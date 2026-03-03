"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, FileText, ChevronDown, ChevronRight,
  GraduationCap, Search, MessageSquare, Send, Loader2,
  Trash2, Filter, Code, Bot, User,
} from "lucide-react";
import {
  loadHistory, saveHistory,
  type HistoryEntry,
  historyToContext,
} from "@/lib/history";

interface HistoryModeProps {
  aiModel: string;
  theme: "light" | "dark";
  projectId?: string;
}

export default function HistoryMode({ aiModel, theme, projectId }: HistoryModeProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedFileKey, setExpandedFileKey] = useState<string | null>(null);
  const [showBeginner, setShowBeginner] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<string | null>(null);

  // AI Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load on mount + periodic refresh to pick up background enrichments
  useEffect(() => {
    setEntries(loadHistory());
    const interval = setInterval(() => {
      setEntries(loadHistory());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatStreaming]);

  // Collect all unique tags
  const allTags = Array.from(new Set(entries.flatMap((e) => e.tags))).sort();

  // Filter entries
  const filtered = entries.filter((e) => {
    if (filterTag && !e.tags.includes(filterTag)) return false;
    if (filterMode && e.mode !== filterMode) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.userPrompt.toLowerCase().includes(q) ||
        e.files.some((f) => f.path.toLowerCase().includes(q))
      );
    }
    return true;
  }).reverse(); // newest first

  const handleClearHistory = useCallback(() => {
    if (confirm("Gesamte History löschen? Das kann nicht rückgängig gemacht werden.")) {
      saveHistory([]);
      setEntries([]);
    }
  }, []);

  // AI Chat — ask questions about the history
  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim() || isChatStreaming) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsChatStreaming(true);

    try {
      const historyContext = historyToContext(entries, 50);

      const allMessages = [
        ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userMsg },
      ];

      const response = await fetch("/api/vibe-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages,
          model: aiModel,
          language: "de",
          roles: ["developer", "designer"],
          userLevel: "beginner",
          chatMode: "plan",
          runtimeContext: {
            planContext: `DU BIST IM HISTORY-MODUS. Der User fragt Fragen über die Projekt-History.
Beantworte Fragen basierend auf dieser History. Sei hilfreich und erkläre verständlich.
Wenn du nach einer bestimmten Änderung gefragt wirst, referenziere die Dateien und erkläre was gemacht wurde.
Generiere KEINEN Code. Du bist hier nur zum Erklären und Beraten.

${historyContext}`,
          },
        }),
      });

      if (!response.ok) throw new Error(`API Error ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as { type: string; text?: string };
            if (event.type === "delta" && event.text) {
              accumulated += event.text;
              setChatMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return [...prev.slice(0, -1), { role: "assistant", content: accumulated }];
                }
                return [...prev, { role: "assistant", content: accumulated }];
              });
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Fehler: ${(err as Error).message}` },
      ]);
    } finally {
      setIsChatStreaming(false);
    }
  }, [chatInput, chatMessages, entries, aiModel, isChatStreaming]);

  const modeColors: Record<string, string> = {
    plan: "#A855F7",
    design: "#EC4899",
    build: "#3B82F6",
  };

  const modeLabels: Record<string, string> = {
    plan: "Plan",
    design: "Design",
    build: "Build",
  };

  // Suppress unused warnings — these are used via props
  void theme;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Header Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: "1px solid var(--d3-border-subtle)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Clock size={16} style={{ color: "var(--d3-text-tertiary)" }} />
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--d3-text)",
              letterSpacing: "-0.02em",
            }}
          >
            Projekt-History
          </span>
          <span
            style={{
              fontSize: "0.6875rem",
              color: "var(--d3-text-tertiary)",
              padding: "2px 8px",
              borderRadius: 6,
              background: "var(--d3-glass)",
            }}
          >
            {entries.length} Einträge
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Beginner Toggle */}
          <button
            onClick={() => setShowBeginner((p) => !p)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 8,
              background: showBeginner ? "rgba(168,85,247,0.15)" : "var(--d3-glass)",
              border: showBeginner
                ? "1px solid rgba(168,85,247,0.3)"
                : "1px solid var(--d3-glass-border)",
              color: showBeginner ? "#A855F7" : "var(--d3-text-secondary)",
              fontSize: "0.6875rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <GraduationCap size={12} />
            {showBeginner ? "Anfänger-Modus an" : "Anfänger-Modus aus"}
          </button>

          {/* AI Chat Toggle */}
          <button
            onClick={() => setChatOpen((p) => !p)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 8,
              background: chatOpen ? "rgba(59,130,246,0.15)" : "var(--d3-glass)",
              border: chatOpen
                ? "1px solid rgba(59,130,246,0.3)"
                : "1px solid var(--d3-glass-border)",
              color: chatOpen ? "#3B82F6" : "var(--d3-text-secondary)",
              fontSize: "0.6875rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <MessageSquare size={12} />
            AI fragen
          </button>

          {/* Clear */}
          <button
            onClick={handleClearHistory}
            style={{
              display: "flex",
              alignItems: "center",
              padding: 6,
              borderRadius: 6,
              background: "var(--d3-glass)",
              border: "1px solid var(--d3-glass-border)",
              color: "var(--d3-text-tertiary)",
              cursor: "pointer",
            }}
            title="History löschen"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* ── Search & Filters ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 24px",
          borderBottom: "1px solid var(--d3-border-subtle)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: 1,
            padding: "6px 10px",
            borderRadius: 8,
            background: "var(--d3-surface)",
            border: "1px solid var(--d3-glass-border)",
          }}
        >
          <Search size={12} style={{ color: "var(--d3-text-tertiary)", flexShrink: 0 }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suchen..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--d3-text)",
              fontSize: "0.75rem",
            }}
          />
        </div>

        {/* Mode filter */}
        <div style={{ display: "flex", gap: 4 }}>
          {["plan", "design", "build"].map((m) => (
            <button
              key={m}
              onClick={() => setFilterMode(filterMode === m ? null : m)}
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: "0.625rem",
                fontWeight: 500,
                background:
                  filterMode === m
                    ? `${modeColors[m]}22`
                    : "var(--d3-glass)",
                border:
                  filterMode === m
                    ? `1px solid ${modeColors[m]}44`
                    : "1px solid var(--d3-glass-border)",
                color: filterMode === m ? modeColors[m] : "var(--d3-text-tertiary)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {modeLabels[m]}
            </button>
          ))}
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            <Filter size={10} style={{ color: "var(--d3-text-tertiary)" }} />
            <select
              value={filterTag ?? ""}
              onChange={(e) => setFilterTag(e.target.value || null)}
              style={{
                background: "var(--d3-surface)",
                border: "1px solid var(--d3-glass-border)",
                borderRadius: 6,
                color: "var(--d3-text-secondary)",
                fontSize: "0.625rem",
                padding: "3px 6px",
                cursor: "pointer",
              }}
            >
              <option value="">Alle Tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Main Content Area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Timeline */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 24px",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 12,
                color: "var(--d3-text-tertiary)",
              }}
            >
              <Clock size={32} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: "0.8125rem" }}>
                {entries.length === 0
                  ? "Noch keine History. Starte im Build-Modus!"
                  : "Keine Einträge gefunden."}
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {filtered.map((entry, idx) => {
                const isExpanded = expandedId === entry.id;
                const date = new Date(entry.timestamp);
                const timeStr = date.toLocaleString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                // Show date separator
                const prevEntry = idx > 0 ? filtered[idx - 1] : null;
                const showDateSep =
                  !prevEntry ||
                  new Date(prevEntry.timestamp).toDateString() !== date.toDateString();

                return (
                  <div key={entry.id}>
                    {showDateSep && (
                      <div
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          color: "var(--d3-text-tertiary)",
                          padding: "12px 0 6px",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {date.toLocaleDateString("de-DE", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    )}

                    <motion.div
                      layout
                      style={{
                        borderRadius: 12,
                        background: isExpanded ? "var(--d3-surface)" : "transparent",
                        border: isExpanded
                          ? "1px solid var(--d3-glass-border)"
                          : "1px solid transparent",
                        overflow: "hidden",
                        transition: "background 0.2s, border 0.2s",
                      }}
                    >
                      {/* Entry header — always visible */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          width: "100%",
                          padding: "10px 12px",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          borderRadius: 12,
                        }}
                        onMouseEnter={(e) => {
                          if (!isExpanded) e.currentTarget.style.background = "var(--d3-glass)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {/* Timeline dot */}
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: modeColors[entry.mode] ?? "#666",
                            marginTop: 4,
                            flexShrink: 0,
                          }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.8125rem",
                                fontWeight: 600,
                                color: "var(--d3-text)",
                                letterSpacing: "-0.01em",
                              }}
                            >
                              {entry.title}
                            </span>
                            <span
                              style={{
                                fontSize: "0.5625rem",
                                fontWeight: 500,
                                padding: "1px 5px",
                                borderRadius: 4,
                                background: `${modeColors[entry.mode]}22`,
                                color: modeColors[entry.mode],
                                textTransform: "uppercase",
                              }}
                            >
                              {modeLabels[entry.mode]}
                            </span>
                          </div>

                          <div
                            style={{
                              fontSize: "0.6875rem",
                              color: "var(--d3-text-secondary)",
                              marginTop: 2,
                              lineHeight: 1.4,
                            }}
                          >
                            {entry.summary}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginTop: 4,
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.5625rem",
                                color: "var(--d3-text-tertiary)",
                              }}
                            >
                              {timeStr}
                            </span>
                            {entry.files.length > 0 && (
                              <span
                                style={{
                                  fontSize: "0.5625rem",
                                  color: "var(--d3-text-tertiary)",
                                }}
                              >
                                {entry.files.length} Datei{entry.files.length !== 1 ? "en" : ""}
                              </span>
                            )}
                            {entry.tags.map((t) => (
                              <span
                                key={t}
                                style={{
                                  fontSize: "0.5625rem",
                                  padding: "1px 4px",
                                  borderRadius: 3,
                                  background: "var(--d3-glass)",
                                  color: "var(--d3-text-tertiary)",
                                }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        {isExpanded ? (
                          <ChevronDown size={14} style={{ color: "var(--d3-text-tertiary)", marginTop: 2 }} />
                        ) : (
                          <ChevronRight size={14} style={{ color: "var(--d3-text-tertiary)", marginTop: 2 }} />
                        )}
                      </button>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            style={{ overflow: "hidden" }}
                          >
                            <div
                              style={{
                                padding: "0 12px 12px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                              }}
                            >
                              {/* Beginner explanation */}
                              {showBeginner && entry.beginnerExplanation && (
                                <div
                                  style={{
                                    padding: "10px 12px",
                                    borderRadius: 8,
                                    background: "rgba(168,85,247,0.08)",
                                    border: "1px solid rgba(168,85,247,0.15)",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                      marginBottom: 6,
                                    }}
                                  >
                                    <GraduationCap size={12} style={{ color: "#A855F7" }} />
                                    <span
                                      style={{
                                        fontSize: "0.625rem",
                                        fontWeight: 600,
                                        color: "#A855F7",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.04em",
                                      }}
                                    >
                                      Einfach erklärt
                                    </span>
                                  </div>
                                  <p
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "var(--d3-text-secondary)",
                                      lineHeight: 1.5,
                                      margin: 0,
                                    }}
                                  >
                                    {entry.beginnerExplanation}
                                  </p>
                                </div>
                              )}

                              {/* Full user prompt */}
                              {entry.userPrompt && (
                                <div
                                  style={{
                                    padding: "8px 10px",
                                    borderRadius: 8,
                                    background: "var(--d3-glass)",
                                    border: "1px solid var(--d3-glass-border)",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <User size={10} style={{ color: "var(--d3-text-tertiary)" }} />
                                    <span style={{ fontSize: "0.625rem", fontWeight: 600, color: "var(--d3-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                      Dein Prompt
                                    </span>
                                  </div>
                                  <p style={{ fontSize: "0.6875rem", color: "var(--d3-text-secondary)", margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                                    {entry.userPrompt}
                                  </p>
                                </div>
                              )}

                              {/* Raw AI response */}
                              {entry.rawAiResponse && (
                                <div
                                  style={{
                                    padding: "8px 10px",
                                    borderRadius: 8,
                                    background: "rgba(59,130,246,0.05)",
                                    border: "1px solid rgba(59,130,246,0.12)",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <Bot size={10} style={{ color: "#3B82F6" }} />
                                    <span style={{ fontSize: "0.625rem", fontWeight: 600, color: "#3B82F6", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                      AI-Antwort
                                    </span>
                                    {!entry.summarized && (
                                      <span style={{ fontSize: "0.5rem", color: "var(--d3-text-tertiary)", marginLeft: "auto", fontStyle: "italic" }}>
                                        Zusammenfassung ausstehend...
                                      </span>
                                    )}
                                  </div>
                                  <pre
                                    style={{
                                      fontSize: "0.6875rem",
                                      color: "var(--d3-text-secondary)",
                                      margin: 0,
                                      lineHeight: 1.5,
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                      maxHeight: 200,
                                      overflowY: "auto",
                                      fontFamily: "inherit",
                                    }}
                                  >
                                    {entry.rawAiResponse}
                                  </pre>
                                </div>
                              )}

                              {/* Files with content previews */}
                              {entry.files.length > 0 && (
                                <div>
                                  <span style={{ fontSize: "0.625rem", fontWeight: 600, color: "var(--d3-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                    Dateien ({entry.files.length})
                                  </span>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                                    {entry.files.map((f, fi) => (
                                      <div key={fi}>
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            padding: "4px 8px",
                                            borderRadius: f.contentPreview ? "6px 6px 0 0" : 6,
                                            background: "var(--d3-glass)",
                                            cursor: f.contentPreview ? "pointer" : "default",
                                          }}
                                          onClick={() => {
                                            if (!f.contentPreview) return;
                                            const key = `${entry.id}:file:${fi}`;
                                            setExpandedFileKey((prev) => prev === key ? null : key);
                                          }}
                                        >
                                          <FileText size={10} style={{ color: f.action === "create" ? "#22C55E" : f.action === "delete" ? "#EF4444" : "#3B82F6" }} />
                                          <span style={{ fontSize: "0.6875rem", color: "var(--d3-text-secondary)", fontFamily: "monospace" }}>
                                            {f.path}
                                          </span>
                                          <span style={{ fontSize: "0.5625rem", color: "var(--d3-text-tertiary)", marginLeft: "auto" }}>
                                            {f.action === "create" ? "neu" : f.action === "delete" ? "gelöscht" : "geändert"}
                                          </span>
                                          {f.contentPreview && (
                                            <Code size={9} style={{ color: "var(--d3-text-tertiary)" }} />
                                          )}
                                        </div>
                                        {/* File content preview */}
                                        {f.contentPreview && expandedFileKey === `${entry.id}:file:${fi}` && (
                                          <pre
                                            style={{
                                              fontSize: "0.625rem",
                                              lineHeight: 1.4,
                                              color: "var(--d3-text-secondary)",
                                              background: "var(--d3-surface)",
                                              border: "1px solid var(--d3-glass-border)",
                                              borderTop: "none",
                                              borderRadius: "0 0 6px 6px",
                                              padding: "8px 10px",
                                              margin: 0,
                                              maxHeight: 250,
                                              overflowY: "auto",
                                              whiteSpace: "pre-wrap",
                                              wordBreak: "break-all",
                                              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                            }}
                                          >
                                            {f.contentPreview}
                                          </pre>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── AI Chat Sidebar ── */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{
                borderLeft: "1px solid var(--d3-border-subtle)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {/* Chat header */}
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--d3-border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <MessageSquare size={14} style={{ color: "#3B82F6" }} />
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--d3-text)",
                  }}
                >
                  History fragen
                </span>
                <span
                  style={{
                    fontSize: "0.625rem",
                    color: "var(--d3-text-tertiary)",
                    marginLeft: "auto",
                  }}
                >
                  AI liest {entries.length} Einträge
                </span>
              </div>

              {/* Chat messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {chatMessages.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--d3-text-tertiary)",
                      fontSize: "0.6875rem",
                      padding: "24px 0",
                      lineHeight: 1.5,
                    }}
                  >
                    Frag mich was über die Projekt-History!
                    <br />
                    z.B. &ldquo;Was wurde gestern gemacht?&rdquo;
                    <br />
                    oder &ldquo;Warum wurde die Navbar geändert?&rdquo;
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      background:
                        msg.role === "user"
                          ? "var(--d3-surface)"
                          : "rgba(59,130,246,0.08)",
                      border:
                        msg.role === "user"
                          ? "1px solid var(--d3-glass-border)"
                          : "1px solid rgba(59,130,246,0.15)",
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "90%",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--d3-text)",
                        margin: 0,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.content}
                    </p>
                  </div>
                ))}
                {isChatStreaming && chatMessages[chatMessages.length - 1]?.role !== "assistant" && (
                  <div style={{ display: "flex", gap: 4, padding: 8 }}>
                    <Loader2
                      size={12}
                      style={{ color: "#3B82F6", animation: "spin 1s linear infinite" }}
                    />
                    <span style={{ fontSize: "0.6875rem", color: "var(--d3-text-tertiary)" }}>
                      Denke nach...
                    </span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div
                style={{
                  padding: "12px 16px",
                  borderTop: "1px solid var(--d3-border-subtle)",
                  display: "flex",
                  gap: 8,
                }}
              >
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSend();
                    }
                  }}
                  placeholder="Frag die History..."
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--d3-surface)",
                    border: "1px solid var(--d3-glass-border)",
                    color: "var(--d3-text)",
                    fontSize: "0.75rem",
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || isChatStreaming}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: chatInput.trim() ? "#3B82F6" : "var(--d3-glass)",
                    border: "none",
                    cursor: chatInput.trim() ? "pointer" : "default",
                    transition: "all 0.15s",
                  }}
                >
                  <Send
                    size={13}
                    style={{
                      color: chatInput.trim() ? "#fff" : "var(--d3-text-tertiary)",
                    }}
                  />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
