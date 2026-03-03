"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useUndoRedo } from "@/lib/hooks/use-history";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2, Send, Trash2, ChevronDown,
  Sparkles, RotateCcw, ArrowRight, Plus, Layout,
  Undo2, Redo2, Monitor, LayoutGrid, GripVertical,
  Search, X, Wand2, Smartphone, Rocket, ExternalLink, Check,
} from "lucide-react";
import dynamic from "next/dynamic";
const CanvasPreview = dynamic(() => import("./CanvasPreview"), { ssr: false });
import type {
  DesignBrief, DesignBriefSection, DesignBriefColors,
  DesignBriefTypography, DesignBriefSpacing, DesignBriefStyle,
} from "@/lib/design-brief";
import { createDesignBrief, DEFAULT_COLORS_DARK, DEFAULT_COLORS_LIGHT } from "@/lib/design-brief";
import {
  SECTION_PATTERNS, SECTION_CATEGORIES, ANIMATION_PRESETS,
  getPatternById,
} from "@/lib/design-patterns";
import type { AnimationPreset } from "@/lib/design-patterns";
import type { DesignBriefPage } from "@/lib/design-brief";
import WireframePreview from "./WireframePreview";

type PreviewMode = "single" | "canvas" | "breakpoints";
import { addRawHistoryEntry, enrichHistoryEntry } from "@/lib/history";
import { generateAllProjectFiles, CMS_SECTION_MAP, detectCmsTypes } from "@/lib/section-code-templates";
import { saveProjectFiles, loadProjectFiles } from "@/lib/project-store";

// ── Types ──

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface DesignModeProps {
  aiModel: string;
  theme: "dark" | "light";
  brief: DesignBrief;
  onBriefChange: (updater: (prev: DesignBrief) => DesignBrief) => void;
  onSwitchToBuild?: () => void;
  userId?: string | null;
  projectId?: string;
  /** Shared AI state from parent — so DesignMode chat appears in GlassChat */
  sharedMessages?: import("@/lib/vibe-code").ChatMessage[];
  sharedIsStreaming?: boolean;
  sharedStreamingText?: string;
  onSharedSend?: (messages: import("@/lib/vibe-code").ChatMessage[]) => void;
}

// ── Helpers ──

function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function parseJsonFromResponse(text: string): Record<string, unknown> | null {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}


// ── Main Component ──

export default function DesignMode({ aiModel, theme, brief, onBriefChange, onSwitchToBuild, userId, projectId, sharedMessages, sharedIsStreaming, sharedStreamingText, onSharedSend }: DesignModeProps) {
  // Brief is now owned by parent (page.tsx) — use onBriefChange to update
  const setBrief = onBriefChange;

  // ── Chat state — internal only for design-specific brief updates ──
  // Visible messages are driven by shared parent state (GlassChat) when provided
  const [localMessages, setLocalMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Use shared state when available, fall back to local
  const chatMessages = sharedMessages
    ? sharedMessages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: typeof m.content === "string" ? m.content : "" }))
    : localMessages;
  const chatIsStreaming = sharedIsStreaming ?? isStreaming;
  const chatStreamingText = sharedStreamingText ?? streamingText;

  // Sync new messages to parent shared state
  const syncToShared = useCallback((msgs: ChatMsg[]) => {
    setLocalMessages(msgs);
    if (onSharedSend) {
      onSharedSend(msgs.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content, timestamp: Date.now() })));
    }
  }, [onSharedSend]);

  // UI state
  const [urlInput, setUrlInput] = useState("");
  const [isRemixing, setIsRemixing] = useState(false);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("canvas");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showAiChat, setShowAiChat] = useState(false);
  const [showInsert, setShowInsert] = useState(false);
  const [patternSearch, setPatternSearch] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  // Multi-page: "home" or page.id
  const [activePage, setActivePage] = useState<"home" | string>("home");
  const [showPageManager, setShowPageManager] = useState(false);
  // Deploy
  const [deployState, setDeployState] = useState<"idle" | "deploying" | "done" | "error">("idle");
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const briefRef = useRef(brief);
  briefRef.current = brief;
  const setupCmsRef = useRef<(b: DesignBrief) => void>(() => {});

  // ── Undo / Redo for brief (unbegrenzt, Supabase-persistiert) ──
  const undoRedo = useUndoRedo<DesignBrief>({
    onApply: (snapshot) => {
      onBriefChange(() => snapshot);
    },
    persist: userId ? { userId, projectId: null, mode: "design" } : null,
  });

  // Wrapper: setBrief with undo recording
  // Note: undoRedo.record must be called OUTSIDE the setState updater
  // to avoid "setState during render" React errors.
  const updateBrief = useCallback((updater: (prev: DesignBrief) => DesignBrief) => {
    onBriefChange((prev) => {
      const next = updater(prev);
      // Schedule undo recording after current render cycle
      setTimeout(() => undoRedo.record(prev, next), 0);
      return next;
    });
  }, [undoRedo, onBriefChange]);

  // ── Quick-Start Templates (with full design tokens) ──
  const QUICK_TEMPLATES: {
    label: string; icon: string; desc: string;
    sections: string[];
    name?: string;
    contentTheme?: string;
    colors?: Partial<DesignBriefColors>;
    typography?: Partial<DesignBriefTypography>;
    spacing?: Partial<DesignBriefSpacing>;
    style?: Partial<DesignBriefStyle>;
  }[] = [
    {
      label: "SaaS Modern",
      icon: "🚀",
      desc: "Indigo/Violett, Inter, Bento",
      name: "SaaS Platform",
      contentTheme: "saas",
      sections: ["navbar-minimal", "hero-centered", "social-proof-marquee", "features-bento", "data-stats", "testimonials-cards", "pricing-3tier", "cta-banner", "footer-columns"],
      colors: { primary: "#6366f1", secondary: "#8b5cf6", accent: "#f59e0b", background: "#09090b", surface: "#18181b", text: "#fafafa", textMuted: "#a1a1aa" },
      typography: { headingFont: "Inter", bodyFont: "Inter", scale: 1.25 },
      style: { mood: "minimal-dark", borderRadius: "soft", darkMode: true },
      spacing: { system: "balanced" },
    },
    {
      label: "Portfolio",
      icon: "🎨",
      desc: "Minimal, Space Grotesk, Galerie",
      name: "Creative Portfolio",
      contentTheme: "portfolio",
      sections: ["navbar-minimal", "hero-minimal", "showcase-gallery", "content-big-text", "features-alternating", "testimonials-carousel", "cta-newsletter", "footer-minimal"],
      colors: { primary: "#171717", secondary: "#404040", accent: "#ef4444", background: "#fafafa", surface: "#ffffff", text: "#0a0a0a", textMuted: "#737373" },
      typography: { headingFont: "Space Grotesk", bodyFont: "Inter", scale: 1.333 },
      style: { mood: "minimal-clean", borderRadius: "sharp", darkMode: false },
      spacing: { system: "relaxed" },
    },
    {
      label: "Agency",
      icon: "💼",
      desc: "Editorial, Syne, Schwarz/Gold",
      name: "Design Agency",
      contentTheme: "agency",
      sections: ["navbar-transparent", "hero-editorial", "content-marquee", "showcase-service-cards", "showcase-case-studies", "data-stats", "testimonials-cards", "cta-fullscreen", "footer-big"],
      colors: { primary: "#d4af37", secondary: "#1a1a1a", accent: "#d4af37", background: "#0c0c0c", surface: "#1a1a1a", text: "#f5f5f5", textMuted: "#8a8a8a" },
      typography: { headingFont: "Syne", bodyFont: "Inter", scale: 1.333 },
      style: { mood: "bold-editorial", borderRadius: "sharp", darkMode: true },
      spacing: { system: "relaxed" },
    },
    {
      label: "E-Commerce",
      icon: "🛍️",
      desc: "Warm, Poppins, Product Hero",
      name: "Online Store",
      contentTheme: "ecommerce",
      sections: ["navbar-minimal", "hero-product", "features-bento-advanced", "showcase-product", "data-stats", "social-proof-marquee", "content-blog-grid", "cta-banner", "footer-columns"],
      colors: { primary: "#ea580c", secondary: "#9333ea", accent: "#16a34a", background: "#fffbf5", surface: "#ffffff", text: "#1c1917", textMuted: "#78716c" },
      typography: { headingFont: "Poppins", bodyFont: "Inter", scale: 1.25 },
      style: { mood: "warm-vibrant", borderRadius: "rounded", darkMode: false },
      spacing: { system: "balanced" },
    },
    {
      label: "Corporate",
      icon: "🏢",
      desc: "Professionell, Blau, Clean",
      name: "Enterprise Solutions",
      contentTheme: "corporate",
      sections: ["navbar-transparent", "hero-fullbleed", "content-big-text", "data-stats", "features-3col", "showcase-service-cards", "testimonials-carousel", "interactive-contact", "footer-big"],
      colors: { primary: "#2563eb", secondary: "#1e40af", accent: "#0ea5e9", background: "#ffffff", surface: "#f8fafc", text: "#0f172a", textMuted: "#64748b" },
      typography: { headingFont: "Plus Jakarta Sans", bodyFont: "Inter", scale: 1.25 },
      style: { mood: "corporate-clean", borderRadius: "soft", darkMode: false },
      spacing: { system: "balanced" },
    },
    {
      label: "Startup",
      icon: "⚡",
      desc: "Neon Grün, Dunkel, Energisch",
      name: "LaunchPad",
      contentTheme: "startup",
      sections: ["navbar-minimal", "hero-video", "social-proof-marquee", "features-bento", "content-image-text", "data-stats", "pricing-3tier", "cta-split", "footer-columns"],
      colors: { primary: "#22c55e", secondary: "#a855f7", accent: "#eab308", background: "#020617", surface: "#0f172a", text: "#f8fafc", textMuted: "#94a3b8" },
      typography: { headingFont: "Outfit", bodyFont: "Inter", scale: 1.25 },
      style: { mood: "bold-neon", borderRadius: "rounded", darkMode: true },
      spacing: { system: "compact" },
    },
    // ── New premium templates ──
    {
      label: "Fitness Editorial",
      icon: "💪",
      desc: "ZONIXX-Style, Serif, SW Editorial",
      name: "ZONIXX",
      contentTheme: "fitness",
      sections: ["navbar-minimal", "hero-fullbleed", "hero-editorial", "features-3col", "showcase-gallery", "pricing-3tier", "cta-fullscreen", "social-proof-marquee", "interactive-contact", "footer-columns"],
      colors: { primary: "#0c0a09", secondary: "#292524", accent: "#0c0a09", background: "#f5f5f0", surface: "#ffffff", text: "#0c0a09", textMuted: "#78716c" },
      typography: { headingFont: "DM Serif Display", bodyFont: "Inter", scale: 1.414 },
      style: { mood: "bold-editorial", borderRadius: "sharp", darkMode: false },
      spacing: { system: "balanced" },
    },
    {
      label: "Luxury Dark",
      icon: "🖤",
      desc: "Premium, Gelb/Schwarz, Playfair",
      name: "Karzone Luxury",
      contentTheme: "automotive",
      sections: ["navbar-transparent", "hero-editorial", "social-proof-marquee", "content-big-text", "features-bento", "data-stats", "showcase-case-studies", "testimonials-carousel", "interactive-contact", "footer-big"],
      colors: { primary: "#eab308", secondary: "#a16207", accent: "#fbbf24", background: "#0a0a0a", surface: "#171717", text: "#fafafa", textMuted: "#737373" },
      typography: { headingFont: "Playfair Display", bodyFont: "Inter", scale: 1.333 },
      style: { mood: "luxury-dark", borderRadius: "sharp", darkMode: true },
      spacing: { system: "relaxed" },
    },
    {
      label: "Restaurant",
      icon: "🍽️",
      desc: "Warm, Elegant, DM Serif",
      name: "Bella Cucina",
      contentTheme: "restaurant",
      sections: ["navbar-transparent", "hero-centered", "content-image-text", "features-alternating", "showcase-gallery", "data-stats", "testimonials-cards", "interactive-contact", "footer-columns"],
      colors: { primary: "#b45309", secondary: "#92400e", accent: "#dc2626", background: "#fffbeb", surface: "#ffffff", text: "#1c1917", textMuted: "#78716c" },
      typography: { headingFont: "DM Serif Display", bodyFont: "Lora", scale: 1.333 },
      style: { mood: "warm-elegant", borderRadius: "soft", darkMode: false },
      spacing: { system: "relaxed" },
    },
    {
      label: "Kreativ Studio",
      icon: "✨",
      desc: "Bunt, Verspielt, Clash Display",
      name: "Studio Bright",
      contentTheme: "creative",
      sections: ["navbar-minimal", "hero-minimal", "content-marquee", "showcase-service-cards", "features-bento-advanced", "showcase-case-studies", "testimonials-carousel", "cta-banner", "footer-big"],
      colors: { primary: "#e11d48", secondary: "#7c3aed", accent: "#0ea5e9", background: "#ffffff", surface: "#fafafa", text: "#09090b", textMuted: "#71717a" },
      typography: { headingFont: "Clash Display", bodyFont: "Satoshi", scale: 1.333 },
      style: { mood: "playful-creative", borderRadius: "rounded", darkMode: false },
      spacing: { system: "balanced" },
    },
    {
      label: "Blog / Magazin",
      icon: "📰",
      desc: "Editorial, Serif, Lesefreundlich",
      name: "The Journal",
      contentTheme: "editorial",
      sections: ["navbar-minimal", "hero-editorial", "content-blog-grid", "content-image-text", "features-alternating", "social-proof-marquee", "cta-newsletter", "footer-columns"],
      colors: { primary: "#dc2626", secondary: "#991b1b", accent: "#f97316", background: "#fefce8", surface: "#ffffff", text: "#1c1917", textMuted: "#78716c" },
      typography: { headingFont: "Fraunces", bodyFont: "Source Serif 4", scale: 1.25 },
      style: { mood: "editorial-warm", borderRadius: "soft", darkMode: false },
      spacing: { system: "relaxed" },
    },
    {
      label: "Immobilien",
      icon: "🏠",
      desc: "Elegant, Grün/Dunkel, Vertrauen",
      name: "Prime Properties",
      contentTheme: "realestate",
      sections: ["navbar-transparent", "hero-product", "data-stats", "features-3col", "showcase-gallery", "content-big-text", "testimonials-cards", "interactive-contact", "footer-big"],
      colors: { primary: "#059669", secondary: "#047857", accent: "#d97706", background: "#ffffff", surface: "#f0fdf4", text: "#022c22", textMuted: "#6b7280" },
      typography: { headingFont: "Plus Jakarta Sans", bodyFont: "Inter", scale: 1.25 },
      style: { mood: "professional-trust", borderRadius: "soft", darkMode: false },
      spacing: { system: "balanced" },
    },
  ];

  // Brief is auto-saved by parent via onBriefChange → saveDesignBrief

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, streamingText]);

  // ── Update brief from AI response ──
  const applyBriefUpdate = useCallback((jsonData: Record<string, unknown>) => {
    updateBrief((prev) => {
      const updated = { ...prev };

      // Sections are replaced entirely (not merged)
      if (jsonData.sections && Array.isArray(jsonData.sections)) {
        updated.sections = (jsonData.sections as Array<Record<string, string>>).map((s) => ({
          id: genId(),
          patternId: s.patternId || "hero-centered",
          label: s.label || "Section",
          description: s.description || "",
          animation: (s.animation as AnimationPreset) || "fade-up",
        }));
        delete jsonData.sections;
      }

      // Notes are replaced
      if (typeof jsonData.notes === "string") {
        updated.notes = jsonData.notes;
        delete jsonData.notes;
      }

      // Source URL
      if (typeof jsonData.sourceUrl === "string") {
        updated.sourceUrl = jsonData.sourceUrl;
        delete jsonData.sourceUrl;
      }

      // Merge remaining nested objects (colors, typography, spacing, style)
      const remaining = jsonData as Record<string, unknown>;
      if (remaining.colors) {
        updated.colors = { ...updated.colors, ...(remaining.colors as Partial<DesignBriefColors>) };
      }
      if (remaining.typography) {
        updated.typography = { ...updated.typography, ...(remaining.typography as Partial<DesignBriefTypography>) };
      }
      if (remaining.spacing) {
        updated.spacing = { ...updated.spacing, ...(remaining.spacing as Partial<DesignBriefSpacing>) };
      }
      if (remaining.style) {
        updated.style = { ...updated.style, ...(remaining.style as Partial<DesignBriefStyle>) };
      }

      if (typeof remaining.name === "string") {
        updated.name = remaining.name;
      }

      updated.updatedAt = Date.now();
      return updated;
    });
  }, []);

  // ── Send chat message ──
  const sendMessage = useCallback(async (message: string, mode: "chat" | "remix" = "chat") => {
    if (!message.trim() && mode === "chat") return;

    const userMsg: ChatMsg = { id: genId(), role: "user", content: message };
    const updatedWithUser = [...localMessages, userMsg];
    syncToShared(updatedWithUser);
    setInputText("");
    setIsStreaming(true);
    setStreamingText("");

    const allMessages = updatedWithUser.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch("/api/design-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages,
          currentBrief: brief,
          model: aiModel,
          mode,
        }),
        signal: controller.signal,
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
              setStreamingText(accumulated);
            }

            if (event.type === "done") {
              if (accumulated) {
                const assistantMsg: ChatMsg = { id: genId(), role: "assistant", content: accumulated };
                syncToShared([...updatedWithUser, assistantMsg]);

                // Extract JSON update from response
                const jsonUpdate = parseJsonFromResponse(accumulated);
                if (jsonUpdate) {
                  applyBriefUpdate(jsonUpdate);
                }

                // ── Auto-save history (instant + background enrich) ──
                const hId = addRawHistoryEntry({
                  userPrompt: message,
                  aiResponse: accumulated,
                  filesChanged: [],
                  mode: "design",
                });
                enrichHistoryEntry(hId).catch(() => {});
              }
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        syncToShared([...updatedWithUser, { id: genId(), role: "assistant", content: `Fehler: ${(err as Error).message}` }]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      abortRef.current = null;
      setIsRemixing(false);
    }
  }, [localMessages, brief, aiModel, applyBriefUpdate, syncToShared]);

  // ── Paste & Remix ──
  const handleRemix = useCallback(() => {
    if (!urlInput.trim()) return;
    setIsRemixing(true);
    const msg = `Analysiere diese Website und extrahiere das Design-System: ${urlInput.trim()}`;
    updateBrief((prev) => ({ ...prev, sourceUrl: urlInput.trim() }));
    sendMessage(msg, "remix");
    setUrlInput("");
  }, [urlInput, sendMessage]);

  // ── Page-aware section helpers ──
  const getActiveSections = useCallback((prev: DesignBrief, page: string): DesignBriefSection[] => {
    if (page === "home") return prev.sections;
    return prev.additionalPages?.find((p) => p.id === page)?.sections ?? [];
  }, []);

  const setActiveSections = useCallback((prev: DesignBrief, page: string, sections: DesignBriefSection[]): DesignBrief => {
    if (page === "home") return { ...prev, sections, updatedAt: Date.now() };
    return {
      ...prev,
      additionalPages: prev.additionalPages?.map((p) =>
        p.id === page ? { ...p, sections } : p
      ) ?? [],
      updatedAt: Date.now(),
    };
  }, []);

  // ── Add section from pattern catalog ──
  const addSection = useCallback((patternId: string) => {
    const pattern = getPatternById(patternId);
    if (!pattern) return;

    const id = genId();
    const newSection: DesignBriefSection = {
      id,
      patternId,
      label: pattern.label,
      description: pattern.description,
      animation: pattern.defaultAnimation,
    };

    const page = activePage;
    let updatedBrief: DesignBrief | null = null;
    updateBrief((prev) => {
      const next = setActiveSections(prev, page, [...getActiveSections(prev, page), newSection]);
      updatedBrief = next;
      return next;
    });

    // Auto-setup CMS tables if this is a CMS section (fire-and-forget)
    if (CMS_SECTION_MAP[patternId]) {
      setTimeout(() => {
        if (updatedBrief) setupCmsRef.current(updatedBrief);
      }, 800);
    }

    // Auto-select + highlight the new section
    setSelectedSection(id);
    setHighlightedSection(id);
    setTimeout(() => setHighlightedSection(null), 1200);
    // Close the section picker after adding
    setShowInsert(false);
  }, [activePage, getActiveSections, setActiveSections]);

  // ── Apply Quick-Start Template ──
  const applyTemplate = useCallback((template: typeof QUICK_TEMPLATES[number]) => {
    const sections: DesignBriefSection[] = template.sections
      .map((pid) => {
        const pattern = getPatternById(pid);
        if (!pattern) return null;
        return {
          id: genId(),
          patternId: pid,
          label: pattern.label,
          description: pattern.description,
          animation: pattern.defaultAnimation,
        };
      })
      .filter(Boolean) as DesignBriefSection[];

    updateBrief((prev) => ({
      ...prev,
      ...(template.name ? { name: template.name } : {}),
      ...(template.contentTheme ? { contentTheme: template.contentTheme } : {}),
      colors: { ...prev.colors, ...(template.colors || {}) },
      typography: { ...prev.typography, ...(template.typography || {}) },
      spacing: { ...prev.spacing, ...(template.spacing || {}) },
      style: { ...prev.style, ...(template.style || {}) },
      sections,
      updatedAt: Date.now(),
    }));
    // Auto-select the first section (e.g. hero) so inspector opens immediately
    if (sections.length > 0) {
      const firstSection = sections.find(s => s.patternId.startsWith("hero")) ?? sections[0];
      setSelectedSection(firstSection.id);
    }
    setShowInsert(false);
  }, []);

  // ── Remove section ──
  const removeSection = useCallback((sectionId: string) => {
    const page = activePage;
    updateBrief((prev) => {
      const current = getActiveSections(prev, page);
      return setActiveSections(prev, page, current.filter((s) => s.id !== sectionId));
    });
  }, [activePage, getActiveSections, setActiveSections]);

  // ── Move section ──
  const moveSection = useCallback((sectionId: string, direction: "up" | "down") => {
    const page = activePage;
    updateBrief((prev) => {
      const current = getActiveSections(prev, page);
      const idx = current.findIndex((s) => s.id === sectionId);
      if (idx === -1) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= current.length) return prev;
      const updated = [...current];
      [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
      return setActiveSections(prev, page, updated);
    });
  }, [activePage, getActiveSections, setActiveSections]);

  // ── Update section animation ──
  const updateSectionAnimation = useCallback((sectionId: string, animation: AnimationPreset) => {
    const page = activePage;
    updateBrief((prev) => {
      const current = getActiveSections(prev, page);
      return setActiveSections(prev, page, current.map((s) => s.id === sectionId ? { ...s, animation } : s));
    });
  }, [activePage, getActiveSections, setActiveSections]);

  // ── Add / remove additional pages ──
  const addPage = useCallback((name: string, slug: string) => {
    const id = genId();
    updateBrief((prev) => ({
      ...prev,
      additionalPages: [...(prev.additionalPages ?? []), { id, name, slug, sections: [] }],
      updatedAt: Date.now(),
    }));
    setActivePage(id);
  }, []);

  const removePage = useCallback((pageId: string) => {
    updateBrief((prev) => ({
      ...prev,
      additionalPages: (prev.additionalPages ?? []).filter((p) => p.id !== pageId),
      updatedAt: Date.now(),
    }));
    setActivePage("home");
  }, []);

  // ── Auto-setup CMS tables when CMS sections are added ──
  const setupCmsForBrief = useCallback(async (updatedBrief: DesignBrief) => {
    if (!projectId) return;
    const cmsTypes = detectCmsTypes(updatedBrief);
    if (cmsTypes.length === 0) return;
    try {
      await fetch("/api/setup-cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, cmsTypes }),
      });
    } catch { /* silent — user never sees this */ }
  }, [projectId]);
  setupCmsRef.current = setupCmsForBrief;

  // ── Deploy to Vercel via /api/deploy ──
  const handleDeploy = useCallback(async () => {
    if (deployState === "deploying" || brief.sections.length === 0) return;
    setDeployState("deploying");
    setDeployUrl(null);
    setDeployError(null);
    try {
      const allFiles = generateAllProjectFiles(brief);
      const files = Object.entries(allFiles).map(([path, content]) => ({ path, content }));
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: brief.name || "mein-projekt", files, framework: "nextjs" }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error || "Deploy fehlgeschlagen");
      // Poll for ready state
      setDeployUrl(data.url || null);
      setDeployState("done");
    } catch (err) {
      setDeployError((err as Error).message);
      setDeployState("error");
    }
  }, [brief, deployState]);

  // ── Reset brief ──
  const resetBrief = useCallback(() => {
    updateBrief(() => createDesignBrief());
    syncToShared([]);
  }, [syncToShared]);

  // ── Auto-sync brief → project files (debounced, no sandbox needed) ──
  useEffect(() => {
    if (!projectId) return;
    const timer = setTimeout(() => {
      const newFiles = generateAllProjectFiles(brief);
      const existing = loadProjectFiles(projectId) ?? {};
      saveProjectFiles(projectId, { ...existing, ...newFiles });
    }, 600);
    return () => clearTimeout(timer);
  }, [brief, projectId]);

  // ── Keyboard handler ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  }, [inputText, sendMessage]);

  // ── Drag & Drop reorder ──
  const handleDrop = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const page = activePage;
    updateBrief((prev) => {
      const arr = [...getActiveSections(prev, page)];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return setActiveSections(prev, page, arr);
    });
  }, [activePage, getActiveSections, setActiveSections]);

  // ── Toggle inspector section ──
  const toggleCollapse = useCallback((key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // ── Filtered patterns for search ──
  const filteredPatterns = patternSearch.trim()
    ? SECTION_PATTERNS.filter((p) =>
        p.label.toLowerCase().includes(patternSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(patternSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(patternSearch.toLowerCase())
      )
    : SECTION_PATTERNS;

  // ── ⌘K to toggle AI chat ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowAiChat((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Computed — active page sections
  const currentPageSections: DesignBriefSection[] = activePage === "home"
    ? brief.sections
    : (brief.additionalPages?.find((p) => p.id === activePage)?.sections ?? []);
  const hasSections = currentPageSections.length > 0;
  const selectedSectionData = currentPageSections.find((s) => s.id === selectedSection) || null;
  const isDark = theme === "dark";
  const allPages = [{ id: "home", name: "Home", slug: "" }, ...(brief.additionalPages ?? [])];

  // Editorial CSS variable overrides — clean light aesthetic for Design Mode
  const editorialVars = {
    "--d3-bg": "#f8f8f8",
    "--d3-surface": "#ffffff",
    "--d3-surface-hover": "#f0f0f0",
    "--d3-surface-active": "#e8e8e8",
    "--d3-glass": "rgba(255,255,255,0.95)",
    "--d3-glass-border": "#e0e0e0",
    "--d3-glass-heavy-border": "#d0d0d0",
    "--d3-border-subtle": "#ebebeb",
    "--d3-border-medium": "#d8d8d8",
    "--d3-text": "#0a0a0a",
    "--d3-text-secondary": "#404040",
    "--d3-text-tertiary": "#707070",
    "--d3-text-ghost": "#a0a0a0",
    "--d3-text-faint": "#c8c8c8",
    "--d3-overlay": "rgba(0,0,0,0.35)",
    "--d3-shadow-heavy": "rgba(0,0,0,0.1)",
  } as React.CSSProperties;

  return (
    <div style={{ display: "flex", height: "100%", gap: 0, position: "relative", ...editorialVars }}>

      {/* ═══ LEFT — Layers + Insert ═══ */}
      <div style={{ width: 248, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--d3-border-subtle)", background: "var(--d3-bg)" }}>
        {/* Page tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "6px 8px 0", borderBottom: "1px solid var(--d3-border-subtle)", background: "var(--d3-surface)", flexShrink: 0, overflowX: "auto" }}>
          {allPages.map((pg) => (
            <button key={pg.id} onClick={() => { setActivePage(pg.id); setSelectedSection(null); }}
              style={{ flexShrink: 0, padding: "4px 10px", borderRadius: "5px 5px 0 0", border: "none", cursor: "pointer", fontSize: "0.5625rem", fontWeight: activePage === pg.id ? 700 : 500, background: activePage === pg.id ? "var(--d3-bg)" : "transparent", color: activePage === pg.id ? "var(--d3-text)" : "var(--d3-text-ghost)", borderBottom: activePage === pg.id ? "2px solid var(--d3-text)" : "2px solid transparent", transition: "all 0.12s", display: "flex", alignItems: "center", gap: 4 }}>
              {pg.name}
              {pg.id !== "home" && (
                <span onClick={(e) => { e.stopPropagation(); removePage(pg.id); }} style={{ opacity: 0.4, fontSize: "0.5rem", lineHeight: 1, cursor: "pointer", padding: "1px 2px" }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "0.4")}>
                  ×
                </span>
              )}
            </button>
          ))}
          {/* Add page */}
          <button onClick={() => setShowPageManager(v => !v)} title="Seite hinzufügen"
            style={{ flexShrink: 0, padding: "4px 6px", border: "none", cursor: "pointer", fontSize: "0.625rem", background: "transparent", color: "var(--d3-text-ghost)", borderBottom: "2px solid transparent" }}>
            +
          </button>
        </div>
        {/* Page quick-add */}
        {showPageManager && (
          <div style={{ padding: "8px", borderBottom: "1px solid var(--d3-border-subtle)", background: "var(--d3-surface)", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: "0.5rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--d3-text-ghost)", marginBottom: 2 }}>Seite hinzufügen</div>
            {[["Startseite", "home"], ["Über uns", "about"], ["Preise", "pricing"], ["Kontakt", "contact"], ["Blog", "blog"], ["Team", "team"]]
              .filter(([, slug]) => slug === "home" || !allPages.some(p => p.slug === slug))
              .map(([name, slug]) => (
                <button key={slug} onClick={() => { if (slug === "home") { setActivePage("home"); } else { addPage(name, slug); } setShowPageManager(false); }}
                  style={{ padding: "5px 8px", borderRadius: 5, border: "1px solid var(--d3-glass-border)", background: "transparent", color: "var(--d3-text-secondary)", fontSize: "0.5625rem", cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--d3-surface-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  /{slug === "home" ? "" : slug} — {name}
                </button>
              ))}
          </div>
        )}
        {/* ── Sections header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: "1px solid var(--d3-border-subtle)", flexShrink: 0 }}>
          <span style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--d3-text-tertiary)" }}>Sektionen</span>
          <div style={{ display: "flex", gap: 2 }}>
            <button onClick={() => setShowAiChat((v) => !v)} title="KI Design-Assistent (⌘K)" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer", background: showAiChat ? "rgba(139,92,246,0.12)" : "transparent", color: showAiChat ? "#a78bfa" : "var(--d3-text-ghost)", transition: "all 0.15s" }}>
              <Wand2 size={12} />
            </button>
            <button onClick={() => setShowInsert((v) => !v)} title="Sektion hinzufügen" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer", background: showInsert ? "#0a0a0a" : "transparent", color: showInsert ? "#fff" : "var(--d3-text-ghost)", transition: "all 0.15s" }}>
              <Plus size={12} />
            </button>
          </div>
        </div>

        {/* ── Section Picker (always accessible, above layers) ── */}
        <AnimatePresence>
          {showInsert && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden", borderBottom: "1px solid var(--d3-border-subtle)", flexShrink: 0, maxHeight: 320 }}>
              <div style={{ padding: "8px 8px 4px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid var(--d3-border-subtle)" }}>
                <Search size={10} style={{ color: "var(--d3-text-ghost)", flexShrink: 0 }} />
                <input value={patternSearch} onChange={(e) => setPatternSearch(e.target.value)} placeholder="Suchen..."
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--d3-text)", fontSize: "0.6875rem", padding: "2px 0" }} />
                {patternSearch && <button onClick={() => setPatternSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--d3-text-ghost)", padding: 0, display: "flex" }}><X size={10} /></button>}
              </div>
              <div style={{ overflow: "auto", maxHeight: 280, padding: "4px 0" }}>
                {patternSearch.trim() ? (
                  filteredPatterns.map((pattern) => (
                    <div key={pattern.id} onClick={() => addSection(pattern.id)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", cursor: "pointer", transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--d3-surface)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <div style={{ width: 3, height: 14, borderRadius: 2, background: brief.colors.primary, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: "0.6875rem", color: "var(--d3-text-secondary)" }}>{pattern.label}</span>
                    </div>
                  ))
                ) : (
                  SECTION_CATEGORIES.map((cat) => {
                    const patterns = SECTION_PATTERNS.filter(p => p.category === cat.id);
                    if (patterns.length === 0) return null;
                    return (
                      <div key={cat.id}>
                        <div style={{ padding: "4px 12px 2px", fontSize: "0.4375rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--d3-text-ghost)" }}>
                          {cat.label}
                        </div>
                        {patterns.map((pattern) => (
                          <div key={pattern.id} onClick={() => addSection(pattern.id)}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", cursor: "pointer", transition: "background 0.1s" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--d3-surface)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <div style={{ width: 3, height: 12, borderRadius: 2, background: brief.colors.primary, opacity: 0.5, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: "0.625rem", color: "var(--d3-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {pattern.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Layers list ── */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {currentPageSections.length === 0 ? (
            /* Empty state — only show templates here, clearly */
            <div style={{ padding: "12px 10px" }}>
              <p style={{ fontSize: "0.5625rem", color: "var(--d3-text-tertiary)", margin: "0 0 10px", padding: "0 2px" }}>
                Starte mit einem Template oder füge einzelne Sektionen über <strong>+</strong> hinzu.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {QUICK_TEMPLATES.map((tpl) => {
                  const bg = tpl.colors?.background || "#0a0a0a";
                  const primary = tpl.colors?.primary || "#6366f1";
                  const surface = tpl.colors?.surface || "#141414";
                  return (
                    <button key={tpl.label} onClick={() => { applyTemplate(tpl); }}
                      style={{ borderRadius: 8, border: "1px solid var(--d3-glass-border)", cursor: "pointer", textAlign: "left", transition: "all 0.15s", overflow: "hidden", background: "var(--d3-surface)", padding: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = primary; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--d3-glass-border)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                      <div style={{ height: 48, background: bg, display: "flex", flexDirection: "column", gap: 2, padding: 5 }}>
                        <div style={{ height: 5, borderRadius: 2, background: surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
                          <div style={{ width: 10, height: 2, borderRadius: 1, background: primary, opacity: 0.8 }} />
                        </div>
                        <div style={{ flex: 1, borderRadius: 3, background: surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ width: "50%", height: 3, borderRadius: 1, background: primary, opacity: 0.9 }} />
                        </div>
                      </div>
                      <div style={{ padding: "5px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.6rem", fontWeight: 600, color: "var(--d3-text)" }}>{tpl.label}</span>
                        <span style={{ fontSize: "0.5rem", color: "var(--d3-text-ghost)" }}>{tpl.sections.length}s</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding: "4px 0" }}>
              {currentPageSections.map((section, idx) => {
                const isSelected = selectedSection === section.id;
                const isOver = dragOverIdx === idx;
                return (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                    onDragEnd={() => { if (dragIdx !== null && dragOverIdx !== null) handleDrop(dragIdx, dragOverIdx); setDragIdx(null); setDragOverIdx(null); }}
                    onClick={() => { setSelectedSection(isSelected ? null : section.id); setHighlightedSection(isSelected ? null : section.id); }}
                    onMouseEnter={() => setHighlightedSection(section.id)}
                    onMouseLeave={() => { if (!isSelected) setHighlightedSection(null); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", margin: "0 4px",
                      borderRadius: 6, cursor: "default", transition: "all 0.1s",
                      background: isSelected ? "var(--d3-surface-active)" : "transparent",
                      borderLeft: isSelected ? `3px solid ${brief.colors.primary}` : "3px solid transparent",
                      borderTop: isOver && dragIdx !== null && dragIdx > idx ? "2px solid rgba(99,102,241,0.5)" : "2px solid transparent",
                      borderBottom: isOver && dragIdx !== null && dragIdx < idx ? "2px solid rgba(99,102,241,0.5)" : "2px solid transparent",
                      opacity: dragIdx === idx ? 0.4 : 1,
                    }}
                  >
                    <GripVertical size={10} style={{ color: "var(--d3-text-ghost)", flexShrink: 0, cursor: "grab" }} />
                    <span style={{ flex: 1, fontSize: "0.6875rem", fontWeight: isSelected ? 600 : 400, color: isSelected ? "var(--d3-text)" : "var(--d3-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {section.label}
                    </span>
                    <span style={{ fontSize: "0.5rem", color: "var(--d3-text-ghost)", fontFamily: "monospace", flexShrink: 0 }}>{idx + 1}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ CENTER — Canvas + Toolbar ═══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {/* Toolbar */}
        <div style={{ height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", borderBottom: "1px solid var(--d3-border-subtle)", background: "var(--d3-bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
            <button onClick={() => undoRedo.undo()} disabled={!undoRedo.canUndo} title="Undo" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, border: "none", cursor: undoRedo.canUndo ? "pointer" : "default", background: "transparent", color: "var(--d3-text)", opacity: undoRedo.canUndo ? 0.6 : 0.15, transition: "opacity 0.15s" }}>
              <Undo2 size={13} />
            </button>
            <button onClick={() => undoRedo.redo()} disabled={!undoRedo.canRedo} title="Redo" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, border: "none", cursor: undoRedo.canRedo ? "pointer" : "default", background: "transparent", color: "var(--d3-text)", opacity: undoRedo.canRedo ? 0.6 : 0.15, transition: "opacity 0.15s" }}>
              <Redo2 size={13} />
            </button>
            <div style={{ width: 1, height: 16, background: "var(--d3-border-subtle)", margin: "0 6px" }} />
            <input value={brief.name} onChange={(e) => updateBrief((prev) => ({ ...prev, name: e.target.value }))} style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.75rem", fontWeight: 600, color: "var(--d3-text)", width: 160, letterSpacing: "-0.01em" }} />
          </div>
          <div style={{ display: "flex", gap: 1, padding: 2, borderRadius: 7, background: "var(--d3-surface)", border: "1px solid var(--d3-glass-border)" }}>
            {(["single", "canvas", "breakpoints"] as PreviewMode[]).map((m) => {
              const icons: Record<PreviewMode, React.ReactNode> = { single: <Monitor size={12} />, canvas: <LayoutGrid size={12} />, breakpoints: <Smartphone size={12} /> };
              const titles: Record<PreviewMode, string> = { single: "Desktop", canvas: "Canvas", breakpoints: "Breakpoints" };
              return (
                <button key={m} onClick={() => setPreviewMode(m)} title={titles[m]}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 5, border: "none", cursor: "pointer", background: previewMode === m ? "var(--d3-text)" : "transparent", color: previewMode === m ? "var(--d3-bg)" : "var(--d3-text-ghost)", transition: "all 0.12s" }}>
                  {icons[m]}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.6rem", color: "var(--d3-text-ghost)", fontFamily: "monospace" }}>{brief.sections.length}s</span>
            <button onClick={() => setShowAiChat((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--d3-glass-border)", cursor: "pointer", background: showAiChat ? "rgba(139,92,246,0.1)" : "var(--d3-surface)", color: showAiChat ? "#a78bfa" : "var(--d3-text-tertiary)", fontSize: "0.625rem", fontWeight: 500, transition: "all 0.15s" }}>
              <Wand2 size={11} /> AI <span style={{ fontSize: "0.5rem", opacity: 0.5 }}>⌘K</span>
            </button>
          </div>
        </div>
        {/* Canvas */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative", background: "#e8e8e8", backgroundImage: "radial-gradient(circle, #d0d0d0 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
          {previewMode === "breakpoints" ? (
            <div style={{ display: "flex", gap: 16, padding: 16, height: "100%", overflow: "auto", background: "transparent" }}>
              {([{ label: "Desktop", width: 1280 }, { label: "Tablet", width: 768 }, { label: "Mobile", width: 375 }]).map(({ label, width }) => {
                const containerWidth = label === "Desktop" ? 520 : label === "Tablet" ? 320 : 200;
                const scale = containerWidth / width;
                return (
                  <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, gap: 8 }}>
                    <div style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--d3-text-ghost)" }}>
                      {label} <span style={{ opacity: 0.5 }}>{width}px</span>
                    </div>
                    <div style={{ width: containerWidth, border: "1px solid var(--d3-glass-border)", borderRadius: 8, overflow: "hidden", background: brief.colors.background, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                      <div style={{ width, transformOrigin: "top left", transform: `scale(${scale})`, height: "fit-content", pointerEvents: "none" }}>
                        <WireframePreview brief={brief} highlightSectionId={null} onSectionClick={() => {}} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : previewMode === "single" ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px 0", overflow: "auto" }}>
              {/* Browser chrome */}
              <div style={{ width: "100%", maxWidth: 900, borderRadius: "10px 10px 0 0", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 1px 0 rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.1)", borderBottom: "none" }}>
                {/* Chrome header */}
                <div style={{ height: 36, background: "#f0f0f0", display: "flex", alignItems: "center", gap: 6, padding: "0 10px", borderBottom: "1px solid #e0e0e0", flexShrink: 0 }}>
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                      <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                    ))}
                  </div>
                  <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                    <div style={{ width: "60%", maxWidth: 320, height: 22, borderRadius: 6, background: "#ffffff", border: "1px solid #d8d8d8", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                      <span style={{ fontSize: "0.5625rem", color: "#707070", fontFamily: "system-ui" }}>
                        {brief.name.toLowerCase().replace(/\s/g, "-")}.vercel.app
                      </span>
                    </div>
                  </div>
                </div>
                {/* Website preview */}
                <div style={{ overflow: "hidden", background: brief.colors.background }}>
                  <WireframePreview
                    brief={activePage === "home" ? brief : { ...brief, sections: currentPageSections }}
                    highlightSectionId={highlightedSection}
                    selectedSectionId={selectedSection}
                    onSectionClick={(id) => { setHighlightedSection((prev) => prev === id ? null : id); setSelectedSection((prev) => prev === id ? null : id); }}
                    onReorder={(newSections) => {
                      const page = activePage;
                      updateBrief((prev) => setActiveSections(prev, page, newSections));
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <CanvasPreview brief={brief} highlightSectionId={highlightedSection} />
          )}
        </div>
      </div>

      {/* ═══ RIGHT — Design Inspector ═══ */}
      <div style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", borderLeft: "1px solid var(--d3-border-subtle)", background: "var(--d3-bg)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--d3-border-subtle)", flexShrink: 0 }}>
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--d3-text)" }}>Design</span>
          <button onClick={resetBrief} title="Reset" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer", background: "transparent", color: "var(--d3-text-ghost)", transition: "color 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--d3-text-ghost)"; }}>
            <RotateCcw size={12} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {/* Selected section inspector */}
          {selectedSectionData && (
            <div style={{ borderBottom: "1px solid var(--d3-border-subtle)" }}>
              <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--d3-text-tertiary)" }}>
                  {selectedSectionData.patternId.split("-")[0]}
                </span>
                <button
                  onClick={() => {
                    const idx = currentPageSections.findIndex(s => s.id === selectedSectionData.id);
                    removeSection(selectedSectionData.id);
                    // Auto-select adjacent section
                    const nextSection = currentPageSections[idx + 1] ?? currentPageSections[idx - 1];
                    setSelectedSection(nextSection?.id ?? null);
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--d3-text-ghost)", padding: 2, display: "flex" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--d3-text-ghost)"; }}>
                  <Trash2 size={11} />
                </button>
              </div>
              <div style={{ padding: "0 12px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--d3-text)", marginBottom: 2 }}>{selectedSectionData.label}</div>
                  {selectedSectionData.description && <div style={{ fontSize: "0.5625rem", color: "var(--d3-text-ghost)", lineHeight: 1.4 }}>{selectedSectionData.description}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "0.5625rem", color: "var(--d3-text-ghost)", flexShrink: 0 }}>Animation</span>
                  <select value={selectedSectionData.animation} onChange={(e) => updateSectionAnimation(selectedSectionData.id, e.target.value as AnimationPreset)} style={{ flex: 1, fontSize: "0.625rem", padding: "4px 6px", borderRadius: 5, background: "var(--d3-surface)", border: "1px solid var(--d3-glass-border)", color: "var(--d3-text)", outline: "none", cursor: "pointer" }}>
                    {ANIMATION_PRESETS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {(() => { const si = currentPageSections.findIndex(s => s.id === selectedSectionData.id); return (<>
                    <button onClick={() => moveSection(selectedSectionData.id, "up")} disabled={si === 0}
                      style={{ flex: 1, padding: "4px", borderRadius: 5, background: "var(--d3-surface)", border: "1px solid var(--d3-glass-border)", color: "var(--d3-text-tertiary)", fontSize: "0.5625rem", cursor: si === 0 ? "default" : "pointer", opacity: si === 0 ? 0.3 : 1 }}>
                      ↑
                    </button>
                    <button onClick={() => moveSection(selectedSectionData.id, "down")} disabled={si === currentPageSections.length - 1}
                      style={{ flex: 1, padding: "4px", borderRadius: 5, background: "var(--d3-surface)", border: "1px solid var(--d3-glass-border)", color: "var(--d3-text-tertiary)", fontSize: "0.5625rem", cursor: si === currentPageSections.length - 1 ? "default" : "pointer", opacity: si === currentPageSections.length - 1 ? 0.3 : 1 }}>
                      ↓
                    </button>
                  </>); })()}
                </div>

                {/* ── Content editing — all content-bearing sections ── */}
                {!["navigation", "footer", "data"].some(cat => selectedSectionData.patternId.startsWith(cat)) && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: "0.5rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--d3-text-ghost)", marginBottom: 6 }}>Inhalt</div>
                    {[
                      { key: "headline", label: "Headline", placeholder: "Großer Titel..." },
                      { key: "subheading", label: "Sub", placeholder: "Untertitel..." },
                      { key: "body", label: "Text", placeholder: "Beschreibung..." },
                      { key: "ctaText", label: "Button", placeholder: "Jetzt starten" },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: "0.5rem", color: "var(--d3-text-ghost)", width: 36, flexShrink: 0, paddingTop: 5 }}>{label}</span>
                        <textarea
                          value={selectedSectionData.content?.[key as keyof import("@/lib/design-brief").SectionContent] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const page = activePage;
                            updateBrief((prev) => {
                              const current = getActiveSections(prev, page);
                              return setActiveSections(prev, page, current.map((s) =>
                                s.id === selectedSectionData.id
                                  ? { ...s, content: { ...s.content, [key]: val } }
                                  : s
                              ));
                            });
                          }}
                          placeholder={placeholder}
                          rows={key === "body" ? 2 : 1}
                          style={{ flex: 1, padding: "4px 6px", borderRadius: 4, border: "1px solid var(--d3-glass-border)", background: "var(--d3-bg)", color: "var(--d3-text)", fontSize: "0.5625rem", outline: "none", resize: "vertical", fontFamily: "inherit" }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Colors — visual swatches grid */}
          <div style={{ borderBottom: "1px solid var(--d3-border-subtle)" }}>
            <button onClick={() => toggleCollapse("colors")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "none", border: "none", cursor: "pointer" }}>
              <span style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--d3-text-tertiary)" }}>Farben</span>
              <motion.div animate={{ rotate: collapsedSections.has("colors") ? -90 : 0 }} transition={{ duration: 0.15 }} style={{ color: "var(--d3-text-ghost)" }}><ChevronDown size={10} /></motion.div>
            </button>
            <AnimatePresence>
              {!collapsedSections.has("colors") && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} style={{ overflow: "hidden" }}>
                  <div style={{ padding: "0 12px 14px", display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                    {(Object.entries(brief.colors) as [keyof DesignBriefColors, string][]).map(([key, color]) => {
                      const labels: Record<string, string> = { primary: "P", secondary: "S", accent: "A", background: "BG", surface: "SF", text: "T", textMuted: "M" };
                      return (
                        <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <label style={{ position: "relative", width: "100%", aspectRatio: "1", borderRadius: 6, cursor: "pointer", display: "block", border: "2px solid var(--d3-glass-border)", background: color, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", transition: "transform 0.12s" }}
                            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
                            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                            <input type="color" value={color} onChange={(e) => { const val = e.target.value; updateBrief((prev) => ({ ...prev, colors: { ...prev.colors, [key]: val }, updatedAt: Date.now() })); }} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
                          </label>
                          <span style={{ fontSize: "0.4375rem", color: "var(--d3-text-ghost)", textAlign: "center", lineHeight: 1 }}>{labels[key]}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Color palette preview */}
                  <div style={{ margin: "0 12px 12px", height: 8, borderRadius: 4, overflow: "hidden", display: "flex" }}>
                    {[brief.colors.background, brief.colors.surface, brief.colors.primary, brief.colors.secondary, brief.colors.accent].map((c, i) => (
                      <div key={i} style={{ flex: 1, background: c }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Typography — with live preview */}
          <div style={{ borderBottom: "1px solid var(--d3-border-subtle)" }}>
            <button onClick={() => toggleCollapse("typo")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "none", border: "none", cursor: "pointer" }}>
              <span style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--d3-text-tertiary)" }}>Schrift</span>
              <motion.div animate={{ rotate: collapsedSections.has("typo") ? -90 : 0 }} transition={{ duration: 0.15 }} style={{ color: "var(--d3-text-ghost)" }}><ChevronDown size={10} /></motion.div>
            </button>
            <AnimatePresence>
              {!collapsedSections.has("typo") && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} style={{ overflow: "hidden" }}>
                  <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Font preview */}
                    <div style={{ padding: "10px", borderRadius: 8, border: "1px solid var(--d3-glass-border)", background: "var(--d3-bg)" }}>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--d3-text)", lineHeight: 1, marginBottom: 4 }}>Aa</div>
                      <div style={{ fontSize: "0.5625rem", color: "var(--d3-text-ghost)" }}>{brief.typography.headingFont}</div>
                    </div>
                    {[
                      { label: "Heading", value: brief.typography.headingFont, onChange: (v: string) => updateBrief((p: DesignBrief) => ({ ...p, typography: { ...p.typography, headingFont: v } })) },
                      { label: "Body", value: brief.typography.bodyFont, onChange: (v: string) => updateBrief((p: DesignBrief) => ({ ...p, typography: { ...p.typography, bodyFont: v } })) },
                    ].map((f) => (
                      <div key={f.label}>
                        <div style={{ fontSize: "0.5rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--d3-text-ghost)", marginBottom: 4 }}>{f.label}</div>
                        <input value={f.value} onChange={(e) => f.onChange(e.target.value)} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, background: "var(--d3-surface)", border: "1px solid var(--d3-glass-border)", color: "var(--d3-text)", fontSize: "0.6875rem", outline: "none", fontWeight: 500 }} />
                      </div>
                    ))}
                    {/* Font quick picks */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {["Inter", "Plus Jakarta Sans", "Geist", "Space Grotesk", "Outfit"].map((font) => (
                        <button key={font} onClick={() => updateBrief((p) => ({ ...p, typography: { ...p.typography, headingFont: font, bodyFont: font } }))}
                          style={{ padding: "3px 8px", borderRadius: 99, fontSize: "0.5625rem", border: "1px solid var(--d3-glass-border)", cursor: "pointer", background: brief.typography.headingFont === font ? "var(--d3-text)" : "transparent", color: brief.typography.headingFont === font ? "var(--d3-bg)" : "var(--d3-text-ghost)", transition: "all 0.12s" }}>
                          {font}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Spacing */}
          <div style={{ borderBottom: "1px solid var(--d3-border-subtle)" }}>
            <button onClick={() => toggleCollapse("spacing")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", color: "var(--d3-text-secondary)" }}>
              <span style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Spacing</span>
              <motion.div animate={{ rotate: collapsedSections.has("spacing") ? -90 : 0 }} transition={{ duration: 0.15 }}><ChevronDown size={11} /></motion.div>
            </button>
            <AnimatePresence>
              {!collapsedSections.has("spacing") && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} style={{ overflow: "hidden" }}>
                  <div style={{ padding: "0 12px 10px", display: "flex", gap: 3 }}>
                    {(["compact", "balanced", "relaxed"] as const).map((s) => (
                      <button key={s} onClick={() => updateBrief((p) => ({ ...p, spacing: { ...p.spacing, system: s } }))} style={{ flex: 1, padding: "5px 2px", borderRadius: 5, background: brief.spacing.system === s ? "var(--d3-text)" : "var(--d3-surface)", border: brief.spacing.system === s ? "none" : "1px solid var(--d3-glass-border)", color: brief.spacing.system === s ? "var(--d3-bg)" : "var(--d3-text-tertiary)", fontSize: "0.5625rem", fontWeight: brief.spacing.system === s ? 600 : 400, cursor: "pointer", transition: "all 0.12s" }}>
                        {s === "compact" ? "Compact" : s === "balanced" ? "Balance" : "Relaxed"}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Style */}
          <div style={{ borderBottom: "1px solid var(--d3-border-subtle)" }}>
            <button onClick={() => toggleCollapse("style")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", color: "var(--d3-text-secondary)" }}>
              <span style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Style</span>
              <motion.div animate={{ rotate: collapsedSections.has("style") ? -90 : 0 }} transition={{ duration: 0.15 }}><ChevronDown size={11} /></motion.div>
            </button>
            <AnimatePresence>
              {!collapsedSections.has("style") && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} style={{ overflow: "hidden" }}>
                  <div style={{ padding: "0 12px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.5625rem", color: "var(--d3-text-ghost)", width: 36, flexShrink: 0 }}>Mood</span>
                      <input value={brief.style.mood} onChange={(e) => updateBrief((p) => ({ ...p, style: { ...p.style, mood: e.target.value } }))} placeholder="minimal-glass" style={{ flex: 1, padding: "4px 8px", borderRadius: 5, background: "var(--d3-surface)", border: "1px solid var(--d3-glass-border)", color: "var(--d3-text)", fontSize: "0.6875rem", outline: "none" }} />
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {(["sharp", "soft", "rounded", "pill"] as const).map((r) => (
                        <button key={r} onClick={() => updateBrief((p) => ({ ...p, style: { ...p.style, borderRadius: r } }))} style={{ flex: 1, padding: "4px 2px", borderRadius: r === "sharp" ? 2 : r === "soft" ? 5 : r === "rounded" ? 8 : 12, background: brief.style.borderRadius === r ? "var(--d3-text)" : "var(--d3-surface)", border: brief.style.borderRadius === r ? "none" : "1px solid var(--d3-glass-border)", color: brief.style.borderRadius === r ? "var(--d3-bg)" : "var(--d3-text-tertiary)", fontSize: "0.5rem", fontWeight: brief.style.borderRadius === r ? 600 : 400, cursor: "pointer", transition: "all 0.12s" }}>
                          {r}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.5625rem", color: "var(--d3-text-ghost)" }}>Dark Mode</span>
                      <button
                        onClick={() => updateBrief((p) => {
                          const nd = !p.style.darkMode;
                          const d = nd ? DEFAULT_COLORS_DARK : DEFAULT_COLORS_LIGHT;
                          return { ...p, style: { ...p.style, darkMode: nd }, colors: { ...p.colors, background: d.background, surface: d.surface, text: d.text, textMuted: d.textMuted }, updatedAt: Date.now() };
                        })}
                        style={{ width: 32, height: 18, borderRadius: 9, background: brief.style.darkMode ? "rgba(34,197,94,0.4)" : "var(--d3-surface)", border: brief.style.darkMode ? "none" : "1px solid var(--d3-glass-border)", cursor: "pointer", position: "relative", transition: "background 0.2s" }}
                      >
                        <div style={{ width: 14, height: 14, borderRadius: "50%", background: brief.style.darkMode ? "#22c55e" : "var(--d3-text-ghost)", position: "absolute", top: 2, left: brief.style.darkMode ? 16 : 2, transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)" }} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Deploy Section */}
        <div style={{ padding: "12px", borderTop: "1px solid var(--d3-border-subtle)", flexShrink: 0 }}>
          {deployState === "done" && deployUrl ? (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 8, background: "#dcfce7", border: "1px solid #bbf7d0" }}>
                <Check size={12} style={{ color: "#16a34a", flexShrink: 0 }} />
                <span style={{ fontSize: "0.625rem", fontWeight: 600, color: "#15803d" }}>Live deployed!</span>
              </div>
              <a href={deployUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 8, background: "var(--d3-surface)", border: "1px solid var(--d3-glass-border)", fontSize: "0.5625rem", color: "var(--d3-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <ExternalLink size={10} style={{ flexShrink: 0 }} />
                {deployUrl.replace("https://", "")}
              </a>
              <button onClick={() => { setDeployState("idle"); setDeployUrl(null); }} style={{ fontSize: "0.5625rem", color: "var(--d3-text-ghost)", background: "none", border: "none", cursor: "pointer", textAlign: "center" }}>
                Erneut deployen
              </button>
            </motion.div>
          ) : (
            <>
              <button
                onClick={handleDeploy}
                disabled={!hasSections || deployState === "deploying"}
                style={{ width: "100%", padding: "11px 0", borderRadius: 8, border: "none", cursor: hasSections && deployState !== "deploying" ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.8125rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "all 0.2s", background: hasSections ? "#0a0a0a" : "var(--d3-surface)", color: hasSections ? "#ffffff" : "var(--d3-text-ghost)", letterSpacing: "-0.01em", opacity: !hasSections ? 0.4 : 1 }}
                onMouseEnter={e => { if (hasSections && deployState !== "deploying") e.currentTarget.style.background = "#1a1a1a"; }}
                onMouseLeave={e => { e.currentTarget.style.background = hasSections ? "#0a0a0a" : "var(--d3-surface)"; }}>
                {deployState === "deploying" ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <Rocket size={13} />
                    </motion.div>
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket size={13} />
                    Deployen
                  </>
                )}
              </button>
              {deployState === "error" && deployError && (
                <p style={{ fontSize: "0.5rem", color: "#ef4444", marginTop: 6, textAlign: "center", lineHeight: 1.4 }}>
                  {deployError}
                </p>
              )}
              {projectId && deployState === "idle" && (
                <div style={{ fontSize: "0.4375rem", color: "var(--d3-text-ghost)", textAlign: "center", marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#22c55e" }} />
                  Code synchronisiert
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══ FLOATING AI CHAT (⌘K) ═══ */}
      <AnimatePresence>
        {showAiChat && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 50, width: 480, maxHeight: 420, background: "var(--d3-bg)", border: "1px solid var(--d3-border-subtle)", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.03)", display: "flex", flexDirection: "column", overflow: "hidden", backdropFilter: "blur(20px)" }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--d3-border-subtle)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Wand2 size={12} style={{ color: "#a78bfa" }} />
                <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--d3-text)" }}>AI Design</span>
                {chatIsStreaming && <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa" }} />}
              </div>
              <button onClick={() => setShowAiChat(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 4, border: "none", cursor: "pointer", background: "transparent", color: "var(--d3-text-ghost)" }}>
                <X size={12} />
              </button>
            </div>

            {/* Remix */}
            <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--d3-border-subtle)", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, background: "var(--d3-surface)", border: "1px solid var(--d3-glass-border)" }}>
                  <Link2 size={11} style={{ color: "var(--d3-text-ghost)", flexShrink: 0 }} />
                  <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleRemix(); }} placeholder="Paste URL to remix..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--d3-text)", fontSize: "0.6875rem" }} />
                </div>
                <button onClick={handleRemix} disabled={!urlInput.trim() || isRemixing} style={{ padding: "4px 10px", borderRadius: 6, background: urlInput.trim() && !isRemixing ? "var(--d3-text)" : "var(--d3-surface)", color: urlInput.trim() && !isRemixing ? "var(--d3-bg)" : "var(--d3-text-ghost)", border: "none", fontSize: "0.625rem", fontWeight: 600, cursor: urlInput.trim() && !isRemixing ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 3, transition: "all 0.12s" }}>
                  <Sparkles size={10} /> Remix
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, minHeight: 60 }}>
              {chatMessages.length === 0 && !chatIsStreaming && (
                <div style={{ display: "flex", flexDirection: "column", gap: 3, padding: "4px 0" }}>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/files?path_prefix=.d3/");
                        if (!res.ok) throw new Error();
                        const data = await res.json();
                        const files = data.files as { path: string; content: string }[] | undefined;
                        const planFiles = files?.filter((f: { path: string }) => f.path.startsWith(".d3/")) ?? [];
                        if (planFiles.length === 0) { setInputText("Generiere ein komplettes Design-System"); return; }
                        const ctx = planFiles.map((f: { path: string; content: string }) => `--- ${f.path} ---\n${f.content}`).join("\n\n");
                        const prompt = `Erstelle ein komplettes Design-System basierend auf meinem Plan:\n\n${ctx}\n\nGeneriere passende Farben, Fonts, Stil und Sektionen.`;
                        setInputText(prompt);
                        setTimeout(() => sendMessage(prompt), 100);
                      } catch { setInputText("Generiere ein komplettes Design-System"); }
                    }}
                    style={{ padding: "6px 10px", borderRadius: 6, background: "var(--d3-surface)", border: "1px solid var(--d3-border-medium)", color: "var(--d3-text)", fontSize: "0.625rem", fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 5, transition: "all 0.1s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--d3-surface-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--d3-surface)"; }}
                  >
                    <Layout size={10} style={{ opacity: 0.5 }} /> Aus Plan generieren
                  </button>
                  {["Wie Stripe aber dunkler", "Minimalistisch mit Glassmorphism", "Corporate & professionell", "Bunt & verspielt"].map((s) => (
                    <button key={s} onClick={() => { setInputText(s); setTimeout(() => sendMessage(s), 50); }} style={{ padding: "5px 10px", borderRadius: 6, background: "transparent", border: "1px solid var(--d3-glass-border)", color: "var(--d3-text-tertiary)", fontSize: "0.625rem", cursor: "pointer", textAlign: "left", transition: "all 0.1s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--d3-border-medium)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--d3-glass-border)"; }}>
                      <Sparkles size={9} style={{ display: "inline", marginRight: 4, verticalAlign: "middle", opacity: 0.4 }} />{s}
                    </button>
                  ))}
                </div>
              )}
              {chatMessages.map((msg) => (
                <div key={msg.id} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", padding: "6px 10px", borderRadius: 8, background: msg.role === "user" ? "var(--d3-text)" : "var(--d3-surface)", color: msg.role === "user" ? "var(--d3-bg)" : "var(--d3-text-secondary)", fontSize: "0.6875rem", lineHeight: 1.45, border: msg.role === "user" ? "none" : "1px solid var(--d3-glass-border)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {msg.content.replace(/```json[\s\S]*?```/g, "[Brief updated]")}
                </div>
              ))}
              {chatIsStreaming && chatStreamingText && (
                <div style={{ alignSelf: "flex-start", maxWidth: "85%", padding: "6px 10px", borderRadius: 8, background: "var(--d3-surface)", color: "var(--d3-text-secondary)", fontSize: "0.6875rem", lineHeight: 1.45, border: "1px solid var(--d3-glass-border)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {chatStreamingText.replace(/```json[\s\S]*?```/g, "[Updating...]")}
                </div>
              )}
              {chatIsStreaming && !chatStreamingText && (
                <div style={{ alignSelf: "flex-start", padding: "6px 10px" }}>
                  <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ display: "flex", gap: 3 }}>
                    {[0, 1, 2].map((i) => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--d3-text-tertiary)" }} />)}
                  </motion.div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "8px 12px", borderTop: "1px solid var(--d3-border-subtle)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: "var(--d3-surface)", border: "1px solid var(--d3-glass-border)" }}>
                <input value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Describe your design..." disabled={chatIsStreaming} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--d3-text)", fontSize: "0.6875rem" }} />
                <button onClick={() => sendMessage(inputText)} disabled={!inputText.trim() || chatIsStreaming} style={{ background: "none", border: "none", cursor: inputText.trim() && !chatIsStreaming ? "pointer" : "not-allowed", color: inputText.trim() ? "var(--d3-text)" : "var(--d3-text-ghost)", padding: 2, display: "flex" }}>
                  <Send size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
