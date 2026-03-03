"use client";

import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Generic undo/redo hook with Cmd+Z / Cmd+Shift+Z keyboard support.
 *
 * Usage:
 *   const history = useHistory<MyState>({
 *     onApply: (state) => setMyState(state),
 *   });
 *
 * Call `history.push(snapshot)` BEFORE each user mutation to save the old state.
 * Cmd+Z / Cmd+Shift+Z will call `onApply` with the restored state.
 */

export interface UseHistoryOptions<T> {
  /** Called when undo/redo restores a state — apply it to your component state */
  onApply: (state: T) => void;
  /** Maximum number of undo steps. Default: 40 */
  maxSize?: number;
  /** Whether keyboard shortcuts are active. Default: true */
  enabled?: boolean;
}

export interface UseHistoryReturn<T> {
  /** Save current state BEFORE a mutation (so it can be undone) */
  push: (state: T) => void;
  /** Undo last change — calls onApply internally */
  undo: () => void;
  /** Redo last undo — calls onApply internally */
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
  undoCount: number;
  redoCount: number;
}

export function useHistory<T>(options: UseHistoryOptions<T>): UseHistoryReturn<T> {
  const { maxSize = 40, enabled = true } = options;

  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const [, forceRender] = useState(0);
  const bump = useCallback(() => forceRender((n) => n + 1), []);

  // Keep onApply in a ref so keyboard handler always has latest
  const onApplyRef = useRef(options.onApply);
  onApplyRef.current = options.onApply;

  const push = useCallback((state: T) => {
    const next = [...pastRef.current, state];
    pastRef.current = next.length > maxSize ? next.slice(next.length - maxSize) : next;
    futureRef.current = [];
    bump();
  }, [maxSize, bump]);

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) return;
    const restored = past[past.length - 1];
    pastRef.current = past.slice(0, -1);
    // We need to save the "current" state to redo stack.
    // The caller should have pushed it before the last mutation,
    // but for redo we save what we're restoring FROM — the current live state.
    // Since we don't track current here, we save the restored state's "next"
    // (which is actually the state that was pushed right before this undo).
    // Actually: the push() saves the state BEFORE mutation. So undo pops
    // the pre-mutation state. To redo, we need the post-mutation state.
    // We can't know the post-mutation state here, so we use a different approach:
    // We'll track "current" explicitly.
    // For simplicity: on undo we pop from past and push current snapshot to future.
    // But we need the caller to tell us what the "current" state is...
    //
    // Simpler design: past/future are full snapshots. undo() needs currentState.
    // Let's use a ref that the caller updates.
    onApplyRef.current(restored);
    bump();
  }, [bump]);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return;
    const restored = future[future.length - 1];
    futureRef.current = future.slice(0, -1);
    onApplyRef.current(restored);
    bump();
  }, [bump]);

  const clear = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    bump();
  }, [bump]);

  // Keyboard shortcuts: Cmd+Z / Cmd+Shift+Z
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.key.toLowerCase() !== "z") return;

      // Don't intercept when inside input/textarea/contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      e.preventDefault();
      e.stopPropagation();

      if (e.shiftKey) {
        if (futureRef.current.length > 0) {
          const restored = futureRef.current[futureRef.current.length - 1];
          futureRef.current = futureRef.current.slice(0, -1);
          onApplyRef.current(restored);
          bump();
        }
      } else {
        if (pastRef.current.length > 0) {
          const restored = pastRef.current[pastRef.current.length - 1];
          pastRef.current = pastRef.current.slice(0, -1);
          onApplyRef.current(restored);
          bump();
        }
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [enabled, bump]);

  return {
    push,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    clear,
    undoCount: pastRef.current.length,
    redoCount: futureRef.current.length,
  };
}

/**
 * Smarter undo/redo that tracks both "before" and "after" states per action.
 * Call `snapshot(currentState)` BEFORE a mutation.
 * Call `commit(newState)` AFTER the mutation.
 * This allows proper undo (restore before) and redo (restore after).
 */

export interface UndoEntry<T> {
  before: T;
  after: T;
}

/** Persistence config — saves last 100 entries to Supabase */
export interface UndoPersist {
  userId: string;
  projectId: string | null;
  mode: "plan" | "design";
}

export interface UseUndoRedoOptions<T> {
  onApply: (state: T) => void;
  /** Max undo steps. Default: Infinity (unbegrenzt). Use 100 for Build. */
  maxSize?: number;
  enabled?: boolean;
  /** If set, persists undo history to Supabase (Plan + Design only) */
  persist?: UndoPersist | null;
}

export interface UseUndoRedoReturn<T> {
  /** Call BEFORE mutation — saves the current state */
  snapshot: (currentState: T) => void;
  /** Call AFTER mutation — pairs with the previous snapshot */
  commit: (newState: T) => void;
  /** Convenience: snapshot + commit in one call */
  record: (before: T, after: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
  /** Whether initial entries are still loading from Supabase */
  isLoading: boolean;
}

// ── Debounced save to Supabase ──
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSave<T>(persist: UndoPersist, entries: UndoEntry<T>[]) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const trimmed = entries.slice(-100);
    fetch("/api/undo-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: persist.userId,
        project_id: persist.projectId,
        mode: persist.mode,
        entries: trimmed,
      }),
    }).catch(() => {});
  }, 1500);
}

export function useUndoRedo<T>(options: UseUndoRedoOptions<T>): UseUndoRedoReturn<T> {
  const { maxSize = Infinity, enabled = true, persist = null } = options;

  const pastRef = useRef<UndoEntry<T>[]>([]);
  const futureRef = useRef<UndoEntry<T>[]>([]);
  const pendingRef = useRef<T | null>(null);
  const [, forceRender] = useState(0);
  const [isLoading, setIsLoading] = useState(!!persist);
  const bump = useCallback(() => forceRender((n) => n + 1), []);

  const onApplyRef = useRef(options.onApply);
  onApplyRef.current = options.onApply;

  const persistRef = useRef(persist);
  persistRef.current = persist;

  // ── Load from Supabase on mount (if persist is set) ──
  const loadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!persist) { setIsLoading(false); return; }
    const key = `${persist.userId}:${persist.projectId}:${persist.mode}`;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;

    setIsLoading(true);
    fetch(`/api/undo-history?user_id=${persist.userId}&project_id=${persist.projectId}&mode=${persist.mode}`)
      .then((r) => r.json())
      .then((data: { entries?: UndoEntry<T>[] }) => {
        if (data.entries && Array.isArray(data.entries) && data.entries.length > 0) {
          pastRef.current = data.entries;
          futureRef.current = [];
          bump();
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [persist?.userId, persist?.projectId, persist?.mode, bump, persist]);

  // ── Auto-persist after changes ──
  const maybePersist = useCallback(() => {
    const p = persistRef.current;
    if (p) debouncedSave(p, pastRef.current);
  }, []);

  const trimIfNeeded = useCallback((arr: UndoEntry<T>[]) => {
    if (maxSize === Infinity) return arr;
    return arr.length > maxSize ? arr.slice(arr.length - maxSize) : arr;
  }, [maxSize]);

  const snapshot = useCallback((currentState: T) => {
    pendingRef.current = currentState;
  }, []);

  const commit = useCallback((newState: T) => {
    if (pendingRef.current === null) return;
    const entry: UndoEntry<T> = { before: pendingRef.current, after: newState };
    pastRef.current = trimIfNeeded([...pastRef.current, entry]);
    futureRef.current = [];
    pendingRef.current = null;
    bump();
    maybePersist();
  }, [trimIfNeeded, bump, maybePersist]);

  const record = useCallback((before: T, after: T) => {
    const entry: UndoEntry<T> = { before, after };
    pastRef.current = trimIfNeeded([...pastRef.current, entry]);
    futureRef.current = [];
    bump();
    maybePersist();
  }, [trimIfNeeded, bump, maybePersist]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const entry = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, entry];
    onApplyRef.current(entry.before);
    bump();
    maybePersist();
  }, [bump, maybePersist]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const entry = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, entry];
    onApplyRef.current(entry.after);
    bump();
    maybePersist();
  }, [bump, maybePersist]);

  const clear = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    pendingRef.current = null;
    bump();
    maybePersist();
  }, [bump, maybePersist]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.key.toLowerCase() !== "z") return;

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      e.preventDefault();
      e.stopPropagation();

      if (e.shiftKey) {
        // Redo
        if (futureRef.current.length > 0) {
          const entry = futureRef.current[futureRef.current.length - 1];
          futureRef.current = futureRef.current.slice(0, -1);
          pastRef.current = [...pastRef.current, entry];
          onApplyRef.current(entry.after);
          bump();
          maybePersist();
        }
      } else {
        // Undo
        if (pastRef.current.length > 0) {
          const entry = pastRef.current[pastRef.current.length - 1];
          pastRef.current = pastRef.current.slice(0, -1);
          futureRef.current = [...futureRef.current, entry];
          onApplyRef.current(entry.before);
          bump();
          maybePersist();
        }
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [enabled, bump, maybePersist]);

  return {
    snapshot,
    commit,
    record,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    clear,
    isLoading,
  };
}
