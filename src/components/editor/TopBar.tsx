"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Download, Layers, FileText, Terminal, Check, Eye,
  ChevronDown, FolderOpen, Github, Cloud, CircleDot, Brain,
} from "lucide-react";

export type AppMode = "design" | "preview" | "planning" | "coding";

export interface ProjectInfo {
  id: string;
  name: string;
  savedAt: number;
}

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
  projects?: ProjectInfo[];
  onProjectSwitch?: (id: string) => void;
  onGithubConnect?: () => void;
  autoSaveEnabled?: boolean;
}

const MODES: { id: AppMode; icon: React.ReactNode; label: string; shortLabel: string }[] = [
  { id: "design", icon: <Layers size={13} />, label: "Design", shortLabel: "Design" },
  { id: "preview", icon: <Eye size={13} />, label: "Preview", shortLabel: "Preview" },
  { id: "planning", icon: <Brain size={13} />, label: "Mind Palace", shortLabel: "Mind" },
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
  projects = [],
  onProjectSwitch,
  onGithubConnect,
  autoSaveEnabled = true,
}: Props) {
  const isDark = theme === "dark";
  const bg = isDark ? "rgba(18,18,18,0.97)" : "rgba(255,255,255,0.97)";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const textPrimary = isDark ? "#e5e5e5" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
  const btnBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const btnHover = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.09)";

  const [projectDropdown, setProjectDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!projectDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProjectDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [projectDropdown]);

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
      <div className="flex items-center gap-2 mr-1">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-[12px] font-bold tracking-tight hidden sm:inline" style={{ color: textPrimary }}>
          D³ Studio
        </span>
      </div>

      {/* Project Switcher */}
      {hasGenerated && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProjectDropdown((p) => !p)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all hover:bg-white/5"
            style={{
              border: `1px solid ${border}`,
              color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
            }}
          >
            <FolderOpen size={12} style={{ color: isDark ? "#a78bfa" : "#7c3aed" }} />
            <span className="max-w-[120px] truncate">{projectName || "Projekt"}</span>
            <ChevronDown size={10} style={{ color: textMuted }} />
          </button>
          <AnimatePresence>
            {projectDropdown && projects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-50 w-[220px] max-h-[280px] overflow-y-auto"
                style={{
                  background: isDark ? "#1a1a1a" : "#fff",
                  border: `1px solid ${border}`,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                }}
              >
                <div className="px-3 py-1.5" style={{ borderBottom: `1px solid ${border}` }}>
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: textMuted }}>Projekte</span>
                </div>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onProjectSwitch?.(p.id);
                      setProjectDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/5"
                    style={{
                      background: p.name === projectName ? (isDark ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.08)") : "transparent",
                    }}
                  >
                    <FolderOpen size={11} style={{ color: p.name === projectName ? "#a78bfa" : textMuted }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-medium block truncate" style={{ color: p.name === projectName ? "#a78bfa" : textPrimary }}>
                        {p.name}
                      </span>
                      <span className="text-[10px]" style={{ color: textMuted }}>
                        {new Date(p.savedAt).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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
        {/* Autosave indicator */}
        {hasGenerated && autoSaveEnabled && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px]" style={{ color: isSaved ? "#34d399" : textMuted }}>
            {isSaved ? (
              <><Cloud size={11} /><span className="hidden md:inline">Autosave</span></>
            ) : (
              <><CircleDot size={11} className="animate-pulse" /><span className="hidden md:inline">Speichert...</span></>
            )}
          </div>
        )}

        {/* GitHub */}
        <button
          onClick={onGithubConnect}
          title="GitHub verbinden"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:bg-white/5"
          style={{ border: `1px solid ${border}`, color: textMuted }}
        >
          <Github size={13} />
          <span className="hidden lg:inline">GitHub</span>
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
