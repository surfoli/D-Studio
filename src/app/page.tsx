"use client";

import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Layers, Code2, Clock, Settings, X, ChevronDown, ArrowRight, FolderPlus, ChevronRight, Trash2, Check, Upload, Sparkles, Rocket, FileText } from "lucide-react";
import { AppSettings, loadSettings, saveSettings, AI_MODELS } from "@/lib/settings";
import GlassChat from "@/components/chat/GlassChat";
import AuthGate, { UserMenu } from "@/components/auth/AuthGate";
import OnboardingFlow, { hasSeenOnboarding } from "@/components/onboarding/OnboardingFlow";
import type { User } from "@/lib/auth";
import type { DesignBrief, DesignBriefSection } from "@/lib/design-brief";
import { saveProjectBrief, loadProjectBrief, createProject, loadProjectList, deleteProject, bootstrapProject, setActiveProjectId, saveProjectFiles, type D3Project } from "@/lib/project-store";
import { createDesignBrief } from "@/lib/design-brief";
import { useAI, type AIChatMode } from "@/lib/hooks/use-ai";
import { authFetch } from "@/lib/auth-fetch";

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

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  accent: string;
  createBrief: () => DesignBrief;
  planFiles: Array<{ path: string; content: string }>;
}

function makeTemplateSection(
  patternId: string,
  label: string,
  description: string,
  animation: DesignBriefSection["animation"]
): DesignBriefSection {
  return {
    id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    patternId,
    label,
    description,
    animation,
  };
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "saas",
    name: "SaaS Launchpad",
    description: "Für Tools, Apps und Produkt-Launches mit klarem Conversion-Fokus.",
    accent: "#22c55e",
    createBrief: () => {
      const brief = createDesignBrief("SaaS Launchpad");
      brief.style.mood = "clean-saas";
      brief.style.darkMode = false;
      brief.colors = {
        primary: "#2563eb",
        secondary: "#0ea5e9",
        accent: "#22c55e",
        background: "#f8fafc",
        surface: "#ffffff",
        text: "#0f172a",
        textMuted: "#475569",
      };
      brief.sections = [
        makeTemplateSection("hero-split", "Hero", "Klarer Wert + CTA", "fade-up"),
        makeTemplateSection("features-bento", "Features", "Vorteile visuell hervorheben", "stagger"),
        makeTemplateSection("data-stats", "Metriken", "Vertrauen durch Zahlen", "counter"),
        makeTemplateSection("pricing-3tier", "Pricing", "Preise verständlich zeigen", "fade-up"),
        makeTemplateSection("cta-fullscreen", "Finale CTA", "Letzter Conversion-Impuls", "scale-in"),
        makeTemplateSection("footer-big", "Footer", "Navigation + Legal + Kontakt", "none"),
      ];
      brief.notes = "Fokus: Klarheit, schnelle Aktivierung, starker Trial-CTA.";
      return brief;
    },
    planFiles: [
      {
        path: ".d3/PROJECT.md",
        content: `# SaaS Launchpad\n\n## Ziel\n- Neue User in Trial bringen\n- Time-to-Value unter 2 Minuten\n\n## Zielgruppe\n- Gründer, Produktteams, Tech-SMBs\n\n## Kernseiten\n- Landing\n- Features\n- Pricing\n- FAQ\n- Login/Signup`,
      },
      {
        path: ".d3/CONTENT.md",
        content: `# Content & Copy\n\n## Ton\n- Klar, konkret, vertrauenswürdig\n\n## Hero\n- Headline: "Ship faster with less complexity."\n- Subline: "Alles in einem Workflow von Plan bis Deploy."\n- CTA: "Kostenlos testen"`,
      },
      {
        path: ".d3/FLOWS.md",
        content: `# User Flows\n\n## Aktivierung\n1. Landing öffnen\n2. CTA klicken\n3. Projekt starten\n4. Erstes Ergebnis sehen\n\n## Zielwert\n- Erstes Ergebnis < 2 Minuten`,
      },
    ],
  },
  {
    id: "agency",
    name: "Agency Portfolio",
    description: "Für Agenturen/Freelancer mit Referenzen, Team und Lead-Formular.",
    accent: "#f59e0b",
    createBrief: () => {
      const brief = createDesignBrief("Agency Portfolio");
      brief.style.mood = "editorial-premium";
      brief.colors = {
        primary: "#f59e0b",
        secondary: "#f97316",
        accent: "#ef4444",
        background: "#0b0b0b",
        surface: "#141414",
        text: "#f4f4f5",
        textMuted: "#a1a1aa",
      };
      brief.sections = [
        makeTemplateSection("hero-editorial", "Hero", "Starke Positionierung und Stil", "clip-reveal"),
        makeTemplateSection("showcase-case-studies", "Case Studies", "Arbeiten mit Ergebnissen", "stagger"),
        makeTemplateSection("showcase-service-cards", "Leistungen", "Pakete und Services", "stagger"),
        makeTemplateSection("testimonials-cards", "Testimonials", "Social Proof", "fade-up"),
        makeTemplateSection("interactive-contact", "Kontakt", "Lead-Formular + Kontaktinfos", "fade-up"),
        makeTemplateSection("footer-big", "Footer", "Links, Legal, Social", "none"),
      ];
      brief.notes = "Fokus: Vertrauen, Premium-Eindruck, hohe Lead-Conversion.";
      return brief;
    },
    planFiles: [
      {
        path: ".d3/PROJECT.md",
        content: `# Agency Portfolio\n\n## Ziel\n- Qualifizierte Leads gewinnen\n- Expertise durch Cases zeigen\n\n## Zielgruppe\n- KMU, Startups, Marketing-Teams\n\n## Angebot\n- Branding\n- Web Design\n- Web Development`,
      },
      {
        path: ".d3/REFERENCES.md",
        content: `# Referenzen\n\n## Stil\n- Editorial, minimal, hochwertig\n\n## Inspiration\n- Awwwards ähnliche Agenturseiten\n\n## Content-Idee\n- 3 Hauptprojekte mit Ergebniszahlen`,
      },
    ],
  },
  {
    id: "shop",
    name: "E-Commerce Starter",
    description: "Für Produktseiten mit Fokus auf Vertrauen und Kaufabschluss.",
    accent: "#06b6d4",
    createBrief: () => {
      const brief = createDesignBrief("E-Commerce Starter");
      brief.style.mood = "modern-commerce";
      brief.colors = {
        primary: "#0ea5e9",
        secondary: "#0284c7",
        accent: "#14b8a6",
        background: "#ffffff",
        surface: "#f8fafc",
        text: "#111827",
        textMuted: "#6b7280",
      };
      brief.sections = [
        makeTemplateSection("hero-product", "Hero", "Produkt direkt im Fokus", "scale-in"),
        makeTemplateSection("showcase-product", "Produktdetails", "Features + Nutzen", "parallax"),
        makeTemplateSection("data-progress", "Vergleich", "Warum dieses Produkt", "scroll-reveal"),
        makeTemplateSection("testimonials-cards", "Reviews", "Vertrauen vor Kauf", "stagger"),
        makeTemplateSection("cta-banner", "Kauf-CTA", "Starker Abschluss", "fade-in"),
        makeTemplateSection("footer-columns", "Footer", "Infos + Richtlinien", "none"),
      ];
      brief.notes = "Fokus: Produktverständnis in Sekunden, Vertrauen, klarer Kaufpfad.";
      return brief;
    },
    planFiles: [
      {
        path: ".d3/PROJECT.md",
        content: `# E-Commerce Starter\n\n## Ziel\n- Conversion Rate steigern\n- Klarer Weg zum Kauf\n\n## Zielgruppe\n- Mobile-first Käufer\n\n## Seiten\n- Home\n- Produkt\n- FAQ\n- Checkout-Info`,
      },
      {
        path: ".d3/TODOS.md",
        content: `# Aufgaben\n\n- [ ] Produkt-USP in 1 Satz formulieren\n- [ ] 5 echte Testimonials ergänzen\n- [ ] Rückgabe/Versand sichtbar machen\n- [ ] Mobile Checkout Text vereinfachen`,
      },
    ],
  },
];

function toImportableFiles(value: unknown): Array<{ path: string; content: string }> {
  if (Array.isArray(value)) {
    return value
      .filter((f) => f && typeof f === "object")
      .map((f) => f as { path?: unknown; file_name?: unknown; content?: unknown })
      .map((f) => ({
        path: String(f.path ?? f.file_name ?? "").trim(),
        content: typeof f.content === "string" ? f.content : "",
      }))
      .filter((f) => !!f.path);
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, content]) => typeof content === "string")
      .map(([path, content]) => ({ path, content: content as string }));
  }

  return [];
}

function toImportableBrief(value: unknown, fallbackName: string): DesignBrief {
  const base = createDesignBrief(fallbackName);
  if (!value || typeof value !== "object") {
    base.name = fallbackName;
    return base;
  }

  const src = value as Partial<DesignBrief>;
  return {
    ...base,
    ...src,
    id: typeof src.id === "string" ? src.id : base.id,
    name: typeof src.name === "string" && src.name.trim() ? src.name : fallbackName,
    colors: { ...base.colors, ...(src.colors ?? {}) },
    typography: { ...base.typography, ...(src.typography ?? {}) },
    spacing: { ...base.spacing, ...(src.spacing ?? {}) },
    style: { ...base.style, ...(src.style ?? {}) },
    sections: Array.isArray(src.sections) ? src.sections : base.sections,
    additionalPages: Array.isArray(src.additionalPages) ? src.additionalPages : base.additionalPages,
    notes: typeof src.notes === "string" ? src.notes : base.notes,
    createdAt: typeof src.createdAt === "number" ? src.createdAt : Date.now(),
    updatedAt: Date.now(),
  };
}

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

// ── Library Start ──

function formatProjectDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "vor kurzem";
  }
}

function LibraryStart({
  projects,
  activeId,
  onContinue,
  onOpenProject,
  onBlankStart,
  onTemplateStart,
  onImport,
  importError,
}: {
  projects: D3Project[];
  activeId: string | null;
  onContinue: () => void;
  onOpenProject: (id: string) => void;
  onBlankStart: () => void;
  onTemplateStart: (templateId: string) => void;
  onImport: () => void;
  importError: string | null;
}) {
  const sortedProjects = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
  const activeProject = sortedProjects.find((p) => p.id === activeId) ?? sortedProjects[0] ?? null;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "auto",
        background:
          "radial-gradient(1200px 500px at 10% -10%, rgba(34,197,94,0.10), transparent 60%), radial-gradient(1200px 500px at 90% -5%, rgba(59,130,246,0.10), transparent 60%), var(--d3-bg)",
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1rem", fontWeight: 900, letterSpacing: "-0.04em", color: "var(--d3-text)" }}>D³</span>
            <span style={{ fontSize: "1rem", fontWeight: 900, letterSpacing: "0.08em", color: "var(--d3-text)" }}>STUDIO</span>
          </div>
          <button
            onClick={onContinue}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid var(--d3-glass-border)",
              background: "var(--d3-surface)",
              color: "var(--d3-text-secondary)",
              cursor: "pointer",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            <Rocket size={13} />
            Weiterarbeiten
          </button>
        </div>

        <div style={{ marginBottom: 22 }}>
          <h1 style={{ margin: 0, fontSize: "clamp(1.6rem, 4vw, 2.6rem)", color: "var(--d3-text)", letterSpacing: "-0.03em" }}>
            Projekt-Bibliothek
          </h1>
          <p style={{ margin: "8px 0 0", color: "var(--d3-text-secondary)", fontSize: "0.9rem" }}>
            Starte mit Template, öffne ein bestehendes Projekt, importiere Daten oder beginne komplett leer.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 24 }}>
          <button
            onClick={onBlankStart}
            style={{
              borderRadius: 14,
              border: "1px solid var(--d3-glass-border)",
              background: "var(--d3-surface)",
              padding: "14px 14px",
              textAlign: "left",
              cursor: "pointer",
              color: "var(--d3-text)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <FolderPlus size={14} />
              <span style={{ fontSize: "0.84rem", fontWeight: 700 }}>Leer starten</span>
            </div>
            <span style={{ fontSize: "0.74rem", color: "var(--d3-text-secondary)" }}>Neues Projekt ohne Vorgaben</span>
          </button>

          <button
            onClick={onImport}
            style={{
              borderRadius: 14,
              border: "1px solid var(--d3-glass-border)",
              background: "var(--d3-surface)",
              padding: "14px 14px",
              textAlign: "left",
              cursor: "pointer",
              color: "var(--d3-text)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Upload size={14} />
              <span style={{ fontSize: "0.84rem", fontWeight: 700 }}>Importieren</span>
            </div>
            <span style={{ fontSize: "0.74rem", color: "var(--d3-text-secondary)" }}>JSON-Backup laden (.json)</span>
          </button>

          {activeProject && (
            <button
              onClick={() => onOpenProject(activeProject.id)}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(34,197,94,0.35)",
                background: "rgba(34,197,94,0.08)",
                padding: "14px 14px",
                textAlign: "left",
                cursor: "pointer",
                color: "var(--d3-text)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Rocket size={14} />
                <span style={{ fontSize: "0.84rem", fontWeight: 700 }}>Letztes Projekt öffnen</span>
              </div>
              <span style={{ fontSize: "0.74rem", color: "var(--d3-text-secondary)" }}>{activeProject.name}</span>
            </button>
          )}
        </div>

        {importError && (
          <div style={{ marginBottom: 18, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#fca5a5", fontSize: "0.78rem" }}>
            {importError}
          </div>
        )}

        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <FileText size={14} style={{ color: "var(--d3-text-secondary)" }} />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--d3-text-secondary)" }}>
              Deine Projekte
            </span>
          </div>
          {sortedProjects.length === 0 ? (
            <div style={{ borderRadius: 14, border: "1px solid var(--d3-glass-border)", background: "var(--d3-surface)", padding: 16, color: "var(--d3-text-secondary)", fontSize: "0.8rem" }}>
              Noch keine Projekte vorhanden.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {sortedProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onOpenProject(p.id)}
                  style={{
                    borderRadius: 14,
                    border: p.id === activeId ? "1px solid rgba(34,197,94,0.35)" : "1px solid var(--d3-glass-border)",
                    background: p.id === activeId ? "rgba(34,197,94,0.08)" : "var(--d3-surface)",
                    padding: "12px 12px",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--d3-text)", marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--d3-text-tertiary)" }}>Aktualisiert: {formatProjectDate(p.updatedAt)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Sparkles size={14} style={{ color: "var(--d3-text-secondary)" }} />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--d3-text-secondary)" }}>
              Templates
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
            {PROJECT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => onTemplateStart(template.id)}
                style={{
                  borderRadius: 14,
                  border: "1px solid var(--d3-glass-border)",
                  background: "var(--d3-surface)",
                  padding: "14px 14px",
                  textAlign: "left",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", insetInlineEnd: -30, insetBlockStart: -30, width: 90, height: 90, borderRadius: "50%", background: `${template.accent}22` }} />
                <div style={{ position: "relative" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "4px 8px", borderRadius: 999, background: `${template.accent}22`, color: template.accent, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Template
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--d3-text)", marginBottom: 4 }}>{template.name}</div>
                  <div style={{ fontSize: "0.74rem", color: "var(--d3-text-secondary)", lineHeight: 1.5 }}>{template.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AppContent ──

function AppContent({ user }: { user: User | null }) {
  const [mode, setMode] = useState<AppMode>("plan");
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [buildFromBrief, setBuildFromBrief] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());
  const [showLibrary, setShowLibrary] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // ── Central Project State ──
  const [bootstrapped] = useState(() => bootstrapProject());
  const [projectId, setProjectId] = useState<string | null>(bootstrapped.projectId);
  const [designBrief, setDesignBrief] = useState<DesignBrief | null>(bootstrapped.brief);
  const [projects, setProjects] = useState<D3Project[]>(() => loadProjectList());
  // Ref so VibeCodingMode reset can be triggered
  const resetBuildRef = useRef<(() => void) | null>(null);

  // ── Unified AI — one engine for all modes + GlassChat ──
  const briefRef = useRef<DesignBrief | null>(designBrief);
  const modeRef = useRef<AppMode>(mode);

  // Keep refs in sync outside render to satisfy React hook rules.
  useEffect(() => {
    briefRef.current = designBrief;
  }, [designBrief]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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

  const persistFilesForProject = useCallback(async (
    id: string,
    files: Array<{ path: string; content: string }>
  ) => {
    const normalized = files
      .map((f) => ({
        path: f.path.replace(/\\/g, "/").replace(/^\/+/, "").trim(),
        content: f.content ?? "",
      }))
      .filter((f) => !!f.path);
    if (normalized.length === 0) return;

    saveProjectFiles(id, Object.fromEntries(normalized.map((f) => [f.path, f.content])));

    const batchSize = 40;
    for (let i = 0; i < normalized.length; i += batchSize) {
      const batch = normalized.slice(i, i + batchSize);
      try {
        await authFetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: id, files: batch }),
        });
      } catch {
        // local fallback is already saved
      }
    }
  }, []);

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

  const handleOpenProjectFromLibrary = useCallback((id: string) => {
    switchProject(id);
    setShowLibrary(false);
    setMode("plan");
    setLibraryError(null);
  }, [switchProject]);

  const handleBlankStartFromLibrary = useCallback(() => {
    handleNewProject();
    setShowLibrary(false);
    setLibraryError(null);
  }, [handleNewProject]);

  const handleContinueFromLibrary = useCallback(() => {
    if (projectId) {
      switchProject(projectId);
    } else {
      handleNewProject();
    }
    setShowLibrary(false);
    setMode("plan");
    setLibraryError(null);
  }, [projectId, switchProject, handleNewProject]);

  const handleTemplateStart = useCallback(async (templateId: string) => {
    const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    const { project } = createProject(template.name);
    const brief = template.createBrief();
    brief.name = project.name;
    saveProjectBrief(project.id, brief);

    setProjectId(project.id);
    setDesignBrief(brief);
    setProjects(loadProjectList());
    ai.clearMessages();
    setBuildFromBrief(false);
    resetBuildRef.current?.();
    setMode("plan");
    setShowLibrary(false);
    setLibraryError(null);

    await persistFilesForProject(project.id, template.planFiles);
  }, [ai, persistFilesForProject]);

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as Record<string, unknown>;
      const fallbackName = file.name.replace(/\.[^.]+$/, "") || "Importiertes Projekt";
      const parsedName = typeof parsed.name === "string" ? parsed.name.trim() : "";
      const importName = parsedName || fallbackName;

      const briefCandidate =
        parsed.designBrief ??
        parsed.brief ??
        ((parsed.project && typeof parsed.project === "object")
          ? (parsed.project as Record<string, unknown>).brief
          : null);
      const fallbackBriefCandidate =
        briefCandidate ??
        ((parsed.colors && parsed.typography && parsed.style) ? parsed : null);

      const filesCandidate =
        parsed.files ??
        parsed.projectFiles ??
        parsed.planFiles ??
        ((parsed.project && typeof parsed.project === "object")
          ? (parsed.project as Record<string, unknown>).files
          : null);

      const { project } = createProject(importName);
      const importedBrief = toImportableBrief(fallbackBriefCandidate, importName);
      importedBrief.name = importName;
      saveProjectBrief(project.id, importedBrief);

      const importedFiles = toImportableFiles(filesCandidate);
      await persistFilesForProject(project.id, importedFiles);

      setProjectId(project.id);
      setDesignBrief(importedBrief);
      setProjects(loadProjectList());
      ai.clearMessages();
      setBuildFromBrief(false);
      resetBuildRef.current?.();
      setMode("plan");
      setShowLibrary(false);
      setLibraryError(null);
    } catch {
      setLibraryError("Import fehlgeschlagen. Bitte nutze ein gültiges JSON-Backup.");
    } finally {
      event.target.value = "";
    }
  }, [ai, persistFilesForProject]);

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

  if (showLibrary) {
    return (
      <>
        <LibraryStart
          projects={projects}
          activeId={projectId}
          onContinue={handleContinueFromLibrary}
          onOpenProject={handleOpenProjectFromLibrary}
          onBlankStart={handleBlankStartFromLibrary}
          onTemplateStart={handleTemplateStart}
          onImport={handleImportClick}
          importError={libraryError}
        />
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={handleImportFileChange}
        />
        <AnimatePresence>
          {showOnboarding && <OnboardingFlow onComplete={() => setShowOnboarding(false)} />}
        </AnimatePresence>
      </>
    );
  }

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
          <button
            onClick={() => setShowLibrary(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 8,
              border: "1px solid var(--d3-glass-border)",
              background: "var(--d3-surface)",
              color: "var(--d3-text-secondary)",
              fontSize: "0.6875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Projekt-Bibliothek öffnen"
          >
            <Sparkles size={11} />
            Bibliothek
          </button>
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
