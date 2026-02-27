"use client";

import { useState, useMemo, useCallback, createElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, FolderOpen, Copy, Check } from "lucide-react";
import { icons } from "lucide-react";
import { ICON_SECTIONS } from "@/lib/icons";

interface Props {
  isOpen: boolean;
  onSelect: (iconName: string) => void;
  onClose: () => void;
}

export default function IconPicker({ isOpen, onSelect, onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedIcon, setCopiedIcon] = useState<string | null>(null);
  const [iconSize, setIconSize] = useState<number>(24);

  const q = searchQuery.toLowerCase();

  const filteredSections = useMemo(
    () =>
      ICON_SECTIONS.map((section) => ({
        ...section,
        icons: section.icons.filter((name) => {
          if (!q) return true;
          // Search by icon name (case-insensitive)
          return name.toLowerCase().includes(q);
        }),
      })).filter((section) => section.icons.length > 0),
    [q]
  );

  const totalCount = useMemo(
    () => filteredSections.reduce((sum, s) => sum + s.icons.length, 0),
    [filteredSections]
  );

  const handleSelect = useCallback(
    (iconName: string) => {
      onSelect(iconName);
    },
    [onSelect]
  );

  const handleCopy = useCallback((iconName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Copy the JSX import snippet
    const snippet = `import { ${iconName} } from "lucide-react";`;
    navigator.clipboard?.writeText(snippet);
    setCopiedIcon(iconName);
    setTimeout(() => setCopiedIcon(null), 1500);
  }, []);

  const renderIcon = useCallback(
    (name: string, size: number = 24) => {
      const IconComponent = icons[name as keyof typeof icons];
      if (!IconComponent) return null;
      return createElement(IconComponent, { size });
    },
    []
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
          style={{
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-[15px] font-semibold" style={{ color: "#1a1a1a" }}>
                Icon auswählen
              </h2>
              <span
                className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.45)" }}
              >
                {totalCount} Icons
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Size toggle */}
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{ background: "rgba(0,0,0,0.04)" }}
              >
                {[20, 24, 32].map((s) => (
                  <button
                    key={s}
                    onClick={() => setIconSize(s)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-[11px] font-medium transition-all"
                    style={{
                      background: iconSize === s ? "#1a1a1a" : "transparent",
                      color: iconSize === s ? "#fff" : "rgba(0,0,0,0.4)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5"
                style={{ color: "rgba(0,0,0,0.4)" }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-2">
              {/* Search bar (sticky) */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl sticky top-0 z-10"
                style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}
              >
                <Search size={14} style={{ color: "rgba(0,0,0,0.35)" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Icon suchen... (z.B. Heart, Star, Home)"
                  className="flex-1 bg-transparent outline-none text-[13px]"
                  style={{ color: "#1a1a1a" }}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/5"
                  >
                    <X size={12} style={{ color: "rgba(0,0,0,0.3)" }} />
                  </button>
                )}
              </div>

              {/* Icon sections */}
              {filteredSections.map((section) => (
                <div key={section.id} className="mb-2">
                  <h3
                    className="text-[12px] font-semibold mb-2.5 mt-3"
                    style={{ color: "rgba(0,0,0,0.6)" }}
                  >
                    {section.label}
                    <span
                      className="ml-2 text-[10px] font-normal"
                      style={{ color: "rgba(0,0,0,0.3)" }}
                    >
                      {section.icons.length}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {section.icons.map((iconName) => {
                      const exists = icons[iconName as keyof typeof icons];
                      if (!exists) return null;

                      return (
                        <div
                          key={iconName}
                          onClick={() => handleSelect(iconName)}
                          className="relative group cursor-pointer rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                          style={{
                            width: iconSize + 24,
                            height: iconSize + 24,
                            background: "rgba(0,0,0,0.03)",
                            border: "1px solid rgba(0,0,0,0.06)",
                            color: "#1a1a1a",
                          }}
                          title={iconName}
                        >
                          {renderIcon(iconName, iconSize)}

                          {/* Hover overlay with name + copy */}
                          <div
                            className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap"
                          >
                            <span
                              className="text-[10px] font-medium px-2 py-1 rounded-md"
                              style={{
                                background: "#1a1a1a",
                                color: "#fff",
                              }}
                            >
                              {iconName}
                            </span>
                          </div>

                          {/* Copy button on hover */}
                          <button
                            onClick={(e) => handleCopy(iconName, e)}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            style={{
                              background: copiedIcon === iconName ? "#22c55e" : "#1a1a1a",
                              color: "#fff",
                            }}
                            title="Import kopieren"
                          >
                            {copiedIcon === iconName ? (
                              <Check size={10} />
                            ) : (
                              <Copy size={10} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {filteredSections.length === 0 && (
                <div
                  className="flex flex-col items-center justify-center py-16 text-center"
                  style={{ color: "rgba(0,0,0,0.4)" }}
                >
                  <FolderOpen size={32} className="mb-3 opacity-40" />
                  <p className="text-[13px]">Kein Icon gefunden</p>
                  <p className="text-[11px] mt-1 opacity-70">
                    Versuche einen anderen Suchbegriff (englisch)
                  </p>
                </div>
              )}

              {/* License note */}
              <div
                className="mt-4 mb-1 text-center"
                style={{ color: "rgba(0,0,0,0.25)" }}
              >
                <p className="text-[10px]">
                  Lucide Icons — MIT Lizenz — Frei verwendbar &amp; weiterverkaufbar
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
