"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  FileText,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  X,
  RotateCcw,
} from "lucide-react";
import {
  Blueprint,
  BlueprintSection,
  markdownToBlueprint,
  blueprintToMarkdown,
  createEmptySection,
  BLOCK_TYPE_LABELS,
  BLOCK_TYPE_EMOJIS,
  BLOCK_FIELD_SCHEMA,
} from "@/lib/blueprint";
import type { BlockType } from "@/lib/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  blueprintMd?: string;
}

interface Props {
  onApplyBlueprint: (blueprint: Blueprint) => void;
  theme: "light" | "dark";
  aiModel: string;
}

const PROMPT_SUGGESTIONS = [
  "Ich bin Zahnarzt in München, spezialisiert auf Implantate und Bleaching",
  "Wir sind eine Webdesign-Agentur mit 10 Mitarbeitern",
  "Ich verkaufe handgemachte Möbel aus Holz",
  "Startup für KI-gestützte Buchhaltung",
  "Restaurant mit italienischer Küche in Berlin",
  "Fotografin für Hochzeiten und Events",
];

const ADDABLE_BLOCK_TYPES: BlockType[] = [
  "navbar",
  "hero",
  "features",
  "stats",
  "testimonials",
  "cta",
  "footer",
];

function genMsgId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function extractBlueprint(text: string): { chatText: string; blueprintMd: string | null } {
  const startTag = "===BLUEPRINT===";
  const endTag = "===END===";
  const startIdx = text.indexOf(startTag);
  const endIdx = text.indexOf(endTag);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return { chatText: text.trim(), blueprintMd: null };
  }

  const chatText = text.slice(0, startIdx).trim();
  const blueprintMd = text.slice(startIdx + startTag.length, endIdx).trim();
  return { chatText, blueprintMd };
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */

export default function PlanningMode({ onApplyBlueprint, theme, aiModel }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [showSourceInput, setShowSourceInput] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isDark = theme === "dark";
  const textPrimary = isDark ? "#e5e5e5" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.35)";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const panelBg = isDark ? "#111" : "#fafafa";
  const chatBubbleUser = isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.1)";
  const chatBubbleAI = isDark ? "rgba(255,255,255,0.05)" : "#fff";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (messageText?: string) => {
      const text = (messageText ?? input).trim();
      if (!text || isStreaming) return;

      const userMsg: ChatMessage = { id: genMsgId(), role: "user", content: text };
      const aiMsg: ChatMessage = { id: genMsgId(), role: "assistant", content: "" };

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setInput("");
      setIsStreaming(true);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const allMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.blueprintMd
            ? m.content + "\n\n===BLUEPRINT===\n" + m.blueprintMd + "\n===END==="
            : m.content,
        }));

        const currentBpMd = blueprint ? blueprintToMarkdown(blueprint) : undefined;

        const response = await fetch("/api/plan-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: allMessages,
            sources: sources.length > 0 ? sources : undefined,
            currentBlueprint: currentBpMd,
            model: aiModel,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Fehler" }));
          throw new Error((err as { error?: string }).error || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Kein Stream.");

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
              const ev = JSON.parse(jsonStr) as {
                type: string;
                text?: string;
                content?: string;
              };

              if (ev.type === "delta" && ev.text) {
                accumulated += ev.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsg.id ? { ...m, content: accumulated } : m
                  )
                );
              } else if (ev.type === "done" && ev.content) {
                const { chatText, blueprintMd } = extractBlueprint(ev.content);

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsg.id
                      ? { ...m, content: chatText, blueprintMd: blueprintMd ?? undefined }
                      : m
                  )
                );

                if (blueprintMd) {
                  const parsed = markdownToBlueprint(blueprintMd);
                  setBlueprint(parsed);
                  setExpandedSections(new Set(parsed.sections.map((_, i) => i)));
                }
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const errMsg = err instanceof Error ? err.message : "Unbekannter Fehler";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id ? { ...m, content: `Fehler: ${errMsg}` } : m
          )
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [input, isStreaming, messages, blueprint, sources, aiModel]
  );

  const handleAbort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  const addSource = useCallback(() => {
    const trimmed = sourceText.trim();
    if (trimmed) {
      setSources((prev) => [...prev, trimmed]);
      setSourceText("");
      setShowSourceInput(false);
    }
  }, [sourceText]);

  const removeSource = useCallback((idx: number) => {
    setSources((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateBlueprintField = useCallback(
    (sectionIdx: number, field: string, value: string) => {
      setBlueprint((prev) => {
        if (!prev) return prev;
        const next = { ...prev, sections: [...prev.sections] };
        next.sections[sectionIdx] = {
          ...next.sections[sectionIdx],
          fields: { ...next.sections[sectionIdx].fields, [field]: value },
        };
        return next;
      });
    },
    []
  );

  const removeBlueprintSection = useCallback((idx: number) => {
    setBlueprint((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.filter((_, i) => i !== idx),
      };
    });
    setExpandedSections((prev) => {
      const next = new Set<number>();
      for (const v of prev) {
        if (v < idx) next.add(v);
        else if (v > idx) next.add(v - 1);
      }
      return next;
    });
  }, []);

  const addBlueprintSection = useCallback((type: BlockType) => {
    setBlueprint((prev) => {
      if (!prev) return prev;
      const section = createEmptySection(type);
      return { ...prev, sections: [...prev.sections, section] };
    });
    setBlueprint((prev) => {
      if (!prev) return prev;
      setExpandedSections((es) => new Set([...es, prev.sections.length - 1]));
      return prev;
    });
  }, []);

  const moveBlueprintSection = useCallback(
    (idx: number, dir: "up" | "down") => {
      setBlueprint((prev) => {
        if (!prev) return prev;
        const newIdx = dir === "up" ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= prev.sections.length) return prev;
        const sections = [...prev.sections];
        [sections[idx], sections[newIdx]] = [sections[newIdx], sections[idx]];
        return { ...prev, sections };
      });
    },
    []
  );

  const toggleSection = useCallback((idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const handleApply = useCallback(() => {
    if (blueprint) {
      onApplyBlueprint(blueprint);
    }
  }, [blueprint, onApplyBlueprint]);

  const handleReset = useCallback(() => {
    setMessages([]);
    setBlueprint(null);
    setSources([]);
    setExpandedSections(new Set());
  }, []);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full" style={{ color: textPrimary }}>
      {/* ── LEFT: Chat Panel ── */}
      <div
        className="flex flex-col shrink-0 h-full"
        style={{
          width: blueprint ? 380 : "100%",
          maxWidth: blueprint ? 420 : 640,
          margin: blueprint ? undefined : "0 auto",
          borderRight: blueprint ? `1px solid ${border}` : undefined,
          background: panelBg,
          transition: "width 0.3s ease, max-width 0.3s ease",
        }}
      >
        {/* Chat header */}
        <div
          className="px-5 py-3 flex items-center justify-between shrink-0"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: "#3b82f6" }} />
            <span className="text-[13px] font-semibold">Content-Workshop</span>
          </div>
          <div className="flex items-center gap-1">
            {hasMessages && (
              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg transition-all hover:opacity-70"
                style={{ color: textMuted }}
                title="Neu starten"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {!hasMessages && (
            <div className="flex flex-col items-center justify-center flex-1 gap-6 py-8">
              <div className="text-center">
                <h2
                  className="text-[20px] font-bold mb-1.5"
                  style={{ color: textPrimary }}
                >
                  Website-Content erstellen
                </h2>
                <p className="text-[12px] max-w-[320px]" style={{ color: textMuted }}>
                  Beschreibe dein Unternehmen und ich erstelle einen kompletten Text-Blueprint
                  mit allen Sektionen.
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full max-w-[360px]">
                {PROMPT_SUGGESTIONS.slice(0, 4).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => void sendMessage(s)}
                    className="text-left px-3.5 py-2.5 rounded-xl text-[12px] transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={{
                      background: cardBg,
                      border: `1px solid ${border}`,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed max-w-[90%]"
                style={{
                  background: msg.role === "user" ? chatBubbleUser : chatBubbleAI,
                  border:
                    msg.role === "assistant"
                      ? `1px solid ${border}`
                      : "none",
                }}
              >
                {msg.content || (
                  <span className="flex items-center gap-2" style={{ color: textMuted }}>
                    <Loader2 size={14} className="animate-spin" />
                    Denkt nach...
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Sources section */}
        {sources.length > 0 && (
          <div className="px-4 py-2" style={{ borderTop: `1px solid ${border}` }}>
            <div className="text-[10px] font-medium mb-1.5" style={{ color: textMuted }}>
              Quelldaten
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((src, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  }}
                >
                  <FileText size={10} />
                  <span className="max-w-[120px] truncate">
                    {src.slice(0, 40)}...
                  </span>
                  <button
                    onClick={() => removeSource(i)}
                    className="ml-0.5 hover:opacity-70"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source text input */}
        <AnimatePresence>
          {showSourceInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden px-4"
              style={{ borderTop: `1px solid ${border}` }}
            >
              <div className="py-3 flex flex-col gap-2">
                <div className="text-[11px] font-medium" style={{ color: textMuted }}>
                  Firmentext, Broschüre oder Beschreibung einfügen:
                </div>
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Text hier einfügen..."
                  rows={4}
                  className="w-full resize-none rounded-xl px-3 py-2.5 text-[12px] outline-none"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    border: `1px solid ${border}`,
                    color: textPrimary,
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowSourceInput(false);
                      setSourceText("");
                    }}
                    className="px-3 py-1.5 rounded-lg text-[11px]"
                    style={{ color: textMuted }}
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={addSource}
                    disabled={!sourceText.trim()}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-medium"
                    style={{
                      background: sourceText.trim() ? "#3b82f6" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                      color: sourceText.trim() ? "#fff" : textMuted,
                    }}
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat input */}
        <div className="px-4 py-3 shrink-0" style={{ borderTop: `1px solid ${border}` }}>
          <div
            className="flex items-end gap-2 rounded-2xl px-3 py-2"
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
              border: `1px solid ${border}`,
            }}
          >
            <button
              onClick={() => setShowSourceInput((p) => !p)}
              className="p-1.5 rounded-lg shrink-0 transition-all hover:opacity-70"
              style={{ color: textMuted }}
              title="Quelldaten einfügen"
            >
              <ClipboardPaste size={16} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Beschreibe dein Unternehmen..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-[13px] outline-none py-1"
              style={{ color: textPrimary, maxHeight: 120 }}
            />
            {isStreaming ? (
              <button
                onClick={handleAbort}
                className="p-1.5 rounded-lg shrink-0 transition-all"
                style={{ color: "#ef4444" }}
              >
                <X size={16} />
              </button>
            ) : (
              <button
                onClick={() => void sendMessage()}
                disabled={!input.trim()}
                className="p-1.5 rounded-lg shrink-0 transition-all"
                style={{
                  color: input.trim() ? "#3b82f6" : textMuted,
                  opacity: input.trim() ? 1 : 0.5,
                }}
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Blueprint Editor ── */}
      <AnimatePresence>
        {blueprint && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            {/* Blueprint header */}
            <div
              className="px-5 py-3 flex items-center justify-between shrink-0"
              style={{ borderBottom: `1px solid ${border}` }}
            >
              <div className="flex items-center gap-2">
                <FileText size={16} style={{ color: "#22c55e" }} />
                <span className="text-[13px] font-semibold">
                  {blueprint.name || "Blueprint"}
                </span>
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    color: textMuted,
                  }}
                >
                  {blueprint.sections.length} Sektionen
                </span>
              </div>
              <button
                onClick={handleApply}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: "#22c55e", color: "#fff" }}
              >
                <ArrowRight size={14} />
                Website generieren
              </button>
            </div>

            {/* Blueprint sections */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-3 max-w-[700px] mx-auto">
                {blueprint.sections.map((section, idx) => {
                  const isExpanded = expandedSections.has(idx);
                  const emoji = BLOCK_TYPE_EMOJIS[section.type] || "?";
                  const label = BLOCK_TYPE_LABELS[section.type] || section.type;
                  const schemaFields = BLOCK_FIELD_SCHEMA[section.type] || [];

                  return (
                    <motion.div
                      key={`${section.type}-${idx}`}
                      layout
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: cardBg,
                        border: `1px solid ${border}`,
                      }}
                    >
                      {/* Section header */}
                      <button
                        onClick={() => toggleSection(idx)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      >
                        <GripVertical
                          size={14}
                          style={{ color: textMuted, cursor: "grab" }}
                        />
                        <span className="text-[16px]">{emoji}</span>
                        <span className="text-[13px] font-semibold flex-1">
                          {label}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            background: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)",
                            color: textMuted,
                          }}
                        >
                          {section.variant}
                        </span>

                        {/* Move up/down */}
                        <div className="flex gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveBlueprintSection(idx, "up");
                            }}
                            disabled={idx === 0}
                            className="p-1 rounded hover:opacity-70 disabled:opacity-20"
                            style={{ color: textMuted }}
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveBlueprintSection(idx, "down");
                            }}
                            disabled={idx === blueprint.sections.length - 1}
                            className="p-1 rounded hover:opacity-70 disabled:opacity-20"
                            style={{ color: textMuted }}
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBlueprintSection(idx);
                          }}
                          className="p-1 rounded hover:opacity-70"
                          style={{ color: "#ef4444" }}
                        >
                          <Trash2 size={12} />
                        </button>

                        {isExpanded ? (
                          <ChevronUp size={14} style={{ color: textMuted }} />
                        ) : (
                          <ChevronDown size={14} style={{ color: textMuted }} />
                        )}
                      </button>

                      {/* Section fields */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            <div
                              className="px-4 pb-3 flex flex-col gap-2"
                              style={{
                                borderTop: `1px solid ${border}`,
                                paddingTop: 12,
                              }}
                            >
                              {schemaFields.map((field) => (
                                <div key={field} className="flex flex-col gap-1">
                                  <label
                                    className="text-[10px] font-medium"
                                    style={{ color: textMuted }}
                                  >
                                    {field}
                                  </label>
                                  {(field.includes("desc") ||
                                    field.includes("subheadline") ||
                                    field.includes("quote")) ? (
                                    <textarea
                                      value={section.fields[field] || ""}
                                      onChange={(e) =>
                                        updateBlueprintField(idx, field, e.target.value)
                                      }
                                      rows={2}
                                      className="w-full resize-none rounded-lg px-3 py-2 text-[12px] outline-none"
                                      style={{
                                        background: isDark
                                          ? "rgba(255,255,255,0.04)"
                                          : "rgba(0,0,0,0.02)",
                                        border: `1px solid ${border}`,
                                        color: textPrimary,
                                      }}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={section.fields[field] || ""}
                                      onChange={(e) =>
                                        updateBlueprintField(idx, field, e.target.value)
                                      }
                                      className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
                                      style={{
                                        background: isDark
                                          ? "rgba(255,255,255,0.04)"
                                          : "rgba(0,0,0,0.02)",
                                        border: `1px solid ${border}`,
                                        color: textPrimary,
                                      }}
                                    />
                                  )}
                                </div>
                              ))}

                              {/* Extra fields not in schema */}
                              {Object.keys(section.fields)
                                .filter((f) => !schemaFields.includes(f))
                                .map((field) => (
                                  <div key={field} className="flex flex-col gap-1">
                                    <label
                                      className="text-[10px] font-medium"
                                      style={{ color: textMuted }}
                                    >
                                      {field}
                                    </label>
                                    <input
                                      type="text"
                                      value={section.fields[field] || ""}
                                      onChange={(e) =>
                                        updateBlueprintField(idx, field, e.target.value)
                                      }
                                      className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
                                      style={{
                                        background: isDark
                                          ? "rgba(255,255,255,0.04)"
                                          : "rgba(0,0,0,0.02)",
                                        border: `1px solid ${border}`,
                                        color: textPrimary,
                                      }}
                                    />
                                  </div>
                                ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {/* Add section */}
                <AddSectionButton
                  onAdd={addBlueprintSection}
                  isDark={isDark}
                  border={border}
                  textMuted={textMuted}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADD SECTION DROPDOWN
───────────────────────────────────────────────────────────────────────────── */

function AddSectionButton({
  onAdd,
  isDark,
  border,
  textMuted,
}: {
  onAdd: (type: BlockType) => void;
  isDark: boolean;
  border: string;
  textMuted: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[12px] font-medium transition-all hover:opacity-80"
        style={{
          border: `1.5px dashed ${border}`,
          color: textMuted,
        }}
      >
        <Plus size={14} />
        Sektion hinzufügen
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden z-20"
            style={{
              background: isDark ? "#1a1a1a" : "#fff",
              border: `1px solid ${border}`,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            }}
          >
            {ADDABLE_BLOCK_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => {
                  onAdd(type);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] text-left transition-all hover:opacity-70"
                style={{
                  borderBottom: `1px solid ${border}`,
                }}
              >
                <span className="text-[14px]">{BLOCK_TYPE_EMOJIS[type]}</span>
                <span className="font-medium">{BLOCK_TYPE_LABELS[type]}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
