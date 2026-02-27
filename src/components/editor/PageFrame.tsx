"use client";

import { useCallback, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Trash2, Plus } from "lucide-react";
import { Page, DesignTokens, SelectedElement } from "@/lib/types";
import { getTokenCSS } from "@/lib/design-tokens";
import BlockRenderer from "../blocks/BlockRenderer";

interface Props {
  page: Page;
  tokens: DesignTokens;
  viewportWidth?: number;
  isActive: boolean;
  selectedElement: SelectedElement | null;
  onSelectBlock: (blockId: string, blockRect: DOMRect) => void;
  onTextClick: (blockId: string, key: string, rect: DOMRect) => void;
  onImageClick?: (blockId: string, key: string, rect: DOMRect) => void;
  onInlineTextUpdate?: (blockId: string, key: string, value: string) => void;
  onPageClick: () => void;
  onRemoveBlock?: (blockId: string) => void;
  onInsertBlock?: (afterBlockId: string | null, afterBlockLabel: string) => void;
}

export default function PageFrame({
  page,
  tokens,
  viewportWidth = 1280,
  isActive,
  selectedElement,
  onSelectBlock,
  onTextClick,
  onImageClick,
  onInlineTextUpdate,
  onPageClick,
  onRemoveBlock,
  onInsertBlock,
}: Props) {
  const tokenStyles = getTokenCSS(tokens);
  const pageRef = useRef<HTMLDivElement>(null);
  const highlightedTextRef = useRef<HTMLElement | null>(null);
  const editingTextRef = useRef<HTMLElement | null>(null);

  const clearHighlightedText = useCallback(() => {
    if (highlightedTextRef.current) {
      highlightedTextRef.current.classList.remove("bs-selected-text");
    }
    highlightedTextRef.current = null;
  }, []);

  const activateInlineEditing = useCallback(
    (target: HTMLElement, blockId: string, contentKey: string) => {
      if (editingTextRef.current && editingTextRef.current !== target) {
        editingTextRef.current.blur();
      }

      if (editingTextRef.current === target) {
        return;
      }

      editingTextRef.current = target;
      const initialValue = target.textContent ?? "";

      target.setAttribute("contenteditable", "true");
      target.setAttribute("spellcheck", "true");
      target.classList.add("bs-inline-editing");
      target.focus();

      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(target);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          target.textContent = initialValue;
          target.blur();
          return;
        }

        const isSingleLineElement = !["P", "DIV", "BLOCKQUOTE"].includes(target.tagName);

        if (event.key === "Enter" && !event.shiftKey && isSingleLineElement) {
          event.preventDefault();
          target.blur();
        }
      };

      const handleBlur = () => {
        onInlineTextUpdate?.(blockId, contentKey, target.textContent ?? "");

        target.removeAttribute("contenteditable");
        target.removeAttribute("spellcheck");
        target.classList.remove("bs-inline-editing");
        target.removeEventListener("keydown", handleKeyDown);
        target.removeEventListener("blur", handleBlur);

        if (editingTextRef.current === target) {
          editingTextRef.current = null;
        }
      };

      target.addEventListener("keydown", handleKeyDown);
      target.addEventListener("blur", handleBlur);
    },
    [onInlineTextUpdate]
  );

  useEffect(() => {
    return () => {
      clearHighlightedText();

      const editingEl = editingTextRef.current;
      if (editingEl) {
        editingEl.removeAttribute("contenteditable");
        editingEl.removeAttribute("spellcheck");
        editingEl.classList.remove("bs-inline-editing");
      }
      editingTextRef.current = null;
    };
  }, [clearHighlightedText]);

  useEffect(() => {
    if (selectedElement?.elementType !== "text") {
      clearHighlightedText();
    }
  }, [selectedElement, clearHighlightedText]);

  return (
    <motion.div
      layout
      className="flex flex-col items-center cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        clearHighlightedText();
        onPageClick();
      }}
    >
      {/* Page label */}
      <motion.div
        className="mb-4 px-4 py-1.5 rounded-full text-xs font-medium"
        style={{
          backgroundColor: isActive ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.05)",
          color: isActive ? "#fff" : "rgba(0,0,0,0.4)",
        }}
      >
        {page.name}
        <span className="ml-2 opacity-50">{page.slug}</span>
      </motion.div>

      {/* Responsive CSS for mobile/tablet viewport */}
      {viewportWidth < 800 && (
        <style>{`
          .bs-responsive-frame .grid.grid-cols-2 { grid-template-columns: 1fr !important; }
          .bs-responsive-frame .grid.grid-cols-3 { grid-template-columns: ${viewportWidth < 500 ? '1fr' : 'repeat(2, 1fr)'} !important; }
          .bs-responsive-frame .grid.lg\:grid-cols-\[1\.1fr_0\.9fr\] { grid-template-columns: 1fr !important; }
          .bs-responsive-frame .grid.md\:grid-cols-\[1fr_360px\] { grid-template-columns: 1fr !important; }
          .bs-responsive-frame .min-h-\[70vh\] { min-height: 50vh !important; }
          .bs-responsive-frame .gap-10 { gap: ${viewportWidth < 500 ? '1.5rem' : '2rem'} !important; }
          .bs-responsive-frame .gap-16 { gap: ${viewportWidth < 500 ? '1.5rem' : '2.5rem'} !important; }
          .bs-responsive-frame .gap-32 { gap: ${viewportWidth < 500 ? '1.5rem' : '2.5rem'} !important; }
          .bs-responsive-frame .max-w-4xl { max-width: 100% !important; }
          .bs-responsive-frame .max-w-3xl { max-width: 100% !important; }
        `}</style>
      )}

      {/* Page content */}
      <motion.div
        ref={pageRef}
        className={`relative overflow-visible${viewportWidth < 800 ? ' bs-responsive-frame' : ''}`}
        style={{
          width: viewportWidth,
          borderRadius: 16,
          boxShadow: isActive
            ? "0 25px 80px rgba(0,0,0,0.12), 0 0 0 2px rgba(0,0,0,0.08)"
            : "0 8px 40px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
          transition: "width 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease",
          ...tokenStyles,
        }}
        whileHover={{
          boxShadow:
            "0 25px 80px rgba(0,0,0,0.12), 0 0 0 2px rgba(0,0,0,0.1)",
        }}
      >
        {/* Insert zone before first block */}
        {onInsertBlock && (
          <InsertZone
            onInsert={() => onInsertBlock(null, "Anfang")}
          />
        )}

        {page.blocks.map((block) => (
          <div key={block.id}>
            <div
              className="relative group/block"
              onClick={(e) => {
                e.stopPropagation();
                clearHighlightedText();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onSelectBlock(block.id, rect);
              }}
            >
              {/* Block hover indicator */}
              <div
                className={`absolute inset-0 pointer-events-none z-10 transition-opacity ${
                  selectedElement?.elementType === "block" && selectedElement.blockId === block.id
                    ? "opacity-100"
                    : "opacity-0 group-hover/block:opacity-100"
                }`}
                style={{
                  outline:
                    selectedElement?.elementType === "block" && selectedElement.blockId === block.id
                      ? "2px solid rgba(37,99,235,0.92)"
                      : "2px dashed rgba(37,99,235,0.42)",
                  outlineOffset: "-2px",
                  borderRadius: "8px",
                  background:
                    selectedElement?.elementType === "block" && selectedElement.blockId === block.id
                      ? "rgba(37,99,235,0.08)"
                      : "transparent",
                }}
              />

              {/* Delete button */}
              {onRemoveBlock && (
                <button
                  title="Sektion entfernen"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBlock(block.id);
                  }}
                  className="absolute top-2 right-2 z-20 w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover/block:opacity-100 transition-all hover:scale-110 active:scale-95"
                  style={{
                    background: "rgba(220,38,38,0.88)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    color: "#fff",
                  }}
                >
                  <Trash2 size={12} />
                </button>
              )}

              <BlockRenderer
                block={block}
                viewportWidth={viewportWidth}
                onUpdateContent={(key, value) => onInlineTextUpdate?.(block.id, key, value)}
                onTextClick={(e, key) => {
                  e.stopPropagation();
                  const target = e.currentTarget as HTMLElement;

                  if (highlightedTextRef.current && highlightedTextRef.current !== target) {
                    highlightedTextRef.current.classList.remove("bs-selected-text");
                  }

                  target.classList.add("bs-selected-text");
                  highlightedTextRef.current = target;

                  const rect = target.getBoundingClientRect();
                  onTextClick(block.id, key, rect);
                  activateInlineEditing(target, block.id, key);
                }}
                onImageClick={(e, key) => {
                  e.stopPropagation();
                  const target = e.currentTarget as HTMLElement;
                  const rect = target.getBoundingClientRect();
                  onImageClick?.(block.id, key, rect);
                }}
              />
            </div>

            {/* Insert zone after each block */}
            {onInsertBlock && (
              <InsertZone
                onInsert={() =>
                  onInsertBlock(
                    block.id,
                    block.type.charAt(0).toUpperCase() + block.type.slice(1)
                  )
                }
              />
            )}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

function InsertZone({ onInsert }: { onInsert: () => void }) {
  return (
    <div
      className="group/insert relative flex items-center justify-center"
      style={{ height: 20, zIndex: 15 }}
    >
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] opacity-0 group-hover/insert:opacity-100 transition-opacity"
        style={{ background: "rgba(37,99,235,0.35)" }}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onInsert();
        }}
        title="Sektion einfügen"
        className="relative flex items-center gap-1 px-2.5 py-1 rounded-full opacity-0 group-hover/insert:opacity-100 transition-all hover:scale-110 active:scale-95 text-[10px] font-semibold"
        style={{
          background: "rgba(37,99,235,0.9)",
          color: "#fff",
          boxShadow: "0 2px 8px rgba(37,99,235,0.35)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Plus size={10} />
        Sektion
      </button>
    </div>
  );
}
