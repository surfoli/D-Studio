"use client";

import { useMemo, useState } from "react";

interface PlanSpacingSelectorProps {
  label: string;
  currentSpacing: string;
  onSpacingChange: (spacing: string) => void;
  config: { color: string };
  isDark?: boolean;
  hideFrame?: boolean;
  canvasBackground?: string;
  description?: string;
}

const SPACING_TOKENS = [
  { name: "XS", value: "0.5rem", px: 8,  color: "#10b981" },
  { name: "SM", value: "1rem",   px: 16, color: "#f59e0b" },
  { name: "MD", value: "1.5rem", px: 24, color: "#3b82f6" },
  { name: "LG", value: "2rem",   px: 32, color: "#8b5cf6" },
  { name: "XL", value: "3rem",   px: 48, color: "#ef4444" },
];

function findClosestToken(spacing: string): number {
  const match = spacing.match(/(-?\d*\.?\d+)/);
  if (!match) return 2;
  const val = Number.parseFloat(match[1]);
  let closest = 0;
  let minDist = Infinity;
  SPACING_TOKENS.forEach((t, i) => {
    const d = Math.abs(Number.parseFloat(t.value) - val);
    if (d < minDist) { minDist = d; closest = i; }
  });
  return closest;
}

function getContrastColor(backgroundColor: string, isDark: boolean): string {
  if (!backgroundColor || backgroundColor === "custom") return isDark ? "#ffffff" : "#000000";
  const hex = backgroundColor.replace("#", "");
  const r = Number.parseInt(hex.substring(0, 2), 16) || 0;
  const g = Number.parseInt(hex.substring(2, 4), 16) || 0;
  const b = Number.parseInt(hex.substring(4, 6), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "#000000" : "#ffffff";
}

function getMutedColor(backgroundColor: string, isDark: boolean): string {
  const main = getContrastColor(backgroundColor, isDark);
  return main === "#000000" ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.65)";
}

function MiniWebPreview({ spacingPx, isDark }: { spacingPx: number; isDark: boolean }) {
  const gap = spacingPx;
  const cardPad = Math.max(6, Math.round(spacingPx * 0.75));
  const bg = isDark ? "#111" : "#fff";
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "#f8f8f8";
  const text = isDark ? "#e5e5e5" : "#1a1a1a";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <div
      className="rounded-xl overflow-hidden w-full"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      {/* Nav */}
      <div
        className="flex items-center justify-between"
        style={{ padding: `${Math.max(8, cardPad)}px ${gap}px`, borderBottom: `1px solid ${border}` }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: text }}>TASKFLOW</span>
        <div className="flex items-center" style={{ gap: Math.max(8, gap * 0.5) }}>
          <span style={{ fontSize: 9, color: muted }}>Features</span>
          <span style={{ fontSize: 9, color: muted }}>Pricing</span>
          <span style={{ fontSize: 9, color: muted }}>Blog</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: `${gap}px` }}>
        <div
          className="rounded-lg overflow-hidden"
          style={{ marginBottom: gap, position: "relative", height: 80, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=200&fit=crop&q=80"
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}
          />
          <div style={{ position: "absolute", bottom: 8, left: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
              Ship faster, together
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2" style={{ gap }}>
          <div className="rounded-lg overflow-hidden" style={{ background: cardBg }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=300&h=100&fit=crop&q=80"
              alt=""
              style={{ width: "100%", height: 44, objectFit: "cover" }}
            />
            <div style={{ padding: cardPad }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: text }}>Dashboard</div>
              <div style={{ fontSize: 9, color: muted, marginTop: 3 }}>Analytics auf einen Blick</div>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden" style={{ background: cardBg }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=100&fit=crop&q=80"
              alt=""
              style={{ width: "100%", height: 44, objectFit: "cover" }}
            />
            <div style={{ padding: cardPad }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: text }}>Reports</div>
              <div style={{ fontSize: 9, color: muted, marginTop: 3 }}>Daten exportieren</div>
            </div>
          </div>
        </div>

        {/* Footer area */}
        <div
          className="flex items-center justify-between"
          style={{ marginTop: gap, paddingTop: Math.max(6, gap * 0.5), borderTop: `1px solid ${border}` }}
        >
          <span style={{ fontSize: 8, color: muted }}>2025 Taskflow Inc.</span>
          <span style={{ fontSize: 8, color: muted }}>Privacy / Terms</span>
        </div>
      </div>
    </div>
  );
}

export function PlanSpacingSelector({
  label,
  currentSpacing,
  onSpacingChange,
  config,
  isDark = false,
  hideFrame = false,
  canvasBackground,
  description,
}: PlanSpacingSelectorProps) {
  const activeIdx = useMemo(() => findClosestToken(currentSpacing), [currentSpacing]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const displayIdx = hoveredIdx !== null ? hoveredIdx : activeIdx;
  const previewPx = SPACING_TOKENS[displayIdx].px;

  const textMain = getContrastColor(canvasBackground || "", isDark);
  const textMuted = getMutedColor(canvasBackground || "", isDark);

  return (
    <div
      className="py-6"
      style={{
        background: hideFrame ? (isDark ? "#000000" : "#ffffff") : "transparent",
        margin: hideFrame ? "-1.5rem" : "0",
        padding: hideFrame ? "1.5rem" : "1.5rem 0",
      }}
    >
      {/* Header */}
      <div className="mb-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: config.color }}>
          {label}
        </div>
        {description && (
          <div className="mt-1 text-[11px]" style={{ color: textMuted }}>
            {description}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-5 items-start">
        {/* LEFT: Token list */}
        <div className="flex flex-col gap-2">
          {SPACING_TOKENS.map((token, i) => {
            const isActive = i === activeIdx;
            const isHovered = i === hoveredIdx;
            return (
              <button
                key={token.name}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
                style={{
                  background: isActive
                    ? (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)")
                    : isHovered
                      ? (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)")
                      : "transparent",
                  border: `1.5px solid ${isActive ? config.color : "transparent"}`,
                  cursor: "pointer",
                }}
                onClick={() => onSpacingChange(token.value)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Pill */}
                <span
                  className="inline-flex items-center justify-center rounded-md text-[10px] font-bold text-white"
                  style={{
                    background: token.color,
                    minWidth: 32,
                    height: 22,
                    padding: "0 6px",
                  }}
                >
                  {token.name}
                </span>

                {/* Value */}
                <span className="text-[13px] font-medium tabular-nums" style={{ color: textMain }}>
                  {token.value}
                </span>

                {/* Pixel hint */}
                <span className="text-[10px] ml-auto" style={{ color: textMuted }}>
                  {token.px}px
                </span>
              </button>
            );
          })}
        </div>

        {/* RIGHT: One live preview */}
        <div>
          <div className="text-[9px] uppercase tracking-[0.14em] font-semibold mb-2" style={{ color: config.color }}>
            Vorschau — {SPACING_TOKENS[displayIdx].name} ({SPACING_TOKENS[displayIdx].value})
          </div>
          <MiniWebPreview spacingPx={previewPx} isDark={isDark} />
        </div>
      </div>
    </div>
  );
}
