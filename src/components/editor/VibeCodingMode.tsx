"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { AI_MODELS } from "@/lib/settings";
import {
  type ChatMessage,
  type VibeCodeFile,
  type FileUpdate,
  detectLanguage,
  parseVibeCodeResponse,
  genMessageId,
  STARTER_FILES,
} from "@/lib/vibe-code";

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

  // ── Chat state ──
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  // ── UI state ──
  const [chatWidth, setChatWidth] = useState(380);
  const [modelOpen, setModelOpen] = useState(false);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const filesRef = useRef<VibeCodeFile[]>(files);
  const messagesRef = useRef<ChatMessage[]>(messages);
  filesRef.current = files;
  messagesRef.current = messages;

  const border = "rgba(255,255,255,0.07)";
  const textMuted = "rgba(255,255,255,0.38)";

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
    },
    []
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
    },
    [openFile]
  );

  // ── Send message to AI ──
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

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

    const userMsg: ChatMessage = {
      id: genMessageId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsStreaming(true);
    setStreamingText("");

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      // Build message history for the API (use ref for latest state)
      const apiMessages = [...messagesRef.current, userMsg].map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const res = await fetch("/api/vibe-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          currentFiles: currentFiles,
          model: aiModel,
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
              setStreamingText(accumulated);
            } else if (event.type === "done" && !doneProcessed) {
              doneProcessed = true;
              // Parse the complete response for file updates
              const { explanation, files: fileUpdates } =
                parseVibeCodeResponse(accumulated);

              const assistantMsg: ChatMessage = {
                id: genMessageId(),
                role: "assistant",
                content: explanation || (fileUpdates.length > 0
                  ? `${fileUpdates.length} Datei${fileUpdates.length > 1 ? "en" : ""} aktualisiert.`
                  : accumulated),
                timestamp: Date.now(),
                fileUpdates,
              };

              setMessages((prev) => [...prev, assistantMsg]);

              if (fileUpdates.length > 0) {
                applyFileUpdates(fileUpdates);
              }
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
      setIsStreaming(false);
      setStreamingText("");
      abortRef.current = null;
    }
  }, [inputText, isStreaming, aiModel, applyFileUpdates]);

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
      </div>

      {/* ── Center: Monaco Code Editor ── */}
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
          </div>
        )}

        {/* Editor or empty state */}
        <div className="flex-1 overflow-hidden">
          {selectedFile ? (
            <MonacoEditor
              height="100%"
              path={selectedFile.path}
              language={selectedFile.language}
              value={selectedFile.content}
              theme="vs-dark"
              onChange={(value) => {
                if (value !== undefined) {
                  updateFileContent(selectedFile.path, value);
                }
              }}
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                fontLigatures: true,
                minimap: { enabled: files.length > 0 },
                scrollBeyondLastLine: false,
                padding: { top: 12 },
                lineNumbers: "on",
                renderLineHighlight: "line",
                bracketPairColorization: { enabled: true },
                formatOnPaste: true,
                tabSize: 2,
                wordWrap: "on",
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                automaticLayout: true,
              }}
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
        className="shrink-0 flex flex-col"
        style={{
          width: chatWidth,
          borderLeft: `1px solid ${border}`,
          background: "#111",
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-2.5 flex items-center gap-2"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          <Sparkles size={12} className="text-purple-400" />
          <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider flex-1">
            AI Chat
          </span>

          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => setModelOpen(!modelOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] transition-all hover:bg-white/5"
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
                  className="absolute top-full right-0 mt-1 rounded-lg overflow-hidden z-20 w-[220px]"
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
            <div key={msg.id} className="flex gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background:
                    msg.role === "user"
                      ? "rgba(59,130,246,0.2)"
                      : "rgba(139,92,246,0.2)",
                }}
              >
                {msg.role === "user" ? (
                  <User size={11} className="text-blue-400" />
                ) : (
                  <Bot size={11} className="text-purple-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[12px] leading-relaxed whitespace-pre-wrap break-words"
                  style={{
                    color:
                      msg.role === "user"
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(255,255,255,0.75)",
                  }}
                >
                  {msg.content}
                </p>
                {msg.fileUpdates && msg.fileUpdates.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.fileUpdates.map((fu) => (
                      <button
                        key={fu.path}
                        onClick={() => openFile(fu.path)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-colors hover:bg-white/10"
                        style={{
                          background: "rgba(52,211,153,0.1)",
                          border: "1px solid rgba(52,211,153,0.2)",
                          color: "#6ee7b7",
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
            <div className="flex gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "rgba(139,92,246,0.2)" }}
              >
                <Loader2 size={11} className="text-purple-400 animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                {streamingText ? (
                  <pre
                    className="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono"
                    style={{ color: "rgba(52,211,153,0.7)" }}
                  >
                    {streamingText.slice(-800)}
                    <span className="animate-pulse">▊</span>
                  </pre>
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
            <button
              onClick={() => void handleSend()}
              disabled={isStreaming || !inputText.trim()}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all shrink-0"
              style={{
                background:
                  isStreaming || !inputText.trim()
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
                    color: inputText.trim()
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
