"use client";

import { motion } from "framer-motion";
import { Settings, Download, Save, Layers, FileText, Terminal, Check, Eye } from "lucide-react";

export type AppMode = "design" | "preview" | "planning" | "coding";

interface Props {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onSettings: () => void;
  onExport: () => void;
  onSave: () => void;
  isExporting: boolean;
  isSaved: boolean;
  hasGenerated: boolean;
  projectName: string;
  theme: "light" | "dark";
}

const MODES: { id: AppMode; icon: React.ReactNode; label: string; shortLabel: string }[] = [
  { id: "design", icon: <Layers size={13} />, label: "Design", shortLabel: "Design" },
  { id: "preview", icon: <Eye size={13} />, label: "Preview", shortLabel: "Preview" },
  { id: "planning", icon: <FileText size={13} />, label: "Planung", shortLabel: "Plan" },
  { id: "coding", icon: <Terminal size={13} />, label: "Vibe-Coding", shortLabel: "Code" },
];

export default function TopBar({
  mode,
  onModeChange,
  onSettings,
  onExport,
  onSave,
  isExporting,
  isSaved,
  hasGenerated,
  projectName,
  theme,
}: Props) {
  const isDark = theme === "dark";
  const bg = isDark ? "rgba(18,18,18,0.97)" : "rgba(255,255,255,0.97)";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const textPrimary = isDark ? "#e5e5e5" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
  const btnBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const btnHover = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.09)";

  return (
    <div
      className="shrink-0 flex items-center px-4 gap-3 z-50"
      style={{
        height: 44,
        background: bg,
        borderBottom: `1px solid ${border}`,
        backdropFilter: "blur(20px)",
        color: textPrimary,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-[12px] font-bold tracking-tight hidden sm:inline" style={{ color: textPrimary }}>
          D³ Studio
        </span>
        {projectName && (
          <span className="text-[11px] hidden md:inline" style={{ color: textMuted }}>
            — {projectName}
          </span>
        )}
      </div>

      {/* Mode Switcher */}
      <div
        className="flex items-center gap-0.5 rounded-xl p-0.5"
        style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }}
      >
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{
                color: active ? (isDark ? "#fff" : "#111") : textMuted,
              }}
            >
              {active && (
                <motion.div
                  layoutId="topbar-active-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.12)" : "#fff",
                    boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.1)",
                  }}
                  transition={{ type: "spring", damping: 24, stiffness: 360 }}
                />
              )}
              <span className="relative z-10">{m.icon}</span>
              <span className="relative z-10 hidden sm:inline">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onSave}
          disabled={!hasGenerated}
          title="Projekt speichern (⌘S)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: btnBg, color: isSaved ? "#34d399" : textMuted }}
        >
          {isSaved ? <Check size={12} /> : <Save size={12} />}
          <span className="hidden md:inline">{isSaved ? "Gespeichert" : "Speichern"}</span>
        </button>

        <button
          onClick={onExport}
          disabled={isExporting || !hasGenerated}
          title="Next.js Export"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: btnBg, color: textPrimary }}
        >
          <Download size={12} />
          <span className="hidden md:inline">{isExporting ? "Export…" : "Export"}</span>
        </button>

        <button
          onClick={onSettings}
          title="Einstellungen (⌘,)"
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
          style={{ background: btnBg, color: textMuted }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = btnHover; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = btnBg; }}
        >
          <Settings size={13} />
        </button>
      </div>
    </div>
  );
}
