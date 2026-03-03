// ── Project History System ──
// Stores a chronological log of all AI interactions & project changes.
// Persisted in localStorage. AI can read history for extended context.

export interface HistoryFileRef {
  path: string;
  action: "create" | "update" | "delete";
  /** First ~40 lines of file content for context */
  contentPreview?: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  /** Short title, e.g. "Hero Section erstellt" */
  title: string;
  /** AI-generated summary of what happened */
  summary: string;
  /** Beginner-friendly explanation (toggleable in UI) */
  beginnerExplanation: string;
  /** Which files were touched */
  files: HistoryFileRef[];
  /** Which mode was active */
  mode: "plan" | "design" | "build";
  /** The user's original prompt — FULL text */
  userPrompt: string;
  /** The AI's full response text (truncated to ~3000 chars for storage) */
  rawAiResponse?: string;
  /** Tags for filtering, e.g. ["styling", "layout", "bugfix"] */
  tags: string[];
  /** Whether AI summary has been applied (vs. raw fallback) */
  summarized?: boolean;
}

const STORAGE_KEY = "d3studio.history";
const MAX_ENTRIES = 300;
const MAX_AI_RESPONSE_CHARS = 3000;
const MAX_FILE_PREVIEW_LINES = 40;

/** Load all history entries from localStorage */
export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

/** Save history entries to localStorage */
export function saveHistory(entries: HistoryEntry[]): void {
  try {
    // Keep only the most recent entries
    const trimmed = entries.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // storage full — trim more aggressively
    try {
      const trimmed = entries.slice(-50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // ignore
    }
  }
}

/** Add a new entry to history */
export function addHistoryEntry(entry: HistoryEntry): void {
  const entries = loadHistory();
  entries.push(entry);
  saveHistory(entries);
}

/** Update an existing entry by id (e.g. to enrich with AI summary later) */
export function updateHistoryEntry(id: string, patch: Partial<HistoryEntry>): void {
  const entries = loadHistory();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return;
  entries[idx] = { ...entries[idx], ...patch };
  saveHistory(entries);
}

/** Truncate a string for file content preview */
function truncateLines(content: string, maxLines = MAX_FILE_PREVIEW_LINES): string {
  const lines = content.split("\n");
  if (lines.length <= maxLines) return content;
  return lines.slice(0, maxLines).join("\n") + `\n... (+${lines.length - maxLines} Zeilen)`;
}

/**
 * Create and save a raw history entry INSTANTLY (no API call).
 * This is the primary auto-save — called right after every AI response.
 * Summary fields get a smart fallback; AI enrichment happens in background.
 */
export function addRawHistoryEntry(opts: {
  userPrompt: string;
  aiResponse: string;
  filesChanged: Array<{ path: string; action: "create" | "update" | "delete"; content?: string }>;
  mode: "plan" | "design" | "build";
}): string {
  const id = genHistoryId();

  // Build file refs with content previews
  const files: HistoryFileRef[] = opts.filesChanged.map((f) => ({
    path: f.path,
    action: f.action,
    contentPreview: f.content ? truncateLines(f.content) : undefined,
  }));

  // Smart fallback title from user prompt
  const title = opts.userPrompt.length > 60
    ? opts.userPrompt.slice(0, 57) + "..."
    : opts.userPrompt || "AI-Interaktion";

  // Smart fallback summary
  const fileCount = files.length;
  const summary = fileCount > 0
    ? `${fileCount} Datei${fileCount !== 1 ? "en" : ""} ${files.map((f) => f.action === "create" ? "erstellt" : "geändert").filter((v, i, a) => a.indexOf(v) === i).join("/")}: ${files.map((f) => f.path.split("/").pop()).join(", ")}`
    : opts.aiResponse.slice(0, 150).replace(/\n/g, " ");

  addHistoryEntry({
    id,
    timestamp: Date.now(),
    title,
    summary,
    beginnerExplanation: "",
    files,
    mode: opts.mode,
    userPrompt: opts.userPrompt,
    rawAiResponse: opts.aiResponse.slice(0, MAX_AI_RESPONSE_CHARS),
    tags: [opts.mode],
    summarized: false,
  });

  return id;
}

/**
 * Background-enrich a history entry with AI-generated summary.
 * Fire-and-forget — call after addRawHistoryEntry.
 */
export async function enrichHistoryEntry(entryId: string): Promise<void> {
  const entries = loadHistory();
  const entry = entries.find((e) => e.id === entryId);
  if (!entry || entry.summarized) return;

  try {
    const res = await fetch("/api/history-summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPrompt: entry.userPrompt,
        aiResponse: entry.rawAiResponse || entry.summary,
        filesChanged: entry.files.map((f) => ({ path: f.path, action: f.action })),
        mode: entry.mode,
      }),
    });
    const data = await res.json() as {
      title?: string;
      summary?: string;
      beginnerExplanation?: string;
      tags?: string[];
    };
    updateHistoryEntry(entryId, {
      title: data.title || entry.title,
      summary: data.summary || entry.summary,
      beginnerExplanation: data.beginnerExplanation || "",
      tags: data.tags && data.tags.length > 0 ? data.tags : entry.tags,
      summarized: true,
    });
  } catch {
    // No problem — raw entry is already saved
  }
}

/** Generate a unique history entry ID */
export function genHistoryId(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Build a compact text representation of the history for AI context injection.
 * Only includes titles, summaries, and file refs — no beginner explanations.
 * Aimed at giving the AI a quick overview of what happened.
 */
export function historyToContext(entries: HistoryEntry[], maxEntries = 30): string {
  if (entries.length === 0) return "";

  const recent = entries.slice(-maxEntries);
  const lines = ["PROJECT HISTORY (chronological — most recent last):"];

  for (const e of recent) {
    const date = new Date(e.timestamp).toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
    const files = e.files.map(f => `${f.action}: ${f.path}`).join(", ");
    lines.push(`[${date}] ${e.title} — ${e.summary}${files ? ` | Files: ${files}` : ""}`);
  }

  return lines.join("\n");
}

