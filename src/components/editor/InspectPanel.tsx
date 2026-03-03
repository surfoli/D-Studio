"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  X,
  Type,
  Palette,
  Move,
  BoxSelect,
  Sparkles,
  ChevronDown,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

// ── Types ──

export interface InspectedElement {
  tagName: string;
  id: string | null;
  classes: string;
  directText: string | null;
  innerHTML: string | null;
  selectorPath: string;
  rect: { x: number; y: number; width: number; height: number };
  styles: Record<string, string>;
}

export interface StyleChange {
  property: string;
  value: string;
  previousValue: string;
}

interface InspectPanelProps {
  element: InspectedElement;
  onClose: () => void;
  onStyleChange: (change: StyleChange) => void;
  onTextChange: (text: string) => void;
  onAiImprove: (instruction: string) => void;
  onApplyChanges: (changes: StyleChange[]) => void;
  isApplying?: boolean;
  theme?: "dark" | "light";
}

// ── Helpers ──

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return rgb;
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

function parsePixels(value: string): number | null {
  const match = value.match(/^([\d.]+)px$/);
  return match ? parseFloat(match[1]) : null;
}

const FONT_OPTIONS = [
  "Inter", "system-ui", "Arial", "Helvetica", "Georgia", "Times New Roman",
  "Courier New", "Verdana", "Trebuchet MS", "Palatino", "Garamond",
];

const WEIGHT_OPTIONS = [
  { label: "Thin", value: "100" },
  { label: "Light", value: "300" },
  { label: "Normal", value: "400" },
  { label: "Medium", value: "500" },
  { label: "Semibold", value: "600" },
  { label: "Bold", value: "700" },
  { label: "Extrabold", value: "800" },
  { label: "Black", value: "900" },
];

// ── Sub-components ──

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/60 transition-colors"
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <Icon size={10} />
        {title}
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/30 w-16 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const hex = rgbToHex(value);
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={hex.startsWith("#") ? hex : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="w-5 h-5 rounded cursor-pointer border border-white/10 bg-transparent"
        style={{ padding: 0 }}
      />
      <input
        type="text"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white/70 font-mono"
      />
    </div>
  );
}

function SliderInput({
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = "px",
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-amber-500"
      />
      <span className="text-[10px] text-white/50 font-mono w-12 text-right">
        {value}{unit}
      </span>
    </div>
  );
}

function SelectInput({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white/70 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── Main Component ──

export default function InspectPanel({
  element,
  onClose,
  onStyleChange,
  onTextChange,
  onAiImprove,
  onApplyChanges,
  isApplying = false,
}: InspectPanelProps) {
  const [pendingChanges, setPendingChanges] = useState<StyleChange[]>([]);
  const [aiInstruction, setAiInstruction] = useState("");
  const [editingText, setEditingText] = useState(element.directText || "");
  const textChanged = useRef(false);

  const handleStyleChange = useCallback(
    (property: string, value: string) => {
      const prev = element.styles[property] || "";
      const change: StyleChange = { property, value, previousValue: prev };

      // Live preview in iframe
      onStyleChange(change);

      // Track pending changes
      setPendingChanges((prev) => {
        const existing = prev.findIndex((c) => c.property === property);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = change;
          return next;
        }
        return [...prev, change];
      });
    },
    [element.styles, onStyleChange]
  );

  const handleTextBlur = useCallback(() => {
    if (textChanged.current && editingText !== element.directText) {
      onTextChange(editingText);
    }
  }, [editingText, element.directText, onTextChange]);

  const handleApply = useCallback(() => {
    if (pendingChanges.length > 0) {
      onApplyChanges(pendingChanges);
    }
  }, [pendingChanges, onApplyChanges]);

  const handleAiSubmit = useCallback(() => {
    if (aiInstruction.trim()) {
      onAiImprove(aiInstruction.trim());
      setAiInstruction("");
    }
  }, [aiInstruction, onAiImprove]);

  // Extract current values
  const fontSize = parsePixels(element.styles.fontSize) ?? 16;
  const borderRadius = parsePixels(element.styles.borderRadius) ?? 0;
  const paddingTop = parsePixels(element.styles.paddingTop) ?? 0;
  const paddingRight = parsePixels(element.styles.paddingRight) ?? 0;
  const paddingBottom = parsePixels(element.styles.paddingBottom) ?? 0;
  const paddingLeft = parsePixels(element.styles.paddingLeft) ?? 0;
  const marginTop = parsePixels(element.styles.marginTop) ?? 0;
  const marginBottom = parsePixels(element.styles.marginBottom) ?? 0;
  const lineHeight = parseFloat(element.styles.lineHeight) || 1.5;
  const opacity = parseFloat(element.styles.opacity) ?? 1;

  const currentFont = element.styles.fontFamily?.split(",")[0]?.replace(/['"]/g, "").trim() || "system-ui";
  const currentWeight = element.styles.fontWeight || "400";

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        width: 260,
        background: "rgba(10,10,10,0.95)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
        
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <BoxSelect size={11} className="text-amber-500" />
          <span className="text-[11px] font-semibold text-white/80">Inspect</span>
        </div>
        <div className="flex items-center gap-1">
          {pendingChanges.length > 0 && (
            <span className="text-[9px] text-amber-500/70 font-medium">
              {pendingChanges.length} Änderung{pendingChanges.length > 1 ? "en" : ""}
            </span>
          )}
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          >
            <X size={10} className="text-white/40" />
          </button>
        </div>
      </div>

      {/* Element info */}
      <div className="px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-amber-500/80">
            &lt;{element.tagName}&gt;
          </span>
          {element.id && (
            <span className="text-[9px] text-white/30 font-mono">#{element.id}</span>
          )}
        </div>
        {element.classes && (
          <div className="mt-1 text-[9px] text-white/20 font-mono truncate" title={element.classes}>
            .{element.classes.split(/\s+/).slice(0, 4).join(" .")}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Text */}
        {element.directText && (
          <Section title="Text" icon={Type}>
            <textarea
              value={editingText}
              onChange={(e) => {
                setEditingText(e.target.value);
                textChanged.current = true;
              }}
              onBlur={handleTextBlur}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white/70 resize-none"
              rows={3}
              spellCheck={false}
            />
          </Section>
        )}

        {/* Colors */}
        <Section title="Farben" icon={Palette}>
          <FieldRow label="Text">
            <ColorInput
              value={element.styles.color}
              onChange={(v) => handleStyleChange("color", v)}
            />
          </FieldRow>
          <FieldRow label="Hintergrund">
            <ColorInput
              value={element.styles.backgroundColor}
              onChange={(v) => handleStyleChange("backgroundColor", v)}
            />
          </FieldRow>
        </Section>

        {/* Typography */}
        <Section title="Typografie" icon={Type}>
          <FieldRow label="Font">
            <SelectInput
              value={currentFont}
              options={FONT_OPTIONS.map((f) => ({ label: f, value: f }))}
              onChange={(v) => handleStyleChange("fontFamily", v)}
            />
          </FieldRow>
          <FieldRow label="Größe">
            <SliderInput
              value={fontSize}
              min={8}
              max={96}
              step={1}
              onChange={(v) => handleStyleChange("fontSize", v + "px")}
            />
          </FieldRow>
          <FieldRow label="Gewicht">
            <SelectInput
              value={currentWeight}
              options={WEIGHT_OPTIONS}
              onChange={(v) => handleStyleChange("fontWeight", v)}
            />
          </FieldRow>
          <FieldRow label="Zeilenhöhe">
            <SliderInput
              value={Math.round(lineHeight * 100) / 100}
              min={0.8}
              max={3}
              step={0.05}
              unit=""
              onChange={(v) => handleStyleChange("lineHeight", String(v))}
            />
          </FieldRow>
          <FieldRow label="Ausrichtung">
            <div className="flex gap-0.5">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => handleStyleChange("textAlign", align)}
                  className="flex-1 px-1.5 py-0.5 rounded text-[9px] transition-colors"
                  style={{
                    background: element.styles.textAlign === align ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)",
                    color: element.styles.textAlign === align ? "#f59e0b" : "rgba(255,255,255,0.4)",
                    border: `1px solid ${element.styles.textAlign === align ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {align === "left" ? "Links" : align === "center" ? "Mitte" : "Rechts"}
                </button>
              ))}
            </div>
          </FieldRow>
        </Section>

        {/* Spacing */}
        <Section title="Abstände" icon={Move} defaultOpen={false}>
          <FieldRow label="Padding T">
            <SliderInput value={paddingTop} max={120} onChange={(v) => handleStyleChange("paddingTop", v + "px")} />
          </FieldRow>
          <FieldRow label="Padding R">
            <SliderInput value={paddingRight} max={120} onChange={(v) => handleStyleChange("paddingRight", v + "px")} />
          </FieldRow>
          <FieldRow label="Padding B">
            <SliderInput value={paddingBottom} max={120} onChange={(v) => handleStyleChange("paddingBottom", v + "px")} />
          </FieldRow>
          <FieldRow label="Padding L">
            <SliderInput value={paddingLeft} max={120} onChange={(v) => handleStyleChange("paddingLeft", v + "px")} />
          </FieldRow>
          <FieldRow label="Margin T">
            <SliderInput value={marginTop} min={-60} max={120} onChange={(v) => handleStyleChange("marginTop", v + "px")} />
          </FieldRow>
          <FieldRow label="Margin B">
            <SliderInput value={marginBottom} min={-60} max={120} onChange={(v) => handleStyleChange("marginBottom", v + "px")} />
          </FieldRow>
          <FieldRow label="Radius">
            <SliderInput value={borderRadius} max={50} onChange={(v) => handleStyleChange("borderRadius", v + "px")} />
          </FieldRow>
        </Section>

        {/* Layout */}
        <Section title="Layout" icon={BoxSelect} defaultOpen={false}>
          <FieldRow label="Display">
            <span className="text-[10px] text-white/40 font-mono">{element.styles.display}</span>
          </FieldRow>
          {element.styles.display === "flex" && (
            <>
              <FieldRow label="Direction">
                <span className="text-[10px] text-white/40 font-mono">{element.styles.flexDirection}</span>
              </FieldRow>
              <FieldRow label="Justify">
                <span className="text-[10px] text-white/40 font-mono">{element.styles.justifyContent}</span>
              </FieldRow>
              <FieldRow label="Align">
                <span className="text-[10px] text-white/40 font-mono">{element.styles.alignItems}</span>
              </FieldRow>
              <FieldRow label="Gap">
                <span className="text-[10px] text-white/40 font-mono">{element.styles.gap}</span>
              </FieldRow>
            </>
          )}
          <FieldRow label="Opacity">
            <SliderInput
              value={Math.round(opacity * 100)}
              min={0}
              max={100}
              step={5}
              unit="%"
              onChange={(v) => handleStyleChange("opacity", String(v / 100))}
            />
          </FieldRow>
        </Section>

        {/* AI Improve */}
        <Section title="AI Vorschlag" icon={Sparkles}>
          <div className="space-y-1.5">
            <textarea
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              placeholder="z.B. 'Mach das moderner' oder 'Mehr Kontrast'"
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white/60 placeholder:text-white/20 resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAiSubmit();
                }
              }}
            />
            <button
              onClick={handleAiSubmit}
              disabled={!aiInstruction.trim() || isApplying}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-medium transition-all disabled:opacity-30"
              style={{
                background: "rgba(168,85,247,0.15)",
                color: "#c084fc",
                border: "1px solid rgba(168,85,247,0.25)",
              }}
            >
              <Sparkles size={10} />
              AI: Mach das besser
            </button>
          </div>
        </Section>
      </div>

      {/* Footer — Apply changes */}
      {pendingChanges.length > 0 && (
        <div className="px-3 py-2 border-t border-white/5 space-y-1.5">
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded text-[11px] font-semibold transition-all disabled:opacity-50"
            style={{
              background: "rgba(245,158,11,0.2)",
              color: "#fbbf24",
              border: "1px solid rgba(245,158,11,0.3)",
            }}
          >
            {isApplying ? (
              <>
                <RotateCcw size={10} className="animate-spin" />
                Code wird angepasst...
              </>
            ) : (
              <>Änderungen in Code übernehmen</>
            )}
          </button>
          <button
            onClick={() => setPendingChanges([])}
            className="w-full text-[9px] text-white/20 hover:text-white/40 transition-colors"
          >
            Verwerfen
          </button>
        </div>
      )}
    </div>
  );
}
