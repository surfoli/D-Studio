"use client";

import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DesignTokens,
  BlockOverrides,
  ProjectDraft,
  Block,
  Page,
} from "@/lib/types";
import { createProjectFromDraft } from "@/lib/project-generator";
import { buildNextAppExport, type NextExportFile } from "@/lib/next-export";
import { autoFixProject } from "@/lib/responsive-fix";
import { SectionTemplate, templateToBlock } from "@/lib/section-templates";
import { slugify } from "@/components/editor/PageManager";
import { AppSettings, DEFAULT_SETTINGS, loadSettings, saveSettings } from "@/lib/settings";
import {
  PlanningDoc,
  SavedProject,
  saveProject as saveProjectToStorage,
  loadProjects,
  getActiveProjectId,
  setActiveProjectId,
} from "@/lib/storage";
import { useProjectHistory } from "@/lib/hooks/use-project-history";
import * as pm from "@/lib/project-mutations";

import Canvas from "@/components/editor/Canvas";
import TopBar, { AppMode, type ProjectInfo } from "@/components/editor/TopBar";
import AIPanel from "@/components/editor/AIPanel";
import SettingsPanel from "@/components/editor/SettingsPanel";

// Lazy-load heavy mode components for faster initial render
const MindPalace = lazy(() => import("@/components/editor/MindPalace"));
const PreviewMode = lazy(() => import("@/components/editor/PreviewMode"));
const VibeCodingMode = lazy(() => import("@/components/editor/VibeCodingMode"));

// ── File export helpers ──

type WritableTextFile = {
  createWritable: () => Promise<{
    write: (contents: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type WritableDirectory = {
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<WritableDirectory>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<WritableTextFile>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: "readwrite" }) => Promise<WritableDirectory>;
};

function sanitizeFilename(input: string) {
  return (input || "d3studio-export")
    .trim().toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "d3studio-export";
}

function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function writeFilesToDirectory(root: WritableDirectory, files: NextExportFile[]) {
  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean);
    const fileName = segments.pop();
    if (!fileName) continue;
    let dir = root;
    for (const seg of segments) dir = await dir.getDirectoryHandle(seg, { create: true });
    const fh = await dir.getFileHandle(fileName, { create: true });
    const w = await fh.createWritable();
    await w.write(file.content);
    await w.close();
  }
}

// ── Constants ──

const PROMPT_HISTORY_KEY = "d3studio.prompt.history";
const MAX_PROMPT_HISTORY = 8;
const AUTO_SAVE_DELAY = 800; // ms debounce

export default function Home() {
  const { project, canUndo, canRedo, apply, replace, undo, redo } = useProjectHistory();

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isAIFixing, setIsAIFixing] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [streamingText, setStreamingText] = useState("");
  const generationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blockIdCounterRef = useRef(Date.now());

  const [mode, setMode] = useState<AppMode>("design");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [planningDocs, setPlanningDocs] = useState<PlanningDoc[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<NextExportFile[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const savedProjectIdRef = useRef<string>(`proj_${Date.now()}`);
  const hasGeneratedRef = useRef(false);
  const handleSaveRef = useRef<(() => void) | null>(null);

  // Load settings + prompt history from localStorage after mount
  useEffect(() => {
    setSettings(loadSettings());
    try {
      const raw = window.localStorage.getItem(PROMPT_HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setPromptHistory(
        parsed.filter((e): e is string => typeof e === "string")
          .map((e) => e.trim()).filter(Boolean).slice(0, MAX_PROMPT_HISTORY)
      );
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(promptHistory));
  }, [promptHistory]);

  useEffect(() => {
    if (!exportMessage) return;
    const id = window.setTimeout(() => setExportMessage(null), 4200);
    return () => window.clearTimeout(id);
  }, [exportMessage]);

  useEffect(() => { hasGeneratedRef.current = hasGenerated; }, [hasGenerated]);
  useEffect(() => { saveSettings(settings); }, [settings]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowAIPanel((p) => !p); }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") { e.preventDefault(); setShowSettings((p) => !p); }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); if (hasGeneratedRef.current) handleSaveRef.current?.(); }
      if (e.key === "Escape") { setShowSettings(false); setShowAIPanel(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Restore last active project on mount
  useEffect(() => {
    const activeId = getActiveProjectId();
    if (!activeId) return;
    const found = loadProjects().find((p) => p.id === activeId);
    if (found) {
      savedProjectIdRef.current = found.id;
      replace(found.project);
      setPlanningDocs(found.planningDocs || []);
      setGeneratedFiles(found.generatedFiles || []);
      setHasGenerated(true);
    }
  }, [replace]);

  // Debounced auto-save
  useEffect(() => {
    if (!hasGenerated || !settings.autoSave) return;
    const timer = setTimeout(() => {
      const saved: SavedProject = {
        id: savedProjectIdRef.current,
        name: project.name,
        savedAt: Date.now(),
        project,
        planningDocs,
        generatedFiles,
      };
      saveProjectToStorage(saved);
      setActiveProjectId(savedProjectIdRef.current);
    }, AUTO_SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [project, planningDocs, generatedFiles, hasGenerated, settings.autoSave]);

  // ── Lean handlers using project-mutations ──

  const nextBlockId = useCallback(() => `added_${++blockIdCounterRef.current}_${Date.now()}`, []);

  const handleRemixAllBlocks = useCallback(() => {
    apply((prev) => pm.remixAllBlocks(prev));
  }, [apply]);

  const handleSwapVariant = useCallback(
    (pageId: string, blockId: string, variant: import("@/lib/types").BlockVariant) => {
      apply((prev) => pm.swapVariant(prev, pageId, blockId, variant));
    },
    [apply]
  );

  const handleSwapBlock = useCallback(
    (pageId: string, blockId: string, template: SectionTemplate) => {
      const t = templateToBlock(template);
      apply((prev) => pm.swapBlockContent(prev, pageId, blockId, t.type, t.variant, { ...t.content }));
    },
    [apply]
  );

  const handleUpdateThemeTokens = useCallback(
    (tokenUpdates: Partial<DesignTokens>) => {
      apply((prev) => pm.updateThemeTokens(prev, tokenUpdates));
    },
    [apply]
  );

  const handleClearBlockColorOverrides = useCallback(() => {
    apply((prev) => pm.clearBlockColorOverrides(prev));
  }, [apply]);

  const handleRemoveBlock = useCallback(
    (pageId: string, blockId: string) => {
      apply((prev) => pm.removeBlock(prev, pageId, blockId));
    },
    [apply]
  );

  const handleAddBlock = useCallback(
    (pageId: string, afterBlockId: string | null, template: SectionTemplate) => {
      const newBlock: Block = { ...templateToBlock(template), id: nextBlockId() };
      apply((prev) => pm.addBlock(prev, pageId, afterBlockId, newBlock));
    },
    [apply, nextBlockId]
  );

  const handleMoveBlock = useCallback(
    (pageId: string, blockId: string, direction: "up" | "down") => {
      apply((prev) => pm.moveBlock(prev, pageId, blockId, direction));
    },
    [apply]
  );

  const handleUpdateOverrides = useCallback(
    (pageId: string, blockId: string, overrides: BlockOverrides) => {
      apply((prev) => pm.updateBlockOverrides(prev, pageId, blockId, overrides));
    },
    [apply]
  );

  const handleUpdateBlockContent = useCallback(
    (pageId: string, blockId: string, contentKey: string, value: string) => {
      apply((prev) => pm.updateBlockContent(prev, pageId, blockId, contentKey, value));
    },
    [apply]
  );

  // ── Page CRUD handlers ──

  const handleAddPage = useCallback(
    (name: string) => {
      apply((prev) => {
        const slug = slugify(name);
        const firstPage = prev.pages[0];
        const navbarBlock = firstPage?.blocks.find((b) => b.type === "navbar");
        const footerBlock = firstPage?.blocks.find((b) => b.type === "footer");

        const newBlocks: Block[] = [];
        if (navbarBlock) {
          const links = (navbarBlock.content.links || "").split(",").map((l) => l.trim()).filter(Boolean);
          const has = links.some((l) => l.toLowerCase() === name.toLowerCase());
          newBlocks.push({
            id: nextBlockId(), type: "navbar", variant: navbarBlock.variant,
            content: { ...navbarBlock.content, links: has ? links.join(", ") : [...links, name].join(", ") },
            overrides: navbarBlock.overrides ? { ...navbarBlock.overrides } : undefined,
          });
        }
        newBlocks.push({
          id: nextBlockId(), type: "hero", variant: "C",
          content: { headline: name, subheadline: `Willkommen auf der ${name}-Seite.`, cta: "Mehr erfahren" },
        });
        newBlocks.push({
          id: nextBlockId(), type: "cta", variant: "B",
          content: { headline: `${name} – Inhalt`, subheadline: "Hier können Sie den Inhalt dieser Seite bearbeiten.", cta: "Kontakt aufnehmen" },
        });
        if (footerBlock) {
          newBlocks.push({
            id: nextBlockId(), type: "footer", variant: footerBlock.variant,
            content: { ...footerBlock.content },
            overrides: footerBlock.overrides ? { ...footerBlock.overrides } : undefined,
          });
        }

        const newPage: Page = { id: nextBlockId(), name, slug, blocks: newBlocks };
        const updated = pm.addNavbarLinkToAllPages(prev, name);
        return { ...updated, pages: [...updated.pages, newPage] };
      });
    },
    [apply, nextBlockId]
  );

  const handleDeletePage = useCallback(
    (pageId: string) => {
      apply((prev) => {
        if (prev.pages.length <= 1) return prev;
        const deleted = prev.pages.find((p) => p.id === pageId);
        if (!deleted) return prev;
        const filtered = { ...prev, pages: prev.pages.filter((p) => p.id !== pageId) };
        return pm.removeNavbarLinkFromAllPages(filtered, deleted.name);
      });
    },
    [apply]
  );

  const handleRenamePage = useCallback(
    (pageId: string, newName: string) => {
      apply((prev) => {
        const page = prev.pages.find((p) => p.id === pageId);
        if (!page) return prev;
        const oldName = page.name;
        const newSlug = page.slug === "/" ? "/" : slugify(newName);
        const renamed = pm.updatePage(prev, pageId, (p) => ({ ...p, name: newName, slug: newSlug }));
        return pm.renameNavbarLinkInAllPages(renamed, oldName, newName);
      });
    },
    [apply]
  );

  const handleDuplicatePage = useCallback(
    (pageId: string) => {
      apply((prev) => {
        const src = prev.pages.find((p) => p.id === pageId);
        if (!src) return prev;
        const copyName = `${src.name} (Kopie)`;
        const newPage: Page = {
          id: nextBlockId(), name: copyName, slug: slugify(copyName),
          blocks: src.blocks.map((b) => ({
            ...b, id: nextBlockId(), content: { ...b.content },
            overrides: b.overrides ? { ...b.overrides } : undefined,
          })),
        };
        return { ...prev, pages: [...prev.pages, newPage] };
      });
    },
    [apply, nextBlockId]
  );

  // ── Fix Mode handlers ──

  const handleAutoFix = useCallback(
    (viewportWidth: number) => {
      apply((prev) => autoFixProject(prev, viewportWidth));
    },
    [apply]
  );

  const handleAIFix = useCallback(
    async (viewportWidth: number) => {
      setIsAIFixing(true);
      try {
        const allBlocks = project.pages.flatMap((page) =>
          page.blocks.map((block) => ({
            id: block.id, type: block.type, variant: block.variant,
            contentKeys: Object.keys(block.content), currentOverrides: block.overrides,
          }))
        );

        const response = await fetch("/api/fix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks: allBlocks, viewportWidth, model: settings.aiModel }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          console.error("KI-Fix Fehler:", (err as { error?: string }).error || response.status);
          return;
        }

        const { fixes } = (await response.json()) as {
          fixes: Array<{ blockId: string; overrides: Partial<BlockOverrides> }>;
        };
        if (!fixes?.length) return;

        apply((prev) =>
          pm.mapBlocks(prev, (block) => {
            const fix = fixes.find((f) => f.blockId === block.id);
            if (!fix) return block;
            return { ...block, overrides: { ...block.overrides, ...fix.overrides } };
          })
        );
      } catch (error) {
        console.error("KI-Fix Fehler:", error);
      } finally {
        setIsAIFixing(false);
      }
    },
    [project.pages, settings.aiModel, apply]
  );

  const rememberPrompt = useCallback((usedPrompt: string) => {
    const normalized = usedPrompt.trim();
    if (!normalized) return;
    setPromptHistory((prev) =>
      [normalized, ...prev.filter((e) => e !== normalized)].slice(0, MAX_PROMPT_HISTORY)
    );
  }, []);

  const handleUsePromptTemplate = useCallback((p: string) => {
    setPrompt(p);
    setGenerationError(null);
  }, []);


  const handleGenerateFromPrompt = useCallback(async (explicitPrompt?: string) => {
    const trimmedPrompt = (explicitPrompt ?? prompt).trim();

    if (trimmedPrompt.length < 6) {
      setGenerationError("Bitte gib einen detaillierteren Prompt ein.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep(0);
    setStreamingText("");

    generationIntervalRef.current = setInterval(() => {
      setGenerationStep((prev) => prev + 1);
    }, 2800);

    try {
      // Cascade mode: generate plan first, then code
      if (settings.cascadeMode) {
        setStreamingText("[Cascade] Plan wird erstellt…");
        const planContent = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmedPrompt, model: settings.aiModel }),
        }).then(async (res) => {
          if (!res.ok) return "";
          const reader2 = res.body?.getReader();
          if (!reader2) return "";
          const dec = new TextDecoder();
          let buf2 = ""; let result = "";
          while (true) {
            const { done, value } = await reader2.read();
            if (done) break;
            buf2 += dec.decode(value, { stream: true });
            const ls = buf2.split("\n"); buf2 = ls.pop() || "";
            for (const l of ls) {
              if (!l.startsWith("data: ")) continue;
              try { const ev = JSON.parse(l.slice(6)) as { type: string; content?: string };
                if (ev.type === "done" && ev.content) result = ev.content;
              } catch { /* skip */ }
            }
          }
          return result;
        }).catch(() => "");
        if (planContent) {
          const { createPlanningDoc } = await import("@/lib/storage");
          const doc = createPlanningDoc(
            trimmedPrompt.slice(0, 55) + (trimmedPrompt.length > 55 ? "…" : ""),
            planContent
          );
          setPlanningDocs((prev) => [doc, ...prev]);
        }
        setStreamingText("");
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmedPrompt, model: settings.aiModel }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(
          (errorPayload as { error?: string }).error || `HTTP ${response.status}`
        );
      }

      const reader = response.body?.getReader();
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
            const event = JSON.parse(jsonStr) as {
              type: string;
              text?: string;
              projectDraft?: ProjectDraft;
              error?: string;
            };

            if (event.type === "delta" && event.text) {
              accumulated += event.text;
              setStreamingText(accumulated);
            } else if (event.type === "done" && event.projectDraft) {
              const nextProject = createProjectFromDraft(event.projectDraft);
              replace(nextProject);
              const exportedFiles = buildNextAppExport(nextProject);
              setGeneratedFiles(exportedFiles);
              rememberPrompt(trimmedPrompt);
              setHasGenerated(true);

              // Write files to Supabase (like Cursor/Windsurf)
              fetch("/api/files", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  project_id: null,
                  files: exportedFiles.map((f) => ({
                    path: f.path,
                    content: f.content,
                  })),
                }),
              }).catch((err) => console.error("Failed to write files:", err));
            } else if (event.type === "error") {
              throw new Error(event.error || "Generierung fehlgeschlagen.");
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      setGenerationError(message);
    } finally {
      if (generationIntervalRef.current) {
        clearInterval(generationIntervalRef.current);
        generationIntervalRef.current = null;
      }
      setIsGenerating(false);
      setGenerationStep(0);
    }
  }, [prompt, rememberPrompt, replace, settings.aiModel, settings.cascadeMode]);

  const handleApplyBlueprint = useCallback(async (blueprint: import("@/lib/blueprint").Blueprint) => {
    const { blueprintToProject } = await import("@/lib/blueprint");
    const nextProject = blueprintToProject(blueprint, project.tokens);
    replace(nextProject);
    setGeneratedFiles(buildNextAppExport(nextProject));
    setHasGenerated(true);
    setMode("design");
  }, [project.tokens, replace]);

  const handleSaveProject = useCallback(() => {
    handleSaveRef.current = handleSaveProject; // keep ref fresh
    const saved: SavedProject = {
      id: savedProjectIdRef.current,
      name: project.name,
      savedAt: Date.now(),
      project,
      planningDocs,
      generatedFiles,
    };
    saveProjectToStorage(saved);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  }, [project, planningDocs, generatedFiles]);

  const handleExportProject = useCallback(async () => {
    setIsExporting(true);
    setExportMessage(null);

    try {
      const files = buildNextAppExport(project);
      const browserWindow = window as DirectoryPickerWindow;

      if (typeof browserWindow.showDirectoryPicker === "function") {
        const directory = await browserWindow.showDirectoryPicker({ mode: "readwrite" });
        await writeFilesToDirectory(directory, files);
        setExportMessage(`Export abgeschlossen (${files.length} Dateien geschrieben).`);
        return;
      }

      const fallbackExport = files
        .map((file) => `// ${file.path}\n${file.content.trim()}\n`)
        .join("\n");

      downloadTextFile(
        fallbackExport,
        `${sanitizeFilename(project.name)}-next-export.txt`
      );
      setExportMessage(
        "Ordner-Export wird in diesem Browser nicht unterstützt. TXT-Export wurde heruntergeladen."
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Der Export konnte nicht abgeschlossen werden.";
      setExportMessage(message);
    } finally {
      setIsExporting(false);
    }
  }, [project]);

  // Project list for switcher — refresh after save
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const projectList: ProjectInfo[] = useMemo(
    () => loadProjects().map((p) => ({ id: p.id, name: p.name, savedAt: p.savedAt })),
    [isSaved, hasGenerated]
  );

  const handleProjectSwitch = useCallback((id: string) => {
    const found = loadProjects().find((p) => p.id === id);
    if (!found) return;
    savedProjectIdRef.current = found.id;
    setActiveProjectId(found.id);
    replace(found.project);
    setPlanningDocs(found.planningDocs || []);
    setGeneratedFiles(found.generatedFiles || []);
    setHasGenerated(true);
  }, [replace]);

  const handleGithubConnect = useCallback(() => {
    // Placeholder — will open GitHub OAuth flow
    window.open("https://github.com/apps", "_blank");
  }, []);

  const isDark = settings.theme === "dark";
  const appBg = isDark ? "#0d0d0d" : "#f7f7f7";

  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden"
      style={{ background: appBg, colorScheme: isDark ? "dark" : "light" }}
    >
      {/* ── Top Bar (always visible) ── */}
      <TopBar
        mode={mode}
        onModeChange={setMode}
        onSettings={() => setShowSettings(true)}
        onExport={() => void handleExportProject()}
        onSave={handleSaveProject}
        isExporting={isExporting}
        isSaved={isSaved}
        hasGenerated={hasGenerated}
        projectName={hasGenerated ? project.name : ""}
        theme={settings.theme}
        projects={projectList}
        onProjectSwitch={handleProjectSwitch}
        onGithubConnect={handleGithubConnect}
        autoSaveEnabled={settings.autoSave}
      />

      {/* ── Export message toast ── */}
      {exportMessage && (
        <div
          className="fixed top-14 right-4 z-[80] rounded-xl px-3 py-2 text-[11px] max-w-[340px]"
          style={{
            background: isDark ? "rgba(18,18,18,0.95)" : "rgba(255,255,255,0.95)",
            border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
            color: isDark ? "rgba(255,255,255,0.8)" : "#111",
            backdropFilter: "blur(16px)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          }}
        >
          {exportMessage}
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* DESIGN MODE */}
          {mode === "design" && (
            <div
              key="design"
              className="flex h-full animate-fade-in"
            >
              {/* AI Panel (left sidebar) */}
              <AnimatePresence>
                {showAIPanel && (
                  <motion.div
                    key="ai-panel"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 300, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 28, stiffness: 340 }}
                    className="overflow-hidden shrink-0 h-full"
                  >
                    <AIPanel
                      prompt={prompt}
                      onPromptChange={setPrompt}
                      onGenerate={() => void handleGenerateFromPrompt()}
                      isGenerating={isGenerating}
                      generationError={generationError}
                      streamingText={streamingText}
                      generationStep={generationStep}
                      promptHistory={promptHistory}
                      onUseHistory={handleUsePromptTemplate}
                      onClose={() => setShowAIPanel(false)}
                      theme={settings.theme}
                      onAddPage={handleAddPage}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Canvas */}
              <div className="flex-1 overflow-hidden h-full">
                  <Canvas
                    pages={project.pages}
                    tokens={project.tokens}
                    canvasBackground={settings.canvasBackground}
                    zoomSpeed={settings.zoomSpeed}
                    onSwapVariant={handleSwapVariant}
                    onSwapBlock={handleSwapBlock}
                    onMoveBlock={handleMoveBlock}
                    onUpdateOverrides={handleUpdateOverrides}
                    onUpdateBlockContent={handleUpdateBlockContent}
                    onUpdateTokens={handleUpdateThemeTokens}
                    onClearBlockColorOverrides={handleClearBlockColorOverrides}
                    onRemixAllBlocks={handleRemixAllBlocks}
                    onUndo={undo}
                    onRedo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onAddBlock={handleAddBlock}
                    onRemoveBlock={handleRemoveBlock}
                    onAutoFix={handleAutoFix}
                    onAIFix={(vw) => void handleAIFix(vw)}
                    isAIFixing={isAIFixing}
                    onAddPage={handleAddPage}
                    onDeletePage={handleDeletePage}
                    onRenamePage={handleRenamePage}
                    onDuplicatePage={handleDuplicatePage}
                  />
              </div>
            </div>
          )}

          {/* PREVIEW MODE */}
          {mode === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <Suspense fallback={<div className="h-full flex items-center justify-center opacity-40 text-sm">Laden…</div>}>
                <PreviewMode
                  project={project}
                  theme={settings.theme}
                />
              </Suspense>
            </motion.div>
          )}

          {/* MIND PALACE MODE */}
          {mode === "planning" && (
            <motion.div
              key="planning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <Suspense fallback={<div className="h-full flex items-center justify-center opacity-40 text-sm">Laden…</div>}>
                <MindPalace
                  theme={settings.theme}
                />
              </Suspense>
            </motion.div>
          )}

          {/* VIBE-CODING MODE */}
          {mode === "coding" && (
            <motion.div
              key="coding"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <Suspense fallback={<div className="h-full flex items-center justify-center opacity-40 text-sm">Laden…</div>}>
                <VibeCodingMode
                  aiModel={settings.aiModel}
                  onModelChange={(model) => setSettings((s) => ({ ...s, aiModel: model }))}
                  theme={settings.theme}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Settings Panel ── */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            settings={settings}
            onUpdate={(s) => setSettings(s)}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      {/* ── AI toggle button (only in design mode after generation, above dock) ── */}
      {mode === "design" && hasGenerated && !showAIPanel && (
        <button
          onClick={() => setShowAIPanel(true)}
          className="fixed z-40 flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all hover:opacity-80"
          style={{
            bottom: 72,
            left: 16,
            background: isDark ? "rgba(30,30,30,0.92)" : "rgba(255,255,255,0.92)",
            color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)",
            border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          ✦ AI <span className="text-[10px] opacity-40">⌘K</span>
        </button>
      )}
    </div>
  );
}

