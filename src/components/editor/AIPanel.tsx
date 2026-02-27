"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, ChevronRight, Code2, X, FileStack } from "lucide-react";

interface Props {
  prompt: string;
  onPromptChange: (v: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generationError: string | null;
  streamingText: string;
  generationStep: number;
  promptHistory: string[];
  onUseHistory: (p: string) => void;
  onClose?: () => void;
  theme: "light" | "dark";
  onAddPage?: (name: string) => void;
}

const GENERATION_STEPS = [
  "Prompt analysieren…",
  "Struktur erstellen…",
  "Inhalte generieren…",
  "Design-Tokens setzen…",
  "Blöcke bauen…",
  "Fast fertig…",
];

export default function AIPanel({
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
  generationError,
  streamingText,
  generationStep,
  promptHistory,
  onUseHistory,
  onClose,
  theme,
  onAddPage,
}: Props) {
  const codeRef = useRef<HTMLPreElement>(null);
  const isDark = theme === "dark";

  const bg = isDark ? "rgba(16,16,16,0.98)" : "rgba(255,255,255,0.98)";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const textPrimary = isDark ? "#e5e5e5" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: bg, borderRight: `1px solid ${border}`, color: textPrimary, width: 300 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-emerald-400" />
          <span className="text-[12px] font-semibold">AI Generate</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: textMuted }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {/* Prompt textarea */}
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              if (!isGenerating) onGenerate();
            }
          }}
          rows={4}
          autoFocus
          disabled={isGenerating}
          placeholder="Beschreibe deine Website…"
          className="w-full resize-none rounded-xl px-3.5 py-3 text-[13px] leading-relaxed outline-none transition-colors"
          style={{ background: inputBg, color: textPrimary, border: `1px solid ${inputBorder}` }}
        />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold transition-all"
            style={{
              background: isGenerating
                ? isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"
                : isDark ? "#fff" : "#111",
              color: isGenerating
                ? textMuted
                : isDark ? "#111" : "#fff",
            }}
          >
            {isGenerating ? (
              <><Loader2 size={14} className="animate-spin" /> Generiert…</>
            ) : (
              <><Sparkles size={13} /> Website erstellen</>
            )}
          </button>

          {onAddPage && (
            <button
              onClick={() => {
                const p = prompt.trim();
                if (!p) return;
                // Extract a page name from the prompt
                const match = p.match(/(?:erstell|mach|bau|add|create|neue?)\s+(?:die|eine?|den|das)?\s*(.+?)(?:\s+seite|\s+page)?\s*$/i)
                  || p.match(/^(.+?)(?:\s+seite|\s+page)?$/i);
                const name = match?.[1]?.trim()
                  ?.replace(/^(seite|page)\s+/i, "")
                  ?.replace(/\s+(seite|page)$/i, "")
                  ?.trim();
                if (name && name.length > 1 && name.length < 40) {
                  onAddPage(name.charAt(0).toUpperCase() + name.slice(1));
                  onPromptChange("");
                }
              }}
              disabled={isGenerating || !prompt.trim()}
              title="Neue Unterseite aus Prompt erstellen"
              className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-medium transition-all disabled:opacity-30"
              style={{
                background: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)",
                color: "rgba(96,165,250,0.95)",
              }}
            >
              <FileStack size={13} />
              <span className="hidden sm:inline">+ Seite</span>
            </button>
          )}
        </div>

        {/* Streaming progress */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-xl"
              style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", border: `1px solid ${border}` }}
            >
              <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${border}` }}>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <motion.span
                    key={generationStep}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[10px]"
                    style={{ color: textMuted }}
                  >
                    {GENERATION_STEPS[generationStep % GENERATION_STEPS.length]}
                  </motion.span>
                </div>
                <div className="flex items-center gap-1">
                  <Code2 size={9} style={{ color: textMuted }} />
                  <span className="text-[9px] font-mono" style={{ color: textMuted }}>
                    {streamingText.length}
                  </span>
                </div>
              </div>
              <pre
                ref={codeRef}
                className="px-3 py-2 text-[9px] leading-[1.5] font-mono overflow-y-auto"
                style={{
                  maxHeight: 140,
                  color: "rgba(52,211,153,0.75)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  scrollbarWidth: "none",
                }}
              >
                {streamingText || "Warte…"}
                <span className="animate-pulse">▊</span>
              </pre>
              <div className="h-[2px]" style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (streamingText.length / 2800) * 100)}%`,
                    background: "linear-gradient(90deg, #34d399, #3b82f6)",
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {generationError && (
          <div
            className="rounded-xl px-3 py-2.5 text-[11px] leading-relaxed"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.18)", color: "#fca5a5" }}
          >
            {generationError}
          </div>
        )}

        {/* Prompt History */}
        {promptHistory.length > 0 && !isGenerating && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5 block" style={{ color: textMuted }}>
              Verlauf
            </span>
            <div className="flex flex-col gap-0.5">
              {promptHistory.slice(0, 5).map((entry) => (
                <button
                  key={entry}
                  onClick={() => onUseHistory(entry)}
                  className="w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] flex items-center gap-2 group transition-colors"
                  style={{
                    color: textMuted,
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  title={entry}
                >
                  <ChevronRight size={10} style={{ opacity: 0.4, flexShrink: 0 }} />
                  <span className="truncate">{entry}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2.5" style={{ borderTop: `1px solid ${border}` }}>
        <span className="text-[10px]" style={{ color: textMuted }}>⌘K Toggle · ⌘↵ Generieren</span>
      </div>
    </div>
  );
}
