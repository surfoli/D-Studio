"use client";

import { useState, useRef, useEffect, useCallback, useMemo, Fragment } from "react";
import {
  ChevronDown,
  ChevronUp,
  Terminal,
  Trash2,
  XCircle,
  Sparkles,
  Copy,
  Check,
  Search,
  Clock,
  ArrowDown,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

interface TerminalLine {
  id: number;
  text: string;
  type: "stdout" | "stderr" | "info" | "error";
  timestamp: number;
}

type LogFilter = "all" | "error" | "stderr" | "info";

interface TerminalOutputProps {
  collapsed: boolean;
  onToggle: () => void;
  height?: number;
  onSendErrors?: (errorText: string) => void;
  onFileClick?: (path: string, line?: number, col?: number) => void;
}

let _lineCounter = 0;

// Shared event bus for terminal communication
type TerminalHandler = (text: string, type: TerminalLine["type"]) => void;
let _addLineHandler: TerminalHandler | null = null;
let _clearHandler: (() => void) | null = null;

// Regex to detect file:line:col patterns (e.g. app/page.tsx:14:5 or ./components/Hero.tsx:3)
const FILE_PATH_REGEX = /(?:^|\s|\(|\/)([a-zA-Z0-9_.\-\/]+\.(?:tsx?|jsx?|css|json|mjs|html|mdx?|ya?ml))(?::([0-9]+)(?::([0-9]+))?)?/g;

// Strip ANSI escape codes for display
const stripAnsi = (text: string) =>
  text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");

// Format timestamp as HH:MM:SS
const formatTime = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

export default function TerminalOutput({
  collapsed,
  onToggle,
  height = 180,
  onSendErrors,
  onFileClick,
}: TerminalOutputProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Feature state ──
  const [filter, setFilter] = useState<LogFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Smart auto-scroll: pause when user scrolls up, resume at bottom ──
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setAutoScroll(atBottom);
  }, []);

  useEffect(() => {
    if (autoScroll && scrollRef.current && !collapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, collapsed, autoScroll]);

  const addLine = useCallback(
    (text: string, type: TerminalLine["type"] = "stdout") => {
      // Handle carriage-return overwrites: keep only the last segment per CR-delimited chunk
      const crResolved = text
        .split("\n")
        .map((line) => {
          const crParts = line.split("\r");
          return crParts[crParts.length - 1];
        })
        .join("\n");

      // Split multi-line output into individual lines
      const parts = crResolved.split("\n");

      // Filter out spinner-only lines (npm progress indicators like \ | / -)
      // and lines that are only whitespace/control chars
      const isJunkLine = (s: string) => {
        const trimmed = s.replace(/[\x08\x1b\[[0-9;]*[a-zA-Z]]/g, "").trim();
        if (trimmed.length === 0) return true;
        if (/^[\\|\/\-]+$/.test(trimmed) && trimmed.length <= 3) return true;
        return false;
      };

      const newLines: TerminalLine[] = parts
        .filter((p) => p.length > 0 && !isJunkLine(p))
        .map((p) => ({
          id: ++_lineCounter,
          text: p,
          type,
          timestamp: Date.now(),
        }));

      if (newLines.length > 0) {
        setLines((prev) => {
          const combined = [...prev, ...newLines];
          // Keep max 500 lines to avoid memory issues
          return combined.length > 500 ? combined.slice(-500) : combined;
        });
      }
    },
    []
  );

  const clearLines = useCallback(() => {
    setLines([]);
    setSearchQuery("");
    setFilter("all");
  }, []);

  // Register handlers so terminalLog/terminalClear can reach this component
  useEffect(() => {
    _addLineHandler = addLine;
    _clearHandler = clearLines;
    return () => {
      _addLineHandler = null;
      _clearHandler = null;
    };
  }, [addLine, clearLines]);

  // ── Filtered + searched lines ──
  const filteredLines = useMemo(() => {
    let result = lines;

    // Log-level filter
    if (filter === "error") {
      result = result.filter((l) => l.type === "error" || l.type === "stderr");
    } else if (filter === "stderr") {
      result = result.filter((l) => l.type === "stderr");
    } else if (filter === "info") {
      result = result.filter((l) => l.type === "info");
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l) => l.text.toLowerCase().includes(q));
    }

    return result;
  }, [lines, filter, searchQuery]);

  // ── Error count (always from unfiltered lines) ──
  const errorLines = useMemo(
    () => lines.filter((l) => l.type === "error" || l.type === "stderr"),
    [lines]
  );
  const warnLines = useMemo(
    () => lines.filter((l) => l.type === "stderr"),
    [lines]
  );
  const hasErrors = errorLines.length > 0;

  // ── Copy all to clipboard ──
  const handleCopy = useCallback(async () => {
    const text = filteredLines.map((l) => stripAnsi(l.text)).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }, [filteredLines]);

  // ── Focus search input when opened ──
  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus();
  }, [showSearch]);

  const border = "rgba(255,255,255,0.07)";

  // ── Render a line with clickable file paths ──
  const renderLineText = useCallback(
    (text: string) => {
      const clean = stripAnsi(text);
      if (!onFileClick) return clean;

      const parts: (string | React.ReactElement)[] = [];
      let lastIndex = 0;
      const regex = new RegExp(FILE_PATH_REGEX.source, "g");
      let match;

      while ((match = regex.exec(clean)) !== null) {
        const filePath = match[1];
        const lineNum = match[2] ? parseInt(match[2], 10) : undefined;
        const colNum = match[3] ? parseInt(match[3], 10) : undefined;

        // Text before match (include leading whitespace/parens from the full match)
        const matchStart = match.index + (match[0].indexOf(filePath));
        if (matchStart > lastIndex) {
          parts.push(clean.slice(lastIndex, matchStart));
        }

        // The clickable file link
        const display = lineNum
          ? `${filePath}:${lineNum}${colNum ? ":" + colNum : ""}`
          : filePath;

        parts.push(
          <button
            key={`${match.index}-${filePath}`}
            onClick={(e) => {
              e.stopPropagation();
              onFileClick(filePath, lineNum, colNum);
            }}
            className="underline decoration-dotted underline-offset-2 hover:brightness-125 transition-all cursor-pointer"
            style={{ color: "#93c5fd" }}
            title={`${filePath} oeffnen${lineNum ? ` (Zeile ${lineNum})` : ""}`}
          >
            {display}
          </button>
        );

        lastIndex = matchStart + display.length;
      }

      if (lastIndex < clean.length) {
        parts.push(clean.slice(lastIndex));
      }

      return parts.length > 0 ? parts : clean;
    },
    [onFileClick]
  );

  // ── Filter pill button helper ──
  const FilterPill = ({ id, label, count, color }: { id: LogFilter; label: string; count?: number; color: string }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setFilter(filter === id ? "all" : id);
      }}
      className="flex items-center gap-1 px-1.5 py-px rounded text-[9px] font-medium transition-all"
      style={{
        background: filter === id ? `${color}20` : "transparent",
        color: filter === id ? color : "rgba(255,255,255,0.3)",
        border: filter === id ? `1px solid ${color}40` : "1px solid transparent",
      }}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="tabular-nums">{count}</span>
      )}
    </button>
  );

  return (
    <div
      style={{
        borderTop: `1px solid ${border}`,
        background: "#0a0a0a",
        flexShrink: 0,
      }}
    >
      {/* Header bar — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white/[0.03]"
        style={{ borderBottom: collapsed ? "none" : `1px solid ${border}` }}
      >
        <Terminal size={11} className="text-white/30" />
        <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider flex-1">
          Protokoll
        </span>
        {hasErrors && (
          <span className="text-[9px] tabular-nums mr-1" style={{ color: "#f87171" }}>
            {errorLines.length} Fehler
          </span>
        )}
        {lines.length > 0 && (
          <span className="text-[9px] text-white/25 tabular-nums mr-1">
            {lines.length} Zeilen
          </span>
        )}
        {collapsed ? (
          <ChevronUp size={11} className="text-white/30" />
        ) : (
          <ChevronDown size={11} className="text-white/30" />
        )}
      </button>

      {/* Terminal content */}
      {!collapsed && (
        <div className="relative">
          {/* Toolbar row */}
          <div
            className="flex items-center gap-1 px-2 py-1"
            style={{ borderBottom: `1px solid ${border}` }}
          >
            {/* Filter pills */}
            <FilterPill id="error" label="Fehler" count={errorLines.length} color="#f87171" />
            <FilterPill id="stderr" label="Warnungen" count={warnLines.length} color="#fbbf24" />
            <FilterPill id="info" label="Info" color="#60a5fa" />

            <div className="flex-1" />

            {/* Search toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSearch((p) => !p);
                if (showSearch) setSearchQuery("");
              }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
              title="Suchen"
            >
              <Search size={10} style={{ color: showSearch ? "#60a5fa" : "rgba(255,255,255,0.25)" }} />
            </button>

            {/* Timestamp toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTimestamps((p) => !p);
              }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
              title="Zeitstempel anzeigen"
            >
              <Clock size={10} style={{ color: showTimestamps ? "#60a5fa" : "rgba(255,255,255,0.25)" }} />
            </button>

            {/* Copy button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                void handleCopy();
              }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
              title="Alles kopieren"
            >
              {copied ? (
                <Check size={10} style={{ color: "#34d399" }} />
              ) : (
                <Copy size={10} className="text-white/25" />
              )}
            </button>

            {/* KI fix button */}
            {hasErrors && onSendErrors && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const errorText = errorLines.map((l) => l.text).join("\n");
                  onSendErrors(errorText);
                }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-all"
                style={{
                  background: "rgba(139,92,246,0.2)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  color: "#c4b5fd",
                }}
                title="Fehler an KI senden"
              >
                <Sparkles size={9} />
                KI fixen
              </button>
            )}

            {/* Clear button */}
            {lines.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearLines();
                }}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                title="Protokoll leeren"
              >
                <Trash2 size={10} className="text-white/25" />
              </button>
            )}
          </div>

          {/* Search bar (collapsible) */}
          {showSearch && (
            <div
              className="flex items-center gap-2 px-2 py-1"
              style={{ borderBottom: `1px solid ${border}` }}
            >
              <Search size={10} className="text-white/20 shrink-0" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowSearch(false);
                    setSearchQuery("");
                  }
                }}
                placeholder="Suchen..."
                className="flex-1 bg-transparent text-[10px] text-white/70 outline-none placeholder:text-white/20"
              />
              {searchQuery && (
                <span className="text-[9px] text-white/30 tabular-nums shrink-0">
                  {filteredLines.length} Treffer
                </span>
              )}
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-white/10"
              >
                <X size={9} className="text-white/30" />
              </button>
            </div>
          )}

          {/* Log output area */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="overflow-y-auto overflow-x-hidden font-mono"
            style={{ height, padding: "6px 10px" }}
          >
            {filteredLines.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-[10px] text-white/20">
                  {lines.length === 0
                    ? "Noch keine Ausgaben"
                    : searchQuery
                      ? "Keine Treffer"
                      : "Keine Eintraege fuer diesen Filter"}
                </span>
              </div>
            ) : (
              filteredLines.map((line) => (
                <div
                  key={line.id}
                  className="text-[11px] leading-[18px] whitespace-pre-wrap break-all group/line hover:bg-white/[0.02] rounded-sm px-1 -mx-1"
                  style={{
                    color:
                      line.type === "error"
                        ? "#f87171"
                        : line.type === "stderr"
                          ? "#fbbf24"
                          : line.type === "info"
                            ? "#60a5fa"
                            : "rgba(255,255,255,0.55)",
                  }}
                >
                  {/* Timestamp */}
                  {showTimestamps && (
                    <span className="text-[9px] text-white/15 mr-3 tabular-nums select-none inline-block w-[52px] shrink-0">
                      {formatTime(line.timestamp)}
                    </span>
                  )}
                  {/* Type icon */}
                  {line.type === "error" && (
                    <XCircle
                      size={10}
                      className="inline-block mr-1.5 -mt-0.5"
                      style={{ color: "#f87171" }}
                    />
                  )}
                  {line.type === "stderr" && (
                    <AlertTriangle
                      size={10}
                      className="inline-block mr-1.5 -mt-0.5"
                      style={{ color: "#fbbf24" }}
                    />
                  )}
                  {line.type === "info" && (
                    <Info
                      size={10}
                      className="inline-block mr-1.5 -mt-0.5"
                      style={{ color: "#60a5fa" }}
                    />
                  )}
                  {renderLineText(line.text)}
                </div>
              ))
            )}
          </div>

          {/* Scroll-to-bottom button (appears when auto-scroll is paused) */}
          {!autoScroll && filteredLines.length > 0 && (
            <button
              onClick={() => {
                setAutoScroll(true);
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              }}
              className="absolute bottom-2 right-3 flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-medium transition-all"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.5)",
                backdropFilter: "blur(8px)",
              }}
            >
              <ArrowDown size={9} />
              Nach unten
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Helper to add a line to the terminal from anywhere.
 */
export function terminalLog(
  text: string,
  type: "stdout" | "stderr" | "info" | "error" = "stdout"
) {
  if (_addLineHandler) _addLineHandler(text, type);
}

export function terminalClear() {
  if (_clearHandler) _clearHandler();
}
