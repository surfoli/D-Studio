"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { authFetch } from "@/lib/auth-fetch";

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

interface HistoryMeta {
  undoCount: number;
  redoCount: number;
}

function buildMeta(undoCount: number, redoCount: number): HistoryMeta {
  return { undoCount, redoCount };
}

export function useHistory<T>(options: UseHistoryOptions<T>): UseHistoryReturn<T> {
  const { maxSize = 40, enabled = true } = options;

  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const onApplyRef = useRef(options.onApply);
  const [meta, setMeta] = useState<HistoryMeta>(() => buildMeta(0, 0));

  const syncMeta = useCallback(() => {
    setMeta(buildMeta(pastRef.current.length, futureRef.current.length));
  }, []);

  useEffect(() => {
    onApplyRef.current = options.onApply;
  }, [options.onApply]);

  const push = useCallback(
    (state: T) => {
      const next = [...pastRef.current, state];
      pastRef.current = next.length > maxSize ? next.slice(next.length - maxSize) : next;
      futureRef.current = [];
      syncMeta();
    },
    [maxSize, syncMeta]
  );

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) return;

    const restored = past[past.length - 1];
    pastRef.current = past.slice(0, -1);
    futureRef.current = [...futureRef.current, restored];
    onApplyRef.current(restored);
    syncMeta();
  }, [syncMeta]);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return;

    const restored = future[future.length - 1];
    futureRef.current = future.slice(0, -1);
    pastRef.current = [...pastRef.current, restored];
    onApplyRef.current(restored);
    syncMeta();
  }, [syncMeta]);

  const clear = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    syncMeta();
  }, [syncMeta]);

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
        redo();
      } else {
        undo();
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [enabled, redo, undo]);

  return {
    push,
    undo,
    redo,
    canUndo: meta.undoCount > 0,
    canRedo: meta.redoCount > 0,
    clear,
    undoCount: meta.undoCount,
    redoCount: meta.redoCount,
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

interface UndoRedoMeta {
  canUndo: boolean;
  canRedo: boolean;
}

// ── Debounced save to Supabase ──
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSave<T>(persist: UndoPersist, entries: UndoEntry<T>[]) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const trimmed = entries.slice(-100);
    authFetch("/api/undo-history", {
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
  const onApplyRef = useRef(options.onApply);
  const persistRef = useRef<UndoPersist | null>(persist);
  const loadedKeyRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!persist);
  const [meta, setMeta] = useState<UndoRedoMeta>({ canUndo: false, canRedo: false });

  const syncMeta = useCallback(() => {
    setMeta({
      canUndo: pastRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
    });
  }, []);

  useEffect(() => {
    onApplyRef.current = options.onApply;
  }, [options.onApply]);

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  // ── Load from Supabase on mount (if persist is set) ──
  const persistKey = persist
    ? `${persist.userId}:${persist.projectId ?? "null"}:${persist.mode}`
    : null;

  useEffect(() => {
    const currentPersist = persistRef.current;
    if (!persistKey || !currentPersist) {
      loadedKeyRef.current = null;
      return;
    }

    if (loadedKeyRef.current === persistKey) return;
    loadedKeyRef.current = persistKey;

    queueMicrotask(() => setIsLoading(true));
    authFetch(
      `/api/undo-history?user_id=${currentPersist.userId}&project_id=${currentPersist.projectId}&mode=${currentPersist.mode}`
    )
      .then((r) => r.json())
      .then((data: { entries?: UndoEntry<T>[] }) => {
        if (Array.isArray(data.entries)) {
          pastRef.current = data.entries;
          futureRef.current = [];
          syncMeta();
        }
      })
      .catch(() => {})
      .finally(() => queueMicrotask(() => setIsLoading(false)));
  }, [persistKey, syncMeta]);

  // ── Auto-persist after changes ──
  const maybePersist = useCallback(() => {
    const activePersist = persistRef.current;
    if (activePersist) debouncedSave(activePersist, pastRef.current);
  }, []);

  const trimIfNeeded = useCallback(
    (arr: UndoEntry<T>[]) => {
      if (maxSize === Infinity) return arr;
      return arr.length > maxSize ? arr.slice(arr.length - maxSize) : arr;
    },
    [maxSize]
  );

  const snapshot = useCallback((currentState: T) => {
    pendingRef.current = currentState;
  }, []);

  const commit = useCallback(
    (newState: T) => {
      if (pendingRef.current === null) return;
      const entry: UndoEntry<T> = { before: pendingRef.current, after: newState };
      pastRef.current = trimIfNeeded([...pastRef.current, entry]);
      futureRef.current = [];
      pendingRef.current = null;
      syncMeta();
      maybePersist();
    },
    [maybePersist, syncMeta, trimIfNeeded]
  );

  const record = useCallback(
    (before: T, after: T) => {
      const entry: UndoEntry<T> = { before, after };
      pastRef.current = trimIfNeeded([...pastRef.current, entry]);
      futureRef.current = [];
      syncMeta();
      maybePersist();
    },
    [maybePersist, syncMeta, trimIfNeeded]
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const entry = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, entry];
    onApplyRef.current(entry.before);
    syncMeta();
    maybePersist();
  }, [maybePersist, syncMeta]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const entry = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, entry];
    onApplyRef.current(entry.after);
    syncMeta();
    maybePersist();
  }, [maybePersist, syncMeta]);

  const clear = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    pendingRef.current = null;
    syncMeta();
    maybePersist();
  }, [maybePersist, syncMeta]);

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
        redo();
      } else {
        undo();
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [enabled, redo, undo]);

  return {
    snapshot,
    commit,
    record,
    undo,
    redo,
    canUndo: meta.canUndo,
    canRedo: meta.canRedo,
    clear,
    isLoading,
  };
}
