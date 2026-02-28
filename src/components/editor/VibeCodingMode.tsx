"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
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
  type LucideIcon,
} from "lucide-react";
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
  type UserLevelId,
  detectLanguage,
  parseVibeCodeResponse,
  genMessageId,
  createThread,
  STARTER_FILES,
  CHAT_LANGUAGES,
  CHAT_ROLES,
  USER_LEVELS,
  vibeFilesToFileSystemTree,
} from "@/lib/vibe-code";
import {
  type ContainerStatus,
  onContainerEvent,
  startProject,
  writeFile as wcWriteFile,
  deleteFile as wcDeleteFile,
  teardown,
  runInstall,
} from "@/lib/webcontainer";
import TerminalOutput, { terminalLog, terminalClear } from "./TerminalOutput";
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
  return { icon: FileCode, color: "rgba(255,255,255,0.4)", label: "Datei", description: "Allgemeine Datei" };
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

export default function VibeCodingMode({
  aiModel,
  onModelChange,
}: VibeCodingProps) {
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
  const messages = activeThread?.messages ?? [];
  const inputText = activeThread?.inputText ?? "";
  const isStreaming = activeThread?.isStreaming ?? false;
  const streamingText = activeThread?.streamingText ?? "";
  const attachedImages = activeThread?.attachedImages ?? [];

  // Setters that update the active thread
  const setMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    updateThread(activeThreadId, (t) => ({
      ...t,
      messages: typeof updater === "function" ? updater(t.messages) : updater,
    }));
  }, [activeThreadId, updateThread]);

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

  // ── Roles & Level state ──
  const [activeRoles, setActiveRoles] = useState<ChatRoleId[]>(["developer", "designer"]);
  const [userLevel, setUserLevel] = useState<UserLevelId>("beginner");
  const [levelOpen, setLevelOpen] = useState(false);
  const [customLevelPrompt, setCustomLevelPrompt] = useState("");

  // ── Undo state ──
  const [fileHistory, setFileHistory] = useState<VibeCodeFile[][]>([]);

  // ── WebContainer / Preview state ──
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [containerStatus, setContainerStatus] = useState<ContainerStatus>("idle");
  const [terminalCollapsed, setTerminalCollapsed] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showPreview, setShowPreview] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

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
  filesRef.current = files;
  messagesRef.current = messages;

  const border = "rgba(255,255,255,0.07)";
  const textMuted = "rgba(255,255,255,0.38)";

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

  // ── Load files from Supabase on mount ──
  useEffect(() => {
    const loadFiles = async () => {
      setIsLoadingFiles(true);
      try {
        const res = await fetch("/api/files");
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
            // Auto-boot WebContainer with loaded files
            setTimeout(() => void bootWebContainer(dbFiles), 200);
          }
        }
      } catch (err) {
        console.error("Failed to load files from DB:", err);
      } finally {
        setIsLoadingFiles(false);
      }
    };
    loadFiles();
  }, []);

  // ── Auto-scroll chat ──
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  // ── WebContainer event listener ──
  useEffect(() => {
    const unsub = onContainerEvent((e) => {
      if (e.status) setContainerStatus(e.status);
      if (e.type === "server-ready" && e.url) {
        setPreviewUrl(e.url);
        setTerminalCollapsed(true);
      }
      if (e.type === "log" && e.message) {
        terminalLog(e.message, "stdout");
      }
      if (e.type === "error" && e.message) {
        terminalLog(e.message, "error");
        setTerminalCollapsed(false);
      }
    });
    return unsub;
  }, []);

  // ── Boot WebContainer when files are available ──
  const bootWebContainer = useCallback(async (currentFiles: VibeCodeFile[]) => {
    if (containerBootedRef.current || currentFiles.length === 0) return;
    containerBootedRef.current = true;
    setTerminalCollapsed(false);
    terminalClear();
    terminalLog("Mini-Computer wird gestartet...", "info");

    try {
      const tree = vibeFilesToFileSystemTree(currentFiles);
      const url = await startProject(tree as Parameters<typeof startProject>[0]);
      setPreviewUrl(url);
    } catch (err) {
      terminalLog(`Fehler: ${(err as Error).message}`, "error");
      containerBootedRef.current = false;
    }
  }, []);

  // ── Teardown on unmount ──
  useEffect(() => {
    return () => {
      teardown().catch(() => {});
      containerBootedRef.current = false;
    };
  }, []);

  // ── Sync single file to WebContainer (debounced) ──
  const syncFileToContainer = useCallback((path: string, content: string) => {
    if (!containerBootedRef.current) return;
    if (wcSyncTimerRef.current) clearTimeout(wcSyncTimerRef.current);
    wcSyncTimerRef.current = setTimeout(() => {
      wcWriteFile(path, content).catch(() => {});
      // If package.json changed, re-run npm install
      if (path === "package.json") {
        terminalLog("package.json geaendert — installiere Pakete neu...", "info");
        runInstall().catch(() => {});
      }
    }, 300);
  }, []);

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
        await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: null,
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
        await fetch(`/api/files?file_name=${encodeURIComponent(path)}`, {
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
        fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: null, files: filesToSave }),
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

      // Sync to WebContainer
      if (containerBootedRef.current) {
        let needsInstall = false;
        for (const u of updates) {
          if (u.action === "delete") {
            wcDeleteFile(u.path).catch(() => {});
          } else {
            wcWriteFile(u.path, u.content).catch(() => {});
            if (u.path === "package.json") needsInstall = true;
          }
        }
        if (needsInstall) {
          terminalLog("package.json geaendert — installiere Pakete neu...", "info");
          runInstall().catch(() => {});
        }
      }
    },
    [openFile]
  );

  // ── Undo: restore previous file snapshot ──
  const handleUndo = useCallback(() => {
    setFileHistory((prev) => {
      if (prev.length === 0) return prev;
      const snapshot = prev[prev.length - 1];
      setFiles(snapshot);
      // Sync restored files to WebContainer
      for (const f of snapshot) {
        wcWriteFile(f.path, f.content).catch(() => {});
      }
      return prev.slice(0, -1);
    });
  }, []);

  const toggleRole = useCallback((roleId: ChatRoleId) => {
    setActiveRoles((prev) => {
      if (prev.includes(roleId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((r) => r !== roleId);
      }
      return [...prev, roleId];
    });
  }, []);

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
      setFiles(newFiles);
      if (newFiles.length > 0) {
        setSelectedPath(newFiles[0].path);
        setOpenTabs([newFiles[0].path]);
      }
      setGhPanel("closed");
      // Show success in chat
      const msg: ChatMessage = {
        id: genMessageId(),
        role: "assistant",
        content: `**${repo.name}** geladen — ${newFiles.length} Dateien von GitHub importiert.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, msg]);
    } catch (e) {
      setGhError(e instanceof Error ? e.message : "Laden fehlgeschlagen");
    } finally {
      setGhLoading(false);
    }
  }, [setFiles, setSelectedPath, setOpenTabs, setMessages]);

  // ── Send message to AI ──
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if ((!text && attachedImages.length === 0) || isStreaming) return;

    // If no files exist, seed with starter files
    let currentFiles = filesRef.current;
    if (currentFiles.length === 0) {
      setFiles(STARTER_FILES);
      currentFiles = STARTER_FILES;

      // Save starter files to Supabase
      fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: null,
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
      setFileHistory((prev) => [...prev.slice(-19), [...filesRef.current]]);

      const res = await fetch("/api/vibe-code", {
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
      let liveSelectedPath = selectedPath; // track selected path locally (closure-safe)

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
                liveSelectedPath = newPath;
                setSelectedPath(newPath);
                setOpenTabs((prev) => prev.includes(newPath) ? prev : [...prev, newPath]);

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
                  const ed = editorRef.current as { getModel?: () => { getValue: () => string; setValue: (v: string) => void } | null } | null;
                  const model = ed?.getModel?.();
                  if (model && liveSelectedPath === currentFilePath) {
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

                // Boot WebContainer after first AI generation
                if (!containerBootedRef.current) {
                  setTimeout(() => {
                    const latestFiles = filesRef.current;
                    if (latestFiles.length > 0) {
                      void bootWebContainer(latestFiles);
                    }
                  }, 100);
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

      const errMsg: ChatMessage = {
        id: genMessageId(),
        role: "assistant",
        content: `Fehler: ${(error as Error).message}`,
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

      // Auto-detect terminal errors after a delay (give WebContainer time to report)
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
  }, [inputText, isStreaming, aiModel, applyFileUpdates, attachedImages, chatLang, activeRoles, userLevel, customLevelPrompt]);

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

  const tree = buildFileTree(files);

  return (
    <div
      className="flex h-full"
      style={{ background: "#0d0d0d", color: "#e5e5e5" }}
    >
      {/* ── Left: File Explorer ── */}
      <div
        className="w-[220px] shrink-0 flex flex-col"
        style={{ borderRight: `1px solid ${border}`, background: "#111" }}
      >
        {/* Header */}
        <div
          className="px-3 py-2.5 flex items-center gap-2"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          <Terminal size={12} style={{ opacity: 0.4 }} />
          <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider flex-1">
            Explorer
          </span>
          {isLoadingFiles && (
            <Loader2 size={10} className="animate-spin text-blue-400" />
          )}
          <button
            onClick={() => setShowNewFileInput(true)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            title="Neue Datei"
          >
            <Plus size={11} className="text-white/40" />
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
              onSelect={openFile}
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
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${border}` }}
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

      {/* ── Center: Editor + Preview + Terminal ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        {openTabs.length > 0 && (
          <div
            className="flex items-center gap-0 px-1 shrink-0 overflow-x-auto"
            style={{
              borderBottom: `1px solid ${border}`,
              background: "#111",
              height: 36,
            }}
          >
            {openTabs.map((tabPath) => {
              const f = files.find((fi) => fi.path === tabPath);
              const isActive = tabPath === selectedPath;
              const tabInfo = getFileTypeInfo(tabPath);
              return (
                <div
                  key={tabPath}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] cursor-pointer group shrink-0"
                  style={{
                    background: isActive ? "#0d0d0d" : "transparent",
                    borderBottom: isActive
                      ? `2px solid ${tabInfo.color}`
                      : "2px solid transparent",
                  }}
                  onClick={() => setSelectedPath(tabPath)}
                  title={tabInfo.description}
                >
                  {fileIcon(tabPath)}
                  <span
                    className="font-mono"
                    style={{
                      color: isActive
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {tabPath.split("/").pop()}
                  </span>
                  <span
                    className="text-[8px] font-medium px-1 py-px rounded uppercase tracking-wide"
                    style={{
                      color: isActive ? tabInfo.color : "rgba(255,255,255,0.25)",
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
                background: showPreview ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)",
                color: showPreview ? "#6ee7b7" : "rgba(255,255,255,0.4)",
                border: `1px solid ${showPreview ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.08)"}`,
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
                theme="vs-dark"
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
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
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
                width: previewUrl ? "50%" : 0,
                borderLeft: previewUrl ? `1px solid ${border}` : "none",
              }}
            >
              {/* Preview toolbar */}
              {previewUrl && (
                <div
                  className="flex items-center gap-1 px-2 shrink-0"
                  style={{
                    borderBottom: `1px solid ${border}`,
                    background: "#111",
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
                  <span className="text-[10px] text-white/40 flex-1 truncate ml-1">
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
                          background: previewDevice === id ? "rgba(255,255,255,0.1)" : "transparent",
                          color: previewDevice === id ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)",
                        }}
                        title={id === "desktop" ? "Desktop" : id === "tablet" ? "Tablet" : "Handy"}
                      >
                        <Icon size={11} />
                      </button>
                    ))}
                  </div>

                  {/* Screenshot */}
                  <button
                    onClick={() => void capturePreviewScreenshot()}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                    title="Screenshot an KI senden"
                  >
                    <Camera size={10} className="text-white/30" />
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
                    <RefreshCw size={10} className="text-white/30" />
                  </button>
                </div>
              )}

              {/* Preview iframe */}
              {previewUrl ? (
                <div className="flex-1 flex items-start justify-center overflow-auto" style={{ background: "#1a1a1a" }}>
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
              ) : containerStatus !== "idle" ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <Loader2 size={24} className="animate-spin text-white/20" />
                  <span className="text-[11px] text-white/30">
                    {containerStatus === "booting"
                      ? "Mini-Computer startet..."
                      : containerStatus === "installing"
                        ? "Pakete werden installiert..."
                        : containerStatus === "starting"
                          ? "Server wird gestartet..."
                          : "Bitte warten..."}
                  </span>
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
          borderLeft: `1px solid ${border}`,
          background: "#111",
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
            {threads.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-1 group shrink-0 max-w-[160px]"
              >
                <button
                  onClick={() => setActiveThreadId(t.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-md text-[11px] transition-all truncate"
                  style={{
                    background: t.id === activeThreadId ? "rgba(255,255,255,0.06)" : "transparent",
                    color: t.id === activeThreadId ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                    borderBottom: t.id === activeThreadId ? "2px solid #8b5cf6" : "2px solid transparent",
                  }}
                >
                  {t.isStreaming ? (
                    <Loader2 size={10} className="text-purple-400 animate-spin shrink-0" />
                  ) : (
                    <Sparkles size={10} className={t.id === activeThreadId ? "text-purple-400" : "text-white/20"} />
                  )}
                  <span className="truncate">
                    {t.messages.length > 0
                      ? t.messages[0].content.slice(0, 20) + (t.messages[0].content.length > 20 ? "..." : "")
                      : t.name}
                  </span>
                </button>
                {threads.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); closeThread(t.id); }}
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
                  border: "1px solid rgba(255,255,255,0.08)",
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
                      background: "#1a1a1a",
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
                                : "rgba(255,255,255,0.8)",
                          }}
                        >
                          {m.label}
                        </span>
                        <span className="text-[10px]" style={{ color: textMuted }}>
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
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Globe size={10} style={{ color: "rgba(255,255,255,0.4)" }} />
                <span style={{ color: "rgba(255,255,255,0.6)" }} className="font-medium">
                  {CHAT_LANGUAGES.find((l) => l.id === chatLang)?.flag ?? "DE"}
                </span>
                {langOpen ? (
                  <ChevronUp size={10} style={{ color: "rgba(255,255,255,0.3)" }} />
                ) : (
                  <ChevronDown size={10} style={{ color: "rgba(255,255,255,0.3)" }} />
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
                      background: "#1a1a1a",
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
                              ? "rgba(255,255,255,0.06)"
                              : "transparent",
                        }}
                      >
                        <span className="text-[10px] font-mono w-5 text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {l.flag}
                        </span>
                        <span
                          className="text-[11px]"
                          style={{
                            color:
                              l.id === chatLang
                                ? "rgba(255,255,255,0.9)"
                                : "rgba(255,255,255,0.55)",
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
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Sparkles size={10} style={{ color: "rgba(255,255,255,0.4)" }} />
                <span style={{ color: "rgba(255,255,255,0.6)" }} className="font-medium">
                  {USER_LEVELS.find((l) => l.id === userLevel)?.label ?? "Anfaenger"}
                </span>
                {levelOpen ? (
                  <ChevronUp size={10} style={{ color: "rgba(255,255,255,0.3)" }} />
                ) : (
                  <ChevronDown size={10} style={{ color: "rgba(255,255,255,0.3)" }} />
                )}
              </button>
              <AnimatePresence>
                {levelOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-20 w-[180px]"
                    style={{ background: "#1a1a1a", border: `1px solid ${border}` }}
                  >
                    {USER_LEVELS.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => { setUserLevel(l.id as UserLevelId); setLevelOpen(false); }}
                        className="w-full flex flex-col px-3 py-1.5 text-left transition-colors hover:bg-white/5"
                        style={{ background: l.id === userLevel ? "rgba(255,255,255,0.06)" : "transparent" }}
                      >
                        <span className="text-[11px]" style={{ color: l.id === userLevel ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)" }}>
                          {l.label}
                        </span>
                        <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>{l.desc}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Undo button */}
            {fileHistory.length > 0 && (
              <button
                onClick={handleUndo}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                title="Letzte KI-Aenderung rueckgaengig machen"
              >
                <RefreshCw size={9} />
                <span>Undo</span>
              </button>
            )}
          </div>

          {/* Role chips */}
          <div
            className="flex flex-wrap gap-1 px-3 py-1.5"
            style={{ borderBottom: `1px solid ${border}`, background: "rgba(0,0,0,0.15)" }}
          >
            {CHAT_ROLES.map((role) => {
              const isActive = activeRoles.includes(role.id);
              return (
                <button
                  key={role.id}
                  onClick={() => toggleRole(role.id)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium transition-all"
                  style={{
                    background: isActive ? `${role.color}20` : "rgba(255,255,255,0.03)",
                    color: isActive ? role.color : "rgba(255,255,255,0.3)",
                    border: `1px solid ${isActive ? `${role.color}40` : "rgba(255,255,255,0.06)"}`,
                  }}
                  title={role.desc}
                >
                  {role.name}
                </button>
              );
            })}
          </div>

          {/* Custom level prompt */}
          {userLevel === "custom" && (
            <div className="px-3 py-2" style={{ borderBottom: `1px solid ${border}`, background: "rgba(0,0,0,0.1)" }}>
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
                      color: "rgba(255,255,255,0.6)",
                      border: "1px solid rgba(255,255,255,0.06)",
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
              className="flex gap-2.5 rounded-lg px-3 py-2.5"
              style={{
                background: msg.role === "user" ? "rgba(255,255,255,0.03)" : "transparent",
              }}
            >
              <div className="shrink-0 mt-0.5">
                {msg.role === "user" ? (
                  <User size={13} style={{ color: "rgba(255,255,255,0.3)" }} />
                ) : (
                  <Sparkles size={13} style={{ color: "rgba(255,255,255,0.3)" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {/* Role label */}
                <span className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "rgba(255,255,255,0.25)" }}>
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
                          border: "1px solid rgba(255,255,255,0.08)",
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
                      ? "rgba(255,255,255,0.85)"
                      : "rgba(255,255,255,0.7)"
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
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.5)",
                        }}
                      >
                        {fileIcon(fu.path)}
                        {fu.path}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex gap-2.5 rounded-lg px-3 py-2.5">
              <div className="shrink-0 mt-0.5">
                <Loader2 size={13} className="animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "rgba(255,255,255,0.25)" }}>KI</span>
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
                                : "rgba(255,255,255,0.6)",
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
                    border: "1px solid rgba(255,255,255,0.1)",
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

          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              rows={2}
              disabled={isStreaming}
              placeholder="Beschreibe was du bauen oder ändern willst…"
              className="flex-1 resize-none bg-transparent text-[12px] leading-relaxed outline-none min-h-[40px] max-h-[120px]"
              style={{ color: "rgba(255,255,255,0.88)" }}
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
                    color: plusMenuOpen ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
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
                      background: "#1a1a1a",
                      border: `1px solid rgba(255,255,255,0.1)`,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
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
                        <span className="text-[11px] block" style={{ color: "rgba(255,255,255,0.8)" }}>Bild hochladen</span>
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Oder Cmd+V / Drag & Drop</span>
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
                        <span className="text-[11px] block" style={{ color: "rgba(255,255,255,0.8)" }}>Vorschau-Screenshot</span>
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Preview an KI senden</span>
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
                        <span className="text-[11px] block" style={{ color: "rgba(255,255,255,0.8)" }}>Planung</span>
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Projekt planen lassen</span>
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
                        <span className="text-[11px] block" style={{ color: "rgba(255,255,255,0.8)" }}>Frage stellen</span>
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Etwas erklaeren lassen</span>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Send button */}
            <button
              onClick={() => void handleSend()}
              disabled={isStreaming || (!inputText.trim() && attachedImages.length === 0)}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all shrink-0"
              style={{
                background:
                  isStreaming || (!inputText.trim() && attachedImages.length === 0)
                    ? "rgba(255,255,255,0.05)"
                    : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              }}
            >
              {isStreaming ? (
                <Loader2 size={13} className="animate-spin text-white/40" />
              ) : (
                <Send
                  size={13}
                  style={{
                    color: (inputText.trim() || attachedImages.length > 0)
                      ? "#fff"
                      : "rgba(255,255,255,0.2)",
                  }}
                />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1">
            <span className="text-[10px]" style={{ color: textMuted }}>
              ↵ Senden · Shift+↵ Neue Zeile · ⌘S Speichern
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
  onSelect,
  onToggleDir,
  onDelete,
  depth,
}: {
  nodes: TreeNode[];
  files: VibeCodeFile[];
  expandedDirs: Set<string>;
  selectedPath: string | null;
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
            className="flex items-center gap-1.5 w-full text-left px-2 py-[3px] transition-colors hover:bg-white/5 rounded-sm cursor-pointer group"
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
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(255,255,255,0.55)",
              }}
              title={node.isDir ? (folderLabel(node.name) ?? node.name) : getFileTypeInfo(node.path).description}
            >
              {node.name}
            </span>
            {/* Human-friendly type label */}
            {!node.isDir && (
              <span
                className="text-[8px] font-medium px-1 py-px rounded shrink-0 uppercase tracking-wide"
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
                className="text-[8px] font-medium px-1 py-px rounded shrink-0 tracking-wide"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                {folderLabel(node.name)}
              </span>
            )}
            {/* Dirty indicator */}
            {!node.isDir &&
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
