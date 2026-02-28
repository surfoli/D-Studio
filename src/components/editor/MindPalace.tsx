"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  Type,
  Layout,
  FileText,
  CheckSquare,
  History,
  Image,
  Target,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";

interface Props {
  theme: "light" | "dark";
  files?: { path: string; content: string }[];
}

interface MindPalaceCard {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  content: string;
  filePath: string;
}

function parseColorSwatches(content: string): string[] {
  const matches = content.match(/#[0-9A-Fa-f]{6}/g);
  return matches ? [...new Set(matches)].slice(0, 6) : [];
}

function parseFonts(content: string): string[] {
  const lines = content.split("\n");
  const fonts: string[] = [];
  for (const line of lines) {
    const match = line.match(/(?:heading|body|font|schrift)[:\s]+"?([^"\n,]+)"?/i);
    if (match) fonts.push(match[1].trim());
  }
  return fonts.length > 0 ? fonts : [];
}

function parseTodoCount(content: string): { open: number; done: number } {
  const openMatches = content.match(/- \[ \]/g);
  const doneMatches = content.match(/- \[x\]/gi);
  return {
    open: openMatches?.length ?? 0,
    done: doneMatches?.length ?? 0,
  };
}

function parsePageCount(content: string): number {
  const matches = content.match(/^- /gm);
  return matches?.length ?? 0;
}

function CardPreviewColors({ colors }: { colors: string[] }) {
  if (colors.length === 0) return <div className="text-[10px] opacity-40">Noch keine Farben</div>;
  return (
    <div className="flex gap-1.5 mt-1">
      {colors.map((c) => (
        <div key={c} className="flex flex-col items-center gap-0.5">
          <div
            className="w-6 h-6 rounded-md border border-white/10"
            style={{ background: c }}
          />
          <span className="text-[8px] font-mono opacity-40">{c}</span>
        </div>
      ))}
    </div>
  );
}

export default function MindPalace({ theme, files = [] }: Props) {
  const isDark = theme === "dark";
  const bg = isDark ? "#0d0d0d" : "#fafafa";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const textMain = isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)";
  const textMuted = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";

  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const d3Files = useMemo(() => {
    return files.filter((f) => f.path.startsWith(".d3/"));
  }, [files]);

  const getFileContent = useCallback(
    (filename: string) => {
      const f = d3Files.find((f) => f.path === `.d3/${filename}`);
      return f?.content ?? "";
    },
    [d3Files]
  );

  const projectContent = getFileContent("PROJECT.md");
  const styleContent = getFileContent("STYLE.md");
  const decisionsContent = getFileContent("DECISIONS.md");
  const todosContent = getFileContent("TODOS.md");
  const refsContent = getFileContent("REFERENCES.md");

  const colors = useMemo(() => parseColorSwatches(styleContent), [styleContent]);
  const fonts = useMemo(() => parseFonts(styleContent), [styleContent]);
  const todos = useMemo(() => parseTodoCount(todosContent), [todosContent]);
  const pageCount = useMemo(() => parsePageCount(projectContent), [projectContent]);
  const decisionCount = decisionsContent.split("\n## ").length - 1;

  const cards: MindPalaceCard[] = useMemo(
    () => [
      {
        id: "project",
        title: "Projekt",
        icon: <Target size={18} />,
        color: "#3B82F6",
        content: projectContent,
        filePath: ".d3/PROJECT.md",
      },
      {
        id: "colors",
        title: "Farben",
        icon: <Palette size={18} />,
        color: "#EC4899",
        content: styleContent,
        filePath: ".d3/STYLE.md",
      },
      {
        id: "typography",
        title: "Typografie",
        icon: <Type size={18} />,
        color: "#8B5CF6",
        content: styleContent,
        filePath: ".d3/STYLE.md",
      },
      {
        id: "pages",
        title: "Seiten",
        icon: <Layout size={18} />,
        color: "#06B6D4",
        content: projectContent,
        filePath: ".d3/PROJECT.md",
      },
      {
        id: "todos",
        title: "Aufgaben",
        icon: <CheckSquare size={18} />,
        color: "#22C55E",
        content: todosContent,
        filePath: ".d3/TODOS.md",
      },
      {
        id: "decisions",
        title: "Entscheidungen",
        icon: <History size={18} />,
        color: "#F97316",
        content: decisionsContent,
        filePath: ".d3/DECISIONS.md",
      },
      {
        id: "references",
        title: "Referenzen",
        icon: <Image size={18} />,
        color: "#A855F7",
        content: refsContent,
        filePath: ".d3/REFERENCES.md",
      },
    ],
    [projectContent, styleContent, todosContent, decisionsContent, refsContent]
  );

  const selectedCardData = cards.find((c) => c.id === selectedCard);
  const hasAnyContent = d3Files.length > 0;

  return (
    <div className="h-full flex flex-col" style={{ background: bg }}>
      {/* Header */}
      <div
        className="shrink-0 px-6 py-4 flex items-center gap-3"
        style={{ borderBottom: `1px solid ${cardBorder}` }}
      >
        <Sparkles size={20} style={{ color: textMuted }} />
        <div>
          <h1 className="text-[15px] font-semibold" style={{ color: textMain }}>
            Mind Palace
          </h1>
          <p className="text-[11px]" style={{ color: textMuted }}>
            Dein Projekt-Wissen auf einen Blick
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!hasAnyContent ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
            <Sparkles size={32} style={{ color: textMuted }} />
            <div className="text-center">
              <p className="text-[13px] font-medium" style={{ color: textMain }}>
                Noch kein Projekt-Wissen
              </p>
              <p className="text-[11px] mt-1" style={{ color: textMuted }}>
                Starte im Vibe-Coding Modus — die KI erstellt automatisch
                Dokumentation in .d3/ Dateien.
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {selectedCard && selectedCardData ? (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                <button
                  onClick={() => setSelectedCard(null)}
                  className="flex items-center gap-2 mb-4 text-[11px] font-medium hover:opacity-70 transition-opacity"
                  style={{ color: textMuted }}
                >
                  <ChevronRight size={12} className="rotate-180" />
                  Zurueck
                </button>

                <div
                  className="rounded-xl p-5"
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${selectedCardData.color}15`, color: selectedCardData.color }}
                    >
                      {selectedCardData.icon}
                    </div>
                    <div>
                      <h2 className="text-[14px] font-semibold" style={{ color: textMain }}>
                        {selectedCardData.title}
                      </h2>
                      <p className="text-[10px] font-mono" style={{ color: textMuted }}>
                        {selectedCardData.filePath}
                      </p>
                    </div>
                  </div>

                  <pre
                    className="text-[11px] leading-relaxed whitespace-pre-wrap font-sans"
                    style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.65)" }}
                  >
                    {selectedCardData.content || "Noch kein Inhalt."}
                  </pre>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {/* Project card */}
                <motion.button
                  onClick={() => setSelectedCard("project")}
                  className="rounded-xl p-4 text-left transition-all hover:scale-[1.02]"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                  whileHover={{ borderColor: "#3B82F640" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#3B82F615", color: "#3B82F6" }}>
                      <Target size={14} />
                    </div>
                    <span className="text-[12px] font-semibold" style={{ color: textMain }}>Projekt</span>
                  </div>
                  <p className="text-[10px] line-clamp-2" style={{ color: textMuted }}>
                    {projectContent ? projectContent.split("\n").slice(0, 2).join(" ").slice(0, 80) : "Noch keine Infos"}
                  </p>
                  {pageCount > 0 && (
                    <div className="mt-2 text-[10px] font-medium" style={{ color: "#3B82F6" }}>
                      {pageCount} Seiten
                    </div>
                  )}
                </motion.button>

                {/* Colors card */}
                <motion.button
                  onClick={() => setSelectedCard("colors")}
                  className="rounded-xl p-4 text-left transition-all hover:scale-[1.02]"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                  whileHover={{ borderColor: "#EC489940" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#EC489915", color: "#EC4899" }}>
                      <Palette size={14} />
                    </div>
                    <span className="text-[12px] font-semibold" style={{ color: textMain }}>Farben</span>
                  </div>
                  <CardPreviewColors colors={colors} />
                </motion.button>

                {/* Typography card */}
                <motion.button
                  onClick={() => setSelectedCard("typography")}
                  className="rounded-xl p-4 text-left transition-all hover:scale-[1.02]"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                  whileHover={{ borderColor: "#8B5CF640" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#8B5CF615", color: "#8B5CF6" }}>
                      <Type size={14} />
                    </div>
                    <span className="text-[12px] font-semibold" style={{ color: textMain }}>Typografie</span>
                  </div>
                  {fonts.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {fonts.map((f) => (
                        <span key={f} className="text-[11px]" style={{ color: textMuted }}>{f}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px]" style={{ color: textMuted }}>Noch keine Fonts</span>
                  )}
                </motion.button>

                {/* Pages card */}
                <motion.button
                  onClick={() => setSelectedCard("pages")}
                  className="rounded-xl p-4 text-left transition-all hover:scale-[1.02]"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                  whileHover={{ borderColor: "#06B6D440" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#06B6D415", color: "#06B6D4" }}>
                      <Layout size={14} />
                    </div>
                    <span className="text-[12px] font-semibold" style={{ color: textMain }}>Seiten</span>
                  </div>
                  <span className="text-[10px]" style={{ color: textMuted }}>
                    {pageCount > 0 ? `${pageCount} Seiten definiert` : "Noch keine Seiten"}
                  </span>
                </motion.button>

                {/* Todos card */}
                <motion.button
                  onClick={() => setSelectedCard("todos")}
                  className="rounded-xl p-4 text-left transition-all hover:scale-[1.02]"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                  whileHover={{ borderColor: "#22C55E40" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#22C55E15", color: "#22C55E" }}>
                      <CheckSquare size={14} />
                    </div>
                    <span className="text-[12px] font-semibold" style={{ color: textMain }}>Aufgaben</span>
                  </div>
                  {todos.open > 0 || todos.done > 0 ? (
                    <div className="flex gap-3 text-[10px]">
                      <span style={{ color: "#22C55E" }}>{todos.done} erledigt</span>
                      <span style={{ color: "#F97316" }}>{todos.open} offen</span>
                    </div>
                  ) : (
                    <span className="text-[10px]" style={{ color: textMuted }}>Keine Aufgaben</span>
                  )}
                </motion.button>

                {/* Decisions card */}
                <motion.button
                  onClick={() => setSelectedCard("decisions")}
                  className="rounded-xl p-4 text-left transition-all hover:scale-[1.02]"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                  whileHover={{ borderColor: "#F9731640" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#F9731615", color: "#F97316" }}>
                      <History size={14} />
                    </div>
                    <span className="text-[12px] font-semibold" style={{ color: textMain }}>Entscheidungen</span>
                  </div>
                  <span className="text-[10px]" style={{ color: textMuted }}>
                    {decisionCount > 0 ? `${decisionCount} Eintraege` : "Noch keine Eintraege"}
                  </span>
                </motion.button>

                {/* References card */}
                <motion.button
                  onClick={() => setSelectedCard("references")}
                  className="rounded-xl p-4 text-left transition-all hover:scale-[1.02]"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                  whileHover={{ borderColor: "#A855F740" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#A855F715", color: "#A855F7" }}>
                      <Image size={14} />
                    </div>
                    <span className="text-[12px] font-semibold" style={{ color: textMain }}>Referenzen</span>
                  </div>
                  <span className="text-[10px]" style={{ color: textMuted }}>
                    {refsContent ? "Bilder vorhanden" : "Noch keine Referenzen"}
                  </span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
