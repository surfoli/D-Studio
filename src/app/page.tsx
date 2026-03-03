"use client";

import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Layers, Code2, Clock, Settings, X, ChevronDown, ArrowRight, FolderPlus, ChevronRight, Trash2, Check } from "lucide-react";
import { AppSettings, DEFAULT_SETTINGS, loadSettings, saveSettings, AI_MODELS } from "@/lib/settings";
import GlassChat from "@/components/chat/GlassChat";
import AuthGate, { UserMenu } from "@/components/auth/AuthGate";
import OnboardingFlow, { hasSeenOnboarding } from "@/components/onboarding/OnboardingFlow";
import type { User } from "@/lib/auth";
import type { DesignBrief } from "@/lib/design-brief";
import { saveProjectBrief, loadProjectBrief, createProject, loadProjectList, deleteProject, bootstrapProject, setActiveProjectId, type D3Project } from "@/lib/project-store";
import { createDesignBrief } from "@/lib/design-brief";
import { useAI, type AIChatMode } from "@/lib/hooks/use-ai";

// Lazy-load mode components
const PlanMode = lazy(() => import("@/components/editor/PlanMode"));
const DesignMode = lazy(() => import("@/components/editor/DesignMode"));
const VibeCodingMode = lazy(() => import("@/components/editor/VibeCodingMode"));
const HistoryMode = lazy(() => import("@/components/editor/HistoryMode"));

// ── Custom Design Icon ──
function DesignIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" strokeWidth="1.5" />
      <path d="M5 11L11 5" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="5" cy="5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="11" cy="11" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ── Types ──

type AppMode = "plan" | "design" | "build" | "history";

// ── Loading Fallback ──

function LoadingFallback() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <motion.div
        animate={{ opacity: [0.15, 0.4, 0.15] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "var(--d3-glass)",
          border: "1px solid var(--d3-glass-border)",
        }}
      />
    </div>
  );
}

// ── Main App ──

export default function Home() {
  return (
    <AuthGate>
      {(user) => <AppContent user={user} />}
    </AuthGate>
  );
}

// ── Project Switcher ──

function ProjectSwitcher({
  projects,
  activeId,
  onSwitch,
  onNew,
  onDelete,
}: {
  projects: D3Project[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const active = projects.find((p) => p.id === activeId);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="glass-hover"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 10px", borderRadius: 8,
          background: open ? "var(--d3-surface-hover)" : "var(--d3-surface)",
          border: "1px solid var(--d3-glass-border)",
          color: "var(--d3-text-secondary)",
          fontSize: "0.6875rem", fontWeight: 500,
          cursor: "pointer", maxWidth: 140,
        }}
        title="Projekt wechseln"
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {active?.name ?? "Projekt"}
        </span>
        <ChevronDown size={10} style={{ opacity: 0.4, flexShrink: 0 }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="glass-heavy"
            style={{
              position: "absolute", top: "100%", left: 0, marginTop: 6,
              borderRadius: 14, zIndex: 60, width: 240, padding: 4,
              boxShadow: "0 16px 40px var(--d3-shadow-heavy)",
            }}
          >
            {/* New project */}
            <button
              onClick={() => { onNew(); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "8px 12px", borderRadius: 10,
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--d3-text-secondary)", fontSize: "0.75rem",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--d3-glass)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <FolderPlus size={13} style={{ color: "var(--d3-text-tertiary)" }} />
              Neues Projekt
            </button>

            {projects.length > 0 && (
              <div style={{ height: 1, background: "var(--d3-border-subtle)", margin: "4px 8px" }} />
            )}

            {/* Project list */}
            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              {projects.map((p) => (
                <div
                  key={p.id}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 4px" }}
                >
                  <button
                    onClick={() => { onSwitch(p.id); setOpen(false); }}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 8px", borderRadius: 8,
                      background: p.id === activeId ? "var(--d3-surface-hover)" : "transparent",
                      border: "none", cursor: "pointer", textAlign: "left",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { if (p.id !== activeId) e.currentTarget.style.background = "var(--d3-glass)"; }}
                    onMouseLeave={(e) => { if (p.id !== activeId) e.currentTarget.style.background = "transparent"; }}
                  >
                    {p.id === activeId && <Check size={11} style={{ color: "#22c55e", flexShrink: 0 }} />}
                    <span style={{
                      fontSize: "0.75rem", fontWeight: p.id === activeId ? 500 : 400,
                      color: p.id === activeId ? "var(--d3-text)" : "var(--d3-text-secondary)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {p.name}
                    </span>
                  </button>
                  {confirmDelete === p.id ? (
                    <button
                      onClick={() => { onDelete(p.id); setConfirmDelete(null); setOpen(false); }}
                      style={{
                        padding: "4px 6px", borderRadius: 6, border: "none",
                        background: "rgba(239,68,68,0.15)", cursor: "pointer",
                        fontSize: "0.625rem", color: "#ef4444", flexShrink: 0,
                      }}
                    >
                      Löschen
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id); }}
                      style={{
                        padding: 4, borderRadius: 6, border: "none",
                        background: "transparent", cursor: "pointer", flexShrink: 0,
                        opacity: 0.3, transition: "opacity 0.15s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.3"; setConfirmDelete(null); }}
                    >
                      <Trash2 size={11} style={{ color: "var(--d3-text-tertiary)" }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── AppContent ──

function AppContent({ user }: { user: User | null }) {
  const [mode, setMode] = useState<AppMode>("plan");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [buildFromBrief, setBuildFromBrief] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());

  // ── Central Project State ──
  const [projectId, setProjectId] = useState<string | null>(null);
  const [designBrief, setDesignBrief] = useState<DesignBrief | null>(null);
  const [projects, setProjects] = useState<D3Project[]>([]);
  // Ref so VibeCodingMode reset can be triggered
  const resetBuildRef = useRef<(() => void) | null>(null);

  // Bootstrap projects on mount
  useEffect(() => {
    const { projectId: pid, brief } = bootstrapProject();
    setProjectId(pid);
    setDesignBrief(brief);
    setProjects(loadProjectList());
  }, []);

  // ── Unified AI — one engine for all modes + GlassChat ──
  const briefRef = useRef<DesignBrief | null>(designBrief);
  briefRef.current = designBrief;
  const modeRef = useRef<AppMode>(mode);
  modeRef.current = mode;

  const ai = useAI({
    model: settings.aiModel,
    userLevel: settings.userLevel,
    getDesignBrief: useCallback(() => briefRef.current, []),
  });

  // Brief updater — persists per project
  const updateDesignBrief = useCallback((updater: (prev: DesignBrief) => DesignBrief) => {
    setDesignBrief((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      if (projectId) saveProjectBrief(projectId, next);
      return next;
    });
  }, [projectId]);

  // Load settings
  useEffect(() => { setSettings(loadSettings()); }, []);
  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  // ── Switch active project — resets all mode state ──
  const switchProject = useCallback((id: string) => {
    setActiveProjectId(id);
    const brief = loadProjectBrief(id);
    setDesignBrief(brief ?? createDesignBrief());
    setProjectId(id);
    setProjects(loadProjectList());
    ai.clearMessages();
    setBuildFromBrief(false);
    resetBuildRef.current?.();
  }, [ai]);

  // ── New project ──
  const handleNewProject = useCallback(() => {
    const { project, brief } = createProject();
    setProjectId(project.id);
    setDesignBrief(brief);
    setProjects(loadProjectList());
    ai.clearMessages();
    setBuildFromBrief(false);
    resetBuildRef.current?.();
    setMode("plan");
  }, [ai]);

  // ── Delete project ──
  const handleDeleteProject = useCallback((id: string) => {
    deleteProject(id);
    const remaining = loadProjectList();
    setProjects(remaining);
    if (id === projectId) {
      if (remaining.length > 0) {
        switchProject(remaining[0].id);
      } else {
        handleNewProject();
      }
    }
  }, [projectId, switchProject, handleNewProject]);

  // Pipeline status helpers
  const hasBrief = (designBrief?.sections.length ?? 0) > 0;
  const briefColorsDone = designBrief?.colors.primary !== "#6366f1" || designBrief?.colors.background !== "#0a0a0a";

  if (!designBrief || !projectId) return <LoadingFallback />;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--d3-bg)",
      }}
    >
      {/* ── Top Navigation ── */}
      <nav
        style={{
          position: "relative",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          flexShrink: 0,
        }}
      >
        {/* Logo + Project Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "1rem", fontWeight: 900, letterSpacing: "-0.04em", color: "var(--d3-text)", lineHeight: 1 }}>D³</span>
            <span style={{ fontSize: "1rem", fontWeight: 900, letterSpacing: "0.08em", color: "var(--d3-text)", lineHeight: 1 }}>STUDIO</span>
          </div>
          <ChevronRight size={12} style={{ color: "var(--d3-text-ghost)", opacity: 0.4 }} />
          <ProjectSwitcher
            projects={projects}
            activeId={projectId}
            onSwitch={switchProject}
            onNew={handleNewProject}
            onDelete={handleDeleteProject}
          />
          {/* Sync indicator — all modes use same project */}
          <div title="Alle Modi synchron" style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 99, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#22c55e" }}>Sync</span>
          </div>
        </div>

        {/* Mode Tabs — Center */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: 3,
            borderRadius: 12,
            background: "var(--d3-surface)",
          }}
        >
          <button className={`mode-tab ${mode === "plan" ? "mode-tab-active" : ""}`} onClick={() => setMode("plan")}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Layers size={13} />Plan</span>
          </button>
          <ArrowRight size={10} style={{ color: "var(--d3-text-ghost)", opacity: 0.4, flexShrink: 0 }} />
          <button className={`mode-tab ${mode === "design" ? "mode-tab-active" : ""}`} onClick={() => setMode("design")} style={{ position: "relative" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><DesignIcon size={13} />Design</span>
            {hasBrief && mode !== "design" && (
              <div style={{ position: "absolute", top: 4, right: 4, width: 5, height: 5, borderRadius: "50%", background: briefColorsDone ? "#22c55e" : "#f59e0b" }} />
            )}
          </button>
          <ArrowRight size={10} style={{ color: "var(--d3-text-ghost)", opacity: 0.4, flexShrink: 0 }} />
          <button className={`mode-tab ${mode === "build" ? "mode-tab-active" : ""}`} onClick={() => setMode("build")}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Code2 size={13} />Build</span>
          </button>
          <div style={{ width: 1, height: 14, background: "var(--d3-border-subtle)", margin: "0 2px", flexShrink: 0 }} />
          <button className={`mode-tab ${mode === "history" ? "mode-tab-active" : ""}`} onClick={() => setMode("history")}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Clock size={13} />History</span>
          </button>
        </div>

        {/* Right — Model Picker + Settings + User */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowModelPicker((p) => !p)}
              className="glass-hover"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 10px", borderRadius: 8,
                background: "var(--d3-glass)", border: "1px solid var(--d3-glass-border)",
                color: "var(--d3-text-secondary)", fontSize: "0.6875rem", fontWeight: 500, cursor: "pointer",
              }}
            >
              {AI_MODELS.find((m) => m.id === settings.aiModel)?.label ?? settings.aiModel}
              <ChevronDown size={10} style={{ opacity: 0.4 }} />
            </button>
            <AnimatePresence>
              {showModelPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="glass-heavy"
                  style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, borderRadius: 12, overflow: "hidden", zIndex: 60, width: 220, padding: 4 }}
                >
                  {AI_MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setSettings((s) => ({ ...s, aiModel: m.id })); setShowModelPicker(false); }}
                      style={{
                        display: "flex", flexDirection: "column", gap: 2,
                        width: "100%", padding: "8px 12px", borderRadius: 8,
                        background: m.id === settings.aiModel ? "var(--d3-surface-hover)" : "transparent",
                        border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { if (m.id !== settings.aiModel) e.currentTarget.style.background = "var(--d3-glass)"; }}
                      onMouseLeave={(e) => { if (m.id !== settings.aiModel) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: "0.75rem", fontWeight: 500, color: m.id === settings.aiModel ? "var(--d3-text)" : "var(--d3-text-secondary)" }}>{m.label}</span>
                      <span style={{ fontSize: "0.625rem", color: "var(--d3-text-tertiary)" }}>{m.desc}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setShowSettings((p) => !p)}
            className="glass-hover"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: 8,
              background: showSettings ? "var(--d3-surface-active)" : "var(--d3-surface)",
              border: "1px solid var(--d3-glass-border)", cursor: "pointer", transition: "all 0.2s",
            }}
          >
            <Settings size={14} style={{ color: "var(--d3-text-tertiary)" }} />
          </button>
          <UserMenu user={user} />
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <AnimatePresence mode="wait">
          {mode === "plan" && (
            <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} style={{ height: "100%" }}>
              <Suspense fallback={<LoadingFallback />}>
                <PlanMode
                  theme={settings.theme === "light" ? "light" : "dark"}
                  aiModel={settings.aiModel}
                  brief={designBrief}
                  onBriefChange={updateDesignBrief}
                  userId={user?.id ?? null}
                  projectId={projectId}
                  projectName={projects.find((p) => p.id === projectId)?.name ?? designBrief.name}
                  onSwitchToDesign={() => setMode("design")}
                  sharedMessages={ai.messages}
                  sharedIsStreaming={ai.isStreaming}
                  sharedStreamingText={ai.streamingText}
                  onSharedMessagesChange={ai.setMessages}
                />
              </Suspense>
            </motion.div>
          )}

          {mode === "design" && (
            <motion.div key="design" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} style={{ height: "100%" }}>
              <Suspense fallback={<LoadingFallback />}>
                <DesignMode
                  aiModel={settings.aiModel}
                  theme={settings.theme === "light" ? "light" : "dark"}
                  brief={designBrief}
                  onBriefChange={updateDesignBrief}
                  onSwitchToBuild={() => { setBuildFromBrief(true); setMode("build"); }}
                  userId={user?.id ?? null}
                  projectId={projectId ?? undefined}
                  sharedMessages={ai.messages}
                  sharedIsStreaming={ai.isStreaming}
                  sharedStreamingText={ai.streamingText}
                  onSharedSend={(msgs) => ai.setMessages(msgs)}
                />
              </Suspense>
            </motion.div>
          )}

          {mode === "history" && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} style={{ height: "100%" }}>
              <Suspense fallback={<LoadingFallback />}>
                <HistoryMode
                  aiModel={settings.aiModel}
                  theme={settings.theme === "light" ? "light" : "dark"}
                  projectId={projectId}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BUILD MODE — Always mounted so E2B sandbox stays alive */}
        <div style={{ height: "100%", display: mode === "build" ? "block" : "none" }}>
          <Suspense fallback={<LoadingFallback />}>
            <VibeCodingMode
              aiModel={settings.aiModel}
              onModelChange={(model: string) => setSettings((s) => ({ ...s, aiModel: model }))}
              theme={settings.theme === "light" ? "light" : "dark"}
              brief={designBrief}
              onBriefChange={updateDesignBrief}
              buildFromBrief={buildFromBrief}
              onBuildFromBriefConsumed={() => setBuildFromBrief(false)}
              projectId={projectId}
              projectName={projects.find((p) => p.id === projectId)?.name ?? designBrief.name}
              onResetRef={resetBuildRef}
              // ── Unified AI — share the same messages + send fn ──
              sharedAiMessages={ai.messages}
              sharedAiIsStreaming={ai.isStreaming}
              sharedAiStreamingText={ai.streamingText}
              onSharedAiSend={ai.send}
              onSharedAiSetMessages={ai.setMessages}
            />
          </Suspense>
        </div>
      </div>

      {/* ── Settings Overlay ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--d3-overlay)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="glass-heavy"
              style={{ width: 480, maxHeight: "80vh", borderRadius: 24, overflow: "hidden", padding: 0, boxShadow: "0 32px 80px var(--d3-shadow-heavy), 0 0 0 1px var(--d3-glass-heavy-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid var(--d3-border-subtle)" }}>
                <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--d3-text)", letterSpacing: "-0.02em" }}>Einstellungen</span>
                <button onClick={() => setShowSettings(false)} style={{ background: "var(--d3-glass)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <X size={14} style={{ color: "var(--d3-text-tertiary)" }} />
                </button>
              </div>
              <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <span className="type-caption" style={{ marginBottom: 8, display: "block" }}>KI-Modell</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {AI_MODELS.map((m) => (
                      <button key={m.id} onClick={() => setSettings((s) => ({ ...s, aiModel: m.id }))} className="glass-hover"
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 12, background: m.id === settings.aiModel ? "var(--d3-surface-hover)" : "var(--d3-surface)", border: m.id === settings.aiModel ? "1px solid var(--d3-border-medium)" : "1px solid transparent", cursor: "pointer", width: "100%", textAlign: "left" }}>
                        <div>
                          <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: m.id === settings.aiModel ? "var(--d3-text)" : "var(--d3-text-secondary)" }}>{m.label}</div>
                          <div style={{ fontSize: "0.6875rem", color: "var(--d3-text-tertiary)", marginTop: 2 }}>{m.desc}</div>
                        </div>
                        {m.id === settings.aiModel && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="type-caption" style={{ marginBottom: 8, display: "block" }}>Erklär-Level</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["beginner", "learning", "pro"] as const).map((level) => (
                      <button key={level} onClick={() => setSettings((s) => ({ ...s, userLevel: level }))} className="glass-hover"
                        style={{ flex: 1, padding: "10px 12px", borderRadius: 12, background: settings.userLevel === level ? "var(--d3-surface-hover)" : "var(--d3-surface)", border: settings.userLevel === level ? "1px solid var(--d3-border-medium)" : "1px solid transparent", cursor: "pointer", textAlign: "center" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 500, color: settings.userLevel === level ? "var(--d3-text)" : "var(--d3-text-secondary)" }}>
                          {level === "beginner" ? "Anfänger" : level === "learning" ? "Lernend" : "Profi"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="type-caption" style={{ marginBottom: 8, display: "block" }}>Erscheinungsbild</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["dark", "light", "auto"] as const).map((th) => (
                      <button key={th} onClick={() => setSettings((s) => ({ ...s, theme: th }))} className="glass-hover"
                        style={{ flex: 1, padding: "10px 12px", borderRadius: 12, background: settings.theme === th ? "var(--d3-surface-hover)" : "var(--d3-surface)", border: settings.theme === th ? "1px solid var(--d3-border-medium)" : "1px solid transparent", cursor: "pointer", textAlign: "center" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 500, color: settings.theme === th ? "var(--d3-text)" : "var(--d3-text-secondary)" }}>
                          {th === "dark" ? "Dunkel" : th === "light" ? "Hell" : "Auto"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--d3-text-secondary)" }}>Auto-Speichern</div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--d3-text-tertiary)", marginTop: 2 }}>Projekte automatisch sichern</div>
                  </div>
                  <button onClick={() => setSettings((s) => ({ ...s, autoSave: !s.autoSave }))}
                    style={{ width: 40, height: 22, borderRadius: 11, background: settings.autoSave ? "rgba(34,197,94,0.4)" : "var(--d3-toggle-bg)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: settings.autoSave ? "#22c55e" : "var(--d3-toggle-knob)", position: "absolute", top: 3, left: settings.autoSave ? 21 : 3, transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)" }} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Onboarding Flow ── */}
      <AnimatePresence>
        {showOnboarding && <OnboardingFlow onComplete={() => setShowOnboarding(false)} />}
      </AnimatePresence>

      {/* ── Unified Floating AI Chat — same instance as Build mode chat ── */}
      <GlassChat
        messages={ai.messages}
        onSend={(msg) => ai.send(msg, modeRef.current as AIChatMode)}
        isStreaming={ai.isStreaming}
        streamingText={ai.streamingText}
        placeholder={
          mode === "plan" ? "Beschreib dein Projekt..." :
          mode === "design" ? "Beschreib dein Design..." :
          "Was soll ich bauen?"
        }
        mode={mode}
      />
    </div>
  );
}
