"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Search } from "lucide-react";
import { SECTION_TEMPLATES, SECTION_TEMPLATE_GROUPS, SectionTemplate } from "@/lib/section-templates";
import { BlockType } from "@/lib/types";

interface Props {
  onSelect: (template: SectionTemplate) => void;
  onClose: () => void;
  insertAfterLabel?: string;
}

export default function SectionPicker({ onSelect, onClose, insertAfterLabel }: Props) {
  const [activeType, setActiveType] = useState<BlockType | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = SECTION_TEMPLATES.filter((t) => {
    const matchesType = activeType === "all" || t.type === activeType;
    const matchesQuery =
      !query ||
      t.label.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase());
    return matchesType && matchesQuery;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 16, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 340 }}
        className="relative flex flex-col overflow-hidden"
        style={{
          width: "min(780px, calc(100vw - 32px))",
          maxHeight: "min(640px, calc(100vh - 64px))",
          background: "#fff",
          borderRadius: 24,
          boxShadow: "0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div>
            <h2 className="text-[15px] font-bold text-black/85">Sektion hinzufügen</h2>
            {insertAfterLabel && (
              <p className="text-[11px] text-black/35 mt-0.5">
                nach <span className="font-medium text-black/50">{insertAfterLabel}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/06 transition-colors text-black/35 hover:text-black/70"
            style={{ background: "rgba(0,0,0,0.04)" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Search + Filter row */}
        <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          {/* Search */}
          <div
            className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl"
            style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <Search size={12} className="text-black/30 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchen…"
              className="flex-1 bg-transparent text-[12px] text-black/75 outline-none placeholder:text-black/25"
            />
          </div>

          {/* Type filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <FilterPill
              label="Alle"
              active={activeType === "all"}
              onClick={() => setActiveType("all")}
            />
            {SECTION_TEMPLATE_GROUPS.map((g) => (
              <FilterPill
                key={g.types[0]}
                label={g.label}
                emoji={g.emoji}
                active={activeType === g.types[0]}
                onClick={() => setActiveType(g.types[0])}
              />
            ))}
          </div>
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-black/30">
              <span className="text-3xl mb-3">🔍</span>
              <p className="text-[13px]">Keine Sektionen gefunden</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => onSelect(template)}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function FilterPill({
  label,
  emoji,
  active,
  onClick,
}: {
  label: string;
  emoji?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all"
      style={{
        background: active ? "#111" : "rgba(0,0,0,0.04)",
        color: active ? "#fff" : "rgba(0,0,0,0.5)",
        border: active ? "1px solid transparent" : "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {emoji && <span>{emoji}</span>}
      {label}
    </button>
  );
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: SectionTemplate;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="group flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: "rgba(0,0,0,0.02)",
        border: "1.5px solid rgba(0,0,0,0.06)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.18)";
        (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.06)";
        (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)";
      }}
    >
      {/* Preview thumbnail */}
      <div
        className="w-full rounded-xl overflow-hidden flex items-center justify-center"
        style={{
          height: 72,
          background: getBlockPreviewBg(template.type),
        }}
      >
        <BlockMiniPreview template={template} />
      </div>

      {/* Info */}
      <div className="w-full">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[14px]">{template.emoji}</span>
          <span className="text-[12px] font-semibold text-black/80">{template.label}</span>
        </div>
        <p className="text-[10px] text-black/40 leading-snug">{template.description}</p>
      </div>
    </button>
  );
}

function getBlockPreviewBg(type: BlockType): string {
  const map: Record<BlockType, string> = {
    navbar: "linear-gradient(135deg, #f8f8f8 0%, #efefef 100%)",
    hero: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
    features: "linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)",
    stats: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
    testimonials: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    cta: "linear-gradient(135deg, #111 0%, #333 100%)",
    footer: "linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)",
    pricing: "linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)",
    custom: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  };
  return map[type] || "#f5f5f5";
}

function BlockMiniPreview({ template }: { template: SectionTemplate }) {
  const isDark = ["hero", "cta", "footer"].includes(template.type);
  const textColor = isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.65)";
  const mutedColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)";
  const lineColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";

  if (template.type === "navbar") {
    return (
      <div className="w-full px-4 flex items-center justify-between">
        <div className="h-2 w-10 rounded-full" style={{ background: textColor }} />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-1.5 w-6 rounded-full" style={{ background: mutedColor }} />
          ))}
        </div>
      </div>
    );
  }

  if (template.type === "hero") {
    return (
      <div className="flex flex-col items-center gap-1.5 px-4">
        <div className="h-2.5 w-32 rounded-full" style={{ background: textColor }} />
        <div className="h-1.5 w-24 rounded-full" style={{ background: mutedColor }} />
        <div className="h-5 w-16 rounded-lg mt-1" style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }} />
      </div>
    );
  }

  if (template.type === "features") {
    return (
      <div className="flex gap-2 px-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 flex flex-col gap-1 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.6)" }}>
            <div className="h-1.5 w-full rounded-full" style={{ background: textColor }} />
            <div className="h-1 w-3/4 rounded-full" style={{ background: mutedColor }} />
            <div className="h-1 w-1/2 rounded-full" style={{ background: mutedColor }} />
          </div>
        ))}
      </div>
    );
  }

  if (template.type === "stats") {
    return (
      <div className="flex gap-3 px-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="h-3 w-8 rounded-full" style={{ background: textColor }} />
            <div className="h-1.5 w-6 rounded-full" style={{ background: mutedColor }} />
          </div>
        ))}
      </div>
    );
  }

  if (template.type === "testimonials") {
    return (
      <div className="flex gap-2 px-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex-1 flex flex-col gap-1 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.7)" }}>
            <div className="h-1 w-full rounded-full" style={{ background: mutedColor }} />
            <div className="h-1 w-3/4 rounded-full" style={{ background: mutedColor }} />
            <div className="h-1.5 w-1/2 rounded-full mt-1" style={{ background: textColor }} />
          </div>
        ))}
      </div>
    );
  }

  if (template.type === "cta") {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="h-2 w-28 rounded-full" style={{ background: textColor }} />
        <div className="h-1.5 w-20 rounded-full" style={{ background: mutedColor }} />
        <div className="h-5 w-16 rounded-lg mt-1" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }} />
      </div>
    );
  }

  if (template.type === "custom") {
    return (
      <div className="flex flex-col items-center gap-1.5 px-4">
        <div className="flex gap-1.5 mb-1">
          {["#6366f1","#a78bfa","#818cf8"].map((c, i) => (
            <div key={i} className="h-2 rounded-full" style={{ width: [40,28,52][i], background: c }} />
          ))}
        </div>
        <div className="w-full h-[1px]" style={{ background: "rgba(255,255,255,0.1)" }} />
        <div className="text-[7px] font-mono text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
          &lt;html&gt; &lt;css&gt; &lt;js&gt;
        </div>
      </div>
    );
  }

  if (template.type === "footer") {
    return (
      <div className="w-full px-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="h-1.5 w-10 rounded-full" style={{ background: textColor }} />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-1 w-5 rounded-full" style={{ background: mutedColor }} />
            ))}
          </div>
        </div>
        <div className="h-[1px] w-full" style={{ background: lineColor }} />
        <div className="h-1 w-24 rounded-full" style={{ background: mutedColor }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="h-2 w-20 rounded-full" style={{ background: textColor }} />
      <div className="h-1.5 w-14 rounded-full" style={{ background: mutedColor }} />
    </div>
  );
}
