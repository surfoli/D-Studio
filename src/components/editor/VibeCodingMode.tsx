"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useUndoRedo } from "@/lib/hooks/use-history";
import { authFetch } from "@/lib/auth-fetch";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Loader2,
  Terminal,
  Send,
  ChevronUp,
  FolderPlus,
  Edit3,
  ChevronLeft,
  GripVertical,
  Plus,
  Trash2,
  User,
  Bot,
  X,
  FilePlus,
  Palette,
  Settings,
  Image,
  Package,
  Globe,
  LayoutTemplate,
  Lock,
  FlaskConical,
  Braces,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  Play,
  Square,
  Check,
  Camera,
  FileEdit,
  ImagePlus,
  MessageCircle,
  ClipboardList,
  Github,
  Download,
  Upload,
  ExternalLink,
  ShieldCheck,
  Zap,
  MousePointerClick,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import InspectPanel, { type InspectedElement, type StyleChange } from "./InspectPanel";
import { getInspectBridgeFiles } from "@/lib/sandbox/preview-bridge";
import {
  type GitHubUser,
  type GitHubRepo,
  getGitHubToken,
  setGitHubToken,
  clearGitHubToken,
  getUser as ghGetUser,
  listRepos as ghListRepos,
  loadRepo as ghLoadRepo,
  saveToRepo as ghSaveToRepo,
} from "@/lib/github";
import { AI_MODELS } from "@/lib/settings";
import {
  type ChatMessage,
  type ChatThread,
  type VibeCodeFile,
  type FileUpdate,
  type ImageAttachment,
  type ChatLanguage,
  type ChatRoleId,
  type ChatMode,
  type UserLevelId,
  detectLanguage,
  parseVibeCodeResponse,
  genMessageId,
  createThread,
  STARTER_FILES,
  CHAT_LANGUAGES,
  CHAT_ROLES,
  CHAT_MODES,
  USER_LEVELS,
  isWebsiteProject,
  buildQualityCheckPrompt,
  designToVibePrompt,
  findMissingImports,
  generateStubFile,
} from "@/lib/vibe-code";
import type { Project } from "@/lib/types";
import { loadDesignBrief, designBriefToPrompt } from "@/lib/design-brief";
import { syncBriefToCode } from "@/lib/sync-brief-to-code";
import { addRawHistoryEntry, enrichHistoryEntry } from "@/lib/history";
import { loadProjectFiles as loadDesignProjectFiles } from "@/lib/project-store";
// E2B Sandbox replaces WebContainers — all calls go through /api/sandbox
type ContainerStatus = "idle" | "booting" | "ready" | "installing" | "starting" | "running" | "error";

// ── E2B Sandbox helpers (replace old WebContainer functions) ──

async function sandboxCall(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await authFetch("/api/sandbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data.error as string) || `Sandbox Error ${res.status}`);
  return data;
}

// Streaming boot helper — unified for all boot paths (GitHub import, AI build, manual)
async function streamingBoot(
  projectId: string,
  files: Record<string, string>,
  onStep: (step: string, message: string, url?: string) => void,
): Promise<string> {
  const res = await authFetch("/api/sandbox/boot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, files }),
  });

  if (!res.ok || !res.body) {
    throw new Error("Sandbox Boot fehlgeschlagen");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let bootUrl = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

    for (const line of lines) {
      try {
        const evt = JSON.parse(line.slice(6)) as {
          step: string;
          message: string;
          url?: string;
        };
        onStep(evt.step, evt.message, evt.url);
        if (evt.url) bootUrl = evt.url;
        if (evt.step === "error") throw new Error(evt.message);
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
          throw parseErr;
        }
      }
    }
  }

  if (!bootUrl) throw new Error("Kein Preview URL erhalten");
  return bootUrl;
}

async function wcWriteFile(path: string, content: string, projectId?: string): Promise<void> {
  if (!projectId) return;
  await sandboxCall({ action: "write", projectId, files: { [path]: content } });
}

async function wcDeleteFile(path: string, projectId?: string): Promise<void> {
  if (!projectId) return;
  await sandboxCall({ action: "exec", projectId, cmd: `rm -f /home/user/${path}` });
}

async function teardown(projectId?: string): Promise<void> {
  if (!projectId) return;
  try { await sandboxCall({ action: "kill", projectId }); } catch { /* ignore */ }
}

async function runInstall(projectId?: string): Promise<number> {
  if (!projectId) return 1;
  try {
    const result = await sandboxCall({ action: "install", projectId });
    return (result.exitCode as number) ?? 0;
  } catch { return 1; }
}

import TerminalOutput, { terminalLog, terminalClear, getTerminalContext } from "./TerminalOutput";
import { ChatContent } from "./ChatCodeBlock";


const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={18} className="animate-spin text-white/30" />
    </div>
  ),
});

export interface VibeCodingProps {
  aiModel: string;
  onModelChange: (model: string) => void;
  theme: "light" | "dark";
  project?: Project;
  brief?: import("@/lib/design-brief").DesignBrief;
  onBriefChange?: (updater: (prev: import("@/lib/design-brief").DesignBrief) => import("@/lib/design-brief").DesignBrief) => void;
  buildFromBrief?: boolean;
  onBuildFromBriefConsumed?: () => void;
  /** Central project ID — used as the single source of truth for project identity */
  projectId?: string;
  /** Central project name — displayed instead of internal vibe project name */
  projectName?: string;
  /** Callback ref — parent sets this to a reset function so it can clear build state on project switch */
  onResetRef?: React.MutableRefObject<(() => void) | null>;
  /** Unified AI props — Build mode chat shares state with GlassChat bubble */
  sharedAiMessages?: import("@/lib/vibe-code").ChatMessage[];
  sharedAiIsStreaming?: boolean;
  sharedAiStreamingText?: string;
  onSharedAiSend?: (message: string, modeOverride?: "plan" | "design" | "build") => Promise<void>;
  onSharedAiSetMessages?: React.Dispatch<React.SetStateAction<import("@/lib/vibe-code").ChatMessage[]>>;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildFileTree(files: VibeCodeFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path
      .replace(/\\/g, "/")
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const existing = current.find((n) => n.name === part);

      if (existing) {
        if (!isLast) current = existing.children;
      } else {
        const node: TreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          isDir: !isLast,
          children: [],
        };
        current.push(node);
        if (!isLast) current = node.children;
      }
    }
  }

  return sortTree(root);
}

function sortTree(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((n) => ({ ...n, children: sortTree(n.children) }));
}

// ── Human-friendly file type info for non-programmers ──

interface FileTypeInfo {
  icon: LucideIcon;
  color: string;
  label: string;       // short German label
  description: string; // one-line explanation
}

const FILE_TYPE_INFO: Record<string, FileTypeInfo> = {
  // Pages & Components (UI)
  "page.tsx":       { icon: Globe,          color: "#60a5fa", label: "Seite",          description: "Eine sichtbare Seite deiner Website" },
  "layout.tsx":     { icon: LayoutTemplate,  color: "#818cf8", label: "Layout",         description: "Rahmen-Vorlage die alle Seiten umgibt" },
  "page.ts":        { icon: Globe,          color: "#60a5fa", label: "Seite",          description: "Eine sichtbare Seite deiner Website" },
  "layout.ts":      { icon: LayoutTemplate,  color: "#818cf8", label: "Layout",         description: "Rahmen-Vorlage die alle Seiten umgibt" },
  // Config files
  "package.json":   { icon: Package,        color: "#f59e0b", label: "Pakete",         description: "Liste aller verwendeten Bibliotheken" },
  "tsconfig.json":  { icon: Settings,       color: "#a78bfa", label: "TS-Config",      description: "TypeScript-Einstellungen" },
  "next.config.ts": { icon: Settings,       color: "#a78bfa", label: "App-Config",     description: "Next.js Framework-Einstellungen" },
  "next.config.js": { icon: Settings,       color: "#a78bfa", label: "App-Config",     description: "Next.js Framework-Einstellungen" },
  "next.config.mjs":{ icon: Settings,       color: "#a78bfa", label: "App-Config",     description: "Next.js Framework-Einstellungen" },
  "tailwind.config.ts": { icon: Palette,    color: "#38bdf8", label: "Design-Config",  description: "Tailwind CSS Design-Einstellungen" },
  "tailwind.config.js": { icon: Palette,    color: "#38bdf8", label: "Design-Config",  description: "Tailwind CSS Design-Einstellungen" },
  "postcss.config.js":  { icon: Settings,   color: "#a78bfa", label: "CSS-Config",     description: "CSS-Verarbeitungs-Einstellungen" },
  "postcss.config.mjs": { icon: Settings,   color: "#a78bfa", label: "CSS-Config",     description: "CSS-Verarbeitungs-Einstellungen" },
  ".env":           { icon: Lock,           color: "#f87171", label: "Geheimnisse",    description: "Geheime Schluessel und Passwoerter" },
  ".env.local":     { icon: Lock,           color: "#f87171", label: "Geheimnisse",    description: "Lokale geheime Schluessel" },
  ".gitignore":     { icon: Settings,       color: "#9ca3af", label: "Git-Regeln",     description: "Dateien die nicht hochgeladen werden" },
};

// Extension-based fallback (when filename doesn't match exactly)
const EXT_TYPE_INFO: Record<string, FileTypeInfo> = {
  ".tsx":     { icon: FileCode,     color: "#60a5fa", label: "Komponente",     description: "Sichtbarer Baustein der Oberflaeche" },
  ".ts":      { icon: FileCode,     color: "#3b82f6", label: "Logik",          description: "Programmier-Logik und Berechnungen" },
  ".jsx":     { icon: FileCode,     color: "#60a5fa", label: "Komponente",     description: "Sichtbarer Baustein der Oberflaeche" },
  ".js":      { icon: FileCode,     color: "#f59e0b", label: "Script",         description: "JavaScript Programmier-Logik" },
  ".mjs":     { icon: FileCode,     color: "#f59e0b", label: "Modul",          description: "JavaScript Modul" },
  ".css":     { icon: Palette,      color: "#f472b6", label: "Design",         description: "Farben, Schriften und Abstande" },
  ".scss":    { icon: Palette,      color: "#f472b6", label: "Design",         description: "Erweiterte CSS-Stile" },
  ".json":    { icon: Braces,       color: "#fbbf24", label: "Daten",          description: "Strukturierte Daten und Einstellungen" },
  ".md":      { icon: FileText,     color: "#34d399", label: "Doku",           description: "Dokumentation und Anleitungen" },
  ".mdx":     { icon: FileText,     color: "#34d399", label: "Doku+Code",      description: "Dokumentation mit eingebettetem Code" },
  ".svg":     { icon: Image,        color: "#fb923c", label: "Grafik",         description: "Vektorgrafik (skalierbar)" },
  ".png":     { icon: Image,        color: "#fb923c", label: "Bild",           description: "Bilddatei" },
  ".jpg":     { icon: Image,        color: "#fb923c", label: "Bild",           description: "Bilddatei" },
  ".jpeg":    { icon: Image,        color: "#fb923c", label: "Bild",           description: "Bilddatei" },
  ".webp":    { icon: Image,        color: "#fb923c", label: "Bild",           description: "Modernes Bildformat" },
  ".ico":     { icon: Image,        color: "#fb923c", label: "Icon",           description: "Kleines Symbol fuer den Browser-Tab" },
  ".html":    { icon: Globe,        color: "#f87171", label: "Webseite",       description: "HTML-Webseite" },
  ".yaml":    { icon: Settings,     color: "#a78bfa", label: "Config",         description: "Konfigurations-Datei" },
  ".yml":     { icon: Settings,     color: "#a78bfa", label: "Config",         description: "Konfigurations-Datei" },
  ".env":     { icon: Lock,         color: "#f87171", label: "Geheimnisse",    description: "Geheime Schluessel" },
  ".test.ts":  { icon: FlaskConical, color: "#a78bfa", label: "Test",           description: "Automatischer Test" },
  ".test.tsx": { icon: FlaskConical, color: "#a78bfa", label: "Test",           description: "Automatischer Test" },
  ".spec.ts":  { icon: FlaskConical, color: "#a78bfa", label: "Test",           description: "Automatischer Test" },
  ".spec.tsx": { icon: FlaskConical, color: "#a78bfa", label: "Test",           description: "Automatischer Test" },
};

// Folder-level labels for common directory names
const FOLDER_LABELS: Record<string, string> = {
  app:         "Seiten",
  components:  "Bausteine",
  lib:         "Helfer",
  utils:       "Werkzeuge",
  hooks:       "Hooks",
  styles:      "Design",
  public:      "Dateien",
  api:         "Schnittstellen",
  types:       "Typen",
  config:      "Einstellungen",
  assets:      "Medien",
  images:      "Bilder",
  layout:      "Rahmen",
  sections:    "Bereiche",
  ui:          "Elemente",
  blog:        "Blog",
  portfolio:   "Portfolio",
  ".d3":       "Notizen",
};

function getFileTypeInfo(filePath: string): FileTypeInfo {
  const fileName = filePath.split("/").pop() || filePath;

  // 1. Exact filename match (e.g. package.json, layout.tsx)
  if (FILE_TYPE_INFO[fileName]) return FILE_TYPE_INFO[fileName];

  // 2. Check for test/spec files first (multi-part extension)
  for (const ext of [".test.tsx", ".test.ts", ".spec.tsx", ".spec.ts"]) {
    if (fileName.endsWith(ext) && EXT_TYPE_INFO[ext]) return EXT_TYPE_INFO[ext];
  }

  // 3. Special names in path context
  if (fileName === "route.ts" || fileName === "route.tsx")
    return { icon: Globe, color: "#34d399", label: "API-Route", description: "Schnittstelle fuer Daten-Anfragen" };
  if (fileName === "loading.tsx" || fileName === "loading.ts")
    return { icon: Loader2, color: "#60a5fa", label: "Ladescreen", description: "Wird angezeigt waehrend Seite laedt" };
  if (fileName === "error.tsx" || fileName === "error.ts")
    return { icon: FileCode, color: "#f87171", label: "Fehlerseite", description: "Wird bei Fehlern angezeigt" };
  if (fileName === "not-found.tsx")
    return { icon: FileCode, color: "#f87171", label: "404-Seite", description: "Wird angezeigt wenn Seite nicht gefunden" };

  // 4. Extension-based fallback
  const dotIdx = fileName.lastIndexOf(".");
  if (dotIdx >= 0) {
    const ext = fileName.slice(dotIdx);
    if (EXT_TYPE_INFO[ext]) return EXT_TYPE_INFO[ext];
  }

  // 5. Default
  return { icon: FileCode, color: "#888", label: "Datei", description: "Allgemeine Datei" };
}

function fileIcon(name: string) {
  const info = getFileTypeInfo(name);
  const Icon = info.icon;
  return <Icon size={12} style={{ color: info.color }} />;
}

function fileLabel(filePath: string): string {
  return getFileTypeInfo(filePath).label;
}

function folderLabel(name: string): string | null {
  return FOLDER_LABELS[name.toLowerCase()] ?? null;
}

// ── Theme colors ──
export function vibeTheme(mode: "light" | "dark") {
  if (mode === "light") return {
    bg: "#ffffff",
    bgPanel: "#f8f9fa",
    bgSurface: "#f1f3f5",
    bgHover: "rgba(0,0,0,0.04)",
    bgActive: "rgba(0,0,0,0.06)",
    bgInput: "rgba(0,0,0,0.03)",
    bgCode: "#f6f8fa",
    border: "rgba(0,0,0,0.09)",
    borderLight: "rgba(0,0,0,0.05)",
    text: "rgba(0,0,0,0.85)",
    textSecondary: "rgba(0,0,0,0.65)",
    textMuted: "rgba(0,0,0,0.38)",
    textFaint: "rgba(0,0,0,0.2)",
    accent: "#3b82f6",
    editorTheme: "vs" as const,
    scrollbar: "rgba(0,0,0,0.12)",
    shadow: "0 1px 3px rgba(0,0,0,0.08)",
    cardBg: "#ffffff",
    cardBorder: "rgba(0,0,0,0.08)",
    userMsgBg: "rgba(0,0,0,0.03)",
    aiMsgBg: "transparent",
    tabActiveBg: "#ffffff",
    tabInactiveBg: "transparent",
    previewBg: "#f5f5f5",
    dropdownBg: "#ffffff",
    dropdownBorder: "rgba(0,0,0,0.1)",
    dropdownShadow: "0 8px 24px rgba(0,0,0,0.12)",
  };
  return {
    bg: "#0d0d0d",
    bgPanel: "#111111",
    bgSurface: "#1a1a1a",
    bgHover: "#1e1e1e",
    bgActive: "#252525",
    bgInput: "#181818",
    bgCode: "#1e1e1e",
    border: "#2a2a2a",
    borderLight: "#1e1e1e",
    text: "#ebebeb",
    textSecondary: "#a0a0a0",
    textMuted: "#666666",
    textFaint: "#3a3a3a",
    accent: "#3b82f6",
    editorTheme: "vs-dark" as const,
    scrollbar: "#2a2a2a",
    shadow: "0 1px 3px rgba(0,0,0,0.4)",
    cardBg: "#161616",
    cardBorder: "#2a2a2a",
    userMsgBg: "#181818",
    aiMsgBg: "transparent",
    tabActiveBg: "#0d0d0d",
    tabInactiveBg: "transparent",
    previewBg: "#1a1a1a",
    dropdownBg: "#1a1a1a",
    dropdownBorder: "#333333",
    dropdownShadow: "0 8px 24px rgba(0,0,0,0.4)",
  };
}

// ── Vibe Project types ──
interface VibeProject {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

const ACTIVE_VIBE_PROJECT_KEY = "d3studio.vibe.active-project";

function loadActiveVibeProjectId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_VIBE_PROJECT_KEY);
  } catch {
    return null;
  }
}

function saveActiveVibeProjectId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_VIBE_PROJECT_KEY, id);
    else localStorage.removeItem(ACTIVE_VIBE_PROJECT_KEY);
  } catch {
    // ignore
  }
}

export default function VibeCodingMode({
  aiModel,
  onModelChange,
  project,
  theme = "dark",
  brief: externalBrief,
  onBriefChange,
  buildFromBrief,
  onBuildFromBriefConsumed,
  onResetRef,
  projectId,
  projectName,
  sharedAiMessages,
  sharedAiIsStreaming,
  sharedAiStreamingText,
  onSharedAiSend,
  onSharedAiSetMessages,
}: VibeCodingProps) {
  const t = vibeTheme(theme);

  // ── Project state ──
  const [vibeProjects, setVibeProjects] = useState<VibeProject[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const activeProjectIdRef = useRef<string | null>(null);
  activeProjectIdRef.current = activeProjectId;

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id);
    saveActiveVibeProjectId(id);
  }, []);

  // ── File state ──
  const [files, setFiles] = useState<VibeCodeFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    new Set(["app", "components", "lib"])
  );
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // ── Chat threads state ──
  const [threads, setThreads] = useState<ChatThread[]>(() => [createThread(aiModel)]);
  const [activeThreadId, setActiveThreadId] = useState<string>(() => threads[0]?.id ?? "");

  // Helper: get active thread
  const activeThread = threads.find((t) => t.id === activeThreadId) ?? threads[0];

  // Helper: update a specific thread
  const updateThread = useCallback((threadId: string, updater: (t: ChatThread) => ChatThread) => {
    setThreads((prev) => prev.map((t) => (t.id === threadId ? updater(t) : t)));
  }, []);

  // Derived state from active thread (for compatibility with existing code)
  // When shared AI is provided by parent (page.tsx), use that state so GlassChat + Build panel share one view
  const messages = sharedAiMessages ?? activeThread?.messages ?? [];
  const inputText = activeThread?.inputText ?? "";
  const isStreaming = sharedAiIsStreaming ?? activeThread?.isStreaming ?? false;
  const streamingText = sharedAiStreamingText ?? activeThread?.streamingText ?? "";
  const attachedImages = activeThread?.attachedImages ?? [];

  // Setters that update the active thread + sync to shared parent state
  const setMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    updateThread(activeThreadId, (t) => ({
      ...t,
      messages: typeof updater === "function" ? updater(t.messages) : updater,
    }));
    // Keep shared parent state in sync so GlassChat bubble sees the same messages
    if (onSharedAiSetMessages) {
      onSharedAiSetMessages(updater as React.SetStateAction<ChatMessage[]>);
    }
  }, [activeThreadId, updateThread, onSharedAiSetMessages]);

  const setInputText = useCallback((val: string) => {
    updateThread(activeThreadId, (t) => ({ ...t, inputText: val }));
  }, [activeThreadId, updateThread]);

  const setIsStreaming = useCallback((val: boolean) => {
    updateThread(activeThreadId, (t) => ({ ...t, isStreaming: val }));
  }, [activeThreadId, updateThread]);

  const setStreamingText = useCallback((val: string) => {
    updateThread(activeThreadId, (t) => ({ ...t, streamingText: val }));
  }, [activeThreadId, updateThread]);

  const setAttachedImages = useCallback((updater: ImageAttachment[] | ((prev: ImageAttachment[]) => ImageAttachment[])) => {
    updateThread(activeThreadId, (t) => ({
      ...t,
      attachedImages: typeof updater === "function" ? updater(t.attachedImages) : updater,
    }));
  }, [activeThreadId, updateThread]);

  // ── UI state ──
  const [chatWidth, setChatWidth] = useState(380);
  const [modelOpen, setModelOpen] = useState(false);
  const [chatLang, setChatLang] = useState<ChatLanguage>("de");
  const [langOpen, setLangOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  // ── Mode & Level state ──
  const [chatMode] = useState<ChatMode>("code");
  const [activeRoles] = useState<ChatRoleId[]>(CHAT_ROLES.map(r => r.id));
  const [userLevel, setUserLevel] = useState<UserLevelId>("beginner");
  const [levelOpen, setLevelOpen] = useState(false);
  const [customLevelPrompt, setCustomLevelPrompt] = useState("");

  // ── Undo / Redo (100 Schritte, nur RAM — keine Supabase-Persistenz) ──
  const fileUndoRedo = useUndoRedo<VibeCodeFile[]>({
    onApply: (snapshot) => {
      setFiles(snapshot);
      // Sync restored files to sandbox
      for (const f of snapshot) {
        wcWriteFile(f.path, f.content, activeProjectId || undefined).catch(() => {});
      }
    },
    maxSize: 100,
  });

  // ── AI active file tracking (which file is AI currently writing to) ──
  const [aiActiveFile, setAiActiveFile] = useState<string | null>(null);
  const userNavigatedRef = useRef(false);

  // ── Live-sync brief changes to sandbox ──
  const briefSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!externalBrief || !containerBootedRef.current || !activeProjectId) return;
    // Debounce to avoid excessive writes during rapid color/font changes
    if (briefSyncTimerRef.current) clearTimeout(briefSyncTimerRef.current);
    briefSyncTimerRef.current = setTimeout(() => {
      syncBriefToCode(externalBrief, {
        writeFile: (path, content) => wcWriteFile(path, content, activeProjectId || undefined),
      }).catch(() => {});
    }, 400);
    return () => {
      if (briefSyncTimerRef.current) clearTimeout(briefSyncTimerRef.current);
    };
  }, [externalBrief, activeProjectId]);

  // ── E2B Sandbox / Preview state ──
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [containerStatus, setContainerStatus] = useState<ContainerStatus>("idle");
  const [terminalCollapsed, setTerminalCollapsed] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showPreview, setShowPreview] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // ── Agent / Cascade state ──
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentPhase, setAgentPhase] = useState<string | null>(null);
  const [agentIteration, setAgentIteration] = useState(0);
  const agentAbortRef = useRef<AbortController | null>(null);
  const [cascadeMode, setCascadeMode] = useState(false);

  // ── Inspect & Edit state ──
  const [inspectEnabled, setInspectEnabled] = useState(false);
  const [inspectedElement, setInspectedElement] = useState<InspectedElement | null>(null);
  const [isInspectApplying, setIsInspectApplying] = useState(false);
  const inspectBridgeReady = useRef(false);

  // ── Deploy state ──
  const [deployStatus, setDeployStatus] = useState<"idle" | "deploying" | "success" | "error">("idle");
  const [deployUrl, setDeployUrl] = useState<string | null>(null);

  // ── GitHub state ──
  const [ghUser, setGhUser] = useState<GitHubUser | null>(null);
  const [ghRepos, setGhRepos] = useState<GitHubRepo[]>([]);
  const [ghPanel, setGhPanel] = useState<"closed" | "connect" | "save" | "load">("closed");
  const [ghTokenInput, setGhTokenInput] = useState("");
  const [ghRepoName, setGhRepoName] = useState("");
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState("");
  const [ghPrivate, setGhPrivate] = useState(true);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wcSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerBootedRef = useRef(false);
  const filesRef = useRef<VibeCodeFile[]>(files);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const editorRef = useRef<unknown>(null);
  const streamingContentRef = useRef<Map<string, string>>(new Map());
  const autoErrorSentRef = useRef(false);
  const selectedPathRef = useRef<string | null>(selectedPath);
  filesRef.current = files;
  messagesRef.current = messages;
  selectedPathRef.current = selectedPath;

  // ── Register reset function for parent (project switch resets build state) ──
  useEffect(() => {
    if (!onResetRef) return;
    onResetRef.current = () => {
      setFiles([]);
      setSelectedPath(null);
      setOpenTabs([]);
      setPreviewUrl(null);
      setContainerStatus("idle");
      containerBootedRef.current = false;
      setThreads([createThread(aiModel)]);
    };
    return () => { if (onResetRef) onResetRef.current = null; };
  }, [aiModel, onResetRef]);

  // ── Sync central projectId → activeProjectId ──
  // The central D3 project is the single source of truth.
  // When it changes, set activeProjectId to it so ALL build operations
  // (E2B sandbox, file saves, etc.) use the same project identity.
  const centralProjectId = projectId;
  const prevCentralProjectIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!centralProjectId) return;
    const prev = prevCentralProjectIdRef.current;
    prevCentralProjectIdRef.current = centralProjectId;
    if (prev === centralProjectId) return;
    // Project changed — sync activeProjectId
    setActiveProjectId(centralProjectId);
  }, [centralProjectId, setActiveProjectId]);

  // ── Seed pre-generated files from Design Mode into Build Mode ──
  // When centralProjectId changes and no files are loaded, load from design store.
  useEffect(() => {
    if (!centralProjectId || files.length > 0) return;
    const stored = loadDesignProjectFiles(centralProjectId);
    if (!stored || Object.keys(stored).length === 0) return;
    const designFiles = Object.entries(stored)
      .filter(([path]) => path.startsWith("src/"))
      .map(([path, content]) => ({ path, content, language: detectLanguage(path) }));
    if (designFiles.length > 0) {
      setFiles(designFiles);
      const firstTsx = designFiles.find(f => f.path.endsWith(".tsx") || f.path.endsWith(".ts"));
      if (firstTsx) setSelectedPath(firstTsx.path);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centralProjectId]);

  const border = t.border;
  const textMuted = t.textMuted;

  const editorOptions = useMemo(() => ({
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
    fontLigatures: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    padding: { top: 12 },
    lineNumbers: "on" as const,
    renderLineHighlight: "line" as const,
    bracketPairColorization: { enabled: true },
    formatOnPaste: true,
    tabSize: 2,
    wordWrap: "on" as const,
    smoothScrolling: true,
    cursorBlinking: "smooth" as const,
    cursorSmoothCaretAnimation: "on" as const,
    automaticLayout: true,
  }), []);

  // ── Load project files helper ──
  const loadProjectFiles = useCallback(async (projectId: string) => {
    setIsLoadingFiles(true);
    setFiles([]);
    setSelectedPath(null);
    setOpenTabs([]);

    try {
      // Check if sandbox is already running (reconnect instead of reboot)
      let sandboxAlreadyRunning = false;
      try {
        const statusRes = await authFetch(`/api/sandbox?projectId=${projectId}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json() as { running: boolean; url: string | null };
          if (statusData.running && statusData.url) {
            sandboxAlreadyRunning = true;
            setPreviewUrl(statusData.url);
            setContainerStatus("running");
            containerBootedRef.current = true;
            terminalLog("Sandbox reconnected — Preview läuft bereits.", "info");
          }
        }
      } catch { /* ignore status check errors */ }

      const res = await authFetch(`/api/files?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        const dbFiles: VibeCodeFile[] = (data.files || []).map(
          (f: { file_name: string; content: string }) => ({
            path: f.file_name,
            content: f.content,
            language: detectLanguage(f.file_name),
          })
        );
        if (dbFiles.length > 0) {
          setFiles(dbFiles);
          setSelectedPath(dbFiles[0].path);
          setOpenTabs([dbFiles[0].path]);

          if (!sandboxAlreadyRunning) {
            // Boot fresh (or hot-update if server detects running sandbox)
            containerBootedRef.current = false;
            setTimeout(() => void bootWebContainer(dbFiles), 200);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load project files:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  // ── Load projects on mount ──
  useEffect(() => {
    // When central projectId is provided, skip internal vibe project loading.
    // The central project is the single source of truth.
    if (projectId) {
      setProjectsLoading(false);
      return;
    }

    const init = async () => {
      setProjectsLoading(true);
      try {
        const res = await authFetch("/api/vibe-projects");
        if (!res.ok) return;
        const data = await res.json();
        const projects: VibeProject[] = data.projects ?? [];
        setVibeProjects(projects);

        if (projects.length === 0) {
          setShowProjectPicker(true);
          setProjectsLoading(false);
          return;
        }

        const savedId = loadActiveVibeProjectId();
        const target = projects.find((p) => p.id === savedId) ?? projects[0];
        setActiveProjectId(target.id);
        await loadProjectFiles(target.id);
      } catch (err) {
        console.error("Failed to load vibe projects:", err);
      } finally {
        setProjectsLoading(false);
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Create new project ──
  const createVibeProject = useCallback(async (name: string) => {
    try {
      const res = await authFetch("/api/vibe-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const newProj: VibeProject = data.project;
      setVibeProjects((prev) => [newProj, ...prev]);
      setActiveProjectId(newProj.id);
      setShowProjectPicker(false);
      setNewProjectName("");
      // Reset file state for fresh project
      setFiles([]);
      setSelectedPath(null);
      setOpenTabs([]);
      setPreviewUrl(null);
      containerBootedRef.current = false;
      // Reset threads for new project
      const freshThread = createThread(aiModel);
      setThreads([freshThread]);
      setActiveThreadId(freshThread.id);
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  }, [aiModel, setActiveProjectId]);

  // ── Switch project ──
  const switchProject = useCallback(async (projectId: string) => {
    if (projectId === activeProjectIdRef.current) {
      setShowProjectPicker(false);
      return;
    }
    setActiveProjectId(projectId);
    setShowProjectPicker(false);
    // Reset all project-specific state
    setPreviewUrl(null);
    setContainerStatus("idle");
    containerBootedRef.current = false;
    // Reset threads for switched project
    const freshThread = createThread(aiModel);
    setThreads([freshThread]);
    setActiveThreadId(freshThread.id);
    // Clear terminal
    terminalClear();
    await loadProjectFiles(projectId);
  }, [aiModel, setActiveProjectId, loadProjectFiles]);

  // ── Rename project ──
  const renameVibeProject = useCallback(async (id: string, name: string) => {
    try {
      const res = await authFetch("/api/vibe-projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setVibeProjects((prev) =>
        prev.map((p) => (p.id === id ? data.project : p))
      );
    } catch (err) {
      console.error("Failed to rename project:", err);
    }
    setRenamingProjectId(null);
    setRenameValue("");
  }, []);

  // ── Delete project ──
  const deleteVibeProject = useCallback(async (id: string) => {
    try {
      await authFetch(`/api/vibe-projects?id=${id}`, { method: "DELETE" });
      setVibeProjects((prev) => {
        const remaining = prev.filter((p) => p.id !== id);
        if (activeProjectIdRef.current === id) {
          if (remaining.length > 0) {
            void switchProject(remaining[0].id);
          } else {
            setActiveProjectId(null);
            setFiles([]);
            setSelectedPath(null);
            setOpenTabs([]);
            setShowProjectPicker(true);
          }
        }
        return remaining;
      });
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  }, [setActiveProjectId, switchProject]);

  // ── Auto-scroll chat ──
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  // ── Auto-retry iframe when preview URL changes ──
  // E2B proxy can take a few seconds to propagate after internal server is ready
  useEffect(() => {
    if (!previewUrl || !iframeRef.current) return;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 3000;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tryReload = () => {
      if (retryCount >= maxRetries) return;
      retryCount++;
      if (iframeRef.current) {
        iframeRef.current.src = previewUrl;
      }
    };

    const handleLoad = () => {
      // iframe loaded something — check if it's an error page
      // If the iframe loaded successfully, stop retrying
      if (timer) clearTimeout(timer);
    };

    const handleError = () => {
      // Connection refused — retry after delay
      if (retryCount < maxRetries) {
        timer = setTimeout(tryReload, retryDelay);
      }
    };

    const iframe = iframeRef.current;
    iframe.addEventListener("load", handleLoad);
    iframe.addEventListener("error", handleError);

    // Schedule first retry in case the initial load fails silently
    // (iframe "load" fires even on connection refused in some browsers)
    timer = setTimeout(() => {
      // After initial delay, do a reload to catch stale connection-refused
      if (iframeRef.current && retryCount < maxRetries) {
        retryCount++;
        iframeRef.current.src = previewUrl;
        // Schedule additional retries
        const retryInterval = setInterval(() => {
          if (retryCount >= maxRetries || !iframeRef.current) {
            clearInterval(retryInterval);
            return;
          }
          retryCount++;
          iframeRef.current.src = previewUrl;
        }, retryDelay);
        // Clean up interval after max time
        setTimeout(() => clearInterval(retryInterval), maxRetries * retryDelay);
      }
    }, 4000);

    return () => {
      if (timer) clearTimeout(timer);
      iframe.removeEventListener("load", handleLoad);
      iframe.removeEventListener("error", handleError);
    };
  }, [previewUrl]);

  // ── Boot E2B Sandbox when files are available (unified streaming) ──
  // Now smart: the server-side boot endpoint auto-detects running sandboxes
  // and performs hot-updates instead of full reboots.
  const bootWebContainer = useCallback(async (initialFiles: VibeCodeFile[]) => {
    if (containerBootedRef.current || initialFiles.length === 0) return;
    containerBootedRef.current = true;
    setTerminalCollapsed(false);
    terminalClear();
    setContainerStatus("booting");
    terminalLog("E2B Sandbox wird gestartet...", "info");

    const pid = activeProjectId || "default";

    try {
      // ── Pre-boot import validation: create stubs for missing @/ imports ──
      let bootFiles = initialFiles;
      const missingImports = findMissingImports(initialFiles);
      if (missingImports.length > 0) {
        terminalLog(`⚠️ ${missingImports.length} fehlende Import(s) — Stubs werden erstellt...`, "error");
        const stubs: VibeCodeFile[] = missingImports.map((imp) => generateStubFile(imp));
        bootFiles = [...initialFiles, ...stubs];
        // Also add to editor state so user sees them
        setFiles((prev) => {
          let next = [...prev];
          for (const stub of stubs) {
            if (!next.find((f) => f.path === stub.path)) {
              next = [...next, stub];
            }
          }
          return next;
        });
      }

      // Convert VibeCodeFiles to flat Record
      const flatFiles: Record<string, string> = {};
      for (const f of bootFiles) {
        flatFiles[f.path] = f.content;
      }

      const url = await streamingBoot(pid, flatFiles, (step, message) => {
        // Update containerStatus based on boot step
        if (step === "create") setContainerStatus("booting");
        else if (step === "hot_update" || step === "hot_update_log") setContainerStatus("installing");
        else if (step === "install" || step === "install_log") setContainerStatus("installing");
        else if (step === "dev" || step === "dev_log") setContainerStatus("starting");
        else if (step === "error") setContainerStatus("error");

        terminalLog(message, step === "error" ? "error" : "info");
      });

      setContainerStatus("running");
      setPreviewUrl(url);

      // Inject Inspect bridge script + layout modification into sandbox
      const bridgeFiles = getInspectBridgeFiles(
        bootFiles.map((f) => ({ path: f.path, content: f.content }))
      );
      sandboxCall({
        action: "write",
        projectId: pid,
        files: bridgeFiles,
      }).catch(() => {});
      inspectBridgeReady.current = false;
    } catch (err) {
      setContainerStatus("error");
      terminalLog(`Fehler: ${(err as Error).message}`, "error");
      containerBootedRef.current = false;
    }
  }, [activeProjectId]);

  // ── Teardown only on true unmount (not on activeProjectId change) ──
  const activeProjectIdForCleanup = useRef(activeProjectId);
  activeProjectIdForCleanup.current = activeProjectId;
  useEffect(() => {
    return () => {
      teardown(activeProjectIdForCleanup.current || "default").catch(() => {});
      containerBootedRef.current = false;
    };
  }, []); // empty deps = only on unmount

  // ── Sync single file to E2B Sandbox (debounced) ──
  const syncFileToContainer = useCallback((path: string, content: string) => {
    if (!containerBootedRef.current) return;
    if (wcSyncTimerRef.current) clearTimeout(wcSyncTimerRef.current);
    wcSyncTimerRef.current = setTimeout(() => {
      wcWriteFile(path, content, activeProjectId || undefined).catch(() => {});
      // If package.json changed, re-run npm install
      if (path === "package.json") {
        terminalLog("package.json geaendert — installiere Pakete neu...", "info");
        runInstall(activeProjectId || undefined).catch(() => {});
      }
    }, 300);
  }, [activeProjectId]);

  // ── Selected file object ──
  const selectedFile = files.find((f) => f.path === selectedPath) ?? null;

  // ── File operations ──
  const openFile = useCallback(
    (path: string) => {
      setSelectedPath(path);
      setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    },
    []
  );

  // Wrapper for user-initiated file selection (marks that user navigated manually)
  const userSelectFile = useCallback(
    (path: string) => {
      if (isStreaming) userNavigatedRef.current = true;
      openFile(path);
    },
    [isStreaming, openFile]
  );

  const closeTab = useCallback(
    (path: string) => {
      setOpenTabs((prev) => {
        const next = prev.filter((p) => p !== path);
        if (selectedPath === path) {
          setSelectedPath(next.length > 0 ? next[next.length - 1] : null);
        }
        return next;
      });
    },
    [selectedPath]
  );

  const updateFileContent = useCallback(
    (path: string, content: string) => {
      setFiles((prev) =>
        prev.map((f) => (f.path === path ? { ...f, content, isDirty: true } : f))
      );
      syncFileToContainer(path, content);
    },
    [syncFileToContainer]
  );

  const saveFile = useCallback(
    async (path: string) => {
      const file = files.find((f) => f.path === path);
      if (!file) return;

      try {
        await authFetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: activeProjectIdRef.current,
            files: [{ path: file.path, content: file.content }],
          }),
        });
        setFiles((prev) =>
          prev.map((f) => (f.path === path ? { ...f, isDirty: false } : f))
        );
      } catch (err) {
        console.error("Save failed:", err);
      }
    },
    [files]
  );

  const createFile = useCallback(
    (path: string, content = "") => {
      const normalized = path
        .trim()
        .replace(/^\/+/, "")
        .replace(/\\/g, "/");
      if (!normalized) return;

      const existing = files.find((f) => f.path === normalized);
      if (existing) {
        openFile(normalized);
        return;
      }

      const newFile: VibeCodeFile = {
        path: normalized,
        content,
        language: detectLanguage(normalized),
        isDirty: true,
      };
      setFiles((prev) => [...prev, newFile]);
      openFile(normalized);

      // Expand parent dirs
      const parts = normalized.split("/");
      if (parts.length > 1) {
        setExpandedDirs((prev) => {
          const next = new Set(prev);
          for (let i = 1; i < parts.length; i++) {
            next.add(parts.slice(0, i).join("/"));
          }
          return next;
        });
      }
    },
    [files, openFile]
  );

  const deleteFile = useCallback(
    async (path: string) => {
      setFiles((prev) => prev.filter((f) => f.path !== path));
      closeTab(path);

      try {
        const delParams = new URLSearchParams({ file_name: path });
        if (activeProjectIdRef.current) delParams.set("project_id", activeProjectIdRef.current);
        await authFetch(`/api/files?${delParams}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Delete failed:", err);
      }
    },
    [closeTab]
  );

  // ── Apply file updates from AI ──
  const applyFileUpdates = useCallback(
    (updates: FileUpdate[]) => {
      setFiles((prev) => {
        let next = [...prev];

        for (const update of updates) {
          if (update.action === "delete") {
            next = next.filter((f) => f.path !== update.path);
            continue;
          }

          const idx = next.findIndex((f) => f.path === update.path);
          const file: VibeCodeFile = {
            path: update.path,
            content: update.content,
            language: detectLanguage(update.path),
            isDirty: true,
          };

          if (idx >= 0) {
            next[idx] = file;
          } else {
            next.push(file);
          }
        }

        return next;
      });

      // Open first updated file
      if (updates.length > 0) {
        const firstPath = updates[0].path;
        openFile(firstPath);
      }

      // Save all updated files to Supabase
      const filesToSave = updates
        .filter((u) => u.action !== "delete")
        .map((u) => ({ path: u.path, content: u.content }));

      if (filesToSave.length > 0) {
        authFetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: activeProjectIdRef.current, files: filesToSave }),
        }).catch((err) => console.error("Save failed:", err));
      }

      // Expand parent dirs
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        for (const update of updates) {
          const parts = update.path.split("/");
          for (let i = 1; i < parts.length; i++) {
            next.add(parts.slice(0, i).join("/"));
          }
        }
        return next;
      });

      // Sync to E2B Sandbox
      if (containerBootedRef.current) {
        let needsInstall = false;
        for (const u of updates) {
          if (u.action === "delete") {
            wcDeleteFile(u.path, activeProjectId || undefined).catch(() => {});
          } else {
            wcWriteFile(u.path, u.content, activeProjectId || undefined).catch(() => {});
            if (u.path === "package.json") needsInstall = true;
          }
        }
        if (needsInstall) {
          terminalLog("package.json geaendert — installiere Pakete neu...", "info");
          runInstall(activeProjectId || undefined).catch(() => {});
        }
      }
    },
    [openFile, activeProjectId]
  );

  // ── Undo / Redo handlers (also triggered by keyboard via hook) ──
  const handleUndo = useCallback(() => fileUndoRedo.undo(), [fileUndoRedo]);
  const handleRedo = useCallback(() => fileUndoRedo.redo(), [fileUndoRedo]);

  // ── Thread management ──
  const addThread = useCallback(() => {
    const t = createThread(aiModel);
    setThreads((prev) => [...prev, t]);
    setActiveThreadId(t.id);
  }, [aiModel]);

  const closeThread = useCallback((threadId: string) => {
    setThreads((prev) => {
      const filtered = prev.filter((t) => t.id !== threadId);
      if (filtered.length === 0) {
        const fresh = createThread(aiModel);
        // React batches these — both run before next render
        setActiveThreadId(fresh.id);
        return [fresh];
      }
      // If closing the active thread, switch to the last remaining
      setActiveThreadId((cur) =>
        cur === threadId ? filtered[filtered.length - 1].id : cur
      );
      return filtered;
    });
  }, [aiModel]);

  // ── Image handling ──
  const fileToImageAttachment = useCallback(
    (file: File): Promise<ImageAttachment | null> => {
      return new Promise((resolve) => {
        const validTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
        if (!validTypes.includes(file.type)) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip data:image/xxx;base64, prefix
          const base64 = result.split(",")[1];
          if (base64) {
            resolve({
              data: base64,
              mediaType: file.type as ImageAttachment["mediaType"],
              name: file.name,
            });
          } else {
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const attachment = await fileToImageAttachment(file);
            if (attachment) {
              setAttachedImages((prev) => [...prev, attachment]);
            }
          }
          return;
        }
      }
    },
    [fileToImageAttachment]
  );

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList) return;

      for (const file of Array.from(fileList)) {
        const attachment = await fileToImageAttachment(file);
        if (attachment) {
          setAttachedImages((prev) => [...prev, attachment]);
        }
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [fileToImageAttachment]
  );

  const removeAttachedImage = useCallback((index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Drag & drop images into chat ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      for (const file of droppedFiles) {
        if (file.type.startsWith("image/")) {
          const attachment = await fileToImageAttachment(file);
          if (attachment) setAttachedImages((prev) => [...prev, attachment]);
        }
      }
    },
    [fileToImageAttachment]
  );

  // ── Capture preview screenshot ──
  const capturePreviewScreenshot = useCallback(async () => {
    const iframe = iframeRef.current;
    if (!iframe || !previewUrl) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opts: any = { video: true, preferCurrentTab: true };
      const stream = await navigator.mediaDevices.getDisplayMedia(opts);
      const videoEl = document.createElement("video");
      videoEl.srcObject = stream;
      videoEl.muted = true;
      await videoEl.play();
      await new Promise((r) => setTimeout(r, 200));
      const rect = iframe.getBoundingClientRect();
      const sx = videoEl.videoWidth / window.innerWidth;
      const sy = videoEl.videoHeight / window.innerHeight;
      const canvas = document.createElement("canvas");
      const cw = Math.round(rect.width * sx);
      const ch = Math.round(rect.height * sy);
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(
        videoEl,
        Math.round(rect.left * sx),
        Math.round(rect.top * sy),
        cw,
        ch,
        0,
        0,
        cw,
        ch
      );
      stream.getTracks().forEach((t) => t.stop());
      const base64 = canvas.toDataURL("image/png").split(",")[1];
      if (base64) {
        setAttachedImages((prev) => [
          ...prev,
          { data: base64, mediaType: "image/png" as const, name: "preview-screenshot.png" },
        ]);
      }
    } catch (err) {
      console.error("Screenshot capture failed:", err);
    }
  }, [previewUrl]);

  // ── GitHub integration ──
  // Auto-connect if token exists in localStorage
  useEffect(() => {
    const token = getGitHubToken();
    if (token && !ghUser) {
      ghGetUser(token)
        .then((user) => setGhUser(user))
        .catch(() => clearGitHubToken());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ghConnect = useCallback(async (token: string) => {
    setGhLoading(true);
    setGhError("");
    try {
      const user = await ghGetUser(token);
      setGitHubToken(token);
      setGhUser(user);
      setGhTokenInput("");
      setGhPanel("closed");
    } catch {
      setGhError("Token ungueltig. Erstelle einen unter github.com/settings/tokens");
    } finally {
      setGhLoading(false);
    }
  }, []);

  const ghDisconnect = useCallback(() => {
    clearGitHubToken();
    setGhUser(null);
    setGhRepos([]);
    setGhPanel("closed");
  }, []);

  const ghOpenSave = useCallback(async () => {
    setGhPanel("save");
    setGhError("");
    setGhRepoName("");
  }, []);

  const ghOpenLoad = useCallback(async () => {
    const token = getGitHubToken();
    if (!token) return;
    setGhPanel("load");
    setGhError("");
    setGhLoading(true);
    try {
      const repos = await ghListRepos(token);
      setGhRepos(repos);
    } catch {
      setGhError("Repos konnten nicht geladen werden");
    } finally {
      setGhLoading(false);
    }
  }, []);

  const ghSave = useCallback(async () => {
    const token = getGitHubToken();
    if (!token || !ghRepoName.trim() || files.length === 0) return;
    setGhLoading(true);
    setGhError("");
    try {
      const ghFiles = files.map((f) => ({ path: f.path, content: f.content }));
      const result = await ghSaveToRepo(
        token,
        ghRepoName.trim(),
        ghFiles,
        "Update von D³ Studio",
        ghPrivate
      );
      setGhPanel("closed");
      // Show success in chat
      const msg: ChatMessage = {
        id: genMessageId(),
        role: "assistant",
        content: result.created
          ? `Neues Repository **${ghRepoName}** erstellt und ${files.length} Dateien hochgeladen.\n\n[Auf GitHub oeffnen](${result.html_url})`
          : `${files.length} Dateien zu **${ghRepoName}** hochgeladen.\n\n[Auf GitHub oeffnen](${result.html_url})`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, msg]);
    } catch (e) {
      setGhError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setGhLoading(false);
    }
  }, [ghRepoName, ghPrivate, files, setMessages]);

  const ghLoad = useCallback(async (repo: GitHubRepo) => {
    const token = getGitHubToken();
    if (!token) return;
    setGhLoading(true);
    setGhError("");
    try {
      const [owner] = repo.full_name.split("/");
      const repoFiles = await ghLoadRepo(token, owner, repo.name, repo.default_branch);
      // Convert to VibeCodeFile format
      const newFiles: VibeCodeFile[] = repoFiles.map((f) => ({
        path: f.path,
        content: f.content,
        language: detectLanguage(f.path),
      }));

      // Always create a new Supabase project for GitHub imports
      let pid = "";
      try {
        const projRes = await authFetch("/api/vibe-projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: `${repo.name} (GitHub)` }),
        });
        if (projRes.ok) {
          const projData = await projRes.json();
          const newProj: VibeProject = projData.project;
          setVibeProjects((prev) => [newProj, ...prev]);
          setActiveProjectId(newProj.id);
          pid = newProj.id;
        }
      } catch { /* ignore */ }

      // Save files to Supabase so they persist across reloads
      if (pid) {
        authFetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: pid,
            files: newFiles.map((f) => ({ path: f.path, content: f.content })),
          }),
        }).catch(() => {});
      }

      setFiles(newFiles);
      if (newFiles.length > 0) {
        setSelectedPath(newFiles[0].path);
        setOpenTabs([newFiles[0].path]);
      }
      setGhPanel("closed");

      // Show status in chat
      const msg: ChatMessage = {
        id: genMessageId(),
        role: "assistant",
        content: `**${repo.name}** geladen — ${newFiles.length} Dateien als Projekt "${repo.name}" gespeichert. Starte E2B Sandbox...`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, msg]);

      // Boot or hot-update sandbox (streamingBoot auto-detects running sandbox)
      if (!pid) pid = "default";
      containerBootedRef.current = false;
      setTerminalCollapsed(false);
      terminalClear();
      setContainerStatus("booting");
      terminalLog("E2B Sandbox wird gestartet...", "info");

      const flatFiles: Record<string, string> = {};
      for (const f of newFiles) {
        flatFiles[f.path] = f.content;
      }

      const bootUrl = await streamingBoot(pid, flatFiles, (step, message) => {
        if (step === "create") setContainerStatus("booting");
        else if (step === "hot_update" || step === "hot_update_log") setContainerStatus("installing");
        else if (step === "install" || step === "install_log") setContainerStatus("installing");
        else if (step === "dev" || step === "dev_log") setContainerStatus("starting");
        else if (step === "error") setContainerStatus("error");
        terminalLog(message, step === "error" ? "error" : "info");
      });

      setContainerStatus("running");
      setPreviewUrl(bootUrl);
      containerBootedRef.current = true;

      // Inject inspect bridge
      const bridgeFiles = getInspectBridgeFiles(
        newFiles.map((f) => ({ path: f.path, content: f.content }))
      );
      sandboxCall({ action: "write", projectId: pid, files: bridgeFiles }).catch(() => {});
      inspectBridgeReady.current = false;

      // Success message
      const doneMsg: ChatMessage = {
        id: genMessageId(),
        role: "assistant",
        content: `**${repo.name}** läuft in der E2B Sandbox!\n\nPreview: ${bootUrl}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, doneMsg]);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Laden fehlgeschlagen";
      setGhError(errMsg);
      terminalLog(`Fehler: ${errMsg}`, "error");
      containerBootedRef.current = false;
    } finally {
      setGhLoading(false);
    }
  }, [setFiles, setSelectedPath, setOpenTabs, setMessages, activeProjectId]);

  // ── Send message to AI ──
  const handleSend = useCallback(async (directText?: string) => {
    const text = (directText ?? inputText).trim();
    if ((!text && attachedImages.length === 0) || isStreaming) return;

    // Auto-create project if none exists yet
    if (!activeProjectIdRef.current) {
      try {
        const projName = text.slice(0, 40) || "Mein Projekt";
        const res = await authFetch("/api/vibe-projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: projName }),
        });
        if (res.ok) {
          const data = await res.json();
          const newProj: VibeProject = data.project;
          setVibeProjects((prev) => [newProj, ...prev]);
          setActiveProjectId(newProj.id);
        }
      } catch { /* ignore */ }
    }

    // If no files exist, seed with starter files
    let currentFiles = filesRef.current;
    if (currentFiles.length === 0) {
      setFiles(STARTER_FILES);
      currentFiles = STARTER_FILES;

      // Save starter files to Supabase
      authFetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: activeProjectIdRef.current,
          files: STARTER_FILES.map((f) => ({ path: f.path, content: f.content })),
        }),
      }).catch(() => {});
    }

    // If this is the very first message (no prior messages, no project files beyond starter),
    // inject a planning hint so the AI asks before building
    const isFirstMessage = messagesRef.current.length === 0;
    const hasNoRealFiles = currentFiles.every(f =>
      STARTER_FILES.some(s => s.path === f.path)
    );
    const userWantsDirectBuild = /(?:bau|mach|erstelle|build|create|just do|einfach|sofort|direkt|los)/i.test(text);
    const planningPrefix = (isFirstMessage && hasNoRealFiles && !userWantsDirectBuild)
      ? "[FIRST_MESSAGE — The user has not started building yet. Follow the BEHAVIOR rules: ask clarifying questions first before generating code. Understand what they want to build, for whom, and what style.]\n\n"
      : "";

    const userMsg: ChatMessage = {
      id: genMessageId(),
      role: "user",
      content: text || (attachedImages.length > 0 ? "Schau dir dieses Bild an." : ""),
      timestamp: Date.now(),
      images: attachedImages.length > 0 ? [...attachedImages] : undefined,
    };

    // Clear attached images
    setAttachedImages([]);

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsStreaming(true);
    setStreamingText("");

    const abort = new AbortController();
    abortRef.current = abort;
    let streamingTextTimer: ReturnType<typeof setTimeout> | null = null;
    let lastStreamingTextUpdate = 0;
    userNavigatedRef.current = false;

    try {
      // Build message history for the API (use ref for latest state)
      // Inject planning prefix into the last user message for the API only (not displayed)
      const apiMessages = [...messagesRef.current, userMsg].map((m, i, arr) => {
        const isLastUserMsg = i === arr.length - 1 && m.role === "user";
        return {
          role: m.role as "user" | "assistant",
          content: isLastUserMsg && planningPrefix ? planningPrefix + m.content : m.content,
          ...(m.images && m.images.length > 0
            ? { images: m.images.map((img) => ({ data: img.data, mediaType: img.mediaType })) }
            : {}),
        };
      });

      // Snapshot files for undo before AI changes
      fileUndoRedo.snapshot([...filesRef.current]);

      // Build runtime context for AI awareness
      const terminalOutput = getTerminalContext(40);
      const runtimeContext: Record<string, string> = {};
      if (terminalOutput) runtimeContext.terminal = terminalOutput;
      if (previewUrl) runtimeContext.previewUrl = previewUrl;
      else runtimeContext.previewUrl = "none";
      runtimeContext.sandboxStatus = containerBootedRef.current ? "running" : "not_started";

      // Inject Design Brief context if available (use prop or fallback to localStorage)
      const activeBrief = externalBrief || loadDesignBrief(activeProjectIdRef.current || undefined);
      if (activeBrief && activeBrief.sections.length > 0) {
        runtimeContext.designBrief = designBriefToPrompt(activeBrief);
      }

      // Smart file selection: extract error-referenced files from terminal
      const errorFileMatches = terminalOutput.match(/(?:[\w\-./]+\.(?:tsx?|jsx?|css|json|mjs))/g) || [];
      const errorFilePaths = [...new Set(errorFileMatches.map(p => p.replace(/^\.\//, "")))];

      const res = await authFetch("/api/vibe-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          currentFiles: currentFiles,
          model: aiModel,
          language: chatLang,
          roles: activeRoles,
          userLevel,
          customLevelPrompt: userLevel === "custom" ? customLevelPrompt : undefined,
          chatMode,
          openFiles: openTabs,
          errorFiles: errorFilePaths,
          runtimeContext,
        }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || `HTTP ${res.status}`
        );
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Kein Stream erhalten.");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let doneProcessed = false;

      // ── Live file parsing state ──
      let currentFilePath: string | null = null;
      let explanationParts: string[] = [];
      const completedFiles: { path: string; content: string }[] = [];
      let liveSelectedPath = selectedPath; // only used for auto-switch when user hasn't navigated

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
            const event = JSON.parse(jsonStr) as {
              type: string;
              text?: string;
              error?: string;
            };

            if (event.type === "delta" && event.text) {
              accumulated += event.text;

              // Re-scan accumulated for file markers
              const fileStartRegex = /===FILE:\s*(.+?)===\n?/g;
              const foundFiles: string[] = [];
              let match;
              while ((match = fileStartRegex.exec(accumulated)) !== null) {
                foundFiles.push(match[1].trim());
              }

              if (foundFiles.length > completedFiles.length + (currentFilePath ? 1 : 0)) {
                // A new file marker was detected
                const newPath = foundFiles[foundFiles.length - 1];

                // If we were in a previous file, close it first
                if (currentFilePath && !completedFiles.find(f => f.path === currentFilePath)) {
                  // Extract content for the previous file from accumulated
                  const prevStart = accumulated.indexOf(`===FILE: ${currentFilePath}===`);
                  if (prevStart !== -1) {
                    const contentStart = accumulated.indexOf("\n", prevStart) + 1;
                    const contentEnd = accumulated.indexOf("===END===", contentStart);
                    if (contentEnd !== -1) {
                      const content = accumulated.slice(contentStart, contentEnd).replace(/\n$/, "");
                      completedFiles.push({ path: currentFilePath, content });
                    }
                  }
                }

                currentFilePath = newPath;

                // Create file if it doesn't exist and open it in the editor
                const lang = detectLanguage(newPath);
                setFiles((prev) => {
                  const exists = prev.find((f) => f.path === newPath);
                  if (!exists) {
                    return [...prev, { path: newPath, content: "", language: lang }];
                  }
                  return prev;
                });
                setOpenTabs((prev) => prev.includes(newPath) ? prev : [...prev, newPath]);

                // Track AI active file (animated indicator)
                setAiActiveFile(newPath);

                // Only auto-switch if user hasn't manually navigated away
                if (!userNavigatedRef.current) {
                  liveSelectedPath = newPath;
                  setSelectedPath(newPath);
                }

                // Expand parent dirs
                setExpandedDirs((prev) => {
                  const next = new Set(prev);
                  const parts = newPath.split("/");
                  for (let i = 1; i < parts.length; i++) {
                    next.add(parts.slice(0, i).join("/"));
                  }
                  return next;
                });

              }

              // If we're inside a file block, extract current partial content and update file
              if (currentFilePath) {
                const markerStr = `===FILE: ${currentFilePath}===`;
                const startIdx = accumulated.lastIndexOf(markerStr);
                if (startIdx !== -1) {
                  const contentStart = accumulated.indexOf("\n", startIdx) + 1;
                  const endIdx = accumulated.indexOf("===END===", contentStart);
                  const partialContent = endIdx !== -1
                    ? accumulated.slice(contentStart, endIdx).replace(/\n$/, "")
                    : accumulated.slice(contentStart);

                  // Store in ref for non-flickering updates
                  streamingContentRef.current.set(currentFilePath, partialContent);

                  // Update Monaco editor directly (no React re-render) if this file is selected
                  // Use selectedPathRef (always current) instead of closure-captured liveSelectedPath
                  const ed = editorRef.current as { getModel?: () => { getValue: () => string; setValue: (v: string) => void } | null } | null;
                  const model = ed?.getModel?.();
                  if (model && selectedPathRef.current === currentFilePath) {
                    if (model.getValue() !== partialContent) {
                      model.setValue(partialContent);
                    }
                  }

                  // Check if file just completed — sync to React state
                  if (endIdx !== -1 && !completedFiles.find(f => f.path === currentFilePath)) {
                    completedFiles.push({
                      path: currentFilePath,
                      content: partialContent,
                    });
                    // Sync completed file to state
                    const donePath = currentFilePath;
                    const doneContent = partialContent;
                    setFiles((prev) =>
                      prev.map((f) =>
                        f.path === donePath ? { ...f, content: doneContent } : f
                      )
                    );
                    streamingContentRef.current.delete(donePath);
                    currentFilePath = null;
                    setAiActiveFile(null);
                  }
                }
              }

              // Throttled streaming text update (~300ms) to avoid excessive re-renders
              const now = Date.now();
              if (now - lastStreamingTextUpdate > 300) {
                lastStreamingTextUpdate = now;
                if (streamingTextTimer) clearTimeout(streamingTextTimer);
                setStreamingText(accumulated);
              } else if (!streamingTextTimer) {
                streamingTextTimer = setTimeout(() => {
                  streamingTextTimer = null;
                  lastStreamingTextUpdate = Date.now();
                  setStreamingText(accumulated);
                }, 300);
              }

              // Collect explanation text (text outside file blocks)
              explanationParts = [];
              let scanPos = 0;
              const fullText = accumulated;
              const fRegex = /===FILE:\s*.+?===[\s\S]*?(?:===END===|$)/g;
              let fMatch;
              while ((fMatch = fRegex.exec(fullText)) !== null) {
                if (fMatch.index > scanPos) {
                  const before = fullText.slice(scanPos, fMatch.index).trim();
                  if (before) explanationParts.push(before);
                }
                scanPos = fMatch.index + fMatch[0].length;
              }
              const remaining = fullText.slice(scanPos).trim();
              if (remaining && !remaining.includes("===FILE:")) {
                explanationParts.push(remaining);
              }

            } else if (event.type === "done" && !doneProcessed) {
              doneProcessed = true;
              // Final parse for any remaining file updates
              const { explanation, files: fileUpdates } =
                parseVibeCodeResponse(accumulated);

              // Apply any files that weren't applied during streaming
              if (fileUpdates.length > 0) {
                applyFileUpdates(fileUpdates);

                // ── Import validation: detect & fix missing @/ imports ──
                // Wait a tick for applyFileUpdates to settle in React state
                setTimeout(() => {
                  const latestFiles = filesRef.current;
                  const missingImports = findMissingImports(latestFiles);
                  if (missingImports.length > 0) {
                    terminalLog(`⚠️ ${missingImports.length} fehlende Import(s) erkannt — Stubs werden erstellt...`, "error");

                    // Generate stubs so sandbox can compile
                    const stubUpdates = missingImports.map((imp) => {
                      const stub = generateStubFile(imp);
                      return { path: stub.path, content: stub.content, action: "create" as const };
                    });
                    applyFileUpdates(stubUpdates);

                    // Auto-trigger AI to generate real components for the stubs
                    const missingList = missingImports.map((p) => `- ${p}`).join("\n");
                    const fixMsg: ChatMessage = {
                      id: genMessageId(),
                      role: "system",
                      content: `⚠️ ${missingImports.length} Komponente(n) fehlen noch:\n${missingList}\n\nStubs wurden erstellt damit die Preview lädt. Die KI generiert jetzt die echten Komponenten...`,
                      timestamp: Date.now(),
                    };
                    setMessages((prev) => [...prev, fixMsg]);

                    // Queue auto-fix: inject a user message asking AI to generate the missing files
                    setTimeout(() => {
                      const autoFixText = `Die folgenden importierten Dateien fehlen noch und müssen generiert werden:\n${missingList}\n\nBitte generiere JETZT alle fehlenden Komponenten als vollständige, fertige Dateien. Nutze das gleiche Design und den gleichen Stil wie die bereits generierten Dateien.`;
                      setInputText(autoFixText);
                      setTimeout(() => {
                        const sendBtn = document.querySelector("[data-send-btn]") as HTMLButtonElement | null;
                        sendBtn?.click();
                      }, 100);
                    }, 500);
                  }
                }, 200);

                // Boot E2B Sandbox after first AI generation
                if (!containerBootedRef.current) {
                  setTimeout(() => {
                    const latestFiles = filesRef.current;
                    if (latestFiles.length > 0) {
                      void bootWebContainer(latestFiles);
                    }
                  }, 300);
                }
              }

              const assistantMsg: ChatMessage = {
                id: genMessageId(),
                role: "assistant",
                content: explanation || (fileUpdates.length > 0
                  ? `${fileUpdates.length} Datei${fileUpdates.length > 1 ? "en" : ""} aktualisiert.`
                  : explanationParts.join("\n") || accumulated),
                timestamp: Date.now(),
                fileUpdates,
              };

              setMessages((prev) => [...prev, assistantMsg]);

              // ── Auto-save history entry (instant + background enrich) ──
              const entryId = addRawHistoryEntry({
                userPrompt: userMsg.content,
                aiResponse: accumulated,
                filesChanged: fileUpdates.map((f) => ({
                  path: f.path,
                  action: f.action,
                  content: f.content,
                })),
                mode: (chatMode === "plan" ? "plan" : "build") as "plan" | "design" | "build",
              });
              // Background: enrich with AI-generated summary (fire & forget)
              enrichHistoryEntry(entryId).catch(() => {});

            } else if (event.type === "error") {
              throw new Error(event.error || "Generierung fehlgeschlagen.");
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;

      const rawErr = (error as Error).message || "Unbekannter Fehler";
      let friendlyError = rawErr;

      // Parse common API errors into user-friendly messages
      if (rawErr.includes("429") || rawErr.toLowerCase().includes("rate_limit")) {
        friendlyError = "⏳ **API Rate Limit erreicht** — Zu viele Anfragen pro Minute. Warte 30 Sekunden und versuche es nochmal.";
      } else if (rawErr.includes("401") || rawErr.includes("authentication")) {
        friendlyError = "🔑 **API Key ungültig** — Prüfe deinen ANTHROPIC_API_KEY in .env.local";
      } else if (rawErr.includes("529") || rawErr.includes("overloaded")) {
        friendlyError = "🔥 **API überlastet** — Anthropic Server sind gerade busy. Versuche es in 1-2 Minuten nochmal.";
      } else if (rawErr.includes("500") || rawErr.includes("internal")) {
        friendlyError = "⚠️ **Server-Fehler** — Bitte versuche es nochmal.";
      } else if (rawErr.includes("Failed to fetch") || rawErr.includes("NetworkError")) {
        friendlyError = "📡 **Netzwerk-Fehler** — Keine Verbindung zum Server. Prüfe deine Internetverbindung.";
      }

      const errMsg: ChatMessage = {
        id: genMessageId(),
        role: "assistant",
        content: friendlyError,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      // Clear throttle timer
      if (streamingTextTimer) clearTimeout(streamingTextTimer);
      // Sync any remaining streaming content to React state
      if (streamingContentRef.current.size > 0) {
        const pending = new Map(streamingContentRef.current);
        setFiles((prev) =>
          prev.map((f) => {
            const content = pending.get(f.path);
            return content !== undefined ? { ...f, content } : f;
          })
        );
        streamingContentRef.current.clear();
      }
      setIsStreaming(false);
      setStreamingText("");
      abortRef.current = null;
      setAiActiveFile(null);
      userNavigatedRef.current = false;

      // Commit undo entry (pairs with snapshot before AI started)
      fileUndoRedo.commit([...filesRef.current]);

      // Auto-detect terminal errors after a delay (give E2B Sandbox time to report)
      setTimeout(() => {
        const terminalEl = document.querySelector("[data-terminal-errors]");
        if (terminalEl) {
          const errorCount = parseInt(terminalEl.getAttribute("data-terminal-errors") || "0", 10);
          if (errorCount > 0 && !autoErrorSentRef.current) {
            autoErrorSentRef.current = true;
            const errorHint: ChatMessage = {
              id: genMessageId(),
              role: "system",
              content: `⚠️ ${errorCount} Fehler im Terminal erkannt. Klicke "KI fixen" im Terminal um sie automatisch beheben zu lassen.`,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, errorHint]);
            setTimeout(() => { autoErrorSentRef.current = false; }, 10000);
          }
        }
      }, 3000);
    }
  }, [inputText, isStreaming, aiModel, applyFileUpdates, attachedImages, chatLang, activeRoles, userLevel, customLevelPrompt, chatMode, setActiveProjectId]);

  // ── Auto-build from Design Brief when arriving from Design Mode ──
  const handleSendRef = useRef(handleSend);
  handleSendRef.current = handleSend;
  useEffect(() => {
    if (!buildFromBrief || !externalBrief || externalBrief.sections.length === 0) return;
    onBuildFromBriefConsumed?.();
    // Small delay to ensure the mode switch animation completes
    const timer = setTimeout(() => {
      const sectionList = externalBrief.sections.map((s) => `- ${s.label} (${s.patternId})`).join("\n");
      const prompt = `Baue die komplette Website basierend auf meinem Design Brief.\n\nSektionen:\n${sectionList}\n\nNutze die Farben, Fonts und den Stil aus dem Design Brief. Erstelle alle Sektionen mit den passenden Animationen. Baue responsive und production-ready.`;
      setInputText(prompt);
      handleSendRef.current(prompt);
    }, 300);
    return () => clearTimeout(timer);
  }, [buildFromBrief, externalBrief, onBuildFromBriefConsumed]);

  // ── Retry: remove last assistant message, re-send last user message ──
  const handleRetry = useCallback((msgId: string) => {
    if (isStreaming) return;
    const idx = messagesRef.current.findIndex((m) => m.id === msgId);
    if (idx === -1) return;
    // Find the preceding user message
    let userMsgIdx = idx - 1;
    while (userMsgIdx >= 0 && messagesRef.current[userMsgIdx].role !== "user") userMsgIdx--;
    if (userMsgIdx < 0) return;
    const userMsg = messagesRef.current[userMsgIdx];
    // Remove the assistant message (and everything after it)
    setMessages(messagesRef.current.slice(0, idx));
    // Re-set the input text and trigger send
    setTimeout(() => {
      setInputText(userMsg.content);
      if (userMsg.images) setAttachedImages(userMsg.images);
      setTimeout(() => {
        // Auto-trigger send
        const sendBtn = document.querySelector("[data-send-btn]") as HTMLButtonElement | null;
        sendBtn?.click();
      }, 50);
    }, 50);
  }, [isStreaming, setMessages, setInputText, setAttachedImages]);

  // ── Cascade / Agent Loop: Plan → Build → Test → Fix ──
  const handleAgentBuild = useCallback(async (cascadePrompt?: string) => {
    if (isAgentRunning || isStreaming) return;
    if (!activeProjectIdRef.current) return;

    const currentFiles = filesRef.current;

    // In Cascade mode, a prompt is always provided; in Agent mode, .d3/ files are required
    if (!cascadePrompt) {
      const d3Files = currentFiles.filter(f => f.path.startsWith(".d3/"));
      if (d3Files.length === 0) {
        const hintMsg: ChatMessage = {
          id: genMessageId(),
          role: "assistant",
          content: "⚠️ Kein Projektplan vorhanden. Wechsle zuerst in den **Plan Mode** und erstelle mindestens PROJECT.md und STYLE.md, damit der Agent weiss was er bauen soll.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, hintMsg]);
        return;
      }
    }

    setIsAgentRunning(true);
    setAgentPhase("plan");
    setAgentIteration(0);
    setTerminalCollapsed(false);
    terminalClear();
    setContainerStatus("booting");
    terminalLog(cascadePrompt ? "⚡ Cascade gestartet..." : "🤖 Agent Loop gestartet — Plan → Build → Test → Fix", "info");

    // Snapshot files for undo
    fileUndoRedo.snapshot([...filesRef.current]);

    const startMsg: ChatMessage = {
      id: genMessageId(),
      role: "assistant",
      content: cascadePrompt
        ? `⚡ **Cascade Mode** — ${cascadePrompt.length > 80 ? cascadePrompt.slice(0, 80) + "..." : cascadePrompt}`
        : "🤖 **Agent Loop gestartet** — Baue das Projekt automatisch aus dem Plan...",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, startMsg]);

    const abort = new AbortController();
    agentAbortRef.current = abort;

    try {
      const res = await authFetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProjectIdRef.current,
          files: currentFiles,
          prompt: cascadePrompt || undefined,
          model: aiModel,
          language: chatLang,
          maxIterations: 3,
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
      const appliedFiles: FileUpdate[] = [];

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
            const event = JSON.parse(jsonStr) as Record<string, unknown>;

            switch (event.type) {
              case "phase": {
                const phase = event.phase as string;
                const iteration = (event.iteration as number) || 0;
                const message = event.message as string;
                setAgentPhase(phase);
                setAgentIteration(iteration);
                terminalLog(`[${phase.toUpperCase()}] ${message}`, "info");
                break;
              }
              case "delta": {
                // AI text streaming — show in terminal as progress
                break;
              }
              case "file-update": {
                const path = event.path as string;
                const content = event.content as string;
                const action = (event.action as string) || "create";
                appliedFiles.push({ path, content, action: action as "create" | "update" | "delete" });

                // Apply file to editor
                setFiles((prev) => {
                  const idx = prev.findIndex(f => f.path === path);
                  const file: VibeCodeFile = {
                    path,
                    content,
                    language: detectLanguage(path),
                    isDirty: true,
                  };
                  if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = file;
                    return next;
                  }
                  return [...prev, file];
                });
                setOpenTabs((prev) => prev.includes(path) ? prev : [...prev, path]);
                setExpandedDirs((prev) => {
                  const next = new Set(prev);
                  const parts = path.split("/");
                  for (let i = 1; i < parts.length; i++) {
                    next.add(parts.slice(0, i).join("/"));
                  }
                  return next;
                });

                terminalLog(`✅ ${path}`, "stdout");
                break;
              }
              case "files-parsed": {
                const count = event.count as number;
                terminalLog(`${count} Dateien generiert`, "info");
                break;
              }
              case "terminal": {
                const text = event.text as string;
                if (text) terminalLog(text.replace(/\n$/, ""), "stdout");
                break;
              }
              case "test-pass": {
                terminalLog("✅ Build erfolgreich!", "info");
                break;
              }
              case "test-fail": {
                const msg = event.message as string;
                terminalLog(`❌ ${msg}`, "error");
                break;
              }
              case "done": {
                const url = event.url as string | null;
                const buildSuccess = event.buildSuccess as boolean;
                const fileCount = event.fileCount as number;
                const message = event.message as string;

                // ── Import validation for agent builds ──
                setTimeout(() => {
                  const latestFiles = filesRef.current;
                  const missingImports = findMissingImports(latestFiles);
                  if (missingImports.length > 0) {
                    terminalLog(`⚠️ ${missingImports.length} fehlende Import(s) — Stubs erstellt`, "error");
                    const stubUpdates = missingImports.map((imp) => {
                      const stub = generateStubFile(imp);
                      return { path: stub.path, content: stub.content, action: "create" as const };
                    });
                    applyFileUpdates(stubUpdates);
                  }
                }, 100);

                if (url) {
                  setPreviewUrl(url);
                  setContainerStatus("running");
                  containerBootedRef.current = true;

                  // Inject Inspect bridge after agent build
                  const bridgeFiles = getInspectBridgeFiles(
                    filesRef.current.map((f) => ({ path: f.path, content: f.content }))
                  );
                  sandboxCall({
                    action: "write",
                    projectId: activeProjectIdRef.current || "default",
                    files: bridgeFiles,
                  }).catch(() => {});
                }

                // Save all files to Supabase
                if (appliedFiles.length > 0) {
                  const filesToSave = appliedFiles
                    .filter(u => u.action !== "delete")
                    .map(u => ({ path: u.path, content: u.content }));
                  if (filesToSave.length > 0) {
                    authFetch("/api/files", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ project_id: activeProjectIdRef.current, files: filesToSave }),
                    }).catch(() => {});
                  }
                }

                terminalLog(`\n${message}`, "info");

                const doneMsg: ChatMessage = {
                  id: genMessageId(),
                  role: "assistant",
                  content: buildSuccess
                    ? `✅ **Agent Loop abgeschlossen** — ${fileCount} Dateien generiert, Build erfolgreich!\n\n${url ? `[Preview öffnen](${url})` : ""}`
                    : `⚠️ **Agent Loop beendet** — ${fileCount} Dateien generiert.\n\n${message}`,
                  timestamp: Date.now(),
                  fileUpdates: appliedFiles,
                };
                setMessages((prev) => [...prev, doneMsg]);
                break;
              }
              case "error": {
                const error = event.error as string;
                throw new Error(error);
              }
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        terminalLog("Agent Loop abgebrochen.", "info");
      } else {
        const errMsg: ChatMessage = {
          id: genMessageId(),
          role: "assistant",
          content: `❌ Agent Loop Fehler: ${(error as Error).message}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
        terminalLog(`Fehler: ${(error as Error).message}`, "error");
      }
    } finally {
      setIsAgentRunning(false);
      setAgentPhase(null);
      setAgentIteration(0);
      agentAbortRef.current = null;
      // Commit undo entry (pairs with snapshot before agent started)
      fileUndoRedo.commit([...filesRef.current]);
    }
  }, [isAgentRunning, isStreaming, aiModel, chatLang, applyFileUpdates, setMessages]);

  // ── Inspect & Edit: postMessage listener ──
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || e.data.source !== "d3inspect") return;

      if (e.data.type === "bridge-ready") {
        inspectBridgeReady.current = true;
        // If inspect was already enabled before bridge loaded, re-enable
        if (inspectEnabled && iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(
            { source: "d3studio", type: "inspect-enable" },
            "*"
          );
        }
      }

      if (e.data.type === "element-selected") {
        setInspectedElement(e.data.element as InspectedElement);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [inspectEnabled]);

  // ── Inspect toggle ──
  const toggleInspect = useCallback(() => {
    const next = !inspectEnabled;
    setInspectEnabled(next);
    if (!next) {
      setInspectedElement(null);
    }
    // Notify iframe
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { source: "d3studio", type: next ? "inspect-enable" : "inspect-disable" },
        "*"
      );
    }
  }, [inspectEnabled]);

  // ── Inspect: live style preview (no AI, instant in iframe) ──
  const handleInspectStyleChange = useCallback((change: StyleChange) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { source: "d3studio", type: "inspect-update-style", property: change.property, value: change.value },
        "*"
      );
    }
  }, []);

  // ── Inspect: text change (live preview in iframe) ──
  const handleInspectTextChange = useCallback((text: string) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { source: "d3studio", type: "inspect-update-text", text },
        "*"
      );
    }
  }, []);

  // ── Inspect: apply style changes to code via AI ──
  const handleInspectApplyChanges = useCallback(async (changes: StyleChange[]) => {
    if (!inspectedElement || !activeProjectIdRef.current) return;
    setIsInspectApplying(true);
    terminalLog("🎨 Inspect: Änderungen werden in Code übernommen...", "info");

    try {
      const currentFiles = filesRef.current.filter(
        (f) => !f.path.includes("node_modules") && f.content.length < 50000
      );

      const res = await authFetch("/api/inspect-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: currentFiles.map((f) => ({ path: f.path, content: f.content })),
          element: inspectedElement,
          changes,
          model: aiModel,
          language: chatLang,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        fileUpdates: { path: string; content: string }[];
        explanation: string | null;
      };

      if (data.fileUpdates.length > 0) {
        const updates: FileUpdate[] = data.fileUpdates.map((f) => ({
          path: f.path,
          content: f.content,
          action: "update" as const,
        }));
        applyFileUpdates(updates);

        // Save to Supabase
        authFetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: activeProjectIdRef.current,
            files: data.fileUpdates,
          }),
        }).catch(() => {});

        // Write to sandbox for hot reload
        const fileMap: Record<string, string> = {};
        for (const f of data.fileUpdates) {
          fileMap[f.path] = f.content;
        }
        sandboxCall({
          action: "write",
          projectId: activeProjectIdRef.current,
          files: fileMap,
        }).catch(() => {});

        terminalLog(`✅ ${data.fileUpdates.length} Datei(en) aktualisiert`, "info");

        const msg: ChatMessage = {
          id: genMessageId(),
          role: "assistant",
          content: `🎨 **Inspect Edit** — ${data.fileUpdates.length} Datei(en) angepasst.${data.explanation ? `\n\n${data.explanation}` : ""}`,
          timestamp: Date.now(),
          fileUpdates: updates,
        };
        setMessages((prev) => [...prev, msg]);
      } else {
        terminalLog("⚠️ Keine Dateien geändert", "info");
      }
    } catch (error) {
      terminalLog(`❌ Inspect Edit Fehler: ${(error as Error).message}`, "error");
    } finally {
      setIsInspectApplying(false);
    }
  }, [inspectedElement, aiModel, chatLang, applyFileUpdates, setMessages]);

  // ── Inspect: AI improve ──
  const handleInspectAiImprove = useCallback(async (instruction: string) => {
    if (!inspectedElement || !activeProjectIdRef.current) return;
    setIsInspectApplying(true);
    terminalLog(`✨ AI Vorschlag: "${instruction}"`, "info");

    try {
      const currentFiles = filesRef.current.filter(
        (f) => !f.path.includes("node_modules") && f.content.length < 50000
      );

      const res = await authFetch("/api/inspect-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: currentFiles.map((f) => ({ path: f.path, content: f.content })),
          element: inspectedElement,
          aiInstruction: instruction,
          model: aiModel,
          language: chatLang,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        fileUpdates: { path: string; content: string }[];
        explanation: string | null;
      };

      if (data.fileUpdates.length > 0) {
        const updates: FileUpdate[] = data.fileUpdates.map((f) => ({
          path: f.path,
          content: f.content,
          action: "update" as const,
        }));
        applyFileUpdates(updates);

        authFetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: activeProjectIdRef.current,
            files: data.fileUpdates,
          }),
        }).catch(() => {});

        const fileMap: Record<string, string> = {};
        for (const f of data.fileUpdates) {
          fileMap[f.path] = f.content;
        }
        sandboxCall({
          action: "write",
          projectId: activeProjectIdRef.current,
          files: fileMap,
        }).catch(() => {});

        terminalLog(`✅ AI hat ${data.fileUpdates.length} Datei(en) verbessert`, "info");

        const msg: ChatMessage = {
          id: genMessageId(),
          role: "assistant",
          content: `✨ **AI Vorschlag angewendet** — "${instruction}"\n\n${data.explanation || `${data.fileUpdates.length} Datei(en) angepasst.`}`,
          timestamp: Date.now(),
          fileUpdates: updates,
        };
        setMessages((prev) => [...prev, msg]);
      }
    } catch (error) {
      terminalLog(`❌ AI Vorschlag Fehler: ${(error as Error).message}`, "error");
    } finally {
      setIsInspectApplying(false);
    }
  }, [inspectedElement, aiModel, chatLang, applyFileUpdates, setMessages]);

  // ── Deploy to Vercel ──
  const handleDeploy = useCallback(async () => {
    if (deployStatus === "deploying") return;
    const currentFiles = filesRef.current;
    if (currentFiles.length === 0) {
      terminalLog("⚠️ Keine Dateien zum Deployen", "info");
      return;
    }

    setDeployStatus("deploying");
    setDeployUrl(null);
    terminalLog("🚀 Deploy wird gestartet...", "info");

    try {
      const projectName = activeProjectIdRef.current || "d3-project";
      const filesToDeploy = currentFiles
        .filter((f) => !f.path.includes("node_modules") && !f.path.startsWith(".next/") && f.content.length < 500000)
        .map((f) => ({ path: f.path, content: f.content }));

      const res = await authFetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          files: filesToDeploy,
          framework: "nextjs",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        id: string;
        url: string;
        readyState: string;
      };

      setDeployUrl(data.url);
      setDeployStatus("success");
      terminalLog(`✅ Deploy gestartet: ${data.url}`, "info");
      terminalLog(`   Status: ${data.readyState}`, "info");

      const msg: ChatMessage = {
        id: genMessageId(),
        role: "assistant",
        content: `🚀 **Deployed!** → [${data.url}](${data.url})\n\nStatus: ${data.readyState}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, msg]);

      // Poll for ready state
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 60) {
          clearInterval(pollInterval);
          return;
        }
        try {
          const statusRes = await authFetch(`/api/deploy?id=${data.id}`);
          if (statusRes.ok) {
            const statusData = (await statusRes.json()) as { readyState: string; url: string };
            if (statusData.readyState === "READY") {
              clearInterval(pollInterval);
              terminalLog(`✅ Deploy live: ${statusData.url}`, "info");
              setDeployUrl(statusData.url);
            } else if (statusData.readyState === "ERROR") {
              clearInterval(pollInterval);
              setDeployStatus("error");
              terminalLog("❌ Deploy fehlgeschlagen", "error");
            }
          }
        } catch {
          // ignore poll errors
        }
      }, 5000);

      // Auto-clear success after 30s
      setTimeout(() => {
        setDeployStatus((s) => (s === "success" ? "idle" : s));
      }, 30000);
    } catch (error) {
      setDeployStatus("error");
      terminalLog(`❌ Deploy Fehler: ${(error as Error).message}`, "error");
      setTimeout(() => setDeployStatus("idle"), 5000);
    }
  }, [deployStatus, setMessages]);

  // ── Close dropdowns on outside click ──
  useEffect(() => {
    if (!modelOpen && !langOpen && !plusMenuOpen) return;
    const handler = () => {
      setModelOpen(false);
      setLangOpen(false);
      setPlusMenuOpen(false);
    };
    // Delay so the click that opened the menu doesn't immediately close it
    const id = requestAnimationFrame(() => {
      document.addEventListener("click", handler, { once: true });
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("click", handler);
    };
  }, [modelOpen, langOpen, plusMenuOpen]);

  // ── Keyboard shortcut: ⌘S to save ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (selectedPath) void saveFile(selectedPath);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedPath, saveFile]);

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // ── Parse streaming text for live progress display ──
  const streamingProgress = useMemo(() => {
    if (!streamingText) return { explanation: "", files: [] as { path: string; done: boolean }[] };
    const fileEntries: { path: string; done: boolean }[] = [];
    const explanationParts: string[] = [];
    const lines = streamingText.split("\n");
    let inFile = false;

    for (const line of lines) {
      if (line.startsWith("===FILE:")) {
        inFile = true;
        const path = line.replace("===FILE:", "").replace(/===\s*$/, "").trim();
        if (path) fileEntries.push({ path, done: false });
      } else if (line.includes("===END===")) {
        inFile = false;
        if (fileEntries.length > 0) fileEntries[fileEntries.length - 1].done = true;
      } else if (!inFile && line.trim()) {
        explanationParts.push(line);
      }
    }
    return { explanation: explanationParts.join("\n"), files: fileEntries };
  }, [streamingText]);

  // Smart detection: is this a website project? (controls quality check button visibility)
  const isWebsite = useMemo(() => isWebsiteProject(files), [files]);

  const tree = buildFileTree(files);

  return (
    <div
      className="flex h-full vibe-root"
      style={{
        background: "var(--d3-bg)",
        color: "var(--d3-text)",
        // CSS custom properties for child components — mapped to liquid glass
        "--vibe-bg": "var(--d3-bg)",
        "--vibe-panel": "rgba(255,255,255,0.02)",
        "--vibe-surface": "var(--d3-surface)",
        "--vibe-hover": "var(--d3-surface-hover)",
        "--vibe-active": "var(--d3-surface-active)",
        "--vibe-input": "rgba(255,255,255,0.04)",
        "--vibe-border": "rgba(255,255,255,0.05)",
        "--vibe-border-light": "rgba(255,255,255,0.03)",
        "--vibe-text": "var(--d3-text)",
        "--vibe-text-secondary": "var(--d3-text-secondary)",
        "--vibe-text-muted": "var(--d3-text-tertiary)",
        "--vibe-text-faint": "rgba(255,255,255,0.12)",
        "--vibe-dropdown-bg": "rgba(20,20,20,0.95)",
      } as React.CSSProperties}
    >
      {/* Theme-aware Tailwind overrides via CSS custom properties */}
      <style>{`
        .vibe-root .text-white\\/90, .vibe-root .text-white\\/85 { color: var(--vibe-text) !important; }
        .vibe-root .text-white\\/80, .vibe-root .text-white\\/70 { color: var(--vibe-text-secondary) !important; }
        .vibe-root .text-white\\/60, .vibe-root .text-white\\/55, .vibe-root .text-white\\/50 { color: var(--vibe-text-secondary) !important; }
        .vibe-root .text-white\\/40, .vibe-root .text-white\\/38 { color: var(--vibe-text-muted) !important; }
        .vibe-root .text-white\\/30, .vibe-root .text-white\\/25 { color: var(--vibe-text-faint) !important; }
        .vibe-root .text-white\\/20, .vibe-root .text-white\\/15 { color: var(--vibe-text-faint) !important; }
        .vibe-root .bg-white\\/5 { background-color: var(--vibe-hover) !important; }
        .vibe-root .bg-white\\/10 { background-color: var(--vibe-active) !important; }
        .vibe-root .hover\\:bg-white\\/5:hover { background-color: var(--vibe-hover) !important; }
        .vibe-root .hover\\:bg-white\\/10:hover { background-color: var(--vibe-active) !important; }
        .vibe-root .border-white\\/10 { border-color: var(--vibe-border) !important; }
        .vibe-root .border-white\\/8 { border-color: var(--vibe-border) !important; }
      `}</style>
      {/* ── File Explorer ── */}
      {true && (
      <div
        className="w-[220px] shrink-0 flex flex-col"
        style={{ borderRight: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.015)" }}
      >
        {/* Project Switcher */}
        <div
          className="px-2 py-2 flex flex-col gap-1"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          <button
            onClick={() => !projectName && setShowProjectPicker((p) => !p)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-left transition-all"
            style={{ background: showProjectPicker ? t.bgActive : "transparent", cursor: projectName ? "default" : "pointer" }}
          >
            <Folder size={12} style={{ color: t.accent, opacity: 0.8 }} />
            <span className="text-[11px] font-semibold flex-1 truncate" style={{ color: t.text }}>
              {projectName
                ? projectName
                : projectsLoading
                  ? "Laden..."
                  : vibeProjects.find((p) => p.id === activeProjectId)?.name ?? "Kein Projekt"}
            </span>
            {!projectName && <ChevronDown size={10} style={{ color: t.textMuted, transform: showProjectPicker ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />}
          </button>

          <AnimatePresence>
            {showProjectPicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="rounded-lg p-2 flex flex-col gap-1 mt-1"
                  style={{ background: t.bgSurface, border: `1px solid ${t.borderLight}` }}
                >
                  {/* New project input */}
                  <div className="flex gap-1 mb-1">
                    <input
                      autoFocus
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newProjectName.trim()) {
                          void createVibeProject(newProjectName.trim());
                        }
                        if (e.key === "Escape") {
                          setShowProjectPicker(false);
                          setNewProjectName("");
                        }
                      }}
                      placeholder="Neues Projekt..."
                      className="flex-1 min-w-0 rounded px-2 py-1 text-[11px] outline-none"
                      style={{ background: t.bgInput, border: `1px solid ${t.borderLight}`, color: t.text }}
                    />
                    <button
                      onClick={() => newProjectName.trim() && void createVibeProject(newProjectName.trim())}
                      disabled={!newProjectName.trim()}
                      className="w-6 h-6 flex items-center justify-center rounded transition-all disabled:opacity-30"
                      style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}
                      title="Neues Projekt erstellen"
                    >
                      <FolderPlus size={11} />
                    </button>
                  </div>

                  {/* Project list */}
                  <div className="max-h-[200px] overflow-y-auto flex flex-col gap-0.5">
                    {vibeProjects.map((vp) => (
                      <div
                        key={vp.id}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded group transition-all cursor-pointer"
                        style={{
                          background: vp.id === activeProjectId ? t.bgActive : "transparent",
                        }}
                        onClick={() => void switchProject(vp.id)}
                      >
                        <Folder size={10} style={{ color: vp.id === activeProjectId ? t.accent : t.textMuted, flexShrink: 0 }} />

                        {renamingProjectId === vp.id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && renameValue.trim()) {
                                void renameVibeProject(vp.id, renameValue.trim());
                              }
                              if (e.key === "Escape") {
                                setRenamingProjectId(null);
                                setRenameValue("");
                              }
                            }}
                            onBlur={() => {
                              if (renameValue.trim()) void renameVibeProject(vp.id, renameValue.trim());
                              else { setRenamingProjectId(null); setRenameValue(""); }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 min-w-0 rounded px-1 py-0.5 text-[10px] outline-none"
                            style={{ background: t.bgInput, border: `1px solid ${t.accent}`, color: t.text }}
                          />
                        ) : (
                          <span
                            className="text-[10px] font-medium flex-1 truncate"
                            style={{ color: vp.id === activeProjectId ? t.text : t.textSecondary }}
                          >
                            {vp.name}
                          </span>
                        )}

                        {renamingProjectId !== vp.id && (
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingProjectId(vp.id);
                                setRenameValue(vp.name);
                              }}
                              className="w-4 h-4 flex items-center justify-center rounded"
                              style={{ color: t.textMuted }}
                              title="Umbenennen"
                            >
                              <Edit3 size={8} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`"${vp.name}" wirklich loeschen? Alle Dateien werden geloescht.`)) {
                                  void deleteVibeProject(vp.id);
                                }
                              }}
                              className="w-4 h-4 flex items-center justify-center rounded hover:text-red-400 transition-colors"
                              style={{ color: t.textMuted }}
                              title="Loeschen"
                            >
                              <Trash2 size={8} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {vibeProjects.length === 0 && !projectsLoading && (
                      <p className="text-[10px] text-center py-2" style={{ color: t.textMuted }}>
                        Erstelle dein erstes Projekt
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* File Explorer Header */}
        <div
          className="px-3 py-2 flex items-center gap-2"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          <Terminal size={12} style={{ opacity: 0.4 }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider flex-1" style={{ color: t.textMuted }}>
            Dateien
          </span>
          {isLoadingFiles && (
            <Loader2 size={10} className="animate-spin text-blue-400" />
          )}
          <button
            onClick={() => setShowNewFileInput(true)}
            className="w-5 h-5 flex items-center justify-center rounded transition-colors"
            style={{ color: t.textMuted }}
            title="Neue Datei"
          >
            <Plus size={11} />
          </button>
        </div>

        {/* New file input */}
        <AnimatePresence>
          {showNewFileInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 py-2 flex gap-1">
                <input
                  autoFocus
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newFileName.trim()) {
                      createFile(newFileName.trim());
                      setNewFileName("");
                      setShowNewFileInput(false);
                    }
                    if (e.key === "Escape") {
                      setShowNewFileInput(false);
                      setNewFileName("");
                    }
                  }}
                  placeholder="app/page.tsx"
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
                />
                <button
                  onClick={() => {
                    setShowNewFileInput(false);
                    setNewFileName("");
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10"
                >
                  <X size={10} className="text-white/40" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto py-1">
          {files.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <FilePlus
                size={20}
                className="mx-auto mb-2"
                style={{ opacity: 0.2 }}
              />
              <p className="text-[11px]" style={{ color: textMuted }}>
                {isLoadingFiles
                  ? "Lade Dateien…"
                  : "Schreib einen Prompt um ein Projekt zu starten"}
              </p>
            </div>
          ) : (
            <FileTreeNodes
              nodes={tree}
              files={files}
              expandedDirs={expandedDirs}
              selectedPath={selectedPath}
              aiActiveFile={aiActiveFile}
              onSelect={userSelectFile}
              onToggleDir={toggleDir}
              onDelete={deleteFile}
              depth={0}
            />
          )}
        </div>

        {/* Stats */}
        {files.length > 0 && (
          <div
            className="px-3 py-2"
            style={{ borderTop: `1px solid ${border}` }}
          >
            <span
              className="text-[10px] font-mono"
              style={{ color: textMuted }}
            >
              {files.length} Dateien ·{" "}
              {(
                files.reduce((acc, f) => acc + f.content.length, 0) / 1000
              ).toFixed(1)}
              KB
            </span>
          </div>
        )}

        {/* GitHub section */}
        <div
          className="px-2 py-2 flex flex-col gap-1"
          style={{ borderTop: `1px solid ${border}` }}
        >
          {!ghUser ? (
            /* Not connected */
            <button
              onClick={() => setGhPanel(ghPanel === "connect" ? "closed" : "connect")}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-[10px] font-medium transition-all hover:bg-white/5"
              style={{ color: textMuted }}
            >
              <Github size={12} />
              <span>GitHub verbinden</span>
            </button>
          ) : (
            /* Connected */
            <>
              <div className="flex items-center gap-2 px-2 py-1">
                <img
                  src={ghUser.avatar_url}
                  alt={ghUser.login}
                  className="w-4 h-4 rounded-full"
                />
                <span className="text-[10px] font-medium text-white/60 flex-1 truncate">
                  {ghUser.login}
                </span>
                <button
                  onClick={ghDisconnect}
                  className="text-[9px] text-white/25 hover:text-red-400 transition-colors"
                  title="Trennen"
                >
                  <X size={9} />
                </button>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={ghOpenSave}
                  disabled={files.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-medium transition-all hover:bg-white/5 disabled:opacity-30"
                  style={{ border: `1px solid ${border}`, color: textMuted }}
                  title="Projekt auf GitHub speichern"
                >
                  <Upload size={10} />
                  Push
                </button>
                <button
                  onClick={ghOpenLoad}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-medium transition-all hover:bg-white/5"
                  style={{ border: `1px solid ${border}`, color: textMuted }}
                  title="Projekt von GitHub laden"
                >
                  <Download size={10} />
                  Pull
                </button>
              </div>
            </>
          )}

          {/* GitHub panels */}
          <AnimatePresence>
            {ghPanel !== "closed" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="rounded-lg p-3 flex flex-col gap-2"
                  style={{ background: t.userMsgBg, border: `1px solid ${border}` }}
                >
                  {/* Connect panel */}
                  {ghPanel === "connect" && (
                    <>
                      <p className="text-[10px] text-white/40">
                        Erstelle einen Token unter{" "}
                        <a
                          href="https://github.com/settings/tokens/new?scopes=repo&description=D3+Studio"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-blue-400"
                        >
                          github.com/settings/tokens
                        </a>
                        {" "}(Berechtigung: repo)
                      </p>
                      <input
                        value={ghTokenInput}
                        onChange={(e) => setGhTokenInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && ghTokenInput.trim()) {
                            void ghConnect(ghTokenInput.trim());
                          }
                          if (e.key === "Escape") setGhPanel("closed");
                        }}
                        placeholder="ghp_xxxxx..."
                        type="password"
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
                      />
                      <button
                        onClick={() => ghTokenInput.trim() && void ghConnect(ghTokenInput.trim())}
                        disabled={!ghTokenInput.trim() || ghLoading}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-medium transition-all disabled:opacity-40"
                        style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd" }}
                      >
                        {ghLoading ? <Loader2 size={10} className="animate-spin" /> : <Github size={10} />}
                        Verbinden
                      </button>
                    </>
                  )}

                  {/* Save panel */}
                  {ghPanel === "save" && (
                    <>
                      <p className="text-[10px] text-white/40">
                        Repository-Name (neu oder bestehend):
                      </p>
                      <input
                        autoFocus
                        value={ghRepoName}
                        onChange={(e) => setGhRepoName(e.target.value.replace(/\s/g, "-").toLowerCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && ghRepoName.trim()) void ghSave();
                          if (e.key === "Escape") setGhPanel("closed");
                        }}
                        placeholder="mein-projekt"
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
                      />
                      <label className="flex items-center gap-2 text-[10px] text-white/40 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ghPrivate}
                          onChange={(e) => setGhPrivate(e.target.checked)}
                          className="rounded"
                        />
                        Privates Repository
                      </label>
                      <button
                        onClick={() => void ghSave()}
                        disabled={!ghRepoName.trim() || ghLoading}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-medium transition-all disabled:opacity-40"
                        style={{ background: "rgba(52,211,153,0.2)", color: "#6ee7b7" }}
                      >
                        {ghLoading ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                        {ghLoading ? "Speichern..." : `${files.length} Dateien pushen`}
                      </button>
                    </>
                  )}

                  {/* Load panel */}
                  {ghPanel === "load" && (
                    <>
                      <p className="text-[10px] text-white/40 mb-1">
                        Deine Repositories:
                      </p>
                      {ghLoading ? (
                        <div className="flex items-center justify-center py-3">
                          <Loader2 size={14} className="animate-spin text-white/30" />
                        </div>
                      ) : ghRepos.length === 0 ? (
                        <p className="text-[10px] text-white/25 text-center py-2">
                          Keine Repositories gefunden
                        </p>
                      ) : (
                        <div className="max-h-[200px] overflow-y-auto flex flex-col gap-0.5">
                          {ghRepos.map((repo) => (
                            <button
                              key={repo.full_name}
                              onClick={() => void ghLoad(repo)}
                              disabled={ghLoading}
                              className="flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all hover:bg-white/5 disabled:opacity-40"
                            >
                              <Github size={10} className="text-white/30 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-medium text-white/70 block truncate">
                                  {repo.name}
                                </span>
                                {repo.description && (
                                  <span className="text-[9px] text-white/25 block truncate">
                                    {repo.description}
                                  </span>
                                )}
                              </div>
                              {repo.private && (
                                <Lock size={8} className="text-white/20 shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Error display */}
                  {ghError && (
                    <p className="text-[10px] text-red-400">{ghError}</p>
                  )}

                  {/* Close button */}
                  <button
                    onClick={() => setGhPanel("closed")}
                    className="text-[9px] text-white/25 hover:text-white/50 text-center transition-colors"
                  >
                    Schliessen
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      )}

      {/* ── Center: Editor + Preview + Terminal ── */}
      {true && (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        {openTabs.length > 0 && (
          <div
            className="flex items-center gap-0 px-1 shrink-0 overflow-x-auto"
            style={{
              borderBottom: `1px solid ${border}`,
              background: t.bgPanel,
              height: 36,
            }}
          >
            {openTabs.map((tabPath) => {
              const f = files.find((fi) => fi.path === tabPath);
              const isActive = tabPath === selectedPath;
              const isAiWriting = tabPath === aiActiveFile;
              const tabInfo = getFileTypeInfo(tabPath);
              return (
                <div
                  key={tabPath}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] cursor-pointer group shrink-0"
                  style={{
                    background: isActive ? t.tabActiveBg : isAiWriting ? "rgba(139,92,246,0.08)" : t.bgHover,
                    borderBottom: isActive
                      ? `2px solid ${tabInfo.color}`
                      : isAiWriting
                        ? "2px solid rgba(139,92,246,0.5)"
                        : "2px solid transparent",
                  }}
                  onClick={() => userSelectFile(tabPath)}
                  title={isAiWriting ? "KI schreibt hier..." : tabInfo.description}
                >
                  {isAiWriting ? (
                    <Sparkles size={12} className="animate-pulse" style={{ color: "#a78bfa" }} />
                  ) : (
                    fileIcon(tabPath)
                  )}
                  <span
                    className="font-mono"
                    style={{
                      color: isActive ? t.text : t.textSecondary,
                    }}
                  >
                    {tabPath.split("/").pop()}
                  </span>
                  <span
                    className="text-[8px] font-medium px-1 py-px rounded uppercase tracking-wide"
                    style={{
                      color: isActive ? tabInfo.color : t.textFaint,
                      background: isActive ? `${tabInfo.color}15` : "transparent",
                    }}
                  >
                    {tabInfo.label}
                  </span>
                  {f?.isDirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tabPath);
                    }}
                    className="w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                  >
                    <X size={9} className="text-white/40" />
                  </button>
                </div>
              );
            })}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Preview toggle button */}
            <button
              onClick={() => setShowPreview((p) => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium transition-colors mr-1"
              style={{
                background: showPreview ? "rgba(52,211,153,0.15)" : t.bgInput,
                color: showPreview ? "#6ee7b7" : t.textMuted,
                border: `1px solid ${showPreview ? "rgba(52,211,153,0.3)" : t.border}`,
              }}
              title={showPreview ? "Vorschau ausblenden" : "Vorschau einblenden"}
            >
              {showPreview ? <Square size={9} /> : <Play size={9} />}
              Vorschau
            </button>
          </div>
        )}

        {/* Editor + Preview area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor pane */}
          <div className={`flex flex-col overflow-hidden ${showPreview && previewUrl ? "w-1/2" : "flex-1"}`}>
            {selectedFile ? (
              <MonacoEditor
                height="100%"
                path={selectedFile.path}
                language={selectedFile.language}
                value={streamingContentRef.current.get(selectedFile.path) ?? selectedFile.content}
                theme={t.editorTheme}
                onMount={(editor) => {
                  editorRef.current = editor;
                  // If there's streaming content for this file, apply it now
                  const pending = streamingContentRef.current.get(selectedFile.path);
                  if (pending !== undefined) {
                    editor.getModel()?.setValue(pending);
                  }
                }}
                onChange={(value) => {
                  if (value !== undefined && !streamingContentRef.current.has(selectedFile.path)) {
                    updateFileContent(selectedFile.path, value);
                  }
                }}
                options={editorOptions}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: t.bgHover,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <Terminal size={22} style={{ opacity: 0.2 }} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-white/60 mb-1">
                    Vibe Coding IDE
                  </p>
                  <p className="text-[12px] text-white/30 max-w-[320px]">
                    Beschreibe im Chat was du bauen willst. Die KI generiert
                    echten Next.js + Tailwind + Lucide Code.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Preview pane */}
          {showPreview && (
            <div
              className="flex flex-col overflow-hidden"
              style={{
                width: (previewUrl || containerStatus !== "idle") ? "50%" : 0,
                borderLeft: (previewUrl || containerStatus !== "idle") ? `1px solid ${border}` : "none",
              }}
            >
              {/* Preview toolbar */}
              {previewUrl && (
                <div
                  className="flex items-center gap-1 px-2 shrink-0"
                  style={{
                    borderBottom: `1px solid ${border}`,
                    background: t.bgPanel,
                    height: 32,
                  }}
                >
                  {/* Status dot */}
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background:
                        containerStatus === "running"
                          ? "#34d399"
                          : containerStatus === "error"
                            ? "#f87171"
                            : "#fbbf24",
                      boxShadow:
                        containerStatus === "running"
                          ? "0 0 6px rgba(52,211,153,0.4)"
                          : "none",
                    }}
                  />

                  {/* Status text */}
                  <span className="text-[10px] flex-1 truncate ml-1" style={{ color: t.textSecondary }}>
                    {containerStatus === "running"
                      ? "Bereit"
                      : containerStatus === "installing"
                        ? "Installiere..."
                        : containerStatus === "starting"
                          ? "Startet..."
                          : containerStatus === "booting"
                            ? "Startet Mini-Computer..."
                            : containerStatus === "error"
                              ? "Fehler"
                              : "Idle"}
                  </span>

                  {/* Device toggle */}
                  <div className="flex items-center gap-px">
                    {([
                      { id: "desktop" as const, icon: Monitor, w: "100%" },
                      { id: "tablet" as const, icon: Tablet, w: "768px" },
                      { id: "mobile" as const, icon: Smartphone, w: "375px" },
                    ]).map(({ id, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setPreviewDevice(id)}
                        className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                        style={{
                          background: previewDevice === id ? t.bgActive : "transparent",
                          color: previewDevice === id ? t.text : t.textSecondary,
                        }}
                        title={id === "desktop" ? "Desktop" : id === "tablet" ? "Tablet" : "Handy"}
                      >
                        <Icon size={11} />
                      </button>
                    ))}
                  </div>

                  {/* Inspect toggle */}
                  <button
                    onClick={toggleInspect}
                    className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                    style={{
                      background: inspectEnabled ? "rgba(245,158,11,0.2)" : "transparent",
                      color: inspectEnabled ? "#f59e0b" : t.textSecondary,
                      border: inspectEnabled ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent",
                    }}
                    title={inspectEnabled ? "Inspect-Modus beenden" : "Element inspizieren (Klick auf Preview)"}
                  >
                    <MousePointerClick size={11} />
                  </button>

                  {/* Screenshot */}
                  <button
                    onClick={() => void capturePreviewScreenshot()}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                    title="Screenshot an KI senden"
                  >
                    <Camera size={10} style={{ color: t.textSecondary }} />
                  </button>
                  {/* Refresh */}
                  <button
                    onClick={() => {
                      if (iframeRef.current && previewUrl) {
                        iframeRef.current.src = previewUrl;
                      }
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                    title="Vorschau neu laden"
                  >
                    <RefreshCw size={10} style={{ color: t.textSecondary }} />
                  </button>

                  {/* Deploy */}
                  <button
                    onClick={() => void handleDeploy()}
                    disabled={deployStatus === "deploying"}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium transition-all ml-1"
                    style={{
                      background:
                        deployStatus === "success"
                          ? "rgba(52,211,153,0.2)"
                          : deployStatus === "error"
                            ? "rgba(248,113,113,0.2)"
                            : deployStatus === "deploying"
                              ? "rgba(251,191,36,0.2)"
                              : "rgba(255,255,255,0.08)",
                      color:
                        deployStatus === "success"
                          ? "#6ee7b7"
                          : deployStatus === "error"
                            ? "#fca5a5"
                            : deployStatus === "deploying"
                              ? "#fbbf24"
                              : t.textSecondary,
                      border: `1px solid ${
                        deployStatus === "success"
                          ? "rgba(52,211,153,0.3)"
                          : deployStatus === "error"
                            ? "rgba(248,113,113,0.3)"
                            : deployStatus === "deploying"
                              ? "rgba(251,191,36,0.3)"
                              : "rgba(255,255,255,0.08)"
                      }`,
                    }}
                    title={
                      deployUrl
                        ? `Deployed: ${deployUrl}`
                        : deployStatus === "deploying"
                          ? "Deploying..."
                          : "Deploy auf Vercel"
                    }
                  >
                    <Rocket size={9} className={deployStatus === "deploying" ? "animate-pulse" : ""} />
                    {deployStatus === "deploying"
                      ? "Deploying..."
                      : deployStatus === "success"
                        ? "Live!"
                        : "Deploy"}
                  </button>
                  {deployUrl && deployStatus === "success" && (
                    <a
                      href={deployUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                      title={deployUrl}
                    >
                      <ExternalLink size={9} className="text-emerald-400/60" />
                    </a>
                  )}
                </div>
              )}

              {/* Preview iframe + InspectPanel */}
              {previewUrl ? (
                <div className="flex-1 flex overflow-hidden">
                  <div className="flex-1 flex items-start justify-center overflow-auto" style={{ background: t.previewBg }}>
                    <iframe
                      ref={iframeRef}
                      src={previewUrl}
                      title="Live-Vorschau"
                      className="border-0 bg-white"
                      style={{
                        width:
                          previewDevice === "mobile"
                            ? 375
                            : previewDevice === "tablet"
                              ? 768
                              : "100%",
                        height: "100%",
                        maxWidth: "100%",
                        transition: "width 0.2s ease",
                      }}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                    />
                  </div>
                  {/* Inspect Panel */}
                  {inspectEnabled && inspectedElement && (
                    <InspectPanel
                      key={inspectedElement.selectorPath}
                      element={inspectedElement}
                      onClose={() => {
                        setInspectedElement(null);
                        setInspectEnabled(false);
                        if (iframeRef.current?.contentWindow) {
                          iframeRef.current.contentWindow.postMessage(
                            { source: "d3studio", type: "inspect-disable" },
                            "*"
                          );
                        }
                      }}
                      onStyleChange={handleInspectStyleChange}
                      onTextChange={handleInspectTextChange}
                      onAiImprove={(instruction) => void handleInspectAiImprove(instruction)}
                      onApplyChanges={(changes) => void handleInspectApplyChanges(changes)}
                      isApplying={isInspectApplying}
                    />
                  )}
                </div>
              ) : containerStatus !== "idle" ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
                  {/* Step indicator */}
                  <div className="flex flex-col items-center gap-3 w-full max-w-[280px]">
                    {/* Progress bar */}
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: t.bgInput }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: containerStatus === "error"
                            ? "#f87171"
                            : "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                        }}
                        initial={{ width: "0%" }}
                        animate={{
                          width: containerStatus === "booting"
                            ? "20%"
                            : containerStatus === "installing"
                              ? "60%"
                              : containerStatus === "starting"
                                ? "85%"
                                : containerStatus === "running"
                                  ? "100%"
                                  : containerStatus === "error"
                                    ? "100%"
                                    : "10%",
                        }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>

                    {/* Steps */}
                    <div className="flex items-center gap-2 w-full justify-between">
                      {[
                        { key: "booting", label: "Sandbox", icon: "🖥️" },
                        { key: "installing", label: "Pakete", icon: "📦" },
                        { key: "starting", label: "Server", icon: "⚡" },
                      ].map((step, i) => {
                        const steps = ["booting", "installing", "starting", "running"];
                        const currentIdx = steps.indexOf(containerStatus);
                        const stepIdx = steps.indexOf(step.key);
                        const isDone = currentIdx > stepIdx;
                        const isActive = containerStatus === step.key;
                        return (
                          <div key={step.key} className="flex flex-col items-center gap-1">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[12px]"
                              style={{
                                background: isDone
                                  ? "rgba(52,211,153,0.15)"
                                  : isActive
                                    ? "rgba(139,92,246,0.15)"
                                    : t.bgInput,
                                border: `1px solid ${isDone ? "rgba(52,211,153,0.3)" : isActive ? "rgba(139,92,246,0.3)" : "transparent"}`,
                              }}
                            >
                              {isDone ? (
                                <Check size={12} style={{ color: "#34d399" }} />
                              ) : isActive ? (
                                <Loader2 size={12} className="animate-spin" style={{ color: "#a78bfa" }} />
                              ) : (
                                <span className="opacity-40">{step.icon}</span>
                              )}
                            </div>
                            <span
                              className="text-[9px] font-medium"
                              style={{
                                color: isDone ? "#34d399" : isActive ? "#a78bfa" : t.textFaint,
                              }}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Status text */}
                    <span className="text-[11px] mt-1" style={{ color: containerStatus === "error" ? "#f87171" : t.textSecondary }}>
                      {containerStatus === "booting"
                        ? "Sandbox wird erstellt..."
                        : containerStatus === "installing"
                          ? "Dependencies werden installiert..."
                          : containerStatus === "starting"
                            ? "Dev Server startet..."
                            : containerStatus === "error"
                              ? "Fehler — siehe Terminal"
                              : "Bitte warten..."}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Terminal */}
        <TerminalOutput
          collapsed={terminalCollapsed}
          onToggle={() => setTerminalCollapsed((p) => !p)}
          onSendErrors={(errorText) => {
            const prefix = chatLang === "en"
              ? "I get the following errors in the console. Please fix them:\n\n"
              : chatLang === "fr"
                ? "J'ai les erreurs suivantes dans la console. Corrige-les s'il te plait:\n\n"
                : chatLang === "es"
                  ? "Tengo los siguientes errores en la consola. Por favor corrígelos:\n\n"
                  : "Ich bekomme folgende Fehler in der Konsole. Bitte behebe sie:\n\n";
            setInputText(prefix + errorText);
            inputRef.current?.focus();
          }}
          onFileClick={(path, line) => {
            // Open the file in the editor; strip leading ./ if present
            const cleanPath = path.replace(/^\.\//, "");
            const file = files.find((f) => f.path === cleanPath || f.path.endsWith(path));
            if (file) {
              openFile(file.path);
              // If a line number is given, scroll Monaco to it
              if (line && editorRef.current) {
                const ed = editorRef.current as { revealLineInCenter?: (line: number) => void; setPosition?: (pos: { lineNumber: number; column: number }) => void };
                setTimeout(() => {
                  ed.revealLineInCenter?.(line);
                  ed.setPosition?.({ lineNumber: line, column: 1 });
                }, 100);
              }
            }
          }}
        />
      </div>
      )}

      {/* ── Resize Handle ── */}
      <div
        className="w-1 shrink-0 cursor-col-resize flex items-center justify-center group"
        style={{ background: border }}
        onMouseDown={(e) => {
          e.preventDefault();
          resizeRef.current = { startX: e.clientX, startWidth: chatWidth };
          const onMove = (ev: MouseEvent) => {
            if (!resizeRef.current) return;
            const delta = resizeRef.current.startX - ev.clientX;
            setChatWidth(
              Math.min(600, Math.max(300, resizeRef.current.startWidth + delta))
            );
          };
          const onUp = () => {
            resizeRef.current = null;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
      >
        <GripVertical
          size={10}
          className="opacity-0 group-hover:opacity-30 transition-opacity"
        />
      </div>

      {/* ── Right: AI Chat Panel ── */}
      <div
        className="shrink-0 flex flex-col relative"
        style={{
          width: chatWidth,
          borderLeft: "1px solid rgba(255,255,255,0.04)",
          background: "rgba(255,255,255,0.015)",
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{
              background: "rgba(59,130,246,0.10)",
              border: "2px dashed rgba(59,130,246,0.5)",
              borderRadius: 12,
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <ImagePlus size={28} className="text-blue-400" />
              <span className="text-[12px] font-medium text-blue-300">Bild hier ablegen</span>
            </div>
          </div>
        )}
        {/* Thread tabs + model selector */}
        <div
          className="flex flex-col"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          {/* Thread tab bar */}
          <div className="flex items-center overflow-x-auto px-1 pt-1" style={{ gap: 2 }}>
            {threads.map((th) => (
              <div
                key={th.id}
                className="flex items-center gap-1 group shrink-0 max-w-[160px]"
              >
                <button
                  onClick={() => setActiveThreadId(th.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-md text-[11px] transition-all truncate"
                  style={{
                    background: th.id === activeThreadId ? t.bgActive : "transparent",
                    color: th.id === activeThreadId ? t.text : t.textMuted,
                    borderBottom: th.id === activeThreadId ? "2px solid #8b5cf6" : "2px solid transparent",
                  }}
                >
                  {th.isStreaming ? (
                    <Loader2 size={10} className="text-purple-400 animate-spin shrink-0" />
                  ) : (
                    <Sparkles size={10} style={{ color: th.id === activeThreadId ? "#c084fc" : t.textFaint }} />
                  )}
                  <span className="truncate">
                    {th.messages.length > 0
                      ? th.messages[0].content.slice(0, 20) + (th.messages[0].content.length > 20 ? "..." : "")
                      : th.name}
                  </span>
                </button>
                {threads.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); closeThread(th.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition-all shrink-0"
                  >
                    <X size={9} className="text-white/40" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addThread}
              className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-white/5 transition-all shrink-0"
              title="Neuer Chat"
            >
              <Plus size={12} className="text-white/30" />
            </button>
            <div className="flex-1" />
          </div>
          {/* Model + Language selector row */}
          <div className="flex items-center gap-2 px-3 py-1.5">
            {/* Model selector */}
            <div className="relative">
              <button
                onClick={() => { setModelOpen(!modelOpen); setLangOpen(false); }}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] transition-all hover:bg-white/5"
                style={{
                  border: `1px solid ${t.border}`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-blue-300 font-medium">
                  {AI_MODELS.find((m) => m.id === aiModel)?.label ??
                    aiModel.split("-").slice(0, 3).join("-")}
                </span>
                {modelOpen ? (
                  <ChevronUp size={10} className="text-blue-400/60" />
                ) : (
                  <ChevronDown size={10} className="text-blue-400/60" />
                )}
              </button>
              <AnimatePresence>
                {modelOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-20 w-[220px]"
                    style={{
                      background: t.dropdownBg,
                      border: `1px solid ${border}`,
                    }}
                  >
                    {AI_MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          onModelChange(m.id);
                          setModelOpen(false);
                        }}
                        className="w-full flex flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-white/5"
                        style={{
                          background:
                            m.id === aiModel
                              ? "rgba(59,130,246,0.12)"
                              : "transparent",
                        }}
                      >
                        <span
                          className="text-[11px] font-medium"
                          style={{
                            color:
                              m.id === aiModel
                                ? "#93c5fd"
                                : t.text,
                          }}
                        >
                          {m.label}
                        </span>
                        <span className="text-[10px]" style={{ color: t.textMuted }}>
                          {m.desc}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => { setLangOpen(!langOpen); setModelOpen(false); }}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] transition-all hover:bg-white/5"
                style={{
                  border: `1px solid ${t.border}`,
                }}
              >
                <Globe size={10} style={{ color: t.textMuted }} />
                <span style={{ color: t.textSecondary }} className="font-medium">
                  {CHAT_LANGUAGES.find((l) => l.id === chatLang)?.flag ?? "DE"}
                </span>
                {langOpen ? (
                  <ChevronUp size={10} style={{ color: t.textFaint }} />
                ) : (
                  <ChevronDown size={10} style={{ color: t.textFaint }} />
                )}
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-20 w-[160px]"
                    style={{
                      background: t.dropdownBg,
                      border: `1px solid ${border}`,
                    }}
                  >
                    {CHAT_LANGUAGES.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => {
                          setChatLang(l.id);
                          setLangOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white/5"
                        style={{
                          background:
                            l.id === chatLang
                              ? t.bgActive
                              : "transparent",
                        }}
                      >
                        <span className="text-[10px] font-mono w-5 text-center" style={{ color: t.textMuted }}>
                          {l.flag}
                        </span>
                        <span
                          className="text-[11px]"
                          style={{
                            color:
                              l.id === chatLang
                                ? t.text
                                : t.textMuted,
                          }}
                        >
                          {l.label}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Level selector */}
            <div className="relative">
              <button
                onClick={() => { setLevelOpen(!levelOpen); setModelOpen(false); setLangOpen(false); }}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] transition-all hover:bg-white/5"
                style={{ border: `1px solid ${t.border}` }}
              >
                <Sparkles size={10} style={{ color: t.textMuted }} />
                <span style={{ color: t.textSecondary }} className="font-medium">
                  {USER_LEVELS.find((l) => l.id === userLevel)?.label ?? "Anfaenger"}
                </span>
                {levelOpen ? (
                  <ChevronUp size={10} style={{ color: t.textFaint }} />
                ) : (
                  <ChevronDown size={10} style={{ color: t.textFaint }} />
                )}
              </button>
              <AnimatePresence>
                {levelOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-20 w-[180px]"
                    style={{ background: t.dropdownBg, border: `1px solid ${border}` }}
                  >
                    {USER_LEVELS.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => { setUserLevel(l.id as UserLevelId); setLevelOpen(false); }}
                        className="w-full flex flex-col px-3 py-1.5 text-left transition-colors hover:bg-white/5"
                        style={{ background: l.id === userLevel ? t.bgActive : "transparent" }}
                      >
                        <span className="text-[11px]" style={{ color: l.id === userLevel ? t.text : t.textMuted }}>
                          {l.label}
                        </span>
                        <span className="text-[9px]" style={{ color: t.textFaint }}>{l.desc}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Undo / Redo buttons */}
            {(fileUndoRedo.canUndo || fileUndoRedo.canRedo) && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleUndo}
                  disabled={!fileUndoRedo.canUndo}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] transition-all hover:bg-white/5"
                  style={{ border: `1px solid ${t.border}`, color: t.textMuted, opacity: fileUndoRedo.canUndo ? 1 : 0.3 }}
                  title="Rückgängig (⌘Z)"
                >
                  <RefreshCw size={9} />
                  <span>Undo</span>
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!fileUndoRedo.canRedo}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] transition-all hover:bg-white/5"
                  style={{ border: `1px solid ${t.border}`, color: t.textMuted, opacity: fileUndoRedo.canRedo ? 1 : 0.3 }}
                  title="Wiederherstellen (⌘⇧Z)"
                >
                  <RefreshCw size={9} style={{ transform: "scaleX(-1)" }} />
                  <span>Redo</span>
                </button>
              </div>
            )}
          </div>

          {/* Role indicator */}
          <div
            className="flex items-center gap-1 px-3 py-1.5"
            style={{ borderBottom: `1px solid ${border}`, background: t.bgSurface }}
          >
            <div className="flex-1" />
            <span className="text-[9px] font-medium" style={{ color: t.textFaint }}>
              9 Rollen aktiv
            </span>
          </div>

          {/* Custom level prompt */}
          {userLevel === "custom" && (
            <div className="px-3 py-2" style={{ borderBottom: `1px solid ${border}`, background: t.bgSurface }}>
              <textarea
                value={customLevelPrompt}
                onChange={(e) => setCustomLevelPrompt(e.target.value)}
                placeholder="Beschreibe wie die KI sich verhalten soll..."
                className="w-full bg-transparent text-[10px] text-white/70 resize-none outline-none placeholder:text-white/20"
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Chat messages */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3"
        >
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col gap-3 py-4">
              <p
                className="text-[11px] text-center"
                style={{ color: textMuted }}
              >
                Beschreibe was du bauen willst
              </p>
              <div className="flex flex-col gap-1.5">
                {[
                  "Erstelle eine moderne Portfolio-Website mit Hero, Projekte-Grid und Kontaktseite",
                  "Baue eine SaaS Landing Page mit Pricing-Tabelle, Features und Testimonials",
                  "Erstelle einen Blog mit Artikel-Liste, einzelne Artikel-Seiten und Dark Mode",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputText(suggestion)}
                    className="text-left px-3 py-2 rounded-lg text-[11px] transition-colors hover:bg-white/5"
                    style={{
                      color: t.textSecondary,
                      border: `1px solid ${t.borderLight}`,
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className="flex gap-2.5 rounded-lg px-3 py-2.5 group"
              style={{
                background: msg.role === "user" ? t.userMsgBg : "transparent",
              }}
            >
              <div className="shrink-0 mt-0.5">
                {msg.role === "user" ? (
                  <User size={13} style={{ color: t.textFaint }} />
                ) : (
                  <Sparkles size={13} style={{ color: t.textFaint }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {/* Role label */}
                <span className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: t.textFaint }}>
                  {msg.role === "user" ? "Du" : "KI"}
                </span>
                {/* Images in message */}
                {msg.images && msg.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-2">
                    {msg.images.map((img, imgIdx) => (
                      <div
                        key={imgIdx}
                        className="rounded-md overflow-hidden cursor-pointer"
                        style={{
                          border: `1px solid ${t.border}`,
                          maxWidth: 180,
                        }}
                        onClick={() => {
                          const w = window.open();
                          if (w) {
                            w.document.write(`<img src="data:${img.mediaType};base64,${img.data}" style="max-width:100%;background:#111" />`);
                          }
                        }}
                        title="Klicken zum Vergroessern"
                      >
                        <img
                          src={`data:${img.mediaType};base64,${img.data}`}
                          alt={img.name || "Screenshot"}
                          className="w-full h-auto"
                          style={{ maxHeight: 140, objectFit: "contain" }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <ChatContent
                  text={msg.content}
                  color={
                    msg.role === "user"
                      ? t.text
                      : t.textSecondary
                  }
                  onFileClick={(path) => openFile(path)}
                />
                {msg.fileUpdates && msg.fileUpdates.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.fileUpdates.map((fu) => (
                      <button
                        key={fu.path}
                        onClick={() => openFile(fu.path)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-colors hover:bg-white/10"
                        style={{
                          background: t.bgHover,
                          border: `1px solid ${t.border}`,
                          color: t.textMuted,
                        }}
                      >
                        {fileIcon(fu.path)}
                        {fu.path}
                      </button>
                    ))}
                  </div>
                )}
                {/* Retry button for assistant messages */}
                {msg.role === "assistant" && !isStreaming && (
                  <button
                    onClick={() => handleRetry(msg.id)}
                    className="mt-2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all hover:bg-white/5 opacity-0 group-hover:opacity-100"
                    style={{ color: t.textFaint }}
                    title="Neu generieren"
                  >
                    <RefreshCw size={9} />
                    Neu generieren
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Cascade / Agent running indicator */}
          {isAgentRunning && (
            <div className="rounded-lg overflow-hidden" style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}>
              {/* Header */}
              <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid rgba(245,158,11,0.08)" }}>
                <Zap size={12} className="animate-pulse" style={{ color: "#f59e0b" }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(245,158,11,0.8)" }}>
                  {cascadeMode ? "Cascade" : "Agent Loop"}
                </span>
                <span className="text-[10px] ml-auto" style={{ color: t.textFaint }}>
                  {agentIteration > 0 ? `Durchlauf ${agentIteration}/3` : ""}
                </span>
              </div>

              {/* Progress steps */}
              <div className="px-3 py-2.5">
                <div className="flex items-center gap-1 mb-2">
                  {[
                    { key: "plan", label: "Analyse", icon: "📋" },
                    { key: "build", label: "Code", icon: "🔨" },
                    { key: "test", label: "Test", icon: "🧪" },
                    { key: "dev-server", label: "Server", icon: "🚀" },
                  ].map((step, idx) => {
                    const phases = ["plan", "build", "test", "dev-server"];
                    const currentIdx = phases.indexOf(agentPhase || "");
                    const stepIdx = phases.indexOf(step.key);
                    const isDone = currentIdx > stepIdx;
                    const isActive = agentPhase === step.key;
                    return (
                      <div key={step.key} className="flex items-center gap-1 flex-1">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px]"
                          style={{
                            background: isDone ? "rgba(52,211,153,0.15)" : isActive ? "rgba(245,158,11,0.15)" : t.bgInput,
                            border: `1px solid ${isDone ? "rgba(52,211,153,0.3)" : isActive ? "rgba(245,158,11,0.3)" : "transparent"}`,
                          }}
                        >
                          {isDone ? <Check size={9} style={{ color: "#34d399" }} /> : isActive ? <Loader2 size={9} className="animate-spin" style={{ color: "#fbbf24" }} /> : <span className="opacity-30">{step.icon}</span>}
                        </div>
                        <span className="text-[9px] font-medium" style={{ color: isDone ? "#34d399" : isActive ? "#fbbf24" : t.textFaint }}>{step.label}</span>
                        {idx < 3 && <div className="flex-1 h-px mx-1" style={{ background: isDone ? "rgba(52,211,153,0.3)" : t.borderLight }} />}
                      </div>
                    );
                  })}
                </div>

                {/* Current status */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: t.textSecondary }}>
                    {agentPhase === "plan" && "Analysiere Codebase & Plan..."}
                    {agentPhase === "build" && `Generiere Code...`}
                    {agentPhase === "test" && "Teste Build im Sandbox..."}
                    {agentPhase === "fix" && `Behebe Fehler...`}
                    {agentPhase === "dev-server" && "Starte Dev Server..."}
                    {!agentPhase && "Starte..."}
                  </span>
                </div>

                {/* Abort */}
                <button
                  onClick={() => agentAbortRef.current?.abort()}
                  className="mt-2 text-[10px] px-2 py-0.5 rounded transition-colors"
                  style={{ color: "rgba(248,113,113,0.7)", border: "1px solid rgba(248,113,113,0.2)" }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex gap-2.5 rounded-lg px-3 py-2.5">
              <div className="shrink-0 mt-0.5">
                <Loader2 size={13} className="animate-spin" style={{ color: t.textFaint }} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: t.textFaint }}>KI</span>
                {streamingProgress.files.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {/* Explanation text if any */}
                    {streamingProgress.explanation && (
                      <p className="text-[11px] text-white/60 leading-relaxed">
                        {streamingProgress.explanation.slice(-200)}
                      </p>
                    )}
                    {/* File progress list */}
                    <div className="flex flex-col gap-1">
                      {streamingProgress.files.map((f, idx) => (
                        <div
                          key={f.path}
                          className="flex items-center gap-1.5 text-[11px] font-mono"
                        >
                          {f.done ? (
                            <Check size={10} className="text-emerald-400 shrink-0" />
                          ) : (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="shrink-0"
                            >
                              <Loader2 size={10} className="text-purple-400" />
                            </motion.div>
                          )}
                          <span
                            style={{
                              color: f.done
                                ? "rgba(52,211,153,0.8)"
                                : t.textSecondary,
                            }}
                          >
                            {f.path}
                          </span>
                          {!f.done && idx === streamingProgress.files.length - 1 && (
                            <span className="text-[9px] text-purple-400/60 animate-pulse ml-1">
                              schreibt...
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : streamingText ? (
                  <p className="text-[11px] text-white/60 leading-relaxed whitespace-pre-wrap break-words">
                    {streamingText.slice(-300)}
                    <span className="animate-pulse text-purple-400">▊</span>
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: textMuted }}>
                      Denkt nach…
                    </span>
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1 h-1 rounded-full bg-purple-400"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div
          className="px-3 py-3"
          style={{ borderTop: `1px solid ${border}` }}
        >
          {/* Hidden file input for image upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* Attached image previews */}
          {attachedImages.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {attachedImages.map((img, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-lg overflow-hidden"
                  style={{
                    border: `1px solid ${t.dropdownBorder}`,
                    width: 64,
                    height: 64,
                  }}
                >
                  <img
                    src={`data:${img.mediaType};base64,${img.data}`}
                    alt={img.name || "Screenshot"}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeAttachedImage(idx)}
                    className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center rounded-bl bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={8} className="text-white/80" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          {!isStreaming && !isAgentRunning && (
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              {/* Agent Build — when .d3/ files exist */}
              {files.some(f => f.path.startsWith(".d3/")) && (
                <button
                  onClick={() => void handleAgentBuild()}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all hover:bg-white/5"
                  style={{
                    border: "1px solid rgba(245,158,11,0.3)",
                    color: "rgba(245,158,11,0.85)",
                    background: "rgba(245,158,11,0.06)",
                  }}
                >
                  <Zap size={10} />
                  Agent Build
                </button>
              )}
              {/* Design Import — when a design project with blocks exists */}
              {project && project.pages.some(p => p.blocks.length > 0) && files.length === 0 && (
                <button
                  onClick={() => {
                    setInputText(designToVibePrompt(project));
                    setTimeout(() => {
                      const sendBtn = document.querySelector("[data-send-btn]") as HTMLButtonElement | null;
                      sendBtn?.click();
                    }, 50);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all hover:bg-white/5"
                  style={{
                    border: "1px solid rgba(59,130,246,0.25)",
                    color: "rgba(59,130,246,0.8)",
                  }}
                >
                  <Palette size={10} />
                  Design importieren
                </button>
              )}
              {files.length > 0 && isWebsiteProject(files) && (
                <button
                  onClick={() => {
                    setInputText(buildQualityCheckPrompt(chatLang));
                    setTimeout(() => {
                      const sendBtn = document.querySelector("[data-send-btn]") as HTMLButtonElement | null;
                      sendBtn?.click();
                    }, 50);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all hover:bg-white/5"
                  style={{
                    border: "1px solid rgba(34,197,94,0.2)",
                    color: "rgba(34,197,94,0.7)",
                  }}
                >
                  <ShieldCheck size={10} />
                  Website-Qualitaet pruefen
                </button>
              )}
              {files.length > 0 && (
                <button
                  onClick={() => {
                    const prompt = chatLang === "en"
                      ? "Review the current code and suggest improvements for performance, accessibility, and code quality."
                      : chatLang === "fr"
                        ? "Analyse le code actuel et propose des ameliorations."
                        : "Pruefe den aktuellen Code und schlage Verbesserungen vor fuer Performance, Barrierefreiheit und Code-Qualitaet.";
                    setInputText(prompt);
                    inputRef.current?.focus();
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all hover:bg-white/5"
                  style={{
                    border: "1px solid rgba(139,92,246,0.2)",
                    color: "rgba(139,92,246,0.6)",
                  }}
                >
                  <RefreshCw size={10} />
                  Code Review
                </button>
              )}
            </div>
          )}

          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2"
            style={{
              background: t.bgInput,
              border: `1px solid ${t.border}`,
            }}
          >
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              autoComplete="off"
              data-form-type="other"
              data-lpignore="true"
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (cascadeMode && inputText.trim()) {
                    const prompt = inputText.trim();
                    setInputText("");
                    const userMsg: ChatMessage = { id: genMessageId(), role: "user", content: prompt, timestamp: Date.now() };
                    setMessages((prev) => [...prev, userMsg]);
                    void handleAgentBuild(prompt);
                  } else {
                    void handleSend();
                  }
                }
              }}
              rows={2}
              disabled={isStreaming || isAgentRunning}
              placeholder={cascadeMode ? "⚡ Cascade: Beschreibe was gebaut werden soll..." : "Beschreibe was du bauen oder ändern willst…"}
              className="flex-1 resize-none bg-transparent text-[12px] leading-relaxed outline-none min-h-[40px] max-h-[120px]"
              style={{ color: t.text }}
            />
            {/* Plus menu button */}
            <div className="relative shrink-0">
              <button
                onClick={() => setPlusMenuOpen((p) => !p)}
                disabled={isStreaming}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-white/10"
                title="Optionen"
              >
                <Plus
                  size={15}
                  style={{
                    color: plusMenuOpen ? t.textSecondary : t.textFaint,
                    transform: plusMenuOpen ? "rotate(45deg)" : "none",
                    transition: "transform 0.2s, color 0.2s",
                  }}
                />
              </button>
              <AnimatePresence>
                {plusMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full left-0 mb-2 rounded-lg overflow-hidden z-30 w-[200px]"
                    style={{
                      background: t.dropdownBg,
                      border: `1px solid ${t.dropdownBorder}`,
                      boxShadow: t.dropdownShadow,
                    }}
                  >
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setPlusMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/5"
                    >
                      <ImagePlus size={13} style={{ color: "#60a5fa" }} />
                      <div>
                        <span className="text-[11px] block" style={{ color: t.textSecondary }}>Bild hochladen</span>
                        <span className="text-[10px]" style={{ color: t.textFaint }}>Oder Cmd+V / Drag & Drop</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        void capturePreviewScreenshot();
                        setPlusMenuOpen(false);
                      }}
                      disabled={!previewUrl}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/5 disabled:opacity-30"
                    >
                      <Camera size={13} style={{ color: "#34d399" }} />
                      <div>
                        <span className="text-[11px] block" style={{ color: t.textSecondary }}>Vorschau-Screenshot</span>
                        <span className="text-[10px]" style={{ color: t.textFaint }}>Preview an KI senden</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        const prefix = chatLang === "en" ? "Create a plan for: "
                          : chatLang === "fr" ? "Cree un plan pour: "
                          : chatLang === "es" ? "Crea un plan para: "
                          : "Erstelle einen Plan fuer: ";
                        setInputText(prefix);
                        setPlusMenuOpen(false);
                        inputRef.current?.focus();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/5"
                    >
                      <ClipboardList size={13} style={{ color: "#a78bfa" }} />
                      <div>
                        <span className="text-[11px] block" style={{ color: t.textSecondary }}>Planung</span>
                        <span className="text-[10px]" style={{ color: t.textFaint }}>Projekt planen lassen</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        const prefix = chatLang === "en" ? "Please explain: "
                          : chatLang === "fr" ? "Explique-moi: "
                          : chatLang === "es" ? "Explicame por favor: "
                          : "Erklaere mir bitte: ";
                        setInputText(prefix);
                        setPlusMenuOpen(false);
                        inputRef.current?.focus();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/5"
                    >
                      <MessageCircle size={13} style={{ color: "#34d399" }} />
                      <div>
                        <span className="text-[11px] block" style={{ color: t.textSecondary }}>Frage stellen</span>
                        <span className="text-[10px]" style={{ color: t.textFaint }}>Etwas erklaeren lassen</span>
                      </div>
                    </button>
                    {/* Quality Check — only for website projects */}
                    {isWebsiteProject(files) && (
                      <>
                        <div className="mx-2 my-1" style={{ borderTop: `1px solid ${t.borderLight}` }} />
                        <button
                          onClick={() => {
                            setInputText(buildQualityCheckPrompt(chatLang));
                            setPlusMenuOpen(false);
                            // Auto-send the quality check
                            setTimeout(() => {
                              const sendBtn = document.querySelector("[data-send-btn]") as HTMLButtonElement | null;
                              sendBtn?.click();
                            }, 50);
                          }}
                          disabled={isStreaming}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/5 disabled:opacity-30"
                        >
                          <ShieldCheck size={13} style={{ color: "#22c55e" }} />
                          <div>
                            <span className="text-[11px] block" style={{ color: t.textSecondary }}>Website pruefen</span>
                            <span className="text-[10px]" style={{ color: t.textFaint }}>SEO, Links, Impressum checken</span>
                          </div>
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Cascade toggle */}
            <button
              onClick={() => setCascadeMode((p) => !p)}
              disabled={isStreaming || isAgentRunning}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all shrink-0"
              style={{
                background: cascadeMode ? "rgba(245,158,11,0.15)" : "transparent",
                border: cascadeMode ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent",
              }}
              title={cascadeMode ? "Cascade Mode AN — AI baut autonom (Plan → Code → Test → Fix)" : "Cascade Mode — Klicken zum Aktivieren"}
            >
              <Zap
                size={13}
                style={{
                  color: cascadeMode ? "#f59e0b" : t.textFaint,
                }}
              />
            </button>
            {/* Send button */}
            <button
              data-send-btn
              onClick={() => {
                if (cascadeMode && inputText.trim()) {
                  const prompt = inputText.trim();
                  setInputText("");
                  const userMsg: ChatMessage = { id: genMessageId(), role: "user", content: prompt, timestamp: Date.now() };
                  setMessages((prev) => [...prev, userMsg]);
                  void handleAgentBuild(prompt);
                } else {
                  void handleSend();
                }
              }}
              disabled={isStreaming || isAgentRunning || (!inputText.trim() && attachedImages.length === 0)}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all shrink-0"
              style={{
                background:
                  isStreaming || isAgentRunning || (!inputText.trim() && attachedImages.length === 0)
                    ? t.bgInput
                    : cascadeMode
                      ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                      : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              }}
            >
              {isStreaming || isAgentRunning ? (
                <Loader2 size={13} className="animate-spin text-white/40" />
              ) : cascadeMode ? (
                <Zap
                  size={13}
                  style={{
                    color: inputText.trim() ? "#fff" : t.textFaint,
                  }}
                />
              ) : (
                <Send
                  size={13}
                  style={{
                    color: (inputText.trim() || attachedImages.length > 0)
                      ? "#fff"
                      : t.textFaint,
                  }}
                />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1">
            <span className="text-[10px]" style={{ color: cascadeMode ? "rgba(245,158,11,0.5)" : textMuted }}>
              {cascadeMode ? "⚡ Cascade — AI baut autonom: Plan → Code → Test → Fix" : "↵ Senden · Shift+↵ Neue Zeile · ⌘S Speichern"}
            </span>
            {isStreaming && (
              <button
                onClick={() => abortRef.current?.abort()}
                className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
              >
                Abbrechen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── File Tree Sub-Components ── */

function FileTreeNodes({
  nodes,
  files,
  expandedDirs,
  selectedPath,
  aiActiveFile,
  onSelect,
  onToggleDir,
  onDelete,
  depth,
}: {
  nodes: TreeNode[];
  files: VibeCodeFile[];
  expandedDirs: Set<string>;
  selectedPath: string | null;
  aiActiveFile: string | null;
  onSelect: (path: string) => void;
  onToggleDir: (path: string) => void;
  onDelete: (path: string) => Promise<void>;
  depth: number;
}) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.path}>
          <div
            className="flex items-center gap-1 w-full text-left px-2 py-[3px] transition-colors hover:bg-white/5 rounded-sm cursor-pointer group overflow-hidden"
            style={{
              paddingLeft: 8 + depth * 12,
              background:
                selectedPath === node.path && !node.isDir
                  ? "rgba(59,130,246,0.2)"
                  : "transparent",
            }}
            onClick={() => {
              if (node.isDir) onToggleDir(node.path);
              else onSelect(node.path);
            }}
          >
            {node.isDir ? (
              expandedDirs.has(node.path) ? (
                <ChevronDown size={11} style={{ opacity: 0.4 }} />
              ) : (
                <ChevronRight size={11} style={{ opacity: 0.3 }} />
              )
            ) : (
              <span className="w-[11px]" />
            )}
            {node.isDir ? (
              expandedDirs.has(node.path) ? (
                <FolderOpen size={12} className="text-yellow-400/80" />
              ) : (
                <Folder size={12} className="text-yellow-400/60" />
              )
            ) : aiActiveFile === node.path ? (
              <Sparkles size={12} className="animate-pulse" style={{ color: "#a78bfa" }} />
            ) : (
              fileIcon(node.path)
            )}
            <span
              className="text-[11px] font-mono flex-1 truncate"
              style={{
                color:
                  selectedPath === node.path && !node.isDir
                    ? "#93c5fd"
                    : node.isDir
                      ? "var(--vibe-text-secondary)"
                      : "var(--vibe-text-muted)",
              }}
              title={node.isDir ? (folderLabel(node.name) ?? node.name) : getFileTypeInfo(node.path).description}
            >
              {node.name}
            </span>
            {/* Human-friendly type label (hover only) */}
            {!node.isDir && (
              <span
                className="text-[8px] font-medium px-1 py-px rounded shrink-0 uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  color: getFileTypeInfo(node.path).color,
                  background: `${getFileTypeInfo(node.path).color}15`,
                }}
              >
                {fileLabel(node.path)}
              </span>
            )}
            {node.isDir && folderLabel(node.name) && (
              <span
                className="text-[8px] font-medium px-1 py-px rounded shrink-0 tracking-wide opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--vibe-text-faint)" }}
              >
                {folderLabel(node.name)}
              </span>
            )}
            {/* AI writing indicator */}
            {!node.isDir && aiActiveFile === node.path && (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                style={{ background: "#a78bfa" }}
              />
            )}
            {/* Dirty indicator */}
            {!node.isDir && aiActiveFile !== node.path &&
              files.find((f) => f.path === node.path)?.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              )}
            {/* Delete button */}
            {!node.isDir && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void onDelete(node.path);
                }}
                className="w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all shrink-0"
              >
                <Trash2 size={9} className="text-red-400/60" />
              </button>
            )}
          </div>
          {node.isDir && expandedDirs.has(node.path) && (
            <FileTreeNodes
              nodes={node.children}
              files={files}
              expandedDirs={expandedDirs}
              selectedPath={selectedPath}
              aiActiveFile={aiActiveFile}
              onSelect={onSelect}
              onToggleDir={onToggleDir}
              onDelete={onDelete}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </>
  );
}
