"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useUndoRedo } from "@/lib/hooks/use-history";
import { authFetch } from "@/lib/auth-fetch";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Palette,
  GitBranch,
  ListTodo,
  Image,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Folder,
  Edit3,
  Save,
  X,
  FileText,
  Send,
  Loader2,
  Sparkles,
  User,
  RefreshCw,
  MessageSquarePlus,
  ClipboardList,
  MessageCircle,
  Upload,
  ImagePlus,
  Trash2,
  ArrowRight,
  LayoutGrid,
  Type,
  Cpu,
  Route,
  Download,
  Copy,
  CheckCircle,
  Undo2,
  Redo2,
  Wand2,
} from "lucide-react";
import {
  type ChatMessage,
  type ChatThread,
  type ChatLanguage,
  type UserLevelId,
  createThread,
  genMessageId,
  CHAT_LANGUAGES,
  USER_LEVELS,
  parseVibeCodeResponse,
  type VibeCodeFile,
  type ImageAttachment,
} from "@/lib/vibe-code";
import { vibeTheme } from "./VibeCodingMode";
import { ChatContent } from "./ChatCodeBlock";
import { PlanFontSelector } from "./PlanFontSelector";
import { PlanSpacingSelector } from "./PlanSpacingSelector";
import { addRawHistoryEntry, enrichHistoryEntry } from "@/lib/history";

// ── Types ──

interface VibeProject {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

interface D3File {
  path: string;
  content: string;
}

interface CardConfig {
  path: string;
  title: string;
  icon: React.ElementType;
  color: string;
  description: string;
  placeholder: string;
}

const CARD_CONFIGS: CardConfig[] = [
  {
    path: ".d3/PROJECT.md",
    title: "Projekt",
    icon: BookOpen,
    color: "#3B82F6",
    description: "Was wird gebaut, fuer wen, welche Seiten",
    placeholder: `# Mein Projekt\n\n## Zielgruppe\n- \n\n## Seiten\n- Startseite\n- \n\n## Kernfunktionen\n- `,
  },
  {
    path: ".d3/STYLE.md",
    title: "Design",
    icon: Palette,
    color: "#EC4899",
    description: "Farben, Schriften, Spacing, Stimmung",
    placeholder: `# Design System\n\n## Farben\n- **Primary**: #3B82F6\n- **Secondary**: #10B981\n\n## Schriften\n- Heading: Inter\n- Body: Inter`,
  },
  {
    path: ".d3/DECISIONS.md",
    title: "Entscheidungen",
    icon: GitBranch,
    color: "#F97316",
    description: "Was wurde geaendert und warum",
    placeholder: `# Entscheidungen\n\n## Framework\n- **Next.js 14** mit App Router`,
  },
  {
    path: ".d3/TODOS.md",
    title: "Aufgaben",
    icon: ListTodo,
    color: "#22C55E",
    description: "Offene Tasks, Ideen, bekannte Probleme",
    placeholder: `# Aufgaben\n\n## Offen\n- [ ] Impressum-Seite erstellen\n- [ ] Responsive testen\n\n## Erledigt`,
  },
  {
    path: ".d3/REFERENCES.md",
    title: "Referenzen",
    icon: Image,
    color: "#A855F7",
    description: "Inspirations-Links, Wettbewerber, Notizen",
    placeholder: `# Referenzen\n\n## Inspiration\n- \n\n## Wettbewerber\n- `,
  },
  {
    path: ".d3/PAGES.md",
    title: "Seiten & Routen",
    icon: LayoutGrid,
    color: "#06B6D4",
    description: "Welche Seiten, Sektionen pro Seite, Navigation",
    placeholder: `# Seiten & Routen\n\n## Startseite (/)\n- Hero: Headline + CTA\n- Features: 3-Spalten Grid\n- Testimonials\n- CTA-Banner\n- Footer\n\n## Ueber uns (/about)\n- Team-Fotos\n- Company Story\n\n## Kontakt (/contact)\n- Kontaktformular\n- Karte\n\n## Navigation\n- Hauptmenue: Home, About, Contact\n- Footer-Links: Impressum, Datenschutz`,
  },
  {
    path: ".d3/CONTENT.md",
    title: "Content & Copy",
    icon: Type,
    color: "#F43F5E",
    description: "Headlines, CTAs, Texte, Tonalitaet",
    placeholder: `# Content & Copy\n\n## Tonalitaet\n- Professionell aber warm\n- Du-Ansprache\n- Kurze Saetze\n\n## Hero\n- **Headline**: "Wir gestalten digitale Erlebnisse"\n- **Subline**: "Design Studio fuer moderne Marken"\n- **CTA**: "Projekt starten"\n\n## Meta\n- **Title**: "Studio Name | Design & Development"\n- **Description**: "Wir bauen Websites die konvertieren."`,
  },
  {
    path: ".d3/TECHSTACK.md",
    title: "Tech Stack",
    icon: Cpu,
    color: "#8B5CF6",
    description: "Framework, Libraries, Hosting, Datenbank",
    placeholder: `# Tech Stack\n\n## Frontend\n- **Framework**: Next.js 14 (App Router)\n- **Styling**: Tailwind CSS\n- **Icons**: Lucide React\n- **Animationen**: Framer Motion\n\n## Backend\n- **Auth**: Supabase Auth\n- **Datenbank**: Supabase (PostgreSQL)\n- **API**: Next.js API Routes\n\n## Hosting\n- **Platform**: Vercel\n- **Domain**: example.com\n\n## Sonstiges\n- **Analytics**: Vercel Analytics\n- **Forms**: Web3Forms / Formspree`,
  },
  {
    path: ".d3/FLOWS.md",
    title: "User Flows",
    icon: Route,
    color: "#14B8A6",
    description: "Nutzer-Pfade, Conversion, Interaktionen",
    placeholder: `# User Flows\n\n## Hauptpfad (Conversion)\n1. Landingpage besuchen\n2. Hero lesen → CTA klicken\n3. Kontaktformular ausfuellen\n4. Bestaetigung erhalten\n\n## Navigation\n- Sticky Navbar → jede Seite erreichbar\n- Mobile: Hamburger-Menu\n- Footer: Impressum + Datenschutz\n\n## Interaktionen\n- Scroll-Animationen auf Sektionen\n- Hover-Effekte auf Karten\n- Formular-Validierung live`,
  },
];

// ── Helpers ──

const ACTIVE_PROJECT_KEY = "d3studio.vibe.active-project";
const PLAN_THREADS_KEY = "d3studio.plan.threads";

function loadActiveProjectId(): string | null {
  try { return localStorage.getItem(ACTIVE_PROJECT_KEY); } catch { return null; }
}
function saveActiveProjectId(id: string | null): void {
  try { if (id) localStorage.setItem(ACTIVE_PROJECT_KEY, id); else localStorage.removeItem(ACTIVE_PROJECT_KEY); } catch { /* */ }
}
function loadPlanThreads(): ChatThread[] | null {
  try {
    const raw = localStorage.getItem(PLAN_THREADS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function savePlanThreads(threads: ChatThread[]): void {
  try { localStorage.setItem(PLAN_THREADS_KEY, JSON.stringify(threads)); } catch { /* */ }
}

function parseColorSwatches(content: string): string[] {
  const matches = content.match(/#[0-9A-Fa-f]{6}/g);
  return matches ? [...new Set(matches)].slice(0, 8) : [];
}

function parseTodos(content: string): { text: string; done: boolean; line: number }[] {
  const lines = content.split("\n");
  const todos: { text: string; done: boolean; line: number }[] = [];
  lines.forEach((line, i) => {
    const openMatch = line.match(/^- \[ \] (.+)/);
    const doneMatch = line.match(/^- \[x\] (.+)/i);
    if (openMatch) todos.push({ text: openMatch[1], done: false, line: i });
    else if (doneMatch) todos.push({ text: doneMatch[1], done: true, line: i });
  });
  return todos;
}

function toggleTodoInContent(content: string, lineIndex: number): string {
  const lines = content.split("\n");
  if (lineIndex >= lines.length) return content;
  const line = lines[lineIndex];
  if (line.match(/^- \[ \]/)) lines[lineIndex] = line.replace("- [ ]", "- [x]");
  else if (line.match(/^- \[x\]/i)) lines[lineIndex] = line.replace(/- \[x\]/i, "- [ ]");
  return lines.join("\n");
}

function addTodoToContent(content: string, text: string): string {
  const trimmed = content.trim();
  if (!trimmed) return `# Aufgaben\n\n- [ ] ${text}\n`;
  const lines = trimmed.split("\n");
  let lastTodoIdx = -1;
  lines.forEach((line, i) => { if (line.match(/^- \[[ x]\]/i)) lastTodoIdx = i; });
  if (lastTodoIdx >= 0) lines.splice(lastTodoIdx + 1, 0, `- [ ] ${text}`);
  else lines.push(`- [ ] ${text}`);
  return lines.join("\n") + "\n";
}

function getReadableTextColor(backgroundColor?: string): "#000000" | "#ffffff" {
  if (!backgroundColor || !backgroundColor.startsWith("#") || backgroundColor.length < 7) {
    return "#000000";
  }

  const hex = backgroundColor.slice(1, 7);
  const r = parseInt(hex.slice(0, 2), 16) || 0;
  const g = parseInt(hex.slice(2, 4), 16) || 0;
  const b = parseInt(hex.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
}

function toReadableAlpha(base: "#000000" | "#ffffff", alpha: number): string {
  return base === "#000000" ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
}

// ── Props ──

interface Props {
  theme: "light" | "dark";
  aiModel?: string;
  canvasBackground?: string;
  brief?: import("@/lib/design-brief").DesignBrief;
  onBriefChange?: (updater: (prev: import("@/lib/design-brief").DesignBrief) => import("@/lib/design-brief").DesignBrief) => void;
  userId?: string | null;
  /** Central project ID — single source of truth, bypasses internal project picker */
  projectId?: string | null;
  /** Central project name — shown instead of internal project name */
  projectName?: string;
  onSwitchToDesign?: () => void;
  /** Shared AI state — Plan chat feeds into the unified GlassChat AI */
  sharedMessages?: ChatMessage[];
  sharedIsStreaming?: boolean;
  sharedStreamingText?: string;
  onSharedMessagesChange?: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

// ── Component ──

export default function PlanMode({ theme, aiModel = "claude-sonnet-4-20250514", canvasBackground, userId, brief, onBriefChange, onSwitchToDesign, projectId: centralProjectId, projectName, sharedMessages, sharedIsStreaming, sharedStreamingText, onSharedMessagesChange }: Props) {
  const isDark = theme === "dark";
  const t = vibeTheme(theme);

  const bg = "var(--d3-bg)";
  // Use CSS variables instead of computed hex colors
  const canvasTextMain = "var(--d3-text)";
  const canvasTextMuted = "var(--d3-text-secondary)";
  const canvasTextFaint = "var(--d3-text-tertiary)";
  const cardBg = "var(--d3-surface)";
  const cardBorder = "var(--d3-glass-border)";
  const textMain = "var(--d3-text)";
  const textMuted = "var(--d3-text-secondary)";
  const textFaint = "var(--d3-text-tertiary)";
  const inputBg = "var(--d3-surface)";
  const inputBorder = "var(--d3-glass-border)";
  const border = "var(--d3-glass-border)";

  // ── Project state ──
  const [projects, setProjects] = useState<VibeProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [d3Files, setD3Files] = useState<D3File[]>([]);
  const [allFiles, setAllFiles] = useState<VibeCodeFile[]>([]);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [newTodoText, setNewTodoText] = useState("");
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [referenceImages, setReferenceImages] = useState<ImageAttachment[]>([]);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillDismissed, setAutoFillDismissed] = useState(false);
  const [autoFillStream, setAutoFillStream] = useState("");
  const [autoFillFilledCards, setAutoFillFilledCards] = useState<string[]>([]);
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const renameTitleRef = useRef<HTMLInputElement>(null);
  const d3FilesRef = useRef(d3Files);
  d3FilesRef.current = d3Files;

  // ── Undo / Redo (unbegrenzt, Supabase-persistiert) ──
  const undoRedo = useUndoRedo<D3File[]>({
    onApply: (snapshot) => {
      setD3Files(snapshot);
      // Persist restored files to server
      if (activeProjectId) {
        for (const f of snapshot) {
          authFetch("/api/files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_id: activeProjectId, files: [{ path: f.path, content: f.content }] }),
          }).catch(() => {});
        }
      }
    },
    persist: userId && activeProjectId ? { userId, projectId: activeProjectId, mode: "plan" } : null,
  });

  // ── Chat state ──
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    const saved = loadPlanThreads();
    return saved && saved.length > 0 ? saved : [createThread(aiModel)];
  });
  const [activeThreadId, setActiveThreadId] = useState<string>(() => threads[0]?.id ?? "");
  const activeThread = threads.find((th) => th.id === activeThreadId) ?? threads[0];
  const [localIsStreaming, setLocalIsStreaming] = useState(false);
  const [localStreamingText, setLocalStreamingText] = useState("");
  // Use shared AI state when provided, fall back to internal thread state
  const messages = sharedMessages ?? activeThread?.messages ?? [];
  const inputText = activeThread?.inputText ?? "";
  const isStreaming = sharedIsStreaming ?? localIsStreaming;
  const streamingText = sharedStreamingText ?? localStreamingText;

  const [chatLang, setChatLang] = useState<ChatLanguage>("de");
  const [langOpen, setLangOpen] = useState(false);
  const [userLevel, setUserLevel] = useState<UserLevelId>("beginner");
  const [levelOpen, setLevelOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Thread helpers
  const updateThread = useCallback((threadId: string, updater: (t: ChatThread) => ChatThread) => {
    setThreads((prev) => prev.map((th) => (th.id === threadId ? updater(th) : th)));
  }, []);
  const setMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    updateThread(activeThreadId, (th) => ({ ...th, messages: typeof updater === "function" ? updater(th.messages) : updater }));
    // Sync to shared parent state so GlassChat sees Plan mode messages
    if (onSharedMessagesChange) onSharedMessagesChange(updater as React.SetStateAction<ChatMessage[]>);
  }, [activeThreadId, updateThread, onSharedMessagesChange]);
  const setInputText = useCallback((val: string) => {
    updateThread(activeThreadId, (th) => ({ ...th, inputText: val }));
  }, [activeThreadId, updateThread]);
  const setIsStreaming = useCallback((val: boolean) => {
    setLocalIsStreaming(val);
    updateThread(activeThreadId, (th) => ({ ...th, isStreaming: val }));
  }, [activeThreadId, updateThread]);
  const setStreamingText = useCallback((val: string) => {
    setLocalStreamingText(val);
    updateThread(activeThreadId, (th) => ({ ...th, streamingText: val }));
  }, [activeThreadId, updateThread]);

  // Save threads to localStorage
  useEffect(() => { savePlanThreads(threads); }, [threads]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  // ── Sync central projectId → activeProjectId ──
  // When central projectId is provided, it is the single source of truth.
  useEffect(() => {
    if (!centralProjectId) return;
    setActiveProjectId(centralProjectId);
    setLoading(false);
  }, [centralProjectId]);

  // ── Load projects (only when NOT managed centrally) ──
  useEffect(() => {
    if (centralProjectId) return; // central project handles this
    (async () => {
      try {
        const res = await authFetch("/api/vibe-projects");
        if (!res.ok) return;
        const data = await res.json();
        const projs: VibeProject[] = data.projects ?? [];
        setProjects(projs);
        const savedId = loadActiveProjectId();
        const target = projs.find((p) => p.id === savedId) ?? projs[0];
        if (target) { setActiveProjectId(target.id); saveActiveProjectId(target.id); }
      } catch (err) { console.error("Failed to load projects:", err); }
      finally { setLoading(false); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load files when project changes ──
  useEffect(() => {
    if (!activeProjectId) { setD3Files([]); setAllFiles([]); return; }
    (async () => {
      try {
        const res = await authFetch(`/api/files?project_id=${activeProjectId}`);
        if (!res.ok) return;
        const data = await res.json();
        const files = (data.files ?? []) as { file_name: string; content: string }[];
        setD3Files(files.filter((f) => f.file_name.startsWith(".d3/")).map((f) => ({ path: f.file_name, content: f.content ?? "" })));
        setAllFiles(files.map((f) => ({ path: f.file_name, content: f.content ?? "", language: "plaintext" })));
      } catch (err) { console.error("Failed to load files:", err); }
    })();
  }, [activeProjectId]);

  // ── Close dropdowns on outside click ──
  useEffect(() => {
    if (!showProjectPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowProjectPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProjectPicker]);

  // ── File helpers ──
  const getFileContent = useCallback((path: string) => d3Files.find((f) => f.path === path)?.content ?? "", [d3Files]);

  // Sync STYLE.md changes → DesignBrief (fonts, colors, spacing)
  const syncStyleToBrief = useCallback((styleContent: string) => {
    if (!onBriefChange) return;
    const sections = parseStyleSections(styleContent);
    const fontSec = sections.find((s) => /schrift|font|typo/i.test(s.title));
    const colorSec = sections.find((s) => /farb|color|palette/i.test(s.title));

    onBriefChange((prev) => {
      const next = { ...prev, typography: { ...prev.typography }, colors: { ...prev.colors } };

      // Sync fonts
      if (fontSec) {
        for (const item of fontSec.items) {
          const font = extractFontName(item.value || item.key);
          if (!font) continue;
          const label = item.key.toLowerCase();
          if (/heading|überschrift|titel/i.test(label)) next.typography.headingFont = font;
          else if (/body|fließ|text|absatz/i.test(label)) next.typography.bodyFont = font;
          else if (/mono|code/i.test(label)) next.typography.monoFont = font;
          // First font item defaults to heading, second to body
          else if (fontSec.items.indexOf(item) === 0 && !next.typography.headingFont) next.typography.headingFont = font;
          else if (fontSec.items.indexOf(item) === 1 && !next.typography.bodyFont) next.typography.bodyFont = font;
        }
      }

      // Sync colors
      if (colorSec) {
        for (const item of colorSec.items) {
          if (!item.hex) continue;
          const label = item.key.toLowerCase();
          if (/primary|primär|haupt/i.test(label)) next.colors.primary = item.hex;
          else if (/secondary|sekundär|zweit/i.test(label)) next.colors.secondary = item.hex;
          else if (/accent|akzent/i.test(label)) next.colors.accent = item.hex;
          else if (/background|hintergrund|bg/i.test(label)) next.colors.background = item.hex;
          else if (/surface|fläche|card/i.test(label)) next.colors.surface = item.hex;
          else if (/text(?!.*muted)/i.test(label)) next.colors.text = item.hex;
          else if (/muted|gedämpft/i.test(label)) next.colors.textMuted = item.hex;
        }
      }

      return next;
    });
  }, [onBriefChange]);

  const saveFile = useCallback((path: string, content: string) => {
    if (!activeProjectId) return;
    // Record undo snapshot before mutation
    const before = [...d3FilesRef.current];
    setD3Files((prev) => {
      const exists = prev.find((f) => f.path === path);
      const after = exists
        ? prev.map((f) => (f.path === path ? { ...f, content } : f))
        : [...prev, { path, content }];
      undoRedo.record(before, after);
      return after;
    });
    // Sync STYLE.md → DesignBrief
    if (path === ".d3/STYLE.md") syncStyleToBrief(content);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await authFetch("/api/files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: activeProjectId, files: [{ path, content }] }) });
      } catch (err) { console.error("Save failed:", err); }
    }, 600);
  }, [activeProjectId, undoRedo, syncStyleToBrief]);

  const handleToggleTodo = useCallback((lineIndex: number) => {
    const content = getFileContent(".d3/TODOS.md");
    saveFile(".d3/TODOS.md", toggleTodoInContent(content, lineIndex));
  }, [getFileContent, saveFile]);

  const handleAddTodo = useCallback(() => {
    if (!newTodoText.trim()) return;
    saveFile(".d3/TODOS.md", addTodoToContent(getFileContent(".d3/TODOS.md"), newTodoText.trim()));
    setNewTodoText("");
  }, [newTodoText, getFileContent, saveFile]);

  const startEditing = useCallback((path: string) => {
    const content = getFileContent(path);
    setEditContent(content || CARD_CONFIGS.find((c) => c.path === path)?.placeholder || "");
    setEditingCard(path);
  }, [getFileContent]);

  const saveEditing = useCallback(() => {
    if (!editingCard) return;
    saveFile(editingCard, editContent);
    setEditingCard(null);
    setEditContent("");
  }, [editingCard, editContent, saveFile]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const switchProject = useCallback((id: string) => {
    setActiveProjectId(id);
    saveActiveProjectId(id);
    setShowProjectPicker(false);
    setEditingCard(null);
  }, []);

  // ── Rename project inline ──
  const startRenaming = useCallback(() => {
    if (!activeProject) return;
    setRenameValue(activeProject.name);
    setIsRenamingTitle(true);
    setTimeout(() => renameTitleRef.current?.select(), 50);
  }, [activeProject]);

  const commitRename = useCallback(async () => {
    const newName = renameValue.trim();
    if (!newName || !activeProjectId) { setIsRenamingTitle(false); return; }
    // Optimistic update
    setProjects((prev) => prev.map((p) => p.id === activeProjectId ? { ...p, name: newName } : p));
    setIsRenamingTitle(false);
    try {
      await authFetch("/api/vibe-projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeProjectId, name: newName }),
      });
    } catch { /* silent */ }
  }, [renameValue, activeProjectId]);

  // ── AI Auto-fill ALL empty cards from existing code ──
  const handleAutoFillAll = useCallback(async () => {
    if (isAutoFilling || !activeProjectId) return;
    setIsAutoFilling(true);
    setAutoFillStream("");
    setAutoFillFilledCards([]);

    const projectName = projects.find((p) => p.id === activeProjectId)?.name ?? "Mein Projekt";
    const emptyCards = CARD_CONFIGS.filter((c) => {
      const content = d3Files.find((f) => f.path === c.path)?.content ?? "";
      return !content.trim();
    });

    if (emptyCards.length === 0) { setIsAutoFilling(false); return; }

    // Build file context from existing code
    const codeContext = allFiles
      .filter((f) => !f.path.startsWith(".d3/"))
      .slice(0, 20)
      .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 2000)}`)
      .join("\n\n");

    const existingPlanContext = d3Files
      .filter((f) => f.content.trim())
      .map((f) => `--- ${f.path} ---\n${f.content}`)
      .join("\n\n");

    const cardDescriptions = emptyCards
      .map((c) => `### ${c.path}\nTitel: ${c.title}\nBeschreibung: ${c.description}\nFormat:\n${c.placeholder.split("\n").slice(0, 8).join("\n")}`)
      .join("\n\n");

    const prompt = `Du bist ein Webdesign-Stratege. Analysiere den bestehenden Code des Projekts "${projectName}" und fülle die folgenden leeren Plan-Dateien aus.

## Bestehender Code:
${codeContext || "Kein Code vorhanden."}

${existingPlanContext ? `## Bereits ausgefüllte Plan-Dateien:\n${existingPlanContext}\n` : ""}

## Leere Dateien zum Ausfüllen:
${cardDescriptions}

WICHTIG: Antworte für JEDE Datei im Format:
===FILE: .d3/DATEINAME.md===
(Markdown-Inhalt)
===END===

Extrahiere aus dem Code: Farben (Hex), Schriften, Beschreibung, Zielgruppe, Ziele, Todos.
Wenn kein Code vorhanden, erstelle sinnvolle professionelle Inhalte basierend auf dem Projektnamen.
Deutsch. Professionell. Konkret.`;

    try {
      const res = await authFetch("/api/vibe-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          currentFiles: allFiles,
          model: aiModel,
          language: "de",
          chatMode: "plan",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Kein Stream");
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
          try {
            const evt = JSON.parse(line.slice(6).trim()) as { type: string; text?: string };
            if (evt.type === "delta" && evt.text) {
              accumulated += evt.text;
              // Show last 300 chars of stream + detect completed cards live
              setAutoFillStream(accumulated.slice(-300));

              // Save cards as they complete (===END=== found)
              const completedBlocks = accumulated.matchAll(/===FILE:\s*(.+?)===\s*\n([\s\S]*?)===END===/g);
              for (const m of completedBlocks) {
                const fp = m[1].trim();
                const fc = m[2].trim();
                if (fc && emptyCards.some((c) => c.path === fp)) {
                  saveFile(fp, fc);
                  setAutoFillFilledCards((prev) => prev.includes(fp) ? prev : [...prev, fp]);
                }
              }
            }
          } catch { /* skip */ }
        }
      }

      // Final pass — save any remaining blocks
      const fileBlocks = accumulated.matchAll(/===FILE:\s*(.+?)===\s*\n([\s\S]*?)===END===/g);
      for (const match of fileBlocks) {
        const filePath = match[1].trim();
        const fileContent = match[2].trim();
        if (fileContent && emptyCards.some((c) => c.path === filePath)) {
          saveFile(filePath, fileContent);
          setAutoFillFilledCards((prev) => prev.includes(filePath) ? prev : [...prev, filePath]);
        }
      }
    } catch (err) {
      console.error("Auto-fill failed:", err);
    } finally {
      setIsAutoFilling(false);
      setAutoFillDismissed(true);
    }
  }, [isAutoFilling, activeProjectId, projects, d3Files, allFiles, aiModel, saveFile]);

  // ── Reference image upload ──
  const handleRefImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    Array.from(fileList).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        if (!base64) return;
        const img: ImageAttachment = {
          data: base64,
          mediaType: file.type as ImageAttachment["mediaType"],
          name: file.name,
        };
        setReferenceImages((prev) => [...prev, img]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }, []);

  const removeRefImage = useCallback((idx: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ── Chat: Send message ──
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = {
      id: genMessageId(), role: "user", content: text, timestamp: Date.now(),
      images: referenceImages.length > 0 ? [...referenceImages] : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsStreaming(true);
    setStreamingText("");

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const apiMessages = [...messagesRef.current, userMsg].map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        images: m.images,
      }));

      // Build plan context so the AI knows where it is
      const planContext = CARD_CONFIGS.map((c) => {
        const fc = d3Files.find((f) => f.path === c.path)?.content?.trim();
        return `${c.path} (${c.title}): ${fc ? "ausgefuellt" : "LEER"}`;
      }).join("\n");
      const projectContext = `Du bist im PLAN-MODUS von D3 Studio.\nProjekt: "${activeProject?.name ?? ""}"\nHasCode: ${allFiles.filter((f) => !f.path.startsWith(".d3/")).length > 0 ? "Ja" : "Nein"}\nKarten-Status:\n${planContext}\n\nDu kannst Plan-Karten ausfuellen indem du Dateien im Format ===FILE: .d3/DATEI.md=== ... ===END=== zurueckgibst. Der User sieht dich als WhatsApp-aehnlichen Assistenten. Sei kurz, freundlich, professionell.`;

      const res = await authFetch("/api/vibe-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          currentFiles: allFiles,
          model: aiModel,
          language: chatLang,
          roles: ["developer", "designer", "security", "marketing", "founder", "simplifier", "legal", "ux", "content"],
          userLevel,
          chatMode: "plan",
          runtimeContext: { planContext: projectContext },
          images: referenceImages.length > 0 ? referenceImages : undefined,
        }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Kein Stream erhalten.");

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
            const event = JSON.parse(jsonStr) as { type: string; text?: string; error?: string };
            if (event.type === "delta" && event.text) {
              accumulated += event.text;
              setStreamingText(accumulated.slice(-400));
            }
            if (event.type === "error") throw new Error(event.error || "Stream-Fehler");
          } catch { /* skip bad JSON */ }
        }
      }

      // Parse response — extract explanation + save any .d3/ file updates
      const parsed = parseVibeCodeResponse(accumulated);
      let explanation = parsed.explanation.trim() || accumulated.trim();

      // Save any .d3/ file updates from the AI response (auto-sync to cards)
      if (parsed.files.length > 0) {
        for (const fu of parsed.files) {
          if (fu.path.startsWith(".d3/")) {
            saveFile(fu.path, fu.content);
          }
        }
        // Clean explanation — remove file markers from visible text
        explanation = explanation.replace(/===FILE:[\s\S]*?===END===/g, "").trim();
        if (!explanation) explanation = `${parsed.files.length} Plan-Karte${parsed.files.length > 1 ? "n" : ""} aktualisiert.`;
      }

      const assistantMsg: ChatMessage = {
        id: genMessageId(),
        role: "assistant",
        content: explanation,
        timestamp: Date.now(),
        fileUpdates: parsed.files.length > 0 ? parsed.files : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // ── Auto-save history (instant + background enrich) ──
      const hId = addRawHistoryEntry({
        userPrompt: text,
        aiResponse: accumulated,
        filesChanged: parsed.files.map((f) => ({ path: f.path, action: f.action as "create" | "update" | "delete", content: f.content })),
        mode: "plan",
      });
      enrichHistoryEntry(hId).catch(() => {});
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const errorMsg: ChatMessage = {
          id: genMessageId(),
          role: "assistant",
          content: `Fehler: ${(err as Error).message}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText("");
    }
  }, [inputText, isStreaming, aiModel, allFiles, chatLang, userLevel, setMessages, setInputText, setIsStreaming, setStreamingText, saveFile]);

  // ── Chat: Retry ──
  const handleRetry = useCallback((msgId: string) => {
    const idx = messages.findIndex((m) => m.id === msgId);
    if (idx < 0) return;
    // Find last user message before this assistant message
    let lastUserIdx = idx - 1;
    while (lastUserIdx >= 0 && messages[lastUserIdx].role !== "user") lastUserIdx--;
    if (lastUserIdx < 0) return;
    const userText = messages[lastUserIdx].content;
    setMessages((prev) => prev.slice(0, idx));
    setInputText(userText);
    setTimeout(() => { void handleSend(); }, 100);
  }, [messages, setMessages, setInputText, handleSend]);

  // ── Chat: New thread ──
  const handleNewThread = useCallback(() => {
    const fresh = createThread(aiModel);
    setThreads((prev) => [fresh, ...prev]);
    setActiveThreadId(fresh.id);
  }, [aiModel]);

  // ── Export Spec ──
  const [exportCopied, setExportCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const buildExportSpec = useCallback((target: "universal" | "lovable" | "bolt" | "cursor") => {
    const sections: string[] = [];
    for (const config of CARD_CONFIGS) {
      const content = getFileContent(config.path).trim();
      if (content) {
        sections.push(`## ${config.title}\n\n${content}`);
      }
    }
    const spec = sections.join("\n\n---\n\n");
    const projectName = activeProject?.name ?? "Mein Projekt";

    if (target === "universal") {
      return `# ${projectName} — Design & Projekt Spezifikation\n\nGeneriert mit D³ Studio\n\n${spec}`;
    }
    if (target === "lovable") {
      return `Baue eine Website basierend auf folgender Spezifikation.\nHalte dich EXAKT an die Farben, Fonts, Seitenstruktur und Texte.\n\n${spec}\n\nWichtig:\n- Verwende React + Tailwind CSS\n- Responsive: Mobile-first\n- Alle Texte wie angegeben verwenden\n- DSGVO: Impressum + Datenschutz Seiten`;
    }
    if (target === "bolt") {
      return `Erstelle diese Website. Nutze die exakten Design-Vorgaben.\n\n${spec}\n\nTechnische Hinweise:\n- Keine nativen Node.js Module (WebContainer)\n- Supabase fuer Auth falls Login noetig\n- Deploy direkt ueber Bolt`;
    }
    // cursor
    return `# .cursorrules\n\nDu baust eine Website fuer "${projectName}".\nLies die folgenden Spezifikationen und halte dich exakt daran.\n\n${spec}`;
  }, [getFileContent, activeProject]);

  const handleExport = useCallback((target: "universal" | "lovable" | "bolt" | "cursor") => {
    const spec = buildExportSpec(target);
    navigator.clipboard.writeText(spec).then(() => {
      setExportCopied(true);
      setShowExportMenu(false);
      setTimeout(() => setExportCopied(false), 2000);
    }).catch(() => {
      // Fallback: download as file
      const blob = new Blob([spec], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeProject?.name ?? "d3-spec"}-${target}.md`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExportMenu(false);
    });
  }, [buildExportSpec, activeProject]);

  const stats = useMemo(() => {
    const todos = parseTodos(getFileContent(".d3/TODOS.md"));
    const filledCards = CARD_CONFIGS.filter((c) => getFileContent(c.path).trim()).length;
    return {
      todosOpen: todos.filter((t) => !t.done).length,
      todosDone: todos.filter((t) => t.done).length,
      filledCards,
      totalCards: CARD_CONFIGS.length,
    };
  }, [d3Files, getFileContent]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: bg }}>
        <span className="text-sm" style={{ color: canvasTextMuted }}>Laden...</span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: bg }}>
        <FileText size={40} style={{ color: canvasTextFaint }} />
        <div className="text-center">
          <p className="text-[14px] font-medium" style={{ color: canvasTextMain }}>Noch kein Projekt</p>
          <p className="text-[12px] mt-1" style={{ color: canvasTextMuted }}>Erstelle ein Projekt im Vibe-Coding Tab, dann kannst du hier planen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex" style={{ background: bg }}>
      {/* ── Left: Plan Cards ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-8 py-3 flex items-center gap-4" style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => !centralProjectId && setShowProjectPicker((p) => !p)}
              className="flex items-center gap-2 px-2 py-1 transition-all"
              style={{ cursor: centralProjectId ? "default" : "pointer", opacity: centralProjectId ? 0.8 : 1 }}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--d3-text)" }}>
                {projectName ?? activeProject?.name ?? "Projekt waehlen"}
              </span>
              {!centralProjectId && <ChevronDown size={10} style={{ color: "var(--d3-text)", opacity: 0.4, transform: showProjectPicker ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />}
            </button>
            <AnimatePresence>
              {showProjectPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 mt-1 overflow-hidden z-50 w-[240px] max-h-[300px] overflow-y-auto"
                  style={{ background: "var(--d3-surface)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}
                >
                  {projects.map((p) => (
                    <button key={p.id} onClick={() => switchProject(p.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:opacity-70"
                      style={{ background: p.id === activeProjectId ? (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)") : "transparent" }}
                    >
                      <span className="text-[11px] font-medium truncate" style={{ color: "var(--d3-text)", fontWeight: p.id === activeProjectId ? 700 : 400 }}>{p.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => undoRedo.undo()}
                disabled={!undoRedo.canUndo}
                title="Rückgängig (⌘Z)"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26, borderRadius: 6,
                  background: "transparent", border: "none", cursor: undoRedo.canUndo ? "pointer" : "default",
                  opacity: undoRedo.canUndo ? 0.7 : 0.2, transition: "opacity 0.15s",
                }}
              >
                <Undo2 size={13} style={{ color: "var(--d3-text)" }} />
              </button>
              <button
                onClick={() => undoRedo.redo()}
                disabled={!undoRedo.canRedo}
                title="Wiederherstellen (⌘⇧Z)"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26, borderRadius: 6,
                  background: "transparent", border: "none", cursor: undoRedo.canRedo ? "pointer" : "default",
                  opacity: undoRedo.canRedo ? 0.7 : 0.2, transition: "opacity 0.15s",
                }}
              >
                <Redo2 size={13} style={{ color: "var(--d3-text)" }} />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold tabular-nums" style={{ color: "var(--d3-text)", opacity: 0.4 }}>{stats.filledCards}/{stats.totalCards}</span>
            </div>
            {(stats.todosOpen > 0 || stats.todosDone > 0) && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: "var(--d3-text)", opacity: 0.4 }}>{stats.todosDone}/{stats.todosOpen + stats.todosDone} Tasks</span>
              </div>
            )}

            {/* Export Button */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowExportMenu((p) => !p)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer", fontSize: "0.625rem", fontWeight: 700,
                  color: "var(--d3-text)",
                  opacity: 0.4,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                }}
              >
                {exportCopied ? <CheckCircle size={11} /> : <Copy size={11} />}
                {exportCopied ? "Kopiert" : "Export"}
              </button>
              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="glass-heavy"
                    style={{
                      position: "absolute", top: "100%", right: 0, marginTop: 6,
                      borderRadius: 14, overflow: "hidden", zIndex: 60,
                      width: 220, padding: 4,
                    }}
                  >
                    {([
                      { id: "universal" as const, label: "Universal Markdown", desc: "Komplette Spec als .md" },
                      { id: "lovable" as const, label: "Für Lovable", desc: "Optimiert für Lovable.dev" },
                      { id: "bolt" as const, label: "Für Bolt", desc: "Optimiert für Bolt.new" },
                      { id: "cursor" as const, label: "Für Cursor", desc: "Als .cursorrules Format" },
                    ]).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleExport(opt.id)}
                        style={{
                          display: "flex", flexDirection: "column", gap: 1,
                          width: "100%", padding: "8px 12px", borderRadius: 10,
                          background: "transparent", border: "none", cursor: "pointer",
                          textAlign: "left", transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--d3-glass)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--d3-text)" }}>{opt.label}</span>
                        <span style={{ fontSize: "0.625rem", color: "var(--d3-text-tertiary)" }}>{opt.desc}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto px-8 py-6 pb-24">
          {/* Nike-style project title — click to rename */}
          {(activeProject || projectName) && (
            <div className="max-w-[1400px] mx-auto mb-8 select-none relative" style={{ padding: "16px 8px" }}>
              <CornerLines isDark={isDark} />
              <div className="flex items-end gap-6">
                {isRenamingTitle ? (
                  <input
                    ref={renameTitleRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => void commitRename()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitRename();
                      if (e.key === "Escape") setIsRenamingTitle(false);
                    }}
                    autoFocus
                    className="outline-none bg-transparent w-full"
                    style={{
                      fontSize: "clamp(3rem, 8vw, 7rem)",
                      fontWeight: 900,
                      letterSpacing: "-0.04em",
                      lineHeight: 0.85,
                      color: "var(--d3-text)",
                      textTransform: "uppercase",
                      margin: 0,
                      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
                      borderBottom: "3px solid var(--d3-text)",
                    }}
                  />
                ) : (
                  <h1
                    onClick={startRenaming}
                    className="cursor-pointer hover:opacity-70 transition-opacity"
                    title="Klicken zum Umbenennen"
                    style={{
                      fontSize: "clamp(3rem, 8vw, 7rem)",
                      fontWeight: 900,
                      letterSpacing: "-0.04em",
                      lineHeight: 0.85,
                      color: "var(--d3-text)",
                      textTransform: "uppercase",
                      margin: 0,
                      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
                    }}
                  >
                    {projectName ?? activeProject?.name}
                  </h1>
                )}
                <div style={{ paddingBottom: "0.5rem" }}>
                  <span
                    style={{
                      fontSize: "0.625rem",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--d3-text-tertiary)",
                    }}
                  >
                    {stats.filledCards}/{stats.totalCards} Specs · {stats.todosDone}/{stats.todosOpen + stats.todosDone} Tasks
                  </span>
                </div>
              </div>
              <div
                style={{
                  height: 3,
                  background: "var(--d3-text)",
                  marginTop: 12,
                  opacity: 0.08,
                }}
              />
            </div>
          )}

          {/* Smart AI suggestion — WhatsApp-style bubble */}
          {activeProject && !autoFillDismissed && !isAutoFilling && stats.filledCards < stats.totalCards && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
              className="max-w-[1400px] mx-auto mb-6"
            >
              <div className="relative" style={{ padding: 4 }}>
                <div className="relative flex items-start gap-4 px-6 py-5" style={{ background: "var(--d3-surface)" }}>
                  <CornerLines isDark={isDark} />
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center" style={{ background: "var(--d3-text)" }}>
                    <Sparkles size={14} style={{ color: "var(--d3-bg)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--d3-text)", opacity: 0.35 }}>D3 Assistent</span>
                      <span className="text-[9px]" style={{ color: "var(--d3-text)", opacity: 0.2 }}>jetzt</span>
                    </div>
                    <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--d3-text)" }}>
                      {allFiles.filter((f) => !f.path.startsWith(".d3/")).length > 0
                        ? <>Ich sehe, dass <strong>{activeProject.name}</strong> bereits Code hat. Soll ich die Plan-Karten automatisch aus dem bestehenden Code ausfuellen? <span style={{ opacity: 0.5 }}>(Farben, Schriften, Beschreibung, Zielgruppe, Todos)</span></>
                        : <>Willkommen bei <strong>{activeProject.name}</strong>! Soll ich alle Plan-Karten mit professionellen Inhalten ausfuellen?</>
                      }
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => void handleAutoFillAll()}
                        className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all hover:opacity-80"
                        style={{ background: "var(--d3-text)", color: "var(--d3-bg)", borderRadius: 0 }}
                      >
                        <Sparkles size={12} /> Ja, ausfuellen
                      </button>
                      <button
                        onClick={() => setAutoFillDismissed(true)}
                        className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider transition-all hover:opacity-60"
                        style={{ color: "var(--d3-text)", opacity: 0.5 }}
                      >
                        Nein danke
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Auto-fill progress panel */}
          {isAutoFilling && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-[1400px] mx-auto mb-6"
            >
              <div className="relative" style={{ padding: 4 }}>
                <div className="relative px-6 py-5" style={{ background: "var(--d3-surface)" }}>
                  <CornerLines isDark={isDark} />

                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center" style={{ background: "var(--d3-text)" }}>
                      <Sparkles size={14} className="animate-pulse" style={{ color: "var(--d3-bg)" }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold" style={{ color: "var(--d3-text)" }}>Analysiere Projekt und fuelle Karten aus</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--d3-text)", opacity: 0.35 }}>
                        {autoFillFilledCards.length} / {stats.totalCards - stats.filledCards} Karten ausgefuellt
                      </p>
                    </div>
                  </div>

                  {/* Card progress grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
                    {CARD_CONFIGS.map((c) => {
                      const wasFilled = autoFillFilledCards.includes(c.path);
                      const alreadyHadContent = !!d3Files.find((f) => f.path === c.path)?.content?.trim();
                      const CIcon = c.icon;
                      return (
                        <div key={c.path} className="flex items-center gap-1.5 px-2 py-1.5"
                          style={{
                            background: wasFilled
                              ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)")
                              : "transparent",
                            borderLeft: wasFilled
                              ? "2px solid var(--d3-text)"
                              : alreadyHadContent
                                ? `2px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`
                                : "2px solid transparent",
                          }}
                        >
                          {wasFilled ? (
                            <Check size={10} style={{ color: "var(--d3-text)" }} />
                          ) : alreadyHadContent ? (
                            <CIcon size={10} style={{ color: "var(--d3-text)", opacity: 0.25 }} />
                          ) : (
                            <Loader2 size={10} className="animate-spin" style={{ color: "var(--d3-text)", opacity: 0.3 }} />
                          )}
                          <span className="text-[9px] font-semibold truncate" style={{
                            color: "var(--d3-text)",
                            opacity: wasFilled ? 1 : alreadyHadContent ? 0.3 : 0.5,
                          }}>
                            {c.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Streaming text preview */}
                  {autoFillStream && (
                    <div className="overflow-hidden" style={{ maxHeight: 80 }}>
                      <pre className="text-[10px] leading-relaxed whitespace-pre-wrap break-words font-mono"
                        style={{ color: "var(--d3-text)", opacity: 0.3 }}>
                        {autoFillStream.replace(/===FILE:.*?===/g, "").replace(/===END===/g, "").trim().slice(-200)}
                      </pre>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="mt-3 w-full h-[2px]" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                    <motion.div
                      className="h-full"
                      style={{ background: "var(--d3-text)" }}
                      initial={{ width: "2%" }}
                      animate={{ width: autoFillFilledCards.length > 0 ? `${Math.max(5, (autoFillFilledCards.length / Math.max(1, stats.totalCards - stats.filledCards)) * 100)}%` : "15%" }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 stagger-children">
            {CARD_CONFIGS.map((config) => {
              const content = getFileContent(config.path);
              const isEmpty = !content.trim();
              const isEditing = editingCard === config.path;

              if (isEditing) {
                return <EditCard key={config.path} config={config} editContent={editContent} onContentChange={setEditContent}
                  onSave={saveEditing} onCancel={() => setEditingCard(null)} isDark={isDark} cardBorder={cardBorder} textMain={textMain} textMuted={textMuted} inputBg={inputBg} inputBorder={inputBorder} />;
              }
              if (config.path === ".d3/TODOS.md") {
                return <TodoCard key={config.path} config={config} todos={parseTodos(content)} isEmpty={isEmpty}
                  onToggle={handleToggleTodo} onEdit={() => startEditing(config.path)}
                  newTodoText={newTodoText} onNewTodoChange={setNewTodoText} onAddTodo={handleAddTodo}
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} textMain={textMain} textMuted={textMuted} textFaint={textFaint} inputBg={inputBg} inputBorder={inputBorder} />;
              }
              if (config.path === ".d3/STYLE.md" && !isEmpty) {
                return <StyleCard key={config.path} config={config} content={content} colors={parseColorSwatches(content)}
                  onOpenMd={() => startEditing(config.path)} onSave={(c) => saveFile(config.path, c)}
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} textMain={textMain} textMuted={textMuted} />;
              }
              if (config.path === ".d3/REFERENCES.md") {
                return <ReferenceCard key={config.path} config={config} content={content} isEmpty={isEmpty}
                  onOpenMd={() => startEditing(config.path)} onSave={(c) => saveFile(config.path, c)} images={referenceImages}
                  onUpload={() => refFileInputRef.current?.click()} onRemoveImage={removeRefImage}
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} textMain={textMain} textMuted={textMuted} textFaint={textFaint} />;
              }
              return <DefaultCard key={config.path} config={config} content={content} isEmpty={isEmpty}
                onOpenMd={() => startEditing(config.path)} onSave={(c) => saveFile(config.path, c)}
                isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} textMain={textMain} textMuted={textMuted} textFaint={textFaint} inputBg={inputBg} inputBorder={inputBorder} />;
            })}
          </div>
          {/* Hidden file input for reference image upload */}
          <input ref={refFileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple className="hidden" onChange={handleRefImageUpload} />

          {/* ── Weiter zu Design → ── */}
          {onSwitchToDesign && activeProject && (
            <div className="max-w-[1400px] mx-auto mt-8 mb-4">
              <div className="relative" style={{ padding: 4 }}>
                <div className="relative flex items-center justify-between px-6 py-4" style={{ background: "var(--d3-surface)" }}>
                  <CornerLines isDark={isDark} />
                  <div className="flex items-center gap-3">
                    <Palette size={14} style={{ color: "var(--d3-text)", opacity: 0.4 }} />
                    <div>
                      <span className="text-[12px] font-bold" style={{ color: canvasTextMain }}>Nächster Schritt: Design</span>
                      <p className="text-[10px] mt-0.5" style={{ color: canvasTextMuted }}>
                        {brief && brief.sections.length > 0
                          ? `Design Brief hat ${brief.sections.length} Sektionen — weiter bearbeiten oder direkt bauen`
                          : "Farben, Fonts, Layout & Sektionen definieren"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onSwitchToDesign}
                    className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all hover:opacity-80"
                    style={{ background: "var(--d3-text)", color: "var(--d3-bg)", borderRadius: 0 }}
                  >
                    Design <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat panel removed — using global GlassChat instead */}
    </div>
  );
}

// ── Rich Markdown Renderer ──
// Parses markdown into structured, beautiful UI automatically

interface ParsedLine {
  type: "heading" | "keyValue" | "bullet" | "numbered" | "todo" | "empty" | "text";
  num?: string;
  raw: string;
  heading?: string;
  key?: string;
  value?: string;
  text?: string;
  done?: boolean;
  colors?: string[];
}

function parseMarkdownLines(content: string): ParsedLine[] {
  return content.split("\n").map((raw): ParsedLine => {
    const trimmed = raw.trim();
    if (!trimmed) return { type: "empty", raw };
    if (trimmed.startsWith("### ")) return { type: "heading", raw, heading: trimmed.slice(4) };
    if (trimmed.startsWith("## ")) return { type: "heading", raw, heading: trimmed.slice(3) };
    if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) return { type: "heading", raw, heading: trimmed.slice(2) };
    if (trimmed.match(/^- \[[ x]\]/i)) {
      const done = /^- \[x\]/i.test(trimmed);
      const text = trimmed.replace(/^- \[[ x]\]\s*/i, "");
      return { type: "todo", raw, text, done };
    }
    if (trimmed.startsWith("- ")) {
      const bulletText = trimmed.slice(2).trim();
      const kvMatch = bulletText.match(/^\*\*(.+?)\*\*[:\s]*(.*)$/);
      if (kvMatch) {
        const colors = (kvMatch[2] || "").match(/#[0-9A-Fa-f]{6}/g) || [];
        return { type: "keyValue", raw, key: kvMatch[1], value: kvMatch[2] || "", colors };
      }
      return { type: "bullet", raw, text: bulletText };
    }
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      return { type: "numbered", raw, num: numMatch[1], text: numMatch[2] };
    }
    const kvMatch2 = trimmed.match(/^\*\*(.+?)\*\*[:\s]*(.*)$/);
    if (kvMatch2) {
      const colors = (kvMatch2[2] || "").match(/#[0-9A-Fa-f]{6}/g) || [];
      return { type: "keyValue", raw, key: kvMatch2[1], value: kvMatch2[2] || "", colors };
    }
    return { type: "text", raw, text: trimmed };
  });
}

function RichMarkdown({ content, accentColor, isDark, textMain, textMuted, textFaint, maxItems }: {
  content: string; accentColor: string; isDark: boolean;
  textMain: string; textMuted: string; textFaint: string; maxItems?: number;
}) {
  const lines = parseMarkdownLines(content);
  let items = 0;
  const cap = maxItems ?? 999;

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (items >= cap) return null;
        switch (line.type) {
          case "empty": return null;
          case "heading":
            return (
              <div key={i} className="pt-3 pb-1 first:pt-0">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--d3-text)", opacity: 0.35 }}>
                  {line.heading}
                </span>
              </div>
            );
          case "keyValue": {
            items++;
            const hex = line.colors?.[0];
            return (
              <div key={i} className="flex items-center gap-2 py-1 px-2.5 rounded-lg"
                style={{ background: "var(--d3-surface)" }}>
                {hex && <div className="w-4 h-4 rounded-md shrink-0 shadow-sm" style={{ background: hex }} />}
                <span className="text-[12px] font-semibold shrink-0" style={{ color: textMain }}>{line.key}</span>
                {line.value && (
                  <span className="text-[11px] truncate" style={{ color: textMuted }}>
                    {line.value.replace(/#[0-9A-Fa-f]{6}/g, "").replace(/[()]/g, "").trim()}
                  </span>
                )}
              </div>
            );
          }
          case "bullet": {
            items++;
            return (
              <div key={i} className="flex items-start gap-2.5 py-0.5 px-1">
                <div className="w-[4px] h-[4px] rounded-full mt-[7px] shrink-0" style={{ background: "var(--d3-text)", opacity: 0.25 }} />
                <span className="text-[12px] leading-relaxed" style={{ color: textMuted }}>
                  <RichInlineText text={line.text || ""} textMain={textMain} />
                </span>
              </div>
            );
          }
          case "numbered": {
            items++;
            return (
              <div key={i} className="flex items-start gap-2.5 py-0.5 px-1">
                <span className="text-[11px] font-semibold tabular-nums mt-[1px] shrink-0 w-4 text-right" style={{ color: textMain, opacity: 0.4 }}>{line.num}.</span>
                <span className="text-[12px] leading-relaxed" style={{ color: textMuted }}>
                  <RichInlineText text={line.text || ""} textMain={textMain} />
                </span>
              </div>
            );
          }
          case "text": {
            items++;
            return (
              <p key={i} className="text-[12px] leading-relaxed px-1" style={{ color: textMuted }}>
                <RichInlineText text={line.text || ""} textMain={textMain} />
              </p>
            );
          }
          default: return null;
        }
      })}
    </div>
  );
}

function RichInlineText({ text, textMain }: { text: string; textMain: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const boldMatch = part.match(/^\*\*(.+)\*\*$/);
        if (boldMatch) return <strong key={i} style={{ color: textMain, fontWeight: 600 }}>{boldMatch[1]}</strong>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── Inline Editable Line ──
// Display: beautiful RichInlineText children. Edit: auto-resizing textarea.

function InlineEditableLine({ value, onSave, style, className, placeholder, children }: {
  value: string; onSave: (v: string) => void;
  style?: React.CSSProperties; className?: string; placeholder?: string;
  children?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);

  useEffect(() => {
    if (editing && taRef.current) {
      const ta = taRef.current;
      ta.focus();
      ta.selectionStart = ta.value.length;
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
  }, [editing]);

  if (editing) {
    return (
      <textarea
        ref={taRef}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = e.target.scrollHeight + "px";
        }}
        onBlur={() => { setEditing(false); if (draft.trim() !== value) onSave(draft.trim()); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setEditing(false); setDraft(value); }
        }}
        placeholder={placeholder}
        rows={1}
        className={`outline-none bg-transparent resize-none w-full ${className || ""}`}
        style={{ ...style, borderBottom: "1px dashed var(--d3-glass-border)", padding: "1px 0", margin: 0, lineHeight: "1.6" }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className={`cursor-text rounded px-0.5 -mx-0.5 transition-all ${className || ""}`}
      style={{ ...style, minWidth: 20 }}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title="Klicken zum Bearbeiten"
    >
      {children || value || <span style={{ opacity: 0.3 }}>{placeholder || "..."}</span>}
    </span>
  );
}

// ── Editable Rich Markdown ──

function EditableRichMarkdown({ content, accentColor, isDark, textMain, textMuted, textFaint, onContentChange, maxItems }: {
  content: string; accentColor: string; isDark: boolean;
  textMain: string; textMuted: string; textFaint: string;
  onContentChange: (newContent: string) => void; maxItems?: number;
}) {
  const linesRef = useRef(content.split("\n"));
  linesRef.current = content.split("\n");
  const parsed = parseMarkdownLines(content);
  let items = 0;
  const cap = maxItems ?? 999;

  const updateLine = useCallback((lineIdx: number, newRaw: string) => {
    const updated = [...linesRef.current];
    updated[lineIdx] = newRaw;
    onContentChange(updated.join("\n"));
  }, [onContentChange]);

  const deleteLine = useCallback((lineIdx: number) => {
    const updated = linesRef.current.filter((_, i) => i !== lineIdx);
    onContentChange(updated.join("\n"));
  }, [onContentChange]);

  return (
    <div className="space-y-1">
      {parsed.map((line, i) => {
        const li = i;
        if (items >= cap) return null;

        switch (line.type) {
          case "empty": return null;
          case "heading": {
            const level = line.raw.trim().startsWith("## ") ? "## " : "# ";
            return (
              <div key={i} className="pt-3 pb-1 first:pt-0 group/line relative">
                <InlineEditableLine
                  value={line.heading || ""}
                  onSave={(v) => updateLine(li, `${level}${v}`)}
                  className="text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: "var(--d3-text)", opacity: 0.35 }}
                  placeholder="Überschrift..."
                />
                <button onClick={() => deleteLine(li)}
                  className="absolute -right-1 top-3 opacity-0 group-hover/line:opacity-40 hover:!opacity-100 transition-opacity p-0.5"
                  title="Zeile löschen">
                  <Trash2 size={9} style={{ color: "var(--d3-text)" }} />
                </button>
              </div>
            );
          }
          case "keyValue": {
            items++;
            const hex = line.colors?.[0];
            return (
              <div key={i} className="flex items-center gap-2 py-1 px-2.5 rounded-lg group/line relative"
                style={{ background: "var(--d3-surface)" }}>
                {hex && <div className="w-4 h-4 rounded-md shrink-0 shadow-sm" style={{ background: hex }} />}
                <InlineEditableLine
                  value={line.key || ""}
                  onSave={(v) => {
                    const valPart = line.value ? `: ${line.value}` : "";
                    updateLine(li, `- **${v}**${valPart}`);
                  }}
                  className="text-[12px] font-semibold shrink-0"
                  style={{ color: textMain }}
                  placeholder="Schlüssel"
                />
                {line.value !== undefined && (
                  <InlineEditableLine
                    value={line.value.replace(/#[0-9A-Fa-f]{6}/g, "").replace(/[()]/g, "").trim()}
                    onSave={(v) => {
                      const hexPart = hex ? ` ${hex}` : "";
                      updateLine(li, `- **${line.key}**: ${v}${hexPart}`);
                    }}
                    className="text-[11px] truncate"
                    style={{ color: textMuted }}
                    placeholder="Wert"
                  />
                )}
                <button onClick={() => deleteLine(li)}
                  className="absolute -right-1 top-1 opacity-0 group-hover/line:opacity-40 hover:!opacity-100 transition-opacity p-0.5"
                  title="Zeile löschen">
                  <Trash2 size={9} style={{ color: "var(--d3-text)" }} />
                </button>
              </div>
            );
          }
          case "bullet": {
            items++;
            return (
              <div key={i} className="flex items-start gap-2.5 py-0.5 px-1 group/line relative">
                <div className="w-[4px] h-[4px] rounded-full mt-[7px] shrink-0" style={{ background: "var(--d3-text)", opacity: 0.25 }} />
                <InlineEditableLine
                  value={line.text || ""}
                  onSave={(v) => updateLine(li, `- ${v}`)}
                  className="text-[12px] leading-relaxed flex-1"
                  style={{ color: textMuted }}
                  placeholder="Eintrag..."
                >
                  <RichInlineText text={line.text || ""} textMain={textMain} />
                </InlineEditableLine>
                <button onClick={() => deleteLine(li)}
                  className="absolute -right-1 top-0.5 opacity-0 group-hover/line:opacity-40 hover:!opacity-100 transition-opacity p-0.5"
                  title="Zeile löschen">
                  <Trash2 size={9} style={{ color: "var(--d3-text)" }} />
                </button>
              </div>
            );
          }
          case "numbered": {
            items++;
            return (
              <div key={i} className="flex items-start gap-2.5 py-0.5 px-1 group/line relative">
                <span className="text-[11px] font-semibold tabular-nums mt-[1px] shrink-0 w-4 text-right" style={{ color: textMain, opacity: 0.4 }}>{line.num}.</span>
                <InlineEditableLine
                  value={line.text || ""}
                  onSave={(v) => updateLine(li, `${line.num}. ${v}`)}
                  className="text-[12px] leading-relaxed flex-1"
                  style={{ color: textMuted }}
                  placeholder="Eintrag..."
                >
                  <RichInlineText text={line.text || ""} textMain={textMain} />
                </InlineEditableLine>
                <button onClick={() => deleteLine(li)}
                  className="absolute -right-1 top-0.5 opacity-0 group-hover/line:opacity-40 hover:!opacity-100 transition-opacity p-0.5"
                  title="Zeile löschen">
                  <Trash2 size={9} style={{ color: "var(--d3-text)" }} />
                </button>
              </div>
            );
          }
          case "text": {
            items++;
            return (
              <div key={i} className="group/line relative px-1">
                <InlineEditableLine
                  value={line.text || ""}
                  onSave={(v) => updateLine(li, v)}
                  className="text-[12px] leading-relaxed"
                  style={{ color: textMuted }}
                  placeholder="Text..."
                >
                  <RichInlineText text={line.text || ""} textMain={textMain} />
                </InlineEditableLine>
                <button onClick={() => deleteLine(li)}
                  className="absolute -right-1 top-0 opacity-0 group-hover/line:opacity-40 hover:!opacity-100 transition-opacity p-0.5"
                  title="Zeile löschen">
                  <Trash2 size={9} style={{ color: "var(--d3-text)" }} />
                </button>
              </div>
            );
          }
          default: return null;
        }
      })}
    </div>
  );
}

// ── Sub-Components ──

function CornerLines({ isDark }: { isDark: boolean }) {
  const c = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)";
  const len = 24;
  const w = 1;
  return (
    <>
      {/* Top-left */}
      <div style={{ position: "absolute", top: 0, left: 0, width: len, height: w, background: c }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: w, height: len, background: c }} />
      {/* Top-right */}
      <div style={{ position: "absolute", top: 0, right: 0, width: len, height: w, background: c }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: w, height: len, background: c }} />
      {/* Bottom-left */}
      <div style={{ position: "absolute", bottom: 0, left: 0, width: len, height: w, background: c }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: w, height: len, background: c }} />
      {/* Bottom-right */}
      <div style={{ position: "absolute", bottom: 0, right: 0, width: len, height: w, background: c }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: w, height: len, background: c }} />
    </>
  );
}

// ── Auto-Format Markdown ──

function formatMarkdown(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  let lastWasEmpty = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    // Skip consecutive empty lines
    if (!trimmed) {
      if (!lastWasEmpty && result.length > 0) result.push("");
      lastWasEmpty = true;
      continue;
    }
    lastWasEmpty = false;

    // Fix headings: normalize ### to ##, ensure space after #
    if (/^#{1,4}/.test(trimmed)) {
      const hMatch = trimmed.match(/^(#{1,4})\s*(.+)$/);
      if (hMatch) {
        const level = Math.min(hMatch[1].length, 2); // normalize to max ##
        line = `${"#".repeat(level)} ${hMatch[2].trim()}`;
      }
    }

    // Fix bullets: normalize "* ", "+ " to "- "
    if (/^[*+]\s/.test(trimmed)) {
      line = `- ${trimmed.slice(2)}`;
    }

    // Fix numbered lists: ensure "N. " format
    const numMatch = trimmed.match(/^(\d+)[.):]\s*(.+)$/);
    if (numMatch) {
      line = `${numMatch[1]}. ${numMatch[2].trim()}`;
    }

    // Fix unclosed bold markers
    const boldCount = (line.match(/\*\*/g) || []).length;
    if (boldCount % 2 !== 0) {
      line = line + "**";
    }

    // Fix unclosed backticks
    const btCount = (line.match(/`/g) || []).length;
    if (btCount % 2 !== 0) {
      line = line + "`";
    }

    // Ensure blank line before headings
    if (/^#{1,3}\s/.test(line.trim()) && result.length > 0 && result[result.length - 1].trim() !== "") {
      result.push("");
    }

    result.push(line.trimEnd());
  }

  // Remove trailing empty lines, ensure final newline
  while (result.length > 0 && result[result.length - 1].trim() === "") result.pop();
  return result.join("\n");
}

function CardShell({
  config, onOpenMd, onAutoFormat, isDark, cardBorder, textMain, textMuted, children, onClick, compact, className: extraClass,
}: {
  config: CardConfig; onOpenMd?: () => void; onAutoFormat?: () => void; isDark: boolean;
  cardBorder: string; textMain: string; textMuted: string;
  children: React.ReactNode; onClick?: () => void; compact?: boolean; className?: string;
}) {
  const Icon = config.icon;
  return (
    <div
      className={`rounded-none overflow-visible group relative ${extraClass || ""}`}
      style={{
        background: "transparent",
        cursor: onClick ? "pointer" : undefined,
        padding: 4,
      }}
      onClick={onClick}
    >
      {/* Inner card */}
      <div className="relative" style={{ background: "var(--d3-surface)" }}>
        <CornerLines isDark={isDark} />
        {/* Minimal header */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={12} style={{ color: "var(--d3-text)", opacity: 0.4 }} />
                <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--d3-text)", opacity: 0.35 }}>
                  {config.path.replace(".d3/", "").replace(".md", "")}
                </span>
              </div>
              <h3 className="text-[22px] font-black tracking-tight leading-none" style={{ color: "var(--d3-text)" }}>{config.title}</h3>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onAutoFormat && (
                <button onClick={(e) => { e.stopPropagation(); onAutoFormat(); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[9px] font-medium opacity-40 hover:opacity-80 transition-opacity cursor-pointer"
                  style={{ color: "var(--d3-text)" }} title="Auto-formatieren">
                  <Sparkles size={11} />
                </button>
              )}
              {onOpenMd && (
                <button onClick={(e) => { e.stopPropagation(); onOpenMd(); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--d3-text)", opacity: 0.4 }} title="Markdown bearbeiten">
                  <Edit3 size={9} />
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Content */}
        <div className={compact ? "px-6 pb-5" : "px-6 pb-6"}>
          {children}
        </div>
      </div>
    </div>
  );
}

function TodoCard({
  config, todos, isEmpty, onToggle, onEdit, newTodoText, onNewTodoChange, onAddTodo,
  isDark, cardBg, cardBorder, textMain, textMuted, textFaint, inputBg, inputBorder,
}: {
  config: CardConfig; todos: { text: string; done: boolean; line: number }[]; isEmpty: boolean;
  onToggle: (line: number) => void; onEdit: () => void; newTodoText: string;
  onNewTodoChange: (v: string) => void; onAddTodo: () => void;
  isDark: boolean; cardBg: string; cardBorder: string; textMain: string; textMuted: string;
  textFaint: string; inputBg: string; inputBorder: string;
}) {
  const doneCount = todos.filter((t) => t.done).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  return (
    <CardShell config={config} onOpenMd={onEdit} isDark={isDark} cardBorder={cardBorder} textMain={textMain} textMuted={textMuted}>
      {/* Minimal progress bar */}
      {totalCount > 0 && (
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-[28px] font-black leading-none tabular-nums" style={{ color: textMain }}>{doneCount}</span>
            <span className="text-[13px] font-medium" style={{ color: textMuted }}>/ {totalCount} erledigt</span>
          </div>
          <div className="w-full h-[2px] rounded-full" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
            <div className="h-full transition-all duration-700" style={{ width: `${progress}%`, background: "var(--d3-text)" }} />
          </div>
        </div>
      )}

      {isEmpty && todos.length === 0 ? (
        <p className="text-[12px] mb-4" style={{ color: textFaint }}>Noch keine Aufgaben angelegt.</p>
      ) : (
        <div className="space-y-0 mb-4 max-h-[260px] overflow-y-auto">
          {todos.map((todo, i) => (
            <button key={i} onClick={() => onToggle(todo.line)}
              className="w-full flex items-center gap-3 py-2.5 px-1 text-left transition-all hover:opacity-70"
              style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
              <div className="w-4 h-4 border flex items-center justify-center shrink-0 transition-all"
                style={{
                  borderColor: todo.done ? "var(--d3-text)" : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                  background: todo.done ? "var(--d3-text)" : "transparent",
                }}>
                {todo.done && <Check size={10} style={{ color: "var(--d3-bg)" }} strokeWidth={3} />}
              </div>
              <span className="text-[12px] leading-snug font-medium" style={{ color: todo.done ? textMuted : textMain, textDecoration: todo.done ? "line-through" : "none" }}>
                {todo.text}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input value={newTodoText} onChange={(e) => onNewTodoChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onAddTodo(); }}
          placeholder="Neue Aufgabe..." autoComplete="off"
          className="flex-1 px-3 py-2 text-[12px] outline-none transition-all bg-transparent"
          style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, color: textMain }} />
        <button onClick={onAddTodo} disabled={!newTodoText.trim()}
          className="px-3 py-2 transition-all disabled:opacity-20 font-bold text-[11px]"
          style={{ background: "var(--d3-text)", color: "var(--d3-bg)", borderRadius: 0 }}>
          <Plus size={12} />
        </button>
      </div>
    </CardShell>
  );
}

// ── Style Card: Visual Design System ──

interface ParsedStyleSection {
  title: string;
  items: { key: string; value: string; hex?: string }[];
}

function parseStyleSections(content: string): ParsedStyleSection[] {
  const sections: ParsedStyleSection[] = [];
  let current: ParsedStyleSection | null = null;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      if (current) sections.push(current);
      current = { title: trimmed.replace(/^#+\s*/, ""), items: [] };
      continue;
    }
    if (!current) continue;
    const kvMatch = trimmed.match(/^-\s*\*\*(.+?)\*\*[:\s]*(.*)$/);
    if (kvMatch) {
      const hexes = (kvMatch[2] || "").match(/#[0-9A-Fa-f]{6}/g);
      current.items.push({ key: kvMatch[1], value: kvMatch[2] || "", hex: hexes?.[0] });
    } else if (trimmed.startsWith("- ")) {
      current.items.push({ key: trimmed.slice(2).trim(), value: "" });
    }
  }
  if (current) sections.push(current);
  return sections;
}

const FONT_CATALOG = [
  "Inter", "Roboto", "Poppins", "Montserrat", "DM Sans", "Space Grotesk",
  "Plus Jakarta Sans", "Outfit", "Sora", "Manrope", "Lato", "Raleway",
  "Playfair Display", "Merriweather", "Open Sans", "Nunito",
];

function extractFontName(value: string): string | null {
  const clean = value.replace(/\(.*?\)/g, "").trim();
  if (!clean) return null;
  for (const f of FONT_CATALOG) {
    if (clean.toLowerCase().includes(f.toLowerCase())) return f;
  }
  const extra = ["Source Sans Pro", "Geist", "Satoshi", "Cabinet Grotesk", "General Sans", "Clash Display"];
  for (const f of extra) {
    if (clean.toLowerCase().includes(f.toLowerCase())) return f;
  }
  const firstWord = clean.split(/[,(]/)[0].trim();
  if (firstWord && firstWord.length > 1 && firstWord[0] === firstWord[0].toUpperCase()) return firstWord;
  return null;
}

function extractSpacingValue(value: string): string | null {
  const match = value.match(/(-?\d*\.?\d+)\s*(rem|px|em|%)/i);
  if (!match) return null;
  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric)) return null;
  const normalized = Number.isInteger(numeric)
    ? String(numeric)
    : numeric.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${normalized}${match[2].toLowerCase()}`;
}

function replaceFirstSpacingToken(text: string, newSpacing: string): string {
  const spacingRegex = /-?\d*\.?\d+\s*(rem|px|em|%)/i;
  if (spacingRegex.test(text)) {
    return text.replace(spacingRegex, newSpacing);
  }
  return text.trim() ? `${text.trim()} ${newSpacing}` : newSpacing;
}

function isSpacingTitle(title: string): boolean {
  return /spacing|abstand|rhythm|whitespace|gaps?/i.test(title);
}

function reconstructStyleMarkdown(sections: ParsedStyleSection[]): string {
  return sections.map((sec) => {
    const lines = [`## ${sec.title}`];
    sec.items.forEach((item) => {
      if (item.value) lines.push(`- **${item.key}**: ${item.value}`);
      else lines.push(`- ${item.key}`);
    });
    return lines.join("\n");
  }).join("\n\n") + "\n";
}

function StyleCard({
  config, content, colors, onOpenMd, onSave, isDark, cardBg, cardBorder, textMain, textMuted,
}: {
  config: CardConfig; content: string; colors: string[]; onOpenMd: () => void;
  onSave: (content: string) => void;
  isDark: boolean; cardBg: string; cardBorder: string; textMain: string; textMuted: string;
}) {
  const sections = useMemo(() => parseStyleSections(content), [content]);
  const colorSection = sections.find((s) => /farb|color|palette/i.test(s.title));
  const fontSection = sections.find((s) => /schrift|font|typo/i.test(s.title));
  const spacingSection = sections.find((s) => isSpacingTitle(s.title));
  const otherSections = sections.filter((s) => s !== colorSection && s !== fontSection && s !== spacingSection);
  const textFaint = "var(--d3-text-tertiary)";

  const colorItems = (colorSection?.items || []).filter((it) => it.hex).slice(0, 8);
  const fontItems = (fontSection?.items || []).map((it) => ({
    label: it.key,
    font: extractFontName(it.value || it.key),
    desc: it.value.replace(/\(.*?\)/g, "").trim(),
  })).filter((f) => f.font);

  const spacingItems = (spacingSection?.items || []).map((it, itemIndex) => {
    const rawSource = `${it.key} ${it.value}`.trim();
    const spacing = extractSpacingValue(rawSource);
    if (!spacing) return null;

    const label = (it.value ? it.key : it.key.replace(/-?\d*\.?\d+\s*(rem|px|em|%)/i, ""))
      .replace(/[:\-–]+$/g, "")
      .trim() || `Spacing ${itemIndex + 1}`;
    const description = (it.value || "")
      .replace(/-?\d*\.?\d+\s*(rem|px|em|%)/i, "")
      .replace(/[()]/g, "")
      .trim();

    return {
      sectionTitle: spacingSection?.title || "Spacing",
      itemIndex,
      label,
      spacing,
      description,
    };
  }).filter((item): item is {
    sectionTitle: string;
    itemIndex: number;
    label: string;
    spacing: string;
    description: string;
  } => item !== null);

  // Load Google Fonts (current + catalog)
  useEffect(() => {
    const currentFonts = fontItems.map((f) => f.font!);
    const allFonts = [...new Set([...currentFonts, ...FONT_CATALOG])];
    const families = allFonts.map((f) => f.replace(/ /g, "+")).join("&family=");
    const id = "plan-google-fonts";
    const href = `https://fonts.googleapis.com/css2?family=${families}:wght@400;600;700&display=swap`;
    if (document.getElementById(id)) {
      (document.getElementById(id) as HTMLLinkElement).href = href;
      return;
    }
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [fontItems]);

  const bg = "var(--d3-bg)";

  const handleColorChange = useCallback((itemKey: string, newHex: string) => {
    const updated = sections.map((sec) => ({
      ...sec,
      items: sec.items.map((it) => {
        if (it.key !== itemKey || !it.hex) return it;
        return { ...it, value: it.value.replace(it.hex, newHex), hex: newHex };
      }),
    }));
    onSave(reconstructStyleMarkdown(updated));
  }, [sections, onSave]);

  const handleFontChange = useCallback((itemKey: string, newFont: string) => {
    const updated = sections.map((sec) => {
      if (!/schrift|font|typo/i.test(sec.title)) return sec;
      return {
        ...sec,
        items: sec.items.map((it) => {
          if (it.key === itemKey) {
            const fontItem = fontItems.find(f => f.label === itemKey);
            return { ...it, value: `${newFont} (${fontItem?.desc || ""})` };
          }
          return it;
        }),
      };
    });
    onSave(reconstructStyleMarkdown(updated));
  }, [sections, onSave, fontItems]);

  const handleSpacingChange = useCallback((sectionTitle: string, itemIndex: number, newSpacing: string) => {
    const updated = sections.map((sec) => {
      if (sec.title !== sectionTitle || !isSpacingTitle(sec.title)) return sec;

      return {
        ...sec,
        items: sec.items.map((it, idx) => {
          if (idx !== itemIndex) return it;

          if (it.value && it.value.trim()) {
            return {
              ...it,
              value: replaceFirstSpacingToken(it.value, newSpacing),
            };
          }

          return {
            ...it,
            key: replaceFirstSpacingToken(it.key, newSpacing),
          };
        }),
      };
    });

    onSave(reconstructStyleMarkdown(updated));
  }, [sections, onSave]);

  return (
    <div className="rounded-none overflow-visible group lg:col-span-2 relative" style={{ padding: 4 }}>
      <div className="relative" style={{ background: "var(--d3-surface)" }}>
        <CornerLines isDark={isDark} />

        {/* Minimal header */}
        <div className="px-7 pt-5 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Palette size={12} style={{ color: "var(--d3-text)", opacity: 0.4 }} />
                <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--d3-text)", opacity: 0.35 }}>STYLE</span>
              </div>
              <h3 className="text-[22px] font-black tracking-tight leading-none" style={{ color: textMain }}>{config.title}</h3>
            </div>
            <button onClick={onOpenMd}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-medium shrink-0"
              style={{ color: "var(--d3-text)", opacity: 0.4 }}>
              <Edit3 size={9} />
            </button>
          </div>
        </div>

        <div className="px-7 pb-7">
        {/* ── COLOR SECTION ── */}
        {colorItems.length > 0 && (
          <div className="mb-7">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] mb-4 block" style={{ color: "var(--d3-text)", opacity: 0.35 }}>Farben</span>

            {/* Large overlapping circles hero */}
            <div className="flex items-center mb-5 -space-x-4">
              {colorItems.slice(0, 6).map((c, i) => (
                <label key={i} className="relative cursor-pointer" style={{ zIndex: 6 - i }}>
                  <div className="w-16 h-16 rounded-full shadow-xl transition-transform hover:scale-110 hover:z-10"
                    style={{ background: c.hex, outline: `3px solid ${bg}` }} />
                  <input type="color" value={c.hex} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => handleColorChange(c.key, e.target.value)} />
                </label>
              ))}
            </div>

            {/* Color grid */}
            <div className="grid grid-cols-2 gap-2">
              {colorItems.map((c, i) => {
                const desc = c.value.replace(/#[0-9A-Fa-f]{6}/g, "").replace(/[()]/g, "").trim();
                return (
                  <label key={i} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                    style={{ background: "var(--d3-surface)" }}>
                    <div className="w-8 h-8 rounded-lg shadow-md shrink-0 relative">
                      <div className="w-full h-full rounded-lg" style={{ background: c.hex }} />
                      <input type="color" value={c.hex} className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => handleColorChange(c.key, e.target.value)} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold leading-tight" style={{ color: textMain }}>{c.key}</div>
                      <div className="text-[10px] font-mono" style={{ color: textMuted }}>{c.hex}{desc ? ` · ${desc}` : ""}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SPACING SECTION ── */}
        {spacingItems.length > 0 && (
          <div className="mb-6">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] mb-4 block" style={{ color: "var(--d3-text)", opacity: 0.35 }}>
              Spacing
            </span>

            <div className="space-y-4">
              {spacingItems.map((item) => (
                <PlanSpacingSelector
                  key={`${item.sectionTitle}-${item.itemIndex}-${item.label}`}
                  label={item.label}
                  currentSpacing={item.spacing}
                  onSpacingChange={(nextSpacing) => handleSpacingChange(item.sectionTitle, item.itemIndex, nextSpacing)}
                  description={item.description || undefined}
                  config={config}
                  isDark={isDark}
                  hideFrame={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── TYPOGRAPHY SECTION ── */}
        {fontItems.length > 0 && (
          <div className="mb-6">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] mb-4 block" style={{ color: "var(--d3-text)", opacity: 0.35 }}>Typografie</span>

            <div className="space-y-4">
              {fontItems.map((f, i) => (
                <PlanFontSelector
                  key={i}
                  label={f.label}
                  currentFont={f.font || "Inter"}
                  onFontChange={(newFont) => handleFontChange(f.label, newFont)}
                  config={config}
                  isDark={isDark}
                  hideFrame={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── OTHER SECTIONS ── */}
        {otherSections.length > 0 && (
          <div className="pt-5" style={{ borderTop: "1px solid var(--d3-glass-border)" }}>
            <div className="grid grid-cols-2 gap-4">
              {otherSections.map((sec, si) => (
                <div key={si}>
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] mb-3 block" style={{ color: "var(--d3-text)", opacity: 0.35 }}>{sec.title}</span>
                  <div className="space-y-2">
                    {sec.items.slice(0, 4).map((item, ii) => (
                      <div key={ii} className="flex items-center gap-2 py-1 group/line">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--d3-text)", opacity: 0.25 }} />
                        <InlineEditableLine
                          value={item.key}
                          onSave={(v) => {
                            const updated = sections.map((s) => s === sec ? { ...s, items: s.items.map((it, idx) => idx === ii ? { ...it, key: v } : it) } : s);
                            onSave(reconstructStyleMarkdown(updated));
                          }}
                          className="text-[12px] font-semibold"
                          style={{ color: textMain }}
                        />
                        {item.value && (
                          <InlineEditableLine
                            value={item.value.replace(/\(.*?\)/g, "").trim()}
                            onSave={(v) => {
                              const updated = sections.map((s) => s === sec ? { ...s, items: s.items.map((it, idx) => idx === ii ? { ...it, value: v } : it) } : s);
                              onSave(reconstructStyleMarkdown(updated));
                            }}
                            className="text-[11px] truncate"
                            style={{ color: textMuted }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback */}
        {sections.length === 0 && colors.length > 0 && (
          <div className="flex items-center -space-x-4 mb-4">
            {colors.slice(0, 6).map((hex, i) => (
              <div key={i} className="relative" style={{ zIndex: 6 - i }}>
                <div className="w-14 h-14 rounded-full shadow-xl" style={{ background: hex, outline: `3px solid ${bg}` }} />
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function ReferenceCard({
  config, content, isEmpty, onOpenMd, onSave, images, onUpload, onRemoveImage,
  isDark, cardBg, cardBorder, textMain, textMuted, textFaint,
}: {
  config: CardConfig; content: string; isEmpty: boolean; onOpenMd: () => void;
  onSave: (content: string) => void;
  images: ImageAttachment[]; onUpload: () => void; onRemoveImage: (idx: number) => void;
  isDark: boolean; cardBg: string; cardBorder: string; textMain: string; textMuted: string; textFaint: string;
}) {
  return (
    <CardShell config={config} onOpenMd={onOpenMd} isDark={isDark} cardBorder={cardBorder} textMain={textMain} textMuted={textMuted}>
      {/* Image gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-1 mb-4">
          {images.map((img, i) => (
            <div key={i} className="relative group/img overflow-hidden aspect-[4/3]">
              <img src={`data:${img.mediaType};base64,${img.data}`} alt={img.name || "Referenz"}
                className="w-full h-full object-cover" />
              <button onClick={(e) => { e.stopPropagation(); onRemoveImage(i); }}
                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.7)" }}>
                <X size={9} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!isEmpty ? (
        <EditableRichMarkdown content={content} accentColor={config.color} isDark={isDark} textMain={textMain} textMuted={textMuted} textFaint={textFaint}
          onContentChange={onSave} maxItems={4} />
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6">
          <ImagePlus size={20} style={{ color: textFaint }} className="mb-2" />
          <p className="text-[11px]" style={{ color: textFaint }}>Referenz-Bilder hochladen</p>
        </div>
      ) : null}

      <div className="flex gap-2 mt-4">
        <button onClick={(e) => { e.stopPropagation(); onUpload(); }}
          className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold transition-all hover:opacity-80"
          style={{ background: "var(--d3-text)", color: "var(--d3-bg)", borderRadius: 0 }}>
          <Upload size={11} /> Hochladen
        </button>
        <button onClick={(e) => { e.stopPropagation(); onOpenMd(); }}
          className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium transition-all hover:opacity-80"
          style={{ color: textMain, border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`, borderRadius: 0 }}>
          <Edit3 size={11} /> Notizen
        </button>
      </div>
    </CardShell>
  );
}

function EditCard({
  config, editContent, onContentChange, onSave, onCancel,
  isDark, cardBorder, textMain, textMuted, inputBg, inputBorder,
}: {
  config: CardConfig; editContent: string; onContentChange: (v: string) => void;
  onSave: () => void; onCancel: () => void;
  isDark: boolean; cardBorder: string; textMain: string; textMuted: string; inputBg: string; inputBorder: string;
}) {
  const Icon = config.icon;
  const textFaint = "var(--d3-text-tertiary)";
  const borderCol = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  return (
    <div className="rounded-none overflow-hidden lg:col-span-2 xl:col-span-3"
      style={{ background: "var(--d3-surface)", borderBottom: `1px solid ${borderCol}` }}>
      {/* Header */}
      <div className="px-6 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${borderCol}` }}>
        <Icon size={12} style={{ color: "var(--d3-text)", opacity: 0.4 }} />
        <h3 className="text-[16px] font-black flex-1 tracking-tight uppercase" style={{ color: textMain }}>{config.title}</h3>
        <button onClick={onCancel} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider hover:opacity-70 transition-all"
          style={{ color: textMuted }}>Abbrechen</button>
        <button onClick={onSave}
          className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all hover:opacity-80"
          style={{ background: "var(--d3-text)", color: "var(--d3-bg)", borderRadius: 0 }}>
          <Save size={10} /> Speichern
        </button>
      </div>
      {/* Split view: Editor + Preview */}
      <div className="flex" style={{ minHeight: 280 }}>
        <div className="flex-1 flex flex-col" style={{ borderRight: `1px solid ${borderCol}` }}>
          <div className="px-4 py-1.5" style={{ borderBottom: `1px solid ${borderCol}` }}>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--d3-text)", opacity: 0.3 }}>Markdown</span>
          </div>
          <textarea value={editContent} onChange={(e) => onContentChange(e.target.value)}
            className="flex-1 w-full px-4 py-3 text-[12px] leading-[1.8] font-mono outline-none resize-none bg-transparent"
            style={{ color: textMain }}
            autoFocus autoComplete="off" />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-1.5" style={{ borderBottom: `1px solid ${borderCol}` }}>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--d3-text)", opacity: 0.3 }}>Vorschau</span>
          </div>
          <div className="flex-1 px-4 py-3 overflow-y-auto">
            <RichMarkdown content={editContent} accentColor={config.color} isDark={isDark} textMain={textMain} textMuted={textMuted} textFaint={textFaint} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DefaultCard({
  config, content, isEmpty, onOpenMd, onSave,
  isDark, cardBg, cardBorder, textMain, textMuted, textFaint, inputBg, inputBorder,
}: {
  config: CardConfig; content: string; isEmpty: boolean; onOpenMd: () => void;
  onSave: (content: string) => void;
  isDark: boolean; cardBg: string; cardBorder: string; textMain: string; textMuted: string; textFaint: string;
  inputBg: string; inputBorder: string;
}) {
  const [addingBullet, setAddingBullet] = useState(false);
  const [newBullet, setNewBullet] = useState("");

  const handleAddBullet = useCallback(() => {
    const text = newBullet.trim();
    if (!text) return;
    const updated = content.trimEnd() + (content.trim() ? "\n" : "") + `- ${text}\n`;
    onSave(updated);
    setNewBullet("");
    setAddingBullet(false);
  }, [content, newBullet, onSave]);

  return (
    <CardShell config={config} onOpenMd={onOpenMd} onAutoFormat={() => onSave(formatMarkdown(content))} isDark={isDark} cardBorder={cardBorder} textMain={textMain} textMuted={textMuted}>
      {isEmpty && !addingBullet ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 gap-3">
          <p className="text-[11px]" style={{ color: textFaint }}>Noch kein Inhalt</p>
          <button onClick={() => setAddingBullet(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium transition-all hover:opacity-80"
            style={{ color: "var(--d3-text)", border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`, borderRadius: 0 }}>
            <Plus size={11} /> Manuell hinzufuegen
          </button>
        </div>
      ) : (
        <>
          <EditableRichMarkdown content={content} accentColor={config.color} isDark={isDark} textMain={textMain} textMuted={textMuted} textFaint={textFaint}
            onContentChange={(c) => onSave(c)} maxItems={12} />
          {addingBullet ? (
            <div className="flex gap-2 mt-4">
              <input value={newBullet} onChange={(e) => setNewBullet(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddBullet(); if (e.key === "Escape") setAddingBullet(false); }}
                placeholder="Neuer Eintrag..." autoFocus autoComplete="off"
                className="flex-1 px-4 py-2 text-[12px] outline-none"
                style={{ background: "transparent", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`, color: textMain }} />
              <button onClick={handleAddBullet} disabled={!newBullet.trim()}
                className="px-3 py-2 transition-all disabled:opacity-20 text-[11px] font-bold"
                style={{ background: "var(--d3-text)", color: "var(--d3-bg)", borderRadius: 0 }}>
                <Plus size={12} />
              </button>
            </div>
          ) : (
            <button onClick={() => setAddingBullet(true)}
              className="mt-4 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all hover:opacity-70"
              style={{ color: "var(--d3-text)", opacity: 0.4 }}>
              <Plus size={10} /> Hinzufuegen
            </button>
          )}
        </>
      )}
    </CardShell>
  );
}
