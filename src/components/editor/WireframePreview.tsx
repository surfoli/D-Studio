"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, Reorder, useDragControls } from "framer-motion";
import type { DesignBrief, DesignBriefSection } from "@/lib/design-brief";
import { getPatternById } from "@/lib/design-patterns";
import { getThemeContent } from "@/lib/theme-content";

interface WireframePreviewProps {
  brief: DesignBrief;
  highlightSectionId?: string | null;
  selectedSectionId?: string | null;
  onSectionClick?: (sectionId: string) => void;
  /** Called when user drags sections to reorder on canvas */
  onReorder?: (sections: DesignBriefSection[]) => void;
}

// ── Design constants ──
const DESIGN_WIDTH = 1440; // Full-size website width

// Images are now loaded from theme-content.ts per contentTheme

function Img({ src, style }: { src: string; style?: React.CSSProperties }) {
  return <img src={src} alt="" loading="lazy" draggable={false} style={{ objectFit: "cover", width: "100%", height: "100%", display: "block", ...style }} />;
}

// ── Border radius helper ──

function brValue(br: string): number {
  switch (br) {
    case "sharp": return 0;
    case "soft": return 12;
    case "rounded": return 20;
    case "pill": return 9999;
    default: return 12;
  }
}

// ── Full-size Section Renderer ──
// Renders each section at REAL website sizes (1440px wide)

// ── Drag Handle Icon ──
function DragHandleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <circle cx="4" cy="4" r="1.2" /><circle cx="4" cy="7" r="1.2" /><circle cx="4" cy="10" r="1.2" />
      <circle cx="8" cy="4" r="1.2" /><circle cx="8" cy="7" r="1.2" /><circle cx="8" cy="10" r="1.2" />
    </svg>
  );
}

function FullSizeSection({ section, brief, index, isHighlighted, isSelected, onClick, dragControls }: {
  section: DesignBriefSection;
  brief: DesignBrief;
  index: number;
  isHighlighted?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  dragControls?: ReturnType<typeof useDragControls>;
}) {
  const pattern = getPatternById(section.patternId);
  const hint = pattern?.wireframe ?? { height: "md", layout: "centered", hasImage: false };
  const c = brief.colors;
  const pri = c.primary;
  const sec = c.secondary;
  const acc = c.accent;
  const txt = c.text;
  const muted = c.textMuted;
  const bg = c.background;
  const surf = c.surface;
  const br = brValue(brief.style.borderRadius);
  const font = brief.typography.headingFont || "Inter";
  const body = brief.typography.bodyFont || "Inter";

  // Theme-aware content
  const t = getThemeContent(brief.contentTheme);
  const IMG = t.images;

  // Premium / luxury detection
  const isLuxury = brief.contentTheme === "automotive" || brief.style.mood?.includes("luxury") || brief.style.darkMode;
  // Editorial / athletic detection
  const isEditorial = t.isEditorial || brief.style.mood?.includes("editorial") || brief.contentTheme === "fitness";

  // Realistic button styles
  const btnPrimary: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "16px 32px", borderRadius: Math.min(br, 12), background: pri,
    color: "#fff", fontSize: 16, fontWeight: 600, fontFamily: body,
    letterSpacing: "0.01em", whiteSpace: "nowrap", border: "none",
    cursor: "pointer",
  };
  const btnOutline: React.CSSProperties = {
    ...btnPrimary, background: "transparent", color: txt,
    border: `1.5px solid ${txt}22`,
  };
  const card: React.CSSProperties = {
    borderRadius: Math.min(br, 16), background: surf,
    border: `1px solid ${txt}0a`, overflow: "hidden",
  };

  // Section padding based on spacing system
  const sectionPy = brief.spacing.system === "compact" ? 80 : brief.spacing.system === "relaxed" ? 140 : 112;
  const maxW = 1200;

  const isEven = index % 2 === 0;
  const sectionBg = isLuxury ? bg : (isEven ? bg : `${surf}22`);

  const renderContent = () => {
    const id = section.patternId;

    // ── Navbar ──
    if (id.startsWith("navbar")) {
      if (isEditorial && !isLuxury) {
        // ZONIXX-style editorial nav: bold serif brand, clean links, outlined CTA
        return (
          <div style={{ padding: "0 48px", height: 80, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${txt}0a` }}>
            <span style={{ fontSize: 22, fontWeight: 800, fontFamily: font, color: txt, letterSpacing: "0.02em", textTransform: "uppercase" as const }}>
              {brief.name || t.brandName}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
              {t.navLinks.map((l) => (
                <span key={l} style={{ fontSize: 14, color: muted, fontFamily: body, fontWeight: 500 }}>{l}</span>
              ))}
            </div>
            <div style={{ ...btnOutline, padding: "10px 24px", fontSize: 13, borderRadius: 0, border: `1.5px solid ${txt}`, color: txt, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
              {t.heroCtaPrimary}
            </div>
          </div>
        );
      }
      return (
        <div style={{ padding: "0 48px", height: 80, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: isLuxury ? "none" : `1px solid ${txt}08`, background: isLuxury ? "transparent" : undefined }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isLuxury && <div style={{ width: 28, height: 28, borderRadius: 4, background: acc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: bg }}>K</div>}
            <span style={{ fontSize: isLuxury ? 18 : 22, fontWeight: 700, fontFamily: font, color: txt, letterSpacing: isLuxury ? "0.12em" : "-0.02em", textTransform: isLuxury ? "uppercase" as const : undefined }}>
              {brief.name || t.brandName}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: isLuxury ? 32 : 40 }}>
            {t.navLinks.map((l) => (
              <span key={l} style={{ fontSize: isLuxury ? 13 : 15, color: muted, fontFamily: body, fontWeight: 500, letterSpacing: isLuxury ? "0.02em" : undefined }}>{l}</span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ ...btnPrimary, padding: "10px 24px", fontSize: 13, background: isLuxury ? acc : pri, color: isLuxury ? bg : "#fff", borderRadius: isLuxury ? 4 : Math.min(br, 12) }}>{t.heroCtaPrimary}</div>
          </div>
        </div>
      );
    }

    // ── Hero: Fullbleed / Video ──
    if (id === "hero-fullbleed" || id === "hero-video") {
      if (isEditorial && !isLuxury) {
        // ZONIXX-style editorial hero: label, massive serif heading, image with overlay text
        return (
          <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy * 0.6}px 48px ${sectionPy * 0.3}px` }}>
            <p style={{ fontSize: 12, color: muted, fontFamily: body, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
              ACHIEVE YOUR FITNESS GOALS
            </p>
            <h1 style={{ fontSize: 100, fontWeight: 400, fontFamily: font, color: txt, lineHeight: 0.9, letterSpacing: "-0.03em", margin: "0 0 32px", textTransform: "uppercase" as const }}>
              {t.heroTitle}<br />{t.heroTitleBreak}
            </h1>
            {/* Hero image with overlaid bold text */}
            <div style={{ position: "relative", borderRadius: Math.min(br, 12), overflow: "hidden", aspectRatio: "16/7" }}>
              <Img src={IMG.hero} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)` }} />
              <div style={{ position: "absolute", bottom: 40, left: 40, right: 40 }}>
                <h2 style={{ fontSize: 72, fontWeight: 800, fontFamily: font, color: "#fff", lineHeight: 0.95, letterSpacing: "-0.02em", margin: 0, textTransform: "uppercase" as const }}>
                  {t.contentTitle}
                </h2>
              </div>
              <div style={{ position: "absolute", bottom: 40, right: 40, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#fff", fontFamily: body }}>3 min</span>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 12, color: "#fff", marginLeft: 2 }}>▶</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              <p style={{ fontSize: 13, color: muted, fontFamily: body, maxWidth: 400, lineHeight: 1.6 }}>
                {t.heroSubtitle}
              </p>
            </div>
          </div>
        );
      }
      if (isLuxury) {
        // Karzone-style luxury hero: dramatic image, bottom-left text, split CTA bar
        return (
          <div style={{ position: "relative", minHeight: 760 }}>
            <Img src={IMG.hero} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${bg}dd 0%, ${bg}99 35%, transparent 65%)` }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${bg}ff 0%, ${bg}cc 15%, transparent 50%)` }} />
            {/* Location badge */}
            <div style={{ position: "absolute", top: 100, left: 48, zIndex: 2 }}>
              <span style={{ fontSize: 11, color: muted, fontFamily: body, textTransform: "uppercase", letterSpacing: "0.08em" }}>NEW YORK, USA</span>
            </div>
            {/* Right side subtitle */}
            <div style={{ position: "absolute", top: 100, right: 48, zIndex: 2, maxWidth: 320, textAlign: "right" }}>
              <span style={{ fontSize: 12, color: `${txt}66`, fontFamily: body, lineHeight: 1.6 }}>{t.heroSubtitle}</span>
            </div>
            {/* Main headline */}
            <div style={{ position: "absolute", bottom: 120, left: 48, zIndex: 2 }}>
              <div style={{ fontSize: 11, color: `${txt}44`, fontFamily: body, letterSpacing: "0.06em", marginBottom: 16 }}>001</div>
              <h1 style={{ fontSize: 80, fontWeight: 300, fontFamily: font, color: txt, lineHeight: 0.92, letterSpacing: "-0.02em", margin: 0 }}>
                {t.heroTitle}<br />{t.heroTitleBreak}
              </h1>
            </div>
            {/* Split CTA bar at bottom */}
            {t.heroSplitCtas && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "grid", gridTemplateColumns: "1fr 1fr", zIndex: 2 }}>
                {t.heroSplitCtas.map((cta, i) => (
                  <div key={i} style={{ padding: "20px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${txt}15`, background: i === 0 ? `${bg}cc` : `${bg}88` }}>
                    <span style={{ fontSize: 14, color: txt, fontFamily: body, fontWeight: 500 }}>{cta}</span>
                    <span style={{ fontSize: 18, color: acc }}>→</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      return (
        <div style={{ position: "relative", minHeight: 700, display: "flex", alignItems: "flex-end", paddingBottom: 80 }}>
          <Img src={IMG.hero} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${bg}ee 5%, ${bg}88 40%, transparent 70%)` }} />
          <div style={{ position: "relative", zIndex: 1, maxWidth: maxW, margin: "0 auto", width: "100%", padding: "0 48px" }}>
            <h1 style={{ fontSize: 72, fontWeight: 800, fontFamily: font, color: txt, lineHeight: 0.95, letterSpacing: "-0.03em", margin: 0, maxWidth: 700 }}>
              {t.heroTitle}<br />{t.heroTitleBreak}
            </h1>
            <p style={{ fontSize: 20, color: muted, fontFamily: body, margin: "24px 0 0", maxWidth: 520, lineHeight: 1.6 }}>
              {t.heroSubtitle}
            </p>
            <div style={{ display: "flex", gap: 16, marginTop: 36 }}>
              <div style={btnPrimary}>{t.heroCtaPrimary}</div>
              <div style={btnOutline}>{t.heroCtaSecondary}</div>
            </div>
          </div>
        </div>
      );
    }

    // ── Hero: Product / Editorial / Split ──
    if (id === "hero-product" || id === "hero-editorial" || hint.layout === "split" || hint.layout === "asymmetric") {
      if (isEditorial && !isLuxury && t.missionTitle) {
        // ZONIXX mission statement: star icon, bold centered heading, paragraph, outlined CTA
        return (
          <div style={{ maxWidth: 640, margin: "0 auto", padding: `${sectionPy}px 48px`, textAlign: "center" }}>
            <div style={{ fontSize: 36, color: txt, marginBottom: 24 }}>✦</div>
            <h2 style={{ fontSize: 32, fontWeight: 800, fontFamily: font, color: txt, lineHeight: 1.15, letterSpacing: "-0.01em", margin: 0, textTransform: "uppercase" as const }}>
              {t.missionTitle}
            </h2>
            <p style={{ fontSize: 14, color: muted, fontFamily: body, marginTop: 20, lineHeight: 1.7 }}>
              {t.missionDesc}
            </p>
            <div style={{ ...btnOutline, display: "inline-flex", padding: "12px 28px", fontSize: 13, borderRadius: 0, border: `1.5px solid ${txt}`, color: txt, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginTop: 28 }}>
              {t.heroCtaPrimary}
            </div>
          </div>
        );
      }
      if (isLuxury && t.aboutText) {
        // Karzone "About Us" editorial section: large serif text with accent highlight
        return (
          <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy * 1.2}px 48px` }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 80 }}>
              <div style={{ flex: 1.5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
                  <div style={{ width: 24, height: 1, background: acc }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: muted, fontFamily: body, textTransform: "uppercase", letterSpacing: "0.12em" }}>ABOUT US</span>
                </div>
                <h2 style={{ fontSize: 44, fontWeight: 400, fontFamily: font, color: txt, lineHeight: 1.25, letterSpacing: "-0.01em", margin: 0 }}>
                  {t.aboutText}{" "}
                  <span style={{ color: acc }}>{t.aboutHighlight}</span>
                </h2>
              </div>
              <div style={{ flex: 0.8, paddingTop: 80 }}>
                <div style={{ width: "100%", height: 1, background: `${txt}12`, marginBottom: 24 }} />
                <p style={{ fontSize: 13, color: `${txt}55`, fontFamily: body, lineHeight: 1.8 }}>
                  {t.heroSubtitle}
                </p>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div style={{ minHeight: 680, display: "flex", alignItems: "center", padding: `0 48px` }}>
          <div style={{ maxWidth: maxW, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 64, alignItems: "center" }}>
            <div>
              <span style={{ display: "inline-block", padding: "6px 16px", fontSize: 13, fontWeight: 500, color: pri, border: `1px solid ${pri}30`, borderRadius: 999, marginBottom: 24, fontFamily: body }}>
                {t.brandName}
              </span>
              <h1 style={{ fontSize: 60, fontWeight: 800, fontFamily: font, color: txt, lineHeight: 1.05, letterSpacing: "-0.03em", margin: 0 }}>
                {t.heroTitle}<br />{t.heroTitleBreak}
              </h1>
              <p style={{ fontSize: 20, color: muted, fontFamily: body, margin: "24px 0 0", maxWidth: 480, lineHeight: 1.6 }}>
                {t.heroSubtitle}
              </p>
              <div style={{ display: "flex", gap: 16, marginTop: 36 }}>
                <div style={btnPrimary}>{t.heroCtaPrimary}</div>
                <div style={btnOutline}>{t.heroCtaSecondary}</div>
              </div>
            </div>
            <div style={{ borderRadius: Math.min(br, 20), overflow: "hidden", aspectRatio: "4/3" }}>
              <Img src={IMG.office} />
            </div>
          </div>
        </div>
      );
    }

    // ── Hero: Centered (default) ──
    if (id.startsWith("hero")) {
      return (
        <div style={{ minHeight: 680, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: `${sectionPy}px 48px` }}>
          <span style={{ display: "inline-block", padding: "6px 16px", fontSize: 13, fontWeight: 500, color: pri, border: `1px solid ${pri}30`, borderRadius: 999, marginBottom: 24, fontFamily: body }}>
            {t.brandName}
          </span>
          <h1 style={{ fontSize: 64, fontWeight: 800, fontFamily: font, color: txt, lineHeight: 1.05, letterSpacing: "-0.03em", margin: 0, maxWidth: 800 }}>
            {t.heroTitle}<br />{t.heroTitleBreak}
          </h1>
          <p style={{ fontSize: 20, color: muted, fontFamily: body, margin: "24px 0 0", maxWidth: 560, lineHeight: 1.6 }}>
            {t.heroSubtitle}
          </p>
          <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
            <div style={btnPrimary}>{t.heroCtaPrimary}</div>
            <div style={btnOutline}>{t.heroCtaSecondary}</div>
          </div>
        </div>
      );
    }

    // ── Features: Bento ──
    if (id.includes("bento")) {
      if (isLuxury && t.featuredBrand) {
        // JAGUAR-style featured vehicle section: giant brand text + car image + specs
        return (
          <div style={{ position: "relative", padding: `${sectionPy}px 0`, overflow: "hidden" }}>
            {/* Giant background brand text */}
            <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", fontSize: 200, fontWeight: 800, fontFamily: font, color: `${txt}06`, letterSpacing: "0.06em", whiteSpace: "nowrap", lineHeight: 1, userSelect: "none" }}>
              {t.featuredBrand}
            </div>
            <div style={{ position: "relative", zIndex: 1, maxWidth: maxW, margin: "0 auto", padding: `0 48px` }}>
              {/* Car image */}
              <div style={{ maxWidth: 700, margin: "0 auto", borderRadius: 0, overflow: "hidden", aspectRatio: "16/9", position: "relative" }}>
                <Img src={t.featuredImage || IMG.product} />
                {/* Reflection/shadow effect */}
                <div style={{ position: "absolute", bottom: 0, left: "10%", right: "10%", height: 4, background: `radial-gradient(ellipse, ${acc}40, transparent)`, filter: "blur(8px)" }} />
              </div>
              {/* Model info + stats */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginTop: 48 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 3, height: 32, background: acc }} />
                    <div>
                      <h3 style={{ fontSize: 22, fontWeight: 700, fontFamily: font, color: txt, margin: 0, letterSpacing: "0.02em" }}>
                        {t.featuredBrand} {t.featuredModel}
                      </h3>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: `${txt}44`, fontFamily: body, marginTop: 12, maxWidth: 360, lineHeight: 1.7 }}>
                    {t.featuredSubtitle}
                  </p>
                </div>
                {/* Stats row */}
                <div style={{ display: "flex", gap: 40 }}>
                  {t.stats.slice(0, 3).map((s, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: `${txt}33`, marginBottom: 8 }}>
                        {["⚡", "🏎️", "📅"][i]}
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: font, color: txt, letterSpacing: "-0.02em" }}>{s.num}</div>
                      <div style={{ fontSize: 11, color: muted, fontFamily: body, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px 48px` }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: 44, fontWeight: 700, fontFamily: font, color: txt, letterSpacing: "-0.02em", margin: 0 }}>{t.features[0]?.title || "Features"}</h2>
            <p style={{ fontSize: 18, color: muted, fontFamily: body, marginTop: 16 }}>{t.features[0]?.desc || ""}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "auto auto", gap: 16 }}>
            <div style={{ ...card, gridRow: "1/3", position: "relative", minHeight: 380 }}>
              <Img src={IMG.abstract} />
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${bg}ee, transparent 60%)` }} />
              <div style={{ position: "absolute", bottom: 28, left: 28, right: 28 }}>
                <h3 style={{ fontSize: 22, fontWeight: 700, fontFamily: font, color: txt, margin: 0 }}>{t.features[1]?.title || ""}</h3>
                <p style={{ fontSize: 15, color: muted, fontFamily: body, marginTop: 8 }}>{t.features[1]?.desc || ""}</p>
              </div>
            </div>
            <div style={{ ...card, padding: 32, display: "flex", flexDirection: "column", justifyContent: "center", background: `${acc}08` }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: acc, fontFamily: font, letterSpacing: "-0.02em" }}>{t.stats[0]?.num}</div>
              <div style={{ fontSize: 15, color: muted, fontFamily: body, marginTop: 8 }}>{t.stats[0]?.label}</div>
            </div>
            <div style={{ ...card, overflow: "hidden", minHeight: 180 }}>
              <Img src={IMG.nature} />
            </div>
            <div style={{ ...card, gridColumn: "2/4", padding: 32, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, fontFamily: font, color: txt, margin: 0 }}>{t.features[2]?.title || ""}</h3>
                <p style={{ fontSize: 15, color: muted, fontFamily: body, marginTop: 4 }}>{t.features[2]?.desc || ""}</p>
              </div>
              <div style={{ ...btnPrimary, fontSize: 14, padding: "12px 24px" }}>{t.heroCtaSecondary}</div>
            </div>
          </div>
        </div>
      );
    }

    // ── Features: 3-col ──
    if (isEditorial && !isLuxury && t.trainingCategories && (id.includes("3col") || id.startsWith("features"))) {
      // ZONIXX training categories: horizontal image strips with label and arrow
      const catImages = [IMG.work1, IMG.work2, IMG.work3];
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy * 0.7}px 48px` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {t.trainingCategories.map((cat, i) => (
              <div key={i} style={{ position: "relative", borderRadius: Math.min(br, 8), overflow: "hidden", height: 100 }}>
                <Img src={catImages[i % catImages.length]} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "grayscale(30%)" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.35), rgba(0,0,0,0.15))" }} />
                <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%", padding: "0 32px" }}>
                  <span style={{ fontSize: 20, fontWeight: 800, fontFamily: font, color: "#fff", textTransform: "uppercase" as const, letterSpacing: "0.02em" }}>
                    {cat}
                  </span>
                  <span style={{ fontSize: 24, color: "#fff" }}>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (id.includes("3col") || id.startsWith("features")) {
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px 48px` }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: 44, fontWeight: 700, fontFamily: font, color: txt, letterSpacing: "-0.02em", margin: 0 }}>{t.contentTitle}</h2>
            <p style={{ fontSize: 18, color: muted, fontFamily: body, marginTop: 16 }}>{t.contentDesc}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {t.features.map((f, i) => (
              <div key={i} style={{ ...card, padding: 40, textAlign: "center" }}>
                <div style={{ width: 64, height: 64, margin: "0 auto 20px", borderRadius: br > 16 ? 32 : Math.min(br, 16), background: [pri, sec, acc][i] + "12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 600, fontFamily: font, color: txt, margin: 0 }}>{f.title}</h3>
                <p style={{ fontSize: 16, color: muted, fontFamily: body, marginTop: 12, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Stats ──
    if (id.startsWith("data-stats") || hint.layout === "stats") {
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy * 0.7}px 48px`, borderTop: `1px solid ${txt}08`, borderBottom: `1px solid ${txt}08` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 32 }}>
            {t.stats.map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 52, fontWeight: 800, fontFamily: font, color: [pri, sec, acc, pri][i], letterSpacing: "-0.03em", lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontSize: 14, color: muted, fontFamily: body, marginTop: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Marquee / Brand Logos ──
    if (id.includes("marquee")) {
      if (isEditorial && !isLuxury) {
        // ZONIXX-style testimonial pills: horizontal pill badges
        return (
          <div style={{ padding: `${sectionPy * 0.4}px 0`, borderTop: `1px solid ${txt}0a`, borderBottom: `1px solid ${txt}0a`, overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 12, paddingLeft: 48, alignItems: "center" }}>
              {[...t.marqueeItems, ...t.marqueeItems].map((item, i) => (
                <div key={i} style={{
                  flexShrink: 0, padding: "10px 24px", borderRadius: 999,
                  border: `1px solid ${txt}15`, background: i % 2 === 0 ? `${txt}08` : "transparent",
                  fontSize: 13, fontWeight: 500, color: txt, fontFamily: body, whiteSpace: "nowrap",
                }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        );
      }
      if (isLuxury && t.brandLogos) {
        // Karzone-style brand logos showcase: glass cards with brand names, featured center brand
        const logos = t.brandLogos;
        const centerIdx = Math.floor(logos.length / 2);
        return (
          <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px 48px` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 24, height: 1, background: acc }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: muted, fontFamily: body, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                POPULAR EXOTIC & LUXURY RENTAL MAKES
              </span>
            </div>
            <p style={{ fontSize: 13, color: `${txt}44`, fontFamily: body, maxWidth: 400, lineHeight: 1.7, marginBottom: 40 }}>
              The finest purveyors of Lamborghini, Ferrari, and more.
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
              {logos.map((logo, i) => (
                <div key={i} style={{
                  width: i === centerIdx ? 140 : 100, height: i === centerIdx ? 140 : 100,
                  borderRadius: 12, border: `1px solid ${txt}15`,
                  background: i === centerIdx ? `${acc}10` : `${surf}44`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4,
                  transition: "all 0.2s",
                }}>
                  <span style={{ fontSize: i === centerIdx ? 15 : 11, fontWeight: 600, color: i === centerIdx ? acc : `${txt}55`, fontFamily: font, textAlign: "center", letterSpacing: "0.02em" }}>
                    {logo}
                  </span>
                </div>
              ))}
            </div>
            {/* CTA below logos */}
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <div style={{ display: "inline-flex", alignItems: "center", padding: "10px 28px", borderRadius: 4, background: acc, color: bg, fontSize: 13, fontWeight: 600, fontFamily: body }}>
                Buy a {logos[centerIdx]}
              </div>
            </div>
          </div>
        );
      }
      const items = t.marqueeItems.map(m => m.toUpperCase());
      return (
        <div style={{ padding: `${sectionPy * 0.5}px 0`, borderTop: `1px solid ${txt}08`, borderBottom: `1px solid ${txt}08`, overflow: "hidden" }}>
          <p style={{ textAlign: "center", fontSize: 13, color: muted, fontFamily: body, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 32 }}>
            {t.marqueeItems.length > 0 ? t.brandName : "Vertrauen von führenden Unternehmen"}
          </p>
          <div style={{ display: "flex", gap: 80, alignItems: "center", paddingLeft: 48 }}>
            {[...items, ...items].map((label, i) => (
              <span key={i} style={{ flexShrink: 0, fontSize: 40, fontWeight: 800, color: `${txt}20`, fontFamily: font, whiteSpace: "nowrap", letterSpacing: "0.06em" }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      );
    }

    // ── Testimonials ──
    if (id.includes("testimonial")) {
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px 48px` }}>
          <h2 style={{ fontSize: 44, fontWeight: 700, fontFamily: font, color: txt, letterSpacing: "-0.02em", margin: 0, textAlign: "center", marginBottom: 64 }}>
            {t.testimonials.length > 0 ? `Was ${t.brandName} Kunden sagen` : "Was unsere Kunden sagen"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {t.testimonials.map((tm, i) => (
              <div key={i} style={{ ...card, padding: 32 }}>
                <p style={{ fontSize: 17, color: txt, fontFamily: body, lineHeight: 1.7, margin: 0 }}>
                  &ldquo;{tm.quote}&rdquo;
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 24 }}>
                  <img src={[IMG.team1, IMG.team2, IMG.team3][i % 3]} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: txt, fontFamily: body }}>{tm.name}</div>
                    <div style={{ fontSize: 13, color: muted, fontFamily: body }}>{tm.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Pricing ──
    if (id.startsWith("pricing")) {
      if (isEditorial && !isLuxury) {
        // ZONIXX "THE CLUB" minimal tier list: name + star + expand icon
        return (
          <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px 48px` }}>
            <p style={{ fontSize: 12, color: muted, fontFamily: body, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 32 }}>THE CLUB</p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {t.pricingPlans.map((plan, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "24px 0", borderBottom: `1px solid ${txt}0a`,
                }}>
                  <span style={{ fontSize: 40, fontWeight: 800, fontFamily: font, color: txt, textTransform: "uppercase" as const, letterSpacing: "-0.01em" }}>
                    {plan.name}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
                    <span style={{ fontSize: 28, color: txt }}>✦</span>
                    <span style={{ fontSize: 28, color: txt, fontWeight: 300 }}>+</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px 48px` }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: 44, fontWeight: 700, fontFamily: font, color: txt, letterSpacing: "-0.02em", margin: 0 }}>{t.pricingPlans.length > 0 ? t.brandName + " Preise" : "Preise"}</h2>
            <p style={{ fontSize: 18, color: muted, fontFamily: body, marginTop: 16 }}>Wähle den Plan der zu dir passt.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, maxWidth: 960, margin: "0 auto" }}>
            {t.pricingPlans.map((plan, i) => (
              <div key={i} style={{
                ...card, padding: 36, display: "flex", flexDirection: "column",
                border: plan.popular ? `2px solid ${pri}` : card.border,
                position: "relative",
              }}>
                {plan.popular && (
                  <span style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", fontSize: 12, fontWeight: 700, background: acc, color: "#fff", padding: "4px 16px", borderRadius: 999 }}>
                    Beliebt
                  </span>
                )}
                <div style={{ fontSize: 20, fontWeight: 600, fontFamily: font, color: txt }}>{plan.name}</div>
                <div style={{ marginTop: 16 }}>
                  <span style={{ fontSize: 48, fontWeight: 800, fontFamily: font, color: txt, letterSpacing: "-0.03em" }}>{plan.price}</span>
                  <span style={{ fontSize: 16, color: muted, fontFamily: body }}>/Monat</span>
                </div>
                <div style={{ marginTop: 28, flex: 1 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, color: muted, fontFamily: body, padding: "8px 0" }}>
                      <span style={{ color: pri, fontSize: 16 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <div style={{
                  ...btnPrimary, width: "100%", marginTop: 28,
                  background: plan.popular ? pri : "transparent",
                  color: plan.popular ? "#fff" : txt,
                  border: plan.popular ? "none" : `1.5px solid ${txt}18`,
                  justifyContent: "center",
                }}>
                  Auswählen
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── CTA ──
    if (id.startsWith("cta")) {
      if (isEditorial && !isLuxury) {
        // ZONIXX dark CTA block: star, large serif title, paragraph, outlined white button
        return (
          <div style={{ background: txt, padding: `${sectionPy * 1.2}px 48px`, textAlign: "center" }}>
            <div style={{ fontSize: 36, color: bg, marginBottom: 24 }}>✦</div>
            <h2 style={{ fontSize: 56, fontWeight: 800, fontFamily: font, color: bg, lineHeight: 1.0, letterSpacing: "-0.02em", margin: 0, maxWidth: 600, marginLeft: "auto", marginRight: "auto", textTransform: "uppercase" as const }}>
              {t.ctaTitle}
            </h2>
            <p style={{ fontSize: 14, color: `${bg}88`, fontFamily: body, marginTop: 20, lineHeight: 1.7, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
              {t.ctaSubtitle}
            </p>
            <div style={{ display: "inline-flex", padding: "12px 28px", borderRadius: 0, border: `1.5px solid ${bg}`, color: bg, fontSize: 13, fontWeight: 600, fontFamily: body, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginTop: 28 }}>
              {t.ctaCta}
            </div>
          </div>
        );
      }
      return (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: `${sectionPy}px 48px`, textAlign: "center" }}>
          <h2 style={{ fontSize: 48, fontWeight: 700, fontFamily: font, color: txt, letterSpacing: "-0.02em", margin: 0 }}>
            {t.ctaTitle}
          </h2>
          <p style={{ fontSize: 18, color: muted, fontFamily: body, marginTop: 16, lineHeight: 1.6 }}>
            {t.ctaSubtitle}
          </p>
          <div style={{ marginTop: 36, display: "flex", justifyContent: "center", gap: 16 }}>
            <div style={btnPrimary}>{t.ctaCta}</div>
          </div>
        </div>
      );
    }

    // ── Gallery / Showcase ──
    if (id.includes("gallery") || id.includes("case")) {
      if (isEditorial && !isLuxury) {
        // ZONIXX "TRAININGS" gallery: header with SEE ALL, horizontal image cards with labels
        return (
          <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy * 0.7}px 48px` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
              <span style={{ fontSize: 18, fontWeight: 800, fontFamily: font, color: txt, textTransform: "uppercase" as const, letterSpacing: "0.02em" }}>
                {t.galleryTitle}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: muted, fontFamily: body }}>See All</span>
                <div style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${txt}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 10, color: txt }}>→</span>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { img: IMG.work1, title: t.galleryCaptions[0] || "Training 1" },
                { img: IMG.work2, title: t.galleryCaptions[1] || "Training 2" },
                { img: IMG.work3, title: t.galleryCaptions[2] || "Training 3" },
                { img: IMG.abstract, title: "Cardio Zone" },
              ].map((p, i) => (
                <div key={i} style={{ position: "relative", borderRadius: Math.min(br, 8), overflow: "hidden", aspectRatio: "16/9" }}>
                  <Img src={p.img} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "grayscale(20%)" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.4))" }} />
                  <div style={{ position: "absolute", bottom: 16, left: 16 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: font, color: "#fff", textTransform: "uppercase" as const }}>{p.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      if (isLuxury) {
        // Premium showcase: minimal cards, overhead images, accent details
        return (
          <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px 48px` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
              <div style={{ width: 24, height: 1, background: acc }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: muted, fontFamily: body, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                {t.galleryTitle}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {[
                { img: IMG.work1, title: t.galleryCaptions[0] || "Projekt 1", cat: t.navLinks[0] || "" },
                { img: IMG.work2, title: t.galleryCaptions[1] || "Projekt 2", cat: t.navLinks[1] || "" },
                { img: IMG.work3, title: t.galleryCaptions[2] || "Projekt 3", cat: t.navLinks[2] || "" },
              ].map((p, i) => (
                <div key={i} style={{ borderRadius: 8, overflow: "hidden", background: `${surf}44`, border: `1px solid ${txt}0a` }}>
                  <div style={{ aspectRatio: "16/10", overflow: "hidden", position: "relative" }}>
                    <Img src={p.img} style={{ filter: "brightness(0.85)" }} />
                    <div style={{ position: "absolute", bottom: 12, left: 12 }}>
                      <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, background: `${acc}cc`, color: bg, fontWeight: 600, fontFamily: body }}>{p.cat}</span>
                    </div>
                  </div>
                  <div style={{ padding: "16px 16px 20px" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, fontFamily: font, color: txt, margin: 0 }}>{p.title}</h3>
                    <span style={{ fontSize: 12, color: `${txt}44`, fontFamily: body, marginTop: 4, display: "block" }}>View details →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px 48px` }}>
          <h2 style={{ fontSize: 44, fontWeight: 700, fontFamily: font, color: txt, letterSpacing: "-0.02em", margin: 0, textAlign: "center", marginBottom: 64 }}>
            {t.galleryTitle}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {[
              { img: IMG.work1, title: t.galleryCaptions[0] || "Projekt 1", cat: t.navLinks[0] || "" },
              { img: IMG.work2, title: t.galleryCaptions[1] || "Projekt 2", cat: t.navLinks[1] || "" },
              { img: IMG.work3, title: t.galleryCaptions[2] || "Projekt 3", cat: t.navLinks[2] || "" },
            ].map((p, i) => (
              <div key={i} style={{ ...card }}>
                <div style={{ aspectRatio: "16/10", overflow: "hidden" }}>
                  <Img src={p.img} />
                </div>
                <div style={{ padding: 20 }}>
                  <span style={{ fontSize: 13, color: pri, fontWeight: 500, fontFamily: body }}>{p.cat}</span>
                  <h3 style={{ fontSize: 18, fontWeight: 600, fontFamily: font, color: txt, margin: "4px 0 0" }}>{p.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Service Cards ──
    if (id.includes("service")) {
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px 48px` }}>
          <h2 style={{ fontSize: 44, fontWeight: 700, fontFamily: font, color: txt, letterSpacing: "-0.02em", margin: 0, textAlign: "center", marginBottom: 64 }}>
            {t.contentTitle}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { title: t.features[0]?.title || "Service 1", desc: t.features[0]?.desc || "", tags: t.navLinks.slice(0, 2), img: IMG.work1 },
              { title: t.features[1]?.title || "Service 2", desc: t.features[1]?.desc || "", tags: t.navLinks.slice(1, 3), img: IMG.work2 },
            ].map((s, i) => (
              <div key={i} style={{ ...card, display: "flex", gap: 24, padding: 28 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 600, fontFamily: font, color: txt, margin: 0 }}>{s.title}</h3>
                  <p style={{ fontSize: 15, color: muted, fontFamily: body, marginTop: 8 }}>{s.desc}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    {s.tags.map((tag) => (
                      <span key={tag} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 999, border: `1px solid ${txt}12`, color: muted, fontFamily: body }}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div style={{ width: 160, borderRadius: Math.min(br, 12), overflow: "hidden", flexShrink: 0 }}>
                  <Img src={s.img} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Content: Big Text ──
    if (id.includes("big-text")) {
      if (isLuxury) {
        return (
          <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy * 1.3}px 48px` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
              <div style={{ width: 24, height: 1, background: acc }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: muted, fontFamily: body, textTransform: "uppercase", letterSpacing: "0.12em" }}>ARRIVE IN STYLE</span>
            </div>
            <h2 style={{ fontSize: 120, fontWeight: 300, fontFamily: font, color: txt, lineHeight: 0.88, letterSpacing: "-0.04em", margin: 0, fontStyle: "italic" }}>
              {t.bigText}<br /><span style={{ color: acc, fontStyle: "italic" }}>{t.bigTextHighlight}</span>
            </h2>
          </div>
        );
      }
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px 48px` }}>
          <h2 style={{ fontSize: 96, fontWeight: 800, fontFamily: font, color: txt, lineHeight: 0.95, letterSpacing: "-0.04em", margin: 0 }}>
            {t.bigText}<br /><span style={{ color: pri }}>{t.bigTextHighlight}</span>
          </h2>
        </div>
      );
    }

    // ── Content: Image + Text / Alternating ──
    if (id.includes("image-text") || id.includes("alternating") || hint.layout === "alternating") {
      if (isLuxury) {
        // Karzone "Superior Customer Service" section: overhead car shot + large text
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 500 }}>
            <div style={{ position: "relative", overflow: "hidden" }}>
              <Img src={IMG.work1} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "grayscale(40%)" }} />
            </div>
            <div style={{ padding: `${sectionPy}px 48px`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h2 style={{ fontSize: 52, fontWeight: 300, fontFamily: font, color: txt, lineHeight: 1.05, letterSpacing: "-0.02em", margin: 0 }}>
                {t.contentTitle}
              </h2>
              <p style={{ fontSize: 14, color: `${txt}55`, fontFamily: body, marginTop: 24, lineHeight: 1.8, maxWidth: 400 }}>
                {t.contentDesc}
              </p>
            </div>
          </div>
        );
      }
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px 48px` }}>
          <div style={{ display: "flex", gap: 64, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 36, fontWeight: 700, fontFamily: font, color: txt, margin: 0, letterSpacing: "-0.02em" }}>{t.contentTitle}</h3>
              <p style={{ fontSize: 18, color: muted, fontFamily: body, marginTop: 16, lineHeight: 1.7 }}>
                {t.contentDesc}
              </p>
              <span style={{ display: "inline-block", fontSize: 16, color: pri, fontWeight: 500, fontFamily: body, marginTop: 20 }}>
                Mehr erfahren →
              </span>
            </div>
            <div style={{ flex: 1, borderRadius: Math.min(br, 16), overflow: "hidden", aspectRatio: "4/3" }}>
              <Img src={IMG.work1} />
            </div>
          </div>
        </div>
      );
    }

    // ── Content: Blog ──
    if (id.includes("blog")) {
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px 48px` }}>
          <h2 style={{ fontSize: 44, fontWeight: 700, fontFamily: font, color: txt, letterSpacing: "-0.02em", margin: 0, textAlign: "center", marginBottom: 64 }}>
            Aus dem Blog
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {[
              { title: t.galleryCaptions[0] || "Artikel 1", date: "15. Feb 2025", img: IMG.work1 },
              { title: t.galleryCaptions[1] || "Artikel 2", date: "8. Feb 2025", img: IMG.work2 },
              { title: t.galleryCaptions[2] || "Artikel 3", date: "1. Feb 2025", img: IMG.work3 },
            ].map((p, i) => (
              <div key={i} style={{ ...card }}>
                <div style={{ aspectRatio: "16/9", overflow: "hidden" }}><Img src={p.img} /></div>
                <div style={{ padding: 24 }}>
                  <span style={{ fontSize: 13, color: muted, fontFamily: body }}>{p.date}</span>
                  <h3 style={{ fontSize: 18, fontWeight: 600, fontFamily: font, color: txt, margin: "8px 0 0" }}>{p.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Contact ──
    if (id.includes("contact")) {
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px 48px` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80 }}>
            <div>
              <h2 style={{ fontSize: 44, fontWeight: 700, fontFamily: font, color: txt, letterSpacing: "-0.02em", margin: 0 }}>{t.contactTitle}</h2>
              <p style={{ fontSize: 18, color: muted, fontFamily: body, marginTop: 16, lineHeight: 1.7 }}>
                Schreib uns und wir melden uns innerhalb von 24 Stunden.
              </p>
              <div style={{ marginTop: 32, fontSize: 15, color: muted, fontFamily: body, lineHeight: 2.2 }}>
                ✉️ hello@{(brief.name || "brand").toLowerCase().replace(/\s/g, "")}.de<br />
                📞 +49 123 456 789<br />
                📍 Berlin, Deutschland
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ height: 48, borderRadius: Math.min(br, 10), background: surf, border: `1px solid ${txt}0a`, padding: "0 16px", display: "flex", alignItems: "center", fontSize: 15, color: `${muted}88`, fontFamily: body }}>Name</div>
                <div style={{ height: 48, borderRadius: Math.min(br, 10), background: surf, border: `1px solid ${txt}0a`, padding: "0 16px", display: "flex", alignItems: "center", fontSize: 15, color: `${muted}88`, fontFamily: body }}>E-Mail</div>
              </div>
              <div style={{ height: 48, borderRadius: Math.min(br, 10), background: surf, border: `1px solid ${txt}0a`, padding: "0 16px", display: "flex", alignItems: "center", fontSize: 15, color: `${muted}88`, fontFamily: body }}>Betreff</div>
              <div style={{ height: 120, borderRadius: Math.min(br, 10), background: surf, border: `1px solid ${txt}0a`, padding: "16px", fontSize: 15, color: `${muted}88`, fontFamily: body }}>Nachricht</div>
              <div style={{ ...btnPrimary, alignSelf: "flex-start" }}>Absenden</div>
            </div>
          </div>
        </div>
      );
    }

    // ── Footer ──
    if (id.startsWith("footer")) {
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `64px 48px 32px`, borderTop: `1px solid ${txt}08` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 48, marginBottom: 64 }}>
            <div>
              <span style={{ fontSize: 20, fontWeight: 700, fontFamily: font, color: txt }}>{brief.name || "Brand"}</span>
              <p style={{ fontSize: 15, color: muted, fontFamily: body, marginTop: 16, lineHeight: 1.7 }}>
                {t.footerTagline}
              </p>
            </div>
            {[
              { title: "Produkt", links: ["Features", "Preise", "Docs"] },
              { title: "Unternehmen", links: ["Über uns", "Blog", "Kontakt"] },
              { title: "Legal", links: ["Impressum", "Datenschutz", "AGB"] },
            ].map((col) => (
              <div key={col.title}>
                <div style={{ fontSize: 14, fontWeight: 600, color: txt, fontFamily: body, marginBottom: 20 }}>{col.title}</div>
                {col.links.map((l) => (
                  <div key={l} style={{ fontSize: 14, color: muted, fontFamily: body, padding: "6px 0" }}>{l}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${txt}08`, paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: muted, fontFamily: body }}>© 2025 {brief.name || "Brand"}. Alle Rechte vorbehalten.</span>
            <div style={{ display: "flex", gap: 24 }}>
              {["Twitter", "GitHub", "LinkedIn"].map((s) => (
                <span key={s} style={{ fontSize: 13, color: muted, fontFamily: body }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ── Default fallback ──
    return (
      <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px 48px`, textAlign: "center" }}>
        <h2 style={{ fontSize: 44, fontWeight: 700, fontFamily: font, color: txt, letterSpacing: "-0.02em", margin: 0 }}>
          {section.label}
        </h2>
        {section.description && (
          <p style={{ fontSize: 18, color: muted, fontFamily: body, marginTop: 16 }}>{section.description}</p>
        )}
      </div>
    );
  };

  const [isHovered, setIsHovered] = useState(false);
  const showOverlay = isSelected || isHighlighted || isHovered;
  const overlayColor = isSelected ? pri : "rgba(99,102,241,0.6)";

  return (
    <div
      style={{ background: sectionBg, position: "relative" }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {renderContent()}

      {/* Framer-style selection/hover overlay */}
      {showOverlay && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none",
          outline: `2px solid ${overlayColor}`,
          outlineOffset: isSelected ? -2 : -1,
        }}>
          {/* Section label badge */}
          <div style={{
            position: "absolute", top: -1, left: -1,
            background: overlayColor, color: "#fff",
            fontSize: 11, fontWeight: 700, fontFamily: "system-ui",
            padding: "3px 10px", borderRadius: "0 0 6px 0",
            letterSpacing: "0.02em",
          }}>
            {section.label}
          </div>

          {/* Drag handle — top center, pointer-events on */}
          {dragControls && (
            <div
              style={{
                position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)",
                background: overlayColor, color: "rgba(255,255,255,0.9)",
                padding: "4px 10px", borderRadius: "0 0 8px 8px",
                cursor: "grab", pointerEvents: "all", display: "flex", alignItems: "center", gap: 4,
                userSelect: "none",
              }}
              onPointerDown={(e) => { e.stopPropagation(); dragControls.start(e); }}
            >
              <DragHandleIcon />
            </div>
          )}

          {/* Corner handles */}
          {isSelected && [
            { top: -4, left: -4 }, { top: -4, right: -4 },
            { bottom: -4, left: -4 }, { bottom: -4, right: -4 },
          ].map((pos, i) => (
            <div key={i} style={{
              position: "absolute", width: 8, height: 8,
              background: "#fff", border: `2px solid ${overlayColor}`,
              borderRadius: 2, pointerEvents: "none", ...pos,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Draggable section wrapper (Reorder.Item + drag controls) ──

function DraggableSection({ section, brief, index, isHighlighted, isSelected, onClick, canDrag }: {
  section: DesignBriefSection;
  brief: DesignBrief;
  index: number;
  isHighlighted?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  canDrag?: boolean;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={dragControls}
      style={{ position: "relative", listStyle: "none" }}
      whileDrag={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)", zIndex: 100, scale: 1.005 }}
      transition={{ duration: 0.15 }}
    >
      <FullSizeSection
        section={section}
        brief={brief}
        index={index}
        isHighlighted={isHighlighted}
        isSelected={isSelected}
        onClick={onClick}
        dragControls={canDrag ? dragControls : undefined}
      />
    </Reorder.Item>
  );
}

// ── Main Preview Component ──

export default function WireframePreview({ brief, highlightSectionId, selectedSectionId, onSectionClick, onReorder }: WireframePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const isEmpty = brief.sections.length === 0;

  // ResizeObserver — recalculate scale when container resizes
  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    setScale(containerWidth / DESIGN_WIDTH);
  }, []);

  useEffect(() => {
    updateScale();
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateScale]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--d3-bg)",
        overflow: "hidden",
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid var(--d3-border-subtle)",
          flexShrink: 0,
          background: "var(--d3-surface)",
        }}
      >
        <div style={{ display: "flex", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f56" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffbd2e" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#27c93f" }} />
        </div>
        <div style={{
          flex: 1, height: 22, borderRadius: 6,
          background: "var(--d3-glass)", border: "1px solid var(--d3-glass-border)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "0.5625rem", color: "var(--d3-text-ghost)", fontFamily: "monospace" }}>
            {brief.name.toLowerCase().replace(/\s+/g, "-")}.vercel.app
          </span>
        </div>
        <span style={{ fontSize: "0.5rem", color: "var(--d3-text-ghost)", fontFamily: "monospace", opacity: 0.5 }}>
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Scaled preview area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "auto",
          position: "relative",
          background: brief.colors.background,
        }}
      >
        {isEmpty ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 12,
              color: "var(--d3-text-ghost)",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity={0.4}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: 600, marginBottom: 4 }}>Noch keine Sektionen</div>
              <div style={{ fontSize: "0.6875rem", opacity: 0.6 }}>Wähle Patterns links oder beschreib dein Design im Chat</div>
            </div>
          </div>
        ) : (
          <div
            style={{
              width: DESIGN_WIDTH,
              transformOrigin: "top left",
              transform: `scale(${scale})`,
              background: brief.colors.background,
            }}
          >
            {/* Load Google Fonts for preview */}
            <link
              href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(brief.typography.headingFont || "Inter")}:wght@400;500;600;700;800;900&family=${encodeURIComponent(brief.typography.bodyFont || "Inter")}:wght@400;500;600;700&display=swap`}
              rel="stylesheet"
            />
            {onReorder ? (
              <Reorder.Group
                axis="y"
                values={brief.sections}
                onReorder={onReorder}
                style={{ listStyle: "none", margin: 0, padding: 0 }}
              >
                {brief.sections.map((section, i) => (
                  <DraggableSection
                    key={section.id}
                    section={section}
                    brief={brief}
                    index={i}
                    isHighlighted={highlightSectionId === section.id}
                    isSelected={selectedSectionId === section.id}
                    onClick={onSectionClick ? () => onSectionClick(section.id) : undefined}
                    canDrag
                  />
                ))}
              </Reorder.Group>
            ) : (
              brief.sections.map((section, i) => (
                <FullSizeSection
                  key={section.id}
                  section={section}
                  brief={brief}
                  index={i}
                  isHighlighted={highlightSectionId === section.id}
                  isSelected={selectedSectionId === section.id}
                  onClick={onSectionClick ? () => onSectionClick(section.id) : undefined}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Design tokens footer */}
      {!isEmpty && (
        <div
          style={{
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderTop: "1px solid var(--d3-border-subtle)",
            flexShrink: 0,
            background: "var(--d3-surface)",
          }}
        >
          {Object.entries(brief.colors).map(([key, color]) => (
            <div
              key={key}
              title={`${key}: ${color}`}
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: color,
                border: "1px solid var(--d3-glass-border)",
                flexShrink: 0,
              }}
            />
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: "0.5625rem", color: "var(--d3-text-tertiary)" }}>
            {brief.typography.headingFont} / {brief.typography.bodyFont} · {brief.style.mood} · {brief.sections.length} Sektionen
          </span>
        </div>
      )}
    </div>
  );
}
