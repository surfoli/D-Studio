"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Copy,
  Pencil,
  Check,
  X,
  FileText,
  GripVertical,
} from "lucide-react";
import { Page } from "@/lib/types";

interface Props {
  pages: Page[];
  activePageId: string | null;
  onAddPage: (name: string) => void;
  onDeletePage: (pageId: string) => void;
  onRenamePage: (pageId: string, name: string) => void;
  onDuplicatePage: (pageId: string) => void;
  onSelectPage: (pageId: string) => void;
  onClose: () => void;
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `/${slug || "page"}`;
}

const PAGE_PRESETS = [
  { name: "Impressum", emoji: "📜" },
  { name: "Datenschutz", emoji: "🔒" },
  { name: "About", emoji: "👋" },
  { name: "Kontakt", emoji: "✉️" },
  { name: "Leere Seite", emoji: "📄" },
];

export default function PageManager({
  pages,
  activePageId,
  onAddPage,
  onDeletePage,
  onRenamePage,
  onDuplicatePage,
  onSelectPage,
  onClose,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timeout = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 100);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  const startRename = (page: Page) => {
    setEditingId(page.id);
    setEditValue(page.name);
  };

  const confirmRename = () => {
    if (editingId && editValue.trim()) {
      onRenamePage(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleAddPreset = (presetName: string) => {
    onAddPage(presetName === "Leere Seite" ? "Neue Seite" : presetName);
    setShowPresets(false);
  };

  return (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: "spring", damping: 26, stiffness: 400 }}
      className="absolute z-[60] flex flex-col"
      style={{
        bottom: "100%",
        left: 0,
        marginBottom: 8,
        width: 280,
        maxHeight: 420,
        background: "rgba(22, 22, 22, 0.96)",
        backdropFilter: "blur(24px)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 12px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
        overflow: "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <span className="text-[12px] font-semibold text-white/80">Seiten</span>
        <span className="text-[11px] text-white/30">{pages.length} Seiten</span>
      </div>

      {/* Page list */}
      <div className="flex-1 overflow-y-auto py-1" style={{ maxHeight: 260 }}>
        {pages.map((page) => {
          const isActive = page.id === activePageId;
          const isEditing = editingId === page.id;
          const isHome = page.slug === "/" || page.slug === "";

          return (
            <div
              key={page.id}
              className="group flex items-center gap-2 px-3 py-2 mx-1 rounded-lg transition-all cursor-pointer"
              style={{
                background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
              }}
              onClick={() => !isEditing && onSelectPage(page.id)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }
              }}
            >
              <GripVertical size={12} className="text-white/20 shrink-0" />

              <FileText size={13} className="text-white/40 shrink-0" />

              {isEditing ? (
                <div className="flex-1 flex items-center gap-1">
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmRename();
                      if (e.key === "Escape") cancelRename();
                    }}
                    className="flex-1 bg-white/10 text-white text-[12px] px-2 py-1 rounded-md border border-white/15 outline-none focus:border-white/30"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); confirmRename(); }}
                    className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                  >
                    <Check size={11} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); cancelRename(); }}
                    className="w-6 h-6 flex items-center justify-center rounded-md bg-white/10 text-white/50 hover:bg-white/15 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-white/80 truncate">
                      {page.name}
                    </div>
                    <div className="text-[10px] text-white/30 truncate">
                      {page.slug}
                    </div>
                  </div>

                  {/* Actions (visible on hover) */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); startRename(page); }}
                      title="Umbenennen"
                      className="w-6 h-6 flex items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDuplicatePage(page.id); }}
                      title="Duplizieren"
                      className="w-6 h-6 flex items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
                    >
                      <Copy size={11} />
                    </button>
                    {!isHome && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeletePage(page.id); }}
                        title="Löschen"
                        className="w-6 h-6 flex items-center justify-center rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-500/15 transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Add page section */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <AnimatePresence>
          {showPresets && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="px-3 py-2 grid grid-cols-2 gap-1">
                {PAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleAddPreset(preset.name)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium text-white/70 hover:text-white/90 hover:bg-white/10 transition-all text-left"
                  >
                    <span>{preset.emoji}</span>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-3 py-2.5">
          <button
            onClick={() => setShowPresets((prev) => !prev)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
            style={{
              background: "rgba(59, 130, 246, 0.15)",
              color: "rgba(96, 165, 250, 0.95)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(59, 130, 246, 0.25)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(59, 130, 246, 0.15)"; }}
          >
            <Plus size={13} />
            Neue Seite
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export { slugify };
