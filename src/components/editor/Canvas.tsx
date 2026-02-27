"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shuffle,
  Minus,
  Plus,
  Maximize,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Wrench,
  Sparkles,
  Loader2,
  FileStack,
  PlusCircle,
  Shapes,
} from "lucide-react";
import { Page, DesignTokens, SelectedElement, BlockVariant, BlockOverrides } from "@/lib/types";
import { ZOOM_SPEED_MULTIPLIERS } from "@/lib/settings";
import { SECTION_TEMPLATES, SectionTemplate } from "@/lib/section-templates";
import { useViewportWidths } from "@/lib/hooks/use-viewport";
import PageFrame from "./PageFrame";
import FloatingToolbar, { type EditorPanel } from "./FloatingToolbar";
import SectionPicker from "./SectionPicker";
import ImagePicker from "./ImagePicker";
import IconPicker from "./IconPicker";
import PageManager from "./PageManager";
import Portal from "./Portal";

interface Props {
  pages: Page[];
  tokens: DesignTokens;
  canvasBackground?: string;
  zoomSpeed?: number;
  onSwapVariant: (pageId: string, blockId: string, variant: BlockVariant) => void;
  onSwapBlock: (pageId: string, blockId: string, template: SectionTemplate) => void;
  onMoveBlock: (pageId: string, blockId: string, direction: "up" | "down") => void;
  onUpdateOverrides: (pageId: string, blockId: string, overrides: BlockOverrides) => void;
  onUpdateTokens: (tokenUpdates: Partial<DesignTokens>) => void;
  onClearBlockColorOverrides: () => void;
  onRemixAllBlocks: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onAddBlock: (pageId: string, afterBlockId: string | null, template: SectionTemplate) => void;
  onRemoveBlock: (pageId: string, blockId: string) => void;
  onUpdateBlockContent: (
    pageId: string,
    blockId: string,
    contentKey: string,
    value: string
  ) => void;
  onAutoFix?: (viewportWidth: number) => void;
  onAIFix?: (viewportWidth: number) => void;
  isAIFixing?: boolean;
  onAddPage?: (name: string) => void;
  onDeletePage?: (pageId: string) => void;
  onRenamePage?: (pageId: string, name: string) => void;
  onDuplicatePage?: (pageId: string) => void;
}

const INSPECTOR_WIDTH = 320;
const DOCK_INSET = 12;
const MIN_DOCK_WIDTH = 280;

// Breakpoints for JS-based responsive logic (zoom-resistant)
const BP = {
  showLabels: 640,      // show text labels on dock tabs
  showRemix: 900,       // show Remix All button
  showUndoRedo: 800,    // show undo/redo buttons
  showPageCount: 1000,  // show page count
  showRemixLabel: 1200, // show "Remix All" label
} as const;

// EditorPanel type is now imported from FloatingToolbar

interface SectionPickerState {
  pageId: string;
  afterBlockId: string | null;
  afterBlockLabel: string;
}

interface ImagePickerState {
  pageId: string;
  blockId: string;
  contentKey: string;
  currentImage?: string;
}

export default function Canvas({
  pages,
  tokens,
  canvasBackground = "#f0efed",
  zoomSpeed = 3,
  onSwapVariant,
  onSwapBlock,
  onMoveBlock,
  onUpdateOverrides,
  onUpdateTokens,
  onClearBlockColorOverrides,
  onUpdateBlockContent,
  onRemixAllBlocks,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAddBlock,
  onRemoveBlock,
  onAutoFix,
  onAIFix,
  isAIFixing,
  onAddPage,
  onDeletePage,
  onRenamePage,
  onDuplicatePage,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { cssWidth: vw, stableWidth: stableVw } = useViewportWidths();

  // Prevent browser pinch-zoom globally so trackpad zoom only triggers canvas zoom
  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    document.addEventListener("wheel", preventBrowserZoom, { passive: false });
    return () => document.removeEventListener("wheel", preventBrowserZoom);
  }, []);

  const [scale, setScale] = useState(0.35);
  const [position, setPosition] = useState({ x: 60, y: 60 });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [currentVariant, setCurrentVariant] = useState<BlockVariant>("A");
  const [currentOverrides, setCurrentOverrides] = useState<BlockOverrides | undefined>(undefined);
  const [proMode, setProMode] = useState(false);
  const [activePanel, setActivePanel] = useState<EditorPanel | null>(null);
  const [sectionPicker, setSectionPicker] = useState<SectionPickerState | null>(null);
  const [imagePicker, setImagePicker] = useState<ImagePickerState | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [viewportMode, setViewportMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showPageManager, setShowPageManager] = useState(false);

  const VIEWPORT_WIDTHS = { desktop: 1280, tablet: 768, mobile: 390 } as const;

  const inspectorOpen = !!selectedElement && !!activePanel;
  const inspectorWidth = Math.min(320, vw - 24);
  const dockRightInset = inspectorOpen
    ? Math.min(inspectorWidth + DOCK_INSET, vw - MIN_DOCK_WIDTH - DOCK_INSET)
    : DOCK_INSET;

  // Keep a ref in sync so the wheel handler always reads fresh position
  const positionRef = useRef(position);
  positionRef.current = position;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const speedMul = ZOOM_SPEED_MULTIPLIERS[zoomSpeed] ?? 2.5;

      // Multiplicative zoom factor (like Figma): each scroll tick scales by a %
      const zoomIntensity = 0.002 * speedMul;
      const factor = Math.pow(2, -e.deltaY * zoomIntensity);

      const prevScale = scaleRef.current;
      const nextScale = Math.min(10, Math.max(0.02, prevScale * factor));

      if (nextScale !== prevScale && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;

        // World-space point under cursor stays fixed
        const prevPos = positionRef.current;
        const worldX = (mouseX - prevPos.x) / prevScale;
        const worldY = (mouseY - prevPos.y) / prevScale;

        const newPos = {
          x: mouseX - worldX * nextScale,
          y: mouseY - worldY * nextScale,
        };

        setScale(nextScale);
        setPosition(newPos);
      }
    } else {
      setPosition((prev) => ({
        x: prev.x - e.deltaX * 0.8,
        y: prev.y - e.deltaY * 0.8,
      }));
    }
  }, [zoomSpeed]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
    },
    [position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSelectBlock = useCallback(
    (pageId: string, blockId: string, blockRect: DOMRect) => {
      const page = pages.find((p) => p.id === pageId);
      const block = page?.blocks.find((b) => b.id === blockId);
      setSelectedElement({
        pageId,
        blockId,
        elementType: "block",
        rect: blockRect,
      });
      setCurrentVariant(block?.variant || "A");
      setCurrentOverrides(block?.overrides);
      setActivePanel("block");
    },
    [pages]
  );

  const handleTextClick = useCallback(
    (pageId: string, blockId: string, contentKey: string, rect: DOMRect) => {
      const page = pages.find((p) => p.id === pageId);
      const block = page?.blocks.find((b) => b.id === blockId);

      setSelectedElement({
        pageId,
        blockId,
        elementType: "text",
        contentKey,
        rect,
      });
      setCurrentVariant(block?.variant || "A");
      setCurrentOverrides(block?.overrides);
      setActivePanel("text");
    },
    [pages]
  );

  const handleImageClick = useCallback(
    (pageId: string, blockId: string, contentKey: string) => {
      const page = pages.find((p) => p.id === pageId);
      const block = page?.blocks.find((b) => b.id === blockId);
      const currentImage = block?.content[contentKey];

      // Open inspector with Assets tab instead of modal
      setSelectedElement({
        pageId,
        blockId,
        elementType: "block",
        rect: new DOMRect(0, 0, 0, 0),
      });
      setCurrentVariant(block?.variant || "A");
      setCurrentOverrides(block?.overrides);
      setImagePicker({
        pageId,
        blockId,
        contentKey,
        currentImage,
      });
      setActivePanel("assets");
    },
    [pages]
  );

  const handleCloseInspector = useCallback(() => {
    setSelectedElement(null);
    setActivePanel(null);
  }, []);

  const handleSwapVariant = useCallback(
    (variant: BlockVariant) => {
      if (selectedElement) {
        onSwapVariant(selectedElement.pageId, selectedElement.blockId, variant);
        setCurrentVariant(variant);
      }
    },
    [selectedElement, onSwapVariant]
  );

  const handleSwapBlock = useCallback(() => {
    if (!selectedElement) {
      return;
    }

    const selectedPage = pages.find((page) => page.id === selectedElement.pageId);
    const selectedBlock = selectedPage?.blocks.find((block) => block.id === selectedElement.blockId);

    if (!selectedBlock) {
      return;
    }

    const candidateTemplates = SECTION_TEMPLATES.filter(
      (template) =>
        template.type !== selectedBlock.type || template.variant !== selectedBlock.variant
    );

    if (candidateTemplates.length === 0) {
      return;
    }

    const randomTemplate =
      candidateTemplates[Math.floor(Math.random() * candidateTemplates.length)];

    onSwapBlock(selectedElement.pageId, selectedElement.blockId, randomTemplate);
    setCurrentVariant(randomTemplate.variant);
  }, [selectedElement, pages, onSwapBlock]);

  const handleMoveBlock = useCallback(
    (direction: "up" | "down") => {
      if (selectedElement) {
        onMoveBlock(selectedElement.pageId, selectedElement.blockId, direction);
      }
    },
    [selectedElement, onMoveBlock]
  );

  const selectedPage = selectedElement
    ? pages.find((page) => page.id === selectedElement.pageId)
    : null;
  const selectedBlock = selectedElement
    ? selectedPage?.blocks.find((block) => block.id === selectedElement.blockId)
    : null;
  const selectedTextValue =
    selectedElement?.contentKey && selectedBlock
      ? selectedBlock.content[selectedElement.contentKey] || ""
      : "";

  const handleChangePanel = useCallback(
    (panel: EditorPanel) => {
      setActivePanel(panel);
    },
    []
  );

  const handleAddSection = useCallback(() => {
    const pid = activePageId || pages[0]?.id;
    if (!pid) return;
    const page = pages.find((p) => p.id === pid);
    const lastBlockId = page?.blocks[page.blocks.length - 1]?.id || null;
    const lastBlockLabel = page?.blocks[page.blocks.length - 1]?.type || "Ende";
    setSectionPicker({ pageId: pid, afterBlockId: lastBlockId, afterBlockLabel: lastBlockLabel });
  }, [activePageId, pages]);

  return (
    <>
      {/* ─── Canvas Area ─── */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden relative"
        style={{
          backgroundColor: canvasBackground,
          cursor: isDragging ? "grabbing" : "default",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-45"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(0,0,0,0.22) 1.2px, transparent 1.2px)",
            backgroundSize: `${24 * scale}px ${24 * scale}px`,
            backgroundPosition: `${position.x % (24 * scale)}px ${position.y % (24 * scale)}px`,
          }}
        />

        {/* Canvas content */}
        <div
          className="relative"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            transition: isDragging ? "none" : "transform 0.05s ease-out",
          }}
        >
          <div className="flex gap-32 items-start pt-8">
            {pages.map((page) => (
              <PageFrame
                key={page.id}
                page={page}
                tokens={tokens}
                viewportWidth={VIEWPORT_WIDTHS[viewportMode]}
                isActive={activePageId === page.id}
                selectedElement={selectedElement}
                onSelectBlock={(blockId, blockRect) =>
                  handleSelectBlock(page.id, blockId, blockRect)
                }
                onTextClick={(blockId, _key, rect) =>
                  handleTextClick(page.id, blockId, _key, rect)
                }
                onImageClick={(blockId, key) =>
                  handleImageClick(page.id, blockId, key)
                }
                onInlineTextUpdate={(blockId, key, value) =>
                  onUpdateBlockContent(page.id, blockId, key, value)
                }
                onPageClick={() => setActivePageId(page.id)}
                onRemoveBlock={(blockId) => onRemoveBlock(page.id, blockId)}
                onInsertBlock={(afterBlockId, afterBlockLabel) =>
                  setSectionPicker({ pageId: page.id, afterBlockId, afterBlockLabel })
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right Inspector Panel (Portal to escape transform ancestor) ─── */}
      <Portal>
      <AnimatePresence>
        {inspectorOpen && (
          <motion.div
            initial={{ x: INSPECTOR_WIDTH + 16 }}
            animate={{ x: 0 }}
            exit={{ x: INSPECTOR_WIDTH + 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
            style={{
              width: Math.min(320, vw - 24),
              bottom: 84,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex-1 flex flex-col overflow-hidden m-3 ml-0"
              style={{
                background: "#fff",
                borderRadius: 20,
                boxShadow: "0 8px 40px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
              }}
            >
              <div className="flex-1 overflow-y-auto">
                <FloatingToolbar
                  selectedElement={selectedElement}
                  tokens={tokens}
                  blockType={selectedBlock?.type}
                  currentHtml={selectedBlock?.type === "custom" ? (selectedBlock.content.html ?? "") : undefined}
                  onClose={handleCloseInspector}
                  onSwapVariant={handleSwapVariant}
                  onSwapBlock={handleSwapBlock}
                  onMoveBlock={handleMoveBlock}
                  onUpdateContent={(contentKey, value) => {
                    if (selectedElement) {
                      onUpdateBlockContent(
                        selectedElement.pageId,
                        selectedElement.blockId,
                        contentKey,
                        value
                      );
                    }
                  }}
                  onUpdateOverrides={(overrides) => {
                    if (selectedElement) {
                      onUpdateOverrides(selectedElement.pageId, selectedElement.blockId, overrides);
                      setCurrentOverrides(overrides);
                    }
                  }}
                  onUpdateTokens={onUpdateTokens}
                  onClearBlockColorOverrides={onClearBlockColorOverrides}
                  selectedTextValue={selectedTextValue}
                  currentVariant={currentVariant}
                  currentOverrides={currentOverrides}
                  proMode={proMode}
                  activePanel={activePanel}
                  onChangePanel={handleChangePanel}
                  onTogglePro={() => setProMode((prev) => !prev)}
                  imagePickerProps={imagePicker ? {
                    currentImage: imagePicker.currentImage,
                    onSelectImage: (url: string) => {
                      if (imagePicker.blockId) {
                        onUpdateBlockContent(
                          imagePicker.pageId,
                          imagePicker.blockId,
                          imagePicker.contentKey,
                          url
                        );
                      }
                      setImagePicker(null);
                    },
                    onExpandPicker: () => {
                      // Keep imagePicker state and open the full modal
                    },
                  } : undefined}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>

      {/* ─── Unified Bottom Dock (Portal to escape transform ancestor) ─── */}
      <Portal>
      <div
        className="fixed bottom-5 z-50 flex items-center justify-start"
        style={{
          left: DOCK_INSET,
          right: Math.max(DOCK_INSET, dockRightInset),
          background: "rgba(12, 12, 12, 0.88)",
          backdropFilter: "blur(24px)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
          padding: "6px 8px",
          gap: 2,
          overflowX: "auto",
          whiteSpace: "nowrap",
          minWidth: 200,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Viewport Toggle */}
        <div className="flex items-center gap-0.5">
          {([
            { id: "desktop" as const, icon: <Monitor size={12} />, label: "Desktop 1280px" },
            { id: "tablet"  as const, icon: <Tablet size={12} />,  label: "Tablet 768px" },
            { id: "mobile" as const, icon: <Smartphone size={12} />, label: "Mobile 390px" },
          ]).map((vp) => (
            <button
              key={vp.id}
              title={vp.label}
              onClick={() => setViewportMode(vp.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
              style={{
                background: viewportMode === vp.id ? "rgba(255,255,255,0.18)" : "transparent",
                color: viewportMode === vp.id ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.38)",
              }}
            >
              {vp.icon}
            </button>
          ))}
        </div>

        <DockDivider />

        {/* + Sektion */}
        <button
          type="button"
          title="Neue Sektion hinzufügen"
          onClick={handleAddSection}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-[12px] font-medium"
          style={{
            background: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.88)",
            cursor: "pointer",
          }}
        >
          <PlusCircle size={13} />
          {stableVw >= BP.showLabels && <span>+ Sektion</span>}
        </button>

        {/* Icons button */}
        <button
          type="button"
          title="Icon-Bibliothek"
          onClick={() => setShowIconPicker(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-[12px] font-medium"
          style={{
            background: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.88)",
            cursor: "pointer",
          }}
        >
          <Shapes size={13} />
          {stableVw >= BP.showLabels && <span>Icons</span>}
        </button>

        {/* Pages button */}
        <div className="relative">
          <button
            type="button"
            title="Seiten verwalten"
            onClick={() => setShowPageManager((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-[12px] font-medium"
            style={{
              background: showPageManager ? "rgba(59,130,246,0.25)" : "rgba(59,130,246,0.12)",
              color: showPageManager ? "rgba(96,165,250,1)" : "rgba(96,165,250,0.85)",
              cursor: "pointer",
            }}
          >
            <FileStack size={13} />
            {stableVw >= BP.showLabels && (
              <span>{pages.length} {pages.length === 1 ? "Seite" : "Seiten"}</span>
            )}
          </button>

          <AnimatePresence>
            {showPageManager && onAddPage && onDeletePage && onRenamePage && onDuplicatePage && (
              <PageManager
                pages={pages}
                activePageId={activePageId}
                onAddPage={(name) => { onAddPage(name); }}
                onDeletePage={(pageId) => { onDeletePage(pageId); }}
                onRenamePage={(pageId, name) => { onRenamePage(pageId, name); }}
                onDuplicatePage={(pageId) => { onDuplicatePage(pageId); }}
                onSelectPage={(pageId) => {
                  setActivePageId(pageId);
                  const pageIndex = pages.findIndex((p) => p.id === pageId);
                  if (pageIndex >= 0) {
                    const pageWidth = VIEWPORT_WIDTHS[viewportMode];
                    const gap = 128;
                    const targetX = pageIndex * (pageWidth + gap);
                    setPosition({ x: 60 - targetX * scale, y: 60 });
                  }
                  setShowPageManager(false);
                }}
                onClose={() => setShowPageManager(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Fix buttons — only when mobile or tablet viewport */}
        {viewportMode !== "desktop" && (
          <>
            <DockDivider />
            <button
              type="button"
              title="Layout automatisch für diese Viewport-Größe fixen"
              onClick={() => onAutoFix?.(VIEWPORT_WIDTHS[viewportMode])}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-[12px] font-medium"
              style={{
                background: "rgba(34,197,94,0.18)",
                color: "rgba(34,197,94,0.95)",
                cursor: "pointer",
              }}
            >
              <Wrench size={13} />
              {stableVw >= BP.showLabels && <span>Auto-Fix</span>}
            </button>
            <button
              type="button"
              title="Layout mit KI intelligent fixen"
              onClick={() => onAIFix?.(VIEWPORT_WIDTHS[viewportMode])}
              disabled={isAIFixing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-[12px] font-medium"
              style={{
                background: isAIFixing ? "rgba(168,85,247,0.28)" : "rgba(168,85,247,0.18)",
                color: "rgba(168,85,247,0.95)",
                cursor: isAIFixing ? "wait" : "pointer",
              }}
            >
              {isAIFixing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} />
              )}
              {stableVw >= BP.showLabels && (
                <span>{isAIFixing ? "Fixe…" : "KI-Fix"}</span>
              )}
            </button>
          </>
        )}

        {stableVw >= BP.showRemix && (
          <>
            <DockDivider />
            <button
              type="button"
              title="Alle Blöcke neu remixen"
              onClick={onRemixAllBlocks}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-[12px] font-medium"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.86)",
                cursor: "pointer",
              }}
            >
              <Shuffle size={14} />
              {stableVw >= BP.showRemixLabel && <span>Remix All</span>}
            </button>
          </>
        )}

        {stableVw >= BP.showUndoRedo && (
          <>
            <DockDivider />
            <button
              type="button"
              title="Zurück"
              onClick={onUndo}
              disabled={!canUndo}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{
                color: canUndo ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.24)",
                cursor: canUndo ? "pointer" : "default",
                background: canUndo ? "transparent" : "rgba(255,255,255,0.03)",
              }}
            >
              <Undo2 size={13} />
            </button>
            <button
              type="button"
              title="Vorwärts"
              onClick={onRedo}
              disabled={!canRedo}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{
                color: canRedo ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.24)",
                cursor: canRedo ? "pointer" : "default",
                background: canRedo ? "transparent" : "rgba(255,255,255,0.03)",
              }}
            >
              <Redo2 size={13} />
            </button>
          </>
        )}

        <DockDivider />

        {/* Zoom controls */}
        <button
          title="Zoom out"
          onClick={() => setScale((s) => Math.max(0.02, s * 0.8))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white/90"
        >
          <Minus size={14} />
        </button>
        <span className="text-[11px] text-white/60 font-mono min-w-[40px] text-center select-none">
          {Math.round(scale * 100)}%
        </span>
        <button
          title="Zoom in"
          onClick={() => setScale((s) => Math.min(10, s * 1.25))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white/90"
        >
          <Plus size={14} />
        </button>
        <button
          title="Fit to view"
          onClick={() => {
            setScale(0.35);
            setPosition({ x: 60, y: 60 });
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white/90"
        >
          <Maximize size={13} />
        </button>

      </div>
      </Portal>

      {/* ─── Section Picker Modal ─── */}
      <AnimatePresence>
        {sectionPicker && (
          <SectionPicker
            insertAfterLabel={sectionPicker.afterBlockLabel}
            onSelect={(template) => {
              onAddBlock(sectionPicker.pageId, sectionPicker.afterBlockId, template);
              setSectionPicker(null);
            }}
            onClose={() => setSectionPicker(null)}
          />
        )}
      </AnimatePresence>

      {/* ─── Image Picker Modal ─── */}
      <Portal>
        <ImagePicker
          isOpen={!!imagePicker}
          currentImage={imagePicker?.currentImage}
          onSelect={(url) => {
            if (imagePicker && imagePicker.blockId) {
              onUpdateBlockContent(
                imagePicker.pageId,
                imagePicker.blockId,
                imagePicker.contentKey,
                url
              );
            }
            setImagePicker(null);
          }}
          onClose={() => setImagePicker(null)}
        />
      </Portal>

      {/* ─── Icon Picker Modal ─── */}
      <Portal>
        <IconPicker
          isOpen={showIconPicker}
          onSelect={(iconName) => {
            // Copy icon name to clipboard for easy use
            navigator.clipboard?.writeText(iconName);
            setShowIconPicker(false);
          }}
          onClose={() => setShowIconPicker(false)}
        />
      </Portal>
    </>
  );
}

function DockDivider() {
  return <div className="w-[1px] h-5 bg-white/10 mx-1.5 shrink-0" />;
}
