"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Type,
  Square,
  ArrowUp,
  ArrowDown,
  Shuffle,
  ALargeSmall,
  Space,
  ChevronDown,
  Sparkles,
  Paintbrush,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  Image as ImageIcon,
  Palette,
  Layout,
  Maximize2,
  Upload,
} from "lucide-react";
import { SelectedElement, BlockVariant, BlockOverrides, DesignTokens, BlockType } from "@/lib/types";
import { loadAssets, addAsset, STOCK_SECTIONS, type Asset } from "@/lib/assets";

export type EditorPanel = "block" | "text" | "style" | "layout" | "assets";

interface Props {
  selectedElement: SelectedElement | null;
  tokens: DesignTokens;
  blockType?: BlockType;
  onClose: () => void;
  onSwapVariant?: (variant: BlockVariant) => void;
  onSwapBlock?: () => void;
  onMoveBlock?: (direction: "up" | "down") => void;
  onUpdateContent?: (contentKey: string, value: string) => void;
  onUpdateOverrides?: (overrides: BlockOverrides) => void;
  onUpdateTokens?: (tokenUpdates: Partial<DesignTokens>) => void;
  onClearBlockColorOverrides?: () => void;
  selectedTextValue?: string;
  currentVariant?: BlockVariant;
  currentOverrides?: BlockOverrides;
  proMode: boolean;
  activePanel: EditorPanel | null;
  onChangePanel?: (panel: EditorPanel) => void;
  onTogglePro?: () => void;
  currentHtml?: string;
  // Inline image picker
  imagePickerProps?: {
    currentImage?: string;
    onSelectImage: (url: string) => void;
    onExpandPicker: () => void;
  };
}

const FONT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "Default", value: "__default" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "Geist", value: "'Geist', sans-serif" },
  { label: "Georgia", value: "'Georgia', serif" },
  { label: "Helvetica", value: "'Helvetica Neue', Arial, sans-serif" },
  { label: "Playfair", value: "'Playfair Display', serif" },
  { label: "Mono", value: "'JetBrains Mono', monospace" },
];

const FONT_WEIGHT_OPTIONS = [
  { label: "Thin", value: 300 },
  { label: "Regular", value: 400 },
  { label: "Medium", value: 500 },
  { label: "Semibold", value: 600 },
  { label: "Bold", value: 700 },
  { label: "Black", value: 900 },
];

const TYPOGRAPHY_RANGE = {
  heading: { min: 80, max: 140, step: 1, defaultValue: 100 },
  body: { min: 85, max: 120, step: 1, defaultValue: 100 },
} as const;

const SPACING_RANGE = {
  vertical: { min: -24, max: 56, step: 2, defaultValue: 0 },
  horizontal: { min: -16, max: 40, step: 2, defaultValue: 0 },
} as const;

const SHAPE_RANGE = {
  radius: { min: 0, max: 48, step: 2, defaultValue: 12 },
  buttonScale: { min: 80, max: 160, step: 2, defaultValue: 100 },
  buttonRadius: { min: 0, max: 40, step: 2, defaultValue: 12 },
  surfaceRadius: { min: 0, max: 48, step: 2, defaultValue: 16 },
} as const;

const TYPO_EXTRA_RANGE = {
  letterSpacing: { min: -10, max: 50, step: 1, defaultValue: 0 },
  lineHeight: { min: 90, max: 200, step: 5, defaultValue: 140 },
  opacity: { min: 10, max: 100, step: 5, defaultValue: 100 },
} as const;

const VARIANT_OPTIONS: BlockVariant[] = ["A", "B", "C"];

type ThemeColorKey =
  | "primaryColor"
  | "secondaryColor"
  | "accentColor"
  | "backgroundColor"
  | "surfaceColor"
  | "textColor"
  | "textMuted";

const THEME_COLOR_FIELDS: Array<{ key: ThemeColorKey; label: string }> = [
  { key: "primaryColor", label: "Primary" },
  { key: "secondaryColor", label: "Secondary" },
  { key: "accentColor", label: "Accent" },
  { key: "backgroundColor", label: "Background" },
  { key: "surfaceColor", label: "Surface" },
  { key: "textColor", label: "Text" },
  { key: "textMuted", label: "Text Muted" },
];

function clampToRange(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pickRandomVariant(currentVariant?: BlockVariant): BlockVariant {
  const pool = VARIANT_OPTIONS.filter((variant) => variant !== currentVariant);
  const variants = pool.length > 0 ? pool : VARIANT_OPTIONS;
  const randomIndex = Math.floor(Math.random() * variants.length);

  return variants[randomIndex];
}

export default function FloatingToolbar({
  selectedElement,
  tokens,
  blockType,
  onClose,
  onSwapVariant,
  onSwapBlock,
  onMoveBlock,
  onUpdateContent,
  onUpdateOverrides,
  onUpdateTokens,
  onClearBlockColorOverrides,
  selectedTextValue,
  currentVariant,
  currentOverrides,
  proMode,
  activePanel,
  onChangePanel,
  onTogglePro,
  currentHtml,
  imagePickerProps,
}: Props) {
  const [expandedSection, setExpandedSection] = useState<
    "color" | "typo" | "spacing" | "shape" | "effects" | "advanced" | null
  >(null);
  const isTextElement = selectedElement?.elementType === "text";
  const isBlockElement = selectedElement?.elementType === "block";
  const activeTextKey = selectedElement?.contentKey || "";
  const normalizedTextKey = activeTextKey.toLowerCase();
  const isButtonTextTarget = isTextElement && /(cta|button|btn)/.test(normalizedTextKey);
  const showShapeTools = isBlockElement || isButtonTextTarget;

  const defaultExpandedSection: "color" | "typo" | "spacing" | "shape" | null =
    activePanel === "style"
      ? "color"
      : activePanel === "layout"
        ? "spacing"
        : isButtonTextTarget
          ? "shape"
        : activePanel === "text"
          ? "typo"
          : null;

  const resolvedExpandedSection =
    activePanel === "block" ? expandedSection : expandedSection ?? defaultExpandedSection;

  const toggleExpandedSection = (
    section: "color" | "typo" | "spacing" | "shape" | "effects" | "advanced"
  ) => {
    const currentSection = activePanel === "block" ? expandedSection : resolvedExpandedSection;
    setExpandedSection(currentSection === section ? null : section);
  };

  const handleRandomVariantSwap = () => {
    if (!onSwapVariant) return;
    onSwapVariant(pickRandomVariant(currentVariant));
  };

  const handleUpdateThemeColor = (key: ThemeColorKey, value: string) => {
    onUpdateTokens?.({ [key]: value } as Pick<DesignTokens, ThemeColorKey>);
  };

  if (!selectedElement) return null;

  if (blockType === "custom") {
    return (
      <CustomCodeEditor
        onClose={onClose}
        onUpdateContent={onUpdateContent}
        blockId={selectedElement.blockId}
        savedHtml={currentHtml}
      />
    );
  }

  const INSPECTOR_TABS: Array<{ id: EditorPanel; label: string; icon: React.ReactNode }> = [
    { id: "block", label: "Block", icon: <Square size={13} /> },
    { id: "text", label: "Text", icon: <Type size={13} /> },
    { id: "style", label: "Style", icon: <Palette size={13} /> },
    { id: "layout", label: "Layout", icon: <Layout size={13} /> },
    { id: "assets", label: "Assets", icon: <ImageIcon size={13} /> },
  ];

  return (
    <div className="flex flex-col gap-0">
      {/* ─── Tab Bar ─── */}
      <div
        className="flex items-center gap-0 px-2 pt-2 pb-0"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}
      >
        {INSPECTOR_TABS.map((tab) => {
          const isActive = activePanel === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangePanel?.(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors relative"
              style={{
                color: isActive ? "rgba(0,0,0,0.88)" : "rgba(0,0,0,0.4)",
                background: "transparent",
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.55 }}>{tab.icon}</span>
              {tab.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                  style={{ background: "rgba(0,0,0,0.75)" }}
                />
              )}
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md transition-colors mb-1"
          style={{ color: "rgba(0,0,0,0.3)", background: "rgba(0,0,0,0.03)" }}
        >
          <X size={12} />
        </button>
      </div>

      {/* ─── Tab Content ─── */}
      <div className="flex flex-col gap-3 p-5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 180px)" }}>

        {/* ─── Block Tab ─── */}
        {activePanel === "block" && (
          <>
            {isTextElement && (
              <div className="flex flex-col gap-2">
                <SectionLabel title="Text Editor" />
                <div
                  className="rounded-xl p-3"
                  style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(0,0,0,0.35)" }}>
                      Field
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "rgba(0,0,0,0.48)" }}>
                      {activeTextKey || "text"}
                    </span>
                  </div>

                  <textarea
                    value={selectedTextValue || ""}
                    onChange={(event) => {
                      if (activeTextKey) {
                        onUpdateContent?.(activeTextKey, event.target.value);
                      }
                    }}
                    rows={4}
                    placeholder="Text bearbeiten..."
                    className="w-full resize-none rounded-lg px-2.5 py-2 text-[12px] leading-relaxed outline-none"
                    style={{
                      color: "rgba(0,0,0,0.88)",
                      background: "rgba(255,255,255,0.86)",
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  />

                  <p className="mt-2 text-[10px]" style={{ color: "rgba(0,0,0,0.42)" }}>
                    Änderungen werden direkt auf der Seite übernommen.
                  </p>
                </div>

                <ActionButton
                  icon={<Type size={14} />}
                  label="Anderen Text wählen"
                  hint="Im Canvas klicken"
                  onClick={onClose}
                />

                {isButtonTextTarget && (
                  <div className="flex flex-col gap-1">
                    <SectionLabel title="Kontext Tools" />
                    <AccordionSection
                      icon={<Square size={14} />}
                      title="Button"
                      isOpen={resolvedExpandedSection === "shape"}
                      shouldHighlight
                      onToggle={() => toggleExpandedSection("shape")}
                    >
                      <ShapeControls
                        currentOverrides={currentOverrides}
                        onUpdateOverrides={onUpdateOverrides}
                        showButtonControls
                        showSurfaceControls={false}
                      />
                    </AccordionSection>
                  </div>
                )}
              </div>
            )}

            {isBlockElement && (
              <>
                <div className="flex flex-col gap-1">
                  <SectionLabel title="Quick Actions" />
                  <div className="grid grid-cols-2 gap-1.5">
                    <ActionButton icon={<ArrowUp size={14} />} label="Move Up" onClick={() => onMoveBlock?.("up")} compact />
                    <ActionButton icon={<ArrowDown size={14} />} label="Move Down" onClick={() => onMoveBlock?.("down")} compact />
                  </div>
                  <ActionButton icon={<Shuffle size={14} />} label="Swap Block" hint="Replace" onClick={onSwapBlock} />
                </div>

                <div className="flex flex-col gap-1">
                  <SectionLabel title="Variant" />
                  <button
                    type="button"
                    onClick={handleRandomVariantSwap}
                    className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition-colors"
                    style={{
                      background: "rgba(0,0,0,0.05)",
                      color: "rgba(0,0,0,0.72)",
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Shuffle size={13} />
                      Zufall remixen
                    </span>
                    <span className="text-[11px] font-mono" style={{ color: "rgba(0,0,0,0.4)" }}>
                      {currentVariant ?? "-"}
                    </span>
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ─── Text Tab ─── */}
        {activePanel === "text" && (
          <div className="flex flex-col gap-1">
            <AccordionSection
              icon={<ALargeSmall size={14} />}
              title="Typography"
              isOpen={resolvedExpandedSection === "typo" || resolvedExpandedSection === null}
              shouldHighlight
              onToggle={() => toggleExpandedSection("typo")}
            >
              <AlignRow
                value={currentOverrides?.textAlign}
                onChange={(v) => onUpdateOverrides?.({ ...currentOverrides, textAlign: v })}
              />
              <ProSelectRow
                label="Heading Font"
                value={currentOverrides?.customFontHeading ?? "__default"}
                options={FONT_OPTIONS}
                onChange={(nextFont) =>
                  onUpdateOverrides?.({
                    ...currentOverrides,
                    customFontHeading: nextFont === "__default" ? undefined : nextFont,
                  })
                }
              />
              <ProSelectRow
                label="Body Font"
                value={currentOverrides?.customFontBody ?? "__default"}
                options={FONT_OPTIONS}
                onChange={(nextFont) =>
                  onUpdateOverrides?.({
                    ...currentOverrides,
                    customFontBody: nextFont === "__default" ? undefined : nextFont,
                  })
                }
              />
              <ProSelectRow
                label="Weight"
                value={String(currentOverrides?.fontWeight ?? "__default")}
                options={[{ label: "Default", value: "__default" }, ...FONT_WEIGHT_OPTIONS.map(w => ({ label: w.label, value: String(w.value) }))]}
                onChange={(v) => onUpdateOverrides?.({ ...currentOverrides, fontWeight: v === "__default" ? undefined : Number(v) })}
              />
              <ProSliderRow
                label="Heading %"
                value={clampToRange(
                  currentOverrides?.fontSizeHeading ?? TYPOGRAPHY_RANGE.heading.defaultValue,
                  TYPOGRAPHY_RANGE.heading.min,
                  TYPOGRAPHY_RANGE.heading.max
                )}
                min={TYPOGRAPHY_RANGE.heading.min}
                max={TYPOGRAPHY_RANGE.heading.max}
                step={TYPOGRAPHY_RANGE.heading.step}
                unit="%"
                onChange={(v) => onUpdateOverrides?.({ ...currentOverrides, fontSizeHeading: v })}
              />
              <ProSliderRow
                label="Body %"
                value={clampToRange(
                  currentOverrides?.fontSizeBody ?? TYPOGRAPHY_RANGE.body.defaultValue,
                  TYPOGRAPHY_RANGE.body.min,
                  TYPOGRAPHY_RANGE.body.max
                )}
                min={TYPOGRAPHY_RANGE.body.min}
                max={TYPOGRAPHY_RANGE.body.max}
                step={TYPOGRAPHY_RANGE.body.step}
                unit="%"
                onChange={(v) => onUpdateOverrides?.({ ...currentOverrides, fontSizeBody: v })}
              />
              <ProSliderRow
                label="Letter Spacing"
                value={clampToRange(
                  currentOverrides?.letterSpacing ?? TYPO_EXTRA_RANGE.letterSpacing.defaultValue,
                  TYPO_EXTRA_RANGE.letterSpacing.min,
                  TYPO_EXTRA_RANGE.letterSpacing.max
                )}
                min={TYPO_EXTRA_RANGE.letterSpacing.min}
                max={TYPO_EXTRA_RANGE.letterSpacing.max}
                step={TYPO_EXTRA_RANGE.letterSpacing.step}
                unit="/100em"
                onChange={(v) => onUpdateOverrides?.({ ...currentOverrides, letterSpacing: v })}
              />
              <ProSliderRow
                label="Line Height"
                value={clampToRange(
                  currentOverrides?.lineHeight ?? TYPO_EXTRA_RANGE.lineHeight.defaultValue,
                  TYPO_EXTRA_RANGE.lineHeight.min,
                  TYPO_EXTRA_RANGE.lineHeight.max
                )}
                min={TYPO_EXTRA_RANGE.lineHeight.min}
                max={TYPO_EXTRA_RANGE.lineHeight.max}
                step={TYPO_EXTRA_RANGE.lineHeight.step}
                unit="%"
                onChange={(v) => onUpdateOverrides?.({ ...currentOverrides, lineHeight: v })}
              />

              <div className="my-1" style={{ height: 1, background: "rgba(0,0,0,0.08)" }} />
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "rgba(0,0,0,0.36)" }}
              >
                Globale Schrift
              </span>
              <ProSelectRow
                label="Heading"
                value={tokens.fontHeading}
                options={FONT_OPTIONS.filter((f) => f.value !== "__default")}
                onChange={(v) => onUpdateTokens?.({ fontHeading: v })}
              />
              <ProSelectRow
                label="Body"
                value={tokens.fontBody}
                options={FONT_OPTIONS.filter((f) => f.value !== "__default")}
                onChange={(v) => onUpdateTokens?.({ fontBody: v })}
              />
            </AccordionSection>
          </div>
        )}

        {/* ─── Style Tab ─── */}
        {activePanel === "style" && (
          <div className="flex flex-col gap-1">
            <AccordionSection
              icon={<Paintbrush size={14} />}
              title="Color"
              isOpen={resolvedExpandedSection === "color" || resolvedExpandedSection === null}
              shouldHighlight
              onToggle={() => toggleExpandedSection("color")}
            >
              <ProColorRow
                label="Background"
                value={currentOverrides?.backgroundColor || ""}
                onChange={(v) => onUpdateOverrides?.({ ...currentOverrides, backgroundColor: v })}
              />
              <ProColorRow
                label="Text"
                value={currentOverrides?.textColor || ""}
                onChange={(v) => onUpdateOverrides?.({ ...currentOverrides, textColor: v })}
              />
              <ProColorRow
                label="Secondary"
                value={currentOverrides?.secondaryColor || ""}
                onChange={(v) => onUpdateOverrides?.({ ...currentOverrides, secondaryColor: v })}
              />
              <ProColorRow
                label="Accent"
                value={currentOverrides?.accentColor || ""}
                onChange={(v) => onUpdateOverrides?.({ ...currentOverrides, accentColor: v })}
              />
              <ProColorRow
                label="Primary"
                value={currentOverrides?.primaryColor || ""}
                onChange={(v) => onUpdateOverrides?.({ ...currentOverrides, primaryColor: v })}
              />

              <div className="my-1" style={{ height: 1, background: "rgba(0,0,0,0.08)" }} />
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "rgba(0,0,0,0.36)" }}
              >
                Global Theme
              </span>

              {THEME_COLOR_FIELDS.map((field) => (
                <ProColorRow
                  key={field.key}
                  label={field.label}
                  value={tokens[field.key]}
                  onChange={(value) => handleUpdateThemeColor(field.key, value)}
                />
              ))}

              <button
                type="button"
                onClick={() => onClearBlockColorOverrides?.()}
                className="w-full rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-colors"
                style={{ background: "rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.74)" }}
              >
                Theme global auf alle Blöcke anwenden
              </button>
            </AccordionSection>

            <AccordionSection
              icon={<Eye size={14} />}
              title="Effects"
              isOpen={resolvedExpandedSection === "effects"}
              onToggle={() => toggleExpandedSection("effects")}
            >
              <ProSliderRow
                label="Opacity"
                value={clampToRange(
                  currentOverrides?.opacity ?? TYPO_EXTRA_RANGE.opacity.defaultValue,
                  TYPO_EXTRA_RANGE.opacity.min,
                  TYPO_EXTRA_RANGE.opacity.max
                )}
                min={TYPO_EXTRA_RANGE.opacity.min}
                max={TYPO_EXTRA_RANGE.opacity.max}
                step={TYPO_EXTRA_RANGE.opacity.step}
                unit="%"
                onChange={(v) => onUpdateOverrides?.({ ...currentOverrides, opacity: v })}
              />
            </AccordionSection>
          </div>
        )}

        {/* ─── Layout Tab ─── */}
        {activePanel === "layout" && (
          <div className="flex flex-col gap-1">
            <AccordionSection
              icon={<Space size={14} />}
              title="Spacing"
              isOpen={resolvedExpandedSection === "spacing" || resolvedExpandedSection === null}
              shouldHighlight
              onToggle={() => toggleExpandedSection("spacing")}
            >
              <ProSliderRow
                label="Vertical"
                value={clampToRange(
                  currentOverrides?.paddingY ?? SPACING_RANGE.vertical.defaultValue,
                  SPACING_RANGE.vertical.min,
                  SPACING_RANGE.vertical.max
                )}
                min={SPACING_RANGE.vertical.min}
                max={SPACING_RANGE.vertical.max}
                step={SPACING_RANGE.vertical.step}
                unit="px"
                onChange={(v) => onUpdateOverrides?.({ ...currentOverrides, paddingY: v })}
              />
              <ProSliderRow
                label="Horizontal"
                value={clampToRange(
                  currentOverrides?.paddingX ?? SPACING_RANGE.horizontal.defaultValue,
                  SPACING_RANGE.horizontal.min,
                  SPACING_RANGE.horizontal.max
                )}
                min={SPACING_RANGE.horizontal.min}
                max={SPACING_RANGE.horizontal.max}
                step={SPACING_RANGE.horizontal.step}
                unit="px"
                onChange={(v) => onUpdateOverrides?.({ ...currentOverrides, paddingX: v })}
              />
            </AccordionSection>

            {showShapeTools && (
              <AccordionSection
                icon={<Square size={14} />}
                title="Shape & Size"
                isOpen={resolvedExpandedSection === "shape"}
                shouldHighlight
                onToggle={() => toggleExpandedSection("shape")}
              >
                <ShapeControls
                  currentOverrides={currentOverrides}
                  onUpdateOverrides={onUpdateOverrides}
                  showButtonControls
                  showSurfaceControls
                />
              </AccordionSection>
            )}
          </div>
        )}

        {/* ─── Assets Tab (inline image picker) ─── */}
        {activePanel === "assets" && imagePickerProps && (
          <div className="flex flex-col gap-3">
            <SectionLabel title="Image Picker" />
            <InlineImagePicker
              currentImage={imagePickerProps.currentImage}
              onSelectImage={imagePickerProps.onSelectImage}
              onExpandPicker={imagePickerProps.onExpandPicker}
            />
          </div>
        )}
        {activePanel === "assets" && !imagePickerProps && (
          <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
            <ImageIcon size={32} style={{ color: "rgba(0,0,0,0.18)" }} />
            <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.4)" }}>
              Klicke auf ein Bild im Canvas, um es hier zu bearbeiten.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProSelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.54)" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 min-w-[140px] rounded-md px-2 text-[10px]"
        style={{
          background: "rgba(0,0,0,0.03)",
          border: "1px solid rgba(0,0,0,0.08)",
          color: "rgba(0,0,0,0.68)",
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <span className="px-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(0,0,0,0.32)" }}>
      {title}
    </span>
  );
}

function ActionButton({
  icon,
  label,
  hint,
  onClick,
  compact,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors group w-full text-left"
      style={{ background: "transparent" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ color: "rgba(0,0,0,0.35)" }} className="group-hover:opacity-70 transition-opacity">
        {icon}
      </span>
      <span className={`${compact ? "text-[12px]" : "text-[13px]"} flex-1`} style={{ color: "rgba(0,0,0,0.72)" }}>
        {label}
      </span>
      {hint && (
        <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.22)" }}>{hint}</span>
      )}
    </button>
  );
}

function AccordionSection({
  icon,
  title,
  isOpen,
  shouldHighlight,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  isOpen: boolean;
  shouldHighlight?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-1.5"
      style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center gap-2 rounded-lg focus:outline-none focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.55)]"
        style={{
          color: shouldHighlight ? "rgba(0,0,0,0.88)" : "rgba(0,0,0,0.65)",
          background: isOpen ? "rgba(0,0,0,0.03)" : "transparent",
          outline: "none",
        }}
      >
        <span className="opacity-70">{icon}</span>
        <span className="text-[12px] font-medium flex-1 text-left">{title}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`} />
      </button>
      {isOpen && <div className="px-4 pb-3.5 pt-2.5 flex flex-col gap-2.5">{children}</div>}
    </div>
  );
}

function ShapeControls({
  currentOverrides,
  onUpdateOverrides,
  showButtonControls,
  showSurfaceControls,
}: {
  currentOverrides?: BlockOverrides;
  onUpdateOverrides?: (overrides: BlockOverrides) => void;
  showButtonControls?: boolean;
  showSurfaceControls?: boolean;
}) {
  const baseOverrides = currentOverrides ?? {};

  return (
    <>
      <ProSliderRow
        label="Radius"
        value={clampToRange(
          baseOverrides.radius ?? SHAPE_RANGE.radius.defaultValue,
          SHAPE_RANGE.radius.min,
          SHAPE_RANGE.radius.max
        )}
        min={SHAPE_RANGE.radius.min}
        max={SHAPE_RANGE.radius.max}
        step={SHAPE_RANGE.radius.step}
        unit="px"
        onChange={(value) =>
          onUpdateOverrides?.({
            ...baseOverrides,
            radius: value,
          })
        }
      />

      {showButtonControls && (
        <>
          <ProSliderRow
            label="Button Size"
            value={clampToRange(
              baseOverrides.buttonScale ?? SHAPE_RANGE.buttonScale.defaultValue,
              SHAPE_RANGE.buttonScale.min,
              SHAPE_RANGE.buttonScale.max
            )}
            min={SHAPE_RANGE.buttonScale.min}
            max={SHAPE_RANGE.buttonScale.max}
            step={SHAPE_RANGE.buttonScale.step}
            unit="%"
            onChange={(value) =>
              onUpdateOverrides?.({
                ...baseOverrides,
                buttonScale: value,
              })
            }
          />
          <ProSliderRow
            label="Button Radius"
            value={clampToRange(
              baseOverrides.buttonRadius ?? SHAPE_RANGE.buttonRadius.defaultValue,
              SHAPE_RANGE.buttonRadius.min,
              SHAPE_RANGE.buttonRadius.max
            )}
            min={SHAPE_RANGE.buttonRadius.min}
            max={SHAPE_RANGE.buttonRadius.max}
            step={SHAPE_RANGE.buttonRadius.step}
            unit="px"
            onChange={(value) =>
              onUpdateOverrides?.({
                ...baseOverrides,
                buttonRadius: value,
              })
            }
          />
        </>
      )}

      {showSurfaceControls && (
        <ProSliderRow
          label="Surface Radius"
          value={clampToRange(
            baseOverrides.surfaceRadius ?? SHAPE_RANGE.surfaceRadius.defaultValue,
            SHAPE_RANGE.surfaceRadius.min,
            SHAPE_RANGE.surfaceRadius.max
          )}
          min={SHAPE_RANGE.surfaceRadius.min}
          max={SHAPE_RANGE.surfaceRadius.max}
          step={SHAPE_RANGE.surfaceRadius.step}
          unit="px"
          onChange={(value) =>
            onUpdateOverrides?.({
              ...baseOverrides,
              surfaceRadius: value,
            })
          }
        />
      )}
    </>
  );
}

function ProColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const isValid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.54)" }}>{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={isValid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-5 h-5 rounded-md border border-black/10 cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-[4px] [&::-webkit-color-swatch]:border-none shrink-0"
        />
        <input
          type="text"
          value={value}
          placeholder="#000000"
          onChange={(e) => {
            const v = e.target.value;
            onChange(v);
          }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && !v.startsWith("#")) onChange("#" + v);
          }}
          className="w-[68px] h-6 px-1.5 rounded-md text-[10px] font-mono outline-none"
          style={{
            background: "rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.08)",
            color: "rgba(0,0,0,0.6)",
          }}
        />
      </div>
    </div>
  );
}

function AlignRow({
  value,
  onChange,
}: {
  value?: "left" | "center" | "right";
  onChange: (v: "left" | "center" | "right") => void;
}) {
  const opts: Array<{ v: "left" | "center" | "right"; icon: React.ReactNode }> = [
    { v: "left",   icon: <AlignLeft size={13} /> },
    { v: "center", icon: <AlignCenter size={13} /> },
    { v: "right",  icon: <AlignRight size={13} /> },
  ];
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.54)" }}>Align</span>
      <div className="flex items-center gap-1">
        {opts.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            title={o.v}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{
              background: value === o.v ? "rgba(59,130,246,0.15)" : "rgba(0,0,0,0.04)",
              border: `1px solid ${value === o.v ? "rgba(59,130,246,0.35)" : "transparent"}`,
              color: value === o.v ? "#3b82f6" : "rgba(0,0,0,0.45)",
            }}
          >
            {o.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

const STARTER_HTML_SNIPPET = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, sans-serif;
    background: #0f172a; color: #e2e8f0;
    display: flex; align-items: center; justify-content: center;
    min-height: 320px; padding: 48px 32px;
  }
  .container { max-width: 640px; text-align: center; }
  h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 1rem;
    background: linear-gradient(135deg, #6366f1, #a78bfa);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  p { font-size: 1.1rem; color: #94a3b8; line-height: 1.6; margin-bottom: 2rem; }
  .btn { display: inline-block; padding: 12px 28px; border-radius: 12px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white; font-weight: 600; cursor: pointer; border: none;
    font-size: 1rem; transition: transform 0.2s; }
  .btn:hover { transform: scale(1.05); }
<\/style>
<\/head>
<body>
  <div class="container">
    <h1>Custom Block ✦<\/h1>
    <p>Eigenes HTML, CSS und JavaScript.<\/p>
    <button class="btn" onclick="this.textContent='🎉 Works!'">Click me<\/button>
  <\/div>
<\/body>
<\/html>`;

function CustomCodeEditor({
  onClose,
  onUpdateContent,
  blockId,
  savedHtml,
}: {
  onClose: () => void;
  onUpdateContent?: (key: string, value: string) => void;
  blockId: string;
  savedHtml?: string;
}) {
  const storageKey = `bs_custom_draft_${blockId}`;
  const [code, setCode] = useState<string>(() => {
    if (savedHtml) return savedHtml;
    try { return localStorage.getItem(storageKey) || STARTER_HTML_SNIPPET; } catch { return STARTER_HTML_SNIPPET; }
  });
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    onUpdateContent?.("html", code);
    try { localStorage.setItem(storageKey, code); } catch { /* ignore */ }
    setApplied(true);
    setTimeout(() => setApplied(false), 1800);
  };

  const handleReset = () => {
    setCode(STARTER_HTML_SNIPPET);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px]">⌨️</span>
          <span className="text-[12px] font-semibold" style={{ color: "#111" }}>Custom Code</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md"
          style={{ background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.4)" }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Info banner */}
      <div
        className="mx-4 mt-3 px-3 py-2 rounded-xl text-[10px] leading-relaxed shrink-0"
        style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)", color: "rgba(0,0,0,0.55)" }}
      >
        Schreibe beliebiges <strong>HTML/CSS/JS</strong> — wird in einem sicheren Sandbox-Frame gerendert.
        Kein Zugriff auf den Editor. Klicke <strong>Anwenden</strong> um Vorschau zu aktualisieren.
      </div>

      {/* Code editor */}
      <div className="flex-1 mx-4 mt-3 flex flex-col" style={{ minHeight: 0 }}>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="flex-1 w-full resize-none rounded-xl text-[11px] leading-relaxed outline-none p-3"
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            background: "#0f172a",
            color: "#e2e8f0",
            border: "1px solid rgba(99,102,241,0.2)",
            minHeight: 300,
            tabSize: 2,
          }}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              const s = e.currentTarget.selectionStart;
              const end = e.currentTarget.selectionEnd;
              const val = e.currentTarget.value;
              e.currentTarget.value = val.substring(0, s) + "  " + val.substring(end);
              e.currentTarget.selectionStart = e.currentTarget.selectionEnd = s + 2;
              setCode(e.currentTarget.value);
            }
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 py-3 shrink-0">
        <button
          onClick={handleReset}
          className="flex-1 py-2 rounded-xl text-[11px] font-medium transition-colors"
          style={{ background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.55)" }}
        >
          Reset
        </button>
        <button
          onClick={handleApply}
          className="flex-2 px-5 py-2 rounded-xl text-[11px] font-semibold transition-all"
          style={{
            background: applied ? "#10b981" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            flex: 2,
          }}
        >
          {applied ? "✓ Angewendet" : "Anwenden ↵"}
        </button>
      </div>
    </div>
  );
}

function ProSliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.54)" }}>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step ?? 1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 h-1 appearance-none bg-black/10 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black/60"
        />
        <span className="text-[10px] font-mono w-[36px] text-right" style={{ color: "rgba(0,0,0,0.38)" }}>
          {value}{unit}
        </span>
      </div>
    </div>
  );
}

function InlineImagePicker({
  currentImage,
  onSelectImage,
  onExpandPicker,
}: {
  currentImage?: string;
  onSelectImage: (url: string) => void;
  onExpandPicker: () => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [activeSection, setActiveSection] = useState<string>("library");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAssets(loadAssets().filter((a) => a.type === "image"));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newAsset = addAsset({
        name: file.name,
        url: dataUrl,
        type: "image",
        isExternal: false,
      });
      setAssets((prev) => [newAsset, ...prev]);
      onSelectImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onSelectImage(trimmed);
    setUrlInput("");
  };

  const sectionTabs = [
    { id: "library", label: "Bibliothek" },
    { id: "stock", label: "Stock" },
    { id: "url", label: "URL" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Current image preview */}
      {currentImage && (
        <div
          className="rounded-xl overflow-hidden relative"
          style={{ border: "1px solid rgba(0,0,0,0.08)" }}
        >
          <img
            src={currentImage}
            alt="Current"
            className="w-full h-32 object-cover"
          />
          <span
            className="absolute top-2 left-2 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md"
            style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
          >
            Aktuell
          </span>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-1">
        {sectionTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors"
            style={{
              background: activeSection === tab.id ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.02)",
              color: activeSection === tab.id ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.4)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Library */}
      {activeSection === "library" && (
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-medium transition-colors"
            style={{
              background: "rgba(0,0,0,0.03)",
              border: "1.5px dashed rgba(0,0,0,0.15)",
              color: "rgba(0,0,0,0.5)",
            }}
          >
            <Upload size={13} />
            Bild hochladen
          </button>

          {assets.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => onSelectImage(asset.url)}
                  className="rounded-lg overflow-hidden transition-all hover:ring-2 hover:ring-black/20"
                  style={{ border: "1px solid rgba(0,0,0,0.08)" }}
                >
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="w-full h-16 object-cover"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-center py-4" style={{ color: "rgba(0,0,0,0.35)" }}>
              Noch keine Bilder hochgeladen.
            </p>
          )}
        </div>
      )}

      {/* Stock photos */}
      {activeSection === "stock" && (
        <div className="flex flex-col gap-3">
          {STOCK_SECTIONS.slice(0, 3).map((section) => (
            <div key={section.id} className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(0,0,0,0.35)" }}>
                {section.label}
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {section.images.slice(0, 6).map((img) => (
                  <button
                    key={img.id}
                    onClick={() => onSelectImage(img.url)}
                    className="rounded-lg overflow-hidden transition-all hover:ring-2 hover:ring-black/20"
                    style={{ border: "1px solid rgba(0,0,0,0.08)" }}
                  >
                    <img
                      src={img.preview}
                      alt={img.name}
                      className="w-full h-16 object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* URL input */}
      {activeSection === "url" && (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            placeholder="https://example.com/image.jpg"
            className="w-full rounded-lg px-3 py-2 text-[11px] outline-none"
            style={{
              background: "rgba(0,0,0,0.03)",
              border: "1px solid rgba(0,0,0,0.1)",
              color: "rgba(0,0,0,0.8)",
            }}
          />
          <button
            onClick={handleUrlSubmit}
            className="w-full py-2 rounded-lg text-[11px] font-medium transition-colors"
            style={{ background: "rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.65)" }}
          >
            Bild verwenden
          </button>
        </div>
      )}

      {/* Expand button */}
      <button
        onClick={onExpandPicker}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-medium transition-colors"
        style={{
          background: "rgba(0,0,0,0.03)",
          color: "rgba(0,0,0,0.4)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <Maximize2 size={11} />
        Vollansicht öffnen
      </button>
    </div>
  );
}
