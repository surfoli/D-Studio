"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, Maximize2, Monitor, Tablet, Smartphone } from "lucide-react";
import type { DesignBrief, DesignBriefSection } from "@/lib/design-brief";
import { getPatternById } from "@/lib/design-patterns";
import { getThemeContent } from "@/lib/theme-content";

// ── Types ──

interface CanvasPreviewProps {
  brief: DesignBrief;
  highlightSectionId?: string | null;
}

interface DeviceFrame {
  id: string;
  label: string;
  width: number;
  icon: typeof Monitor;
}

// ── Device definitions ──

const DEVICES: DeviceFrame[] = [
  { id: "desktop", label: "Desktop", width: 1440, icon: Monitor },
  { id: "tablet", label: "Tablet", width: 768, icon: Tablet },
  { id: "mobile", label: "Mobile", width: 375, icon: Smartphone },
];

const CANVAS_GAP = 80; // Gap between device frames
const FRAME_PADDING_TOP = 56; // Space for device label above frame

// Images are now loaded from theme-content.ts per contentTheme

// ── Helpers ──

function Img({ src, style }: { src: string; style?: React.CSSProperties }) {
  return <img src={src} alt="" loading="lazy" draggable={false} style={{ objectFit: "cover", width: "100%", height: "100%", display: "block", ...style }} />;
}

function brValue(br: string): number {
  switch (br) {
    case "sharp": return 0;
    case "soft": return 12;
    case "rounded": return 20;
    case "pill": return 9999;
    default: return 12;
  }
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

// ── Section Renderer (responsive) ──
// Renders sections at full pixel width, adapted per device

function CanvasSection({ section, brief, index, isHighlighted, deviceWidth }: {
  section: DesignBriefSection;
  brief: DesignBrief;
  index: number;
  isHighlighted?: boolean;
  deviceWidth: number;
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
  const tc = getThemeContent(brief.contentTheme);
  const IMG = tc.images;

  // Premium / luxury detection
  const isLuxury = brief.contentTheme === "automotive" || brief.style.mood?.includes("luxury") || brief.style.darkMode;
  // Editorial / athletic detection
  const isEditorial = tc.isEditorial || brief.style.mood?.includes("editorial") || brief.contentTheme === "fitness";

  const isMobile = deviceWidth <= 480;
  const isTablet = deviceWidth > 480 && deviceWidth <= 900;

  // Responsive sizing
  const h1Size = isMobile ? 36 : isTablet ? 48 : 64;
  const h2Size = isMobile ? 28 : isTablet ? 36 : 44;
  const bodySize = isMobile ? 15 : 18;
  const sectionPy = isMobile ? 48 : isTablet ? 64 : (brief.spacing.system === "compact" ? 80 : brief.spacing.system === "relaxed" ? 140 : 112);
  const px = isMobile ? 20 : isTablet ? 32 : 48;
  const maxW = isMobile ? deviceWidth : isTablet ? 720 : 1200;
  const gridCols = isMobile ? 1 : isTablet ? 2 : 3;

  const btnPrimary: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: isMobile ? "12px 24px" : "16px 32px", borderRadius: Math.min(br, 12),
    background: pri, color: "#fff", fontSize: isMobile ? 14 : 16,
    fontWeight: 600, fontFamily: body, whiteSpace: "nowrap", border: "none",
  };
  const btnOutline: React.CSSProperties = {
    ...btnPrimary, background: "transparent", color: txt, border: `1.5px solid ${txt}22`,
  };
  const card: React.CSSProperties = {
    borderRadius: Math.min(br, 16), background: surf, border: `1px solid ${txt}0a`, overflow: "hidden",
  };

  const isEven = index % 2 === 0;
  const sectionBg = isLuxury ? bg : (isEven ? bg : `${surf}22`);

  const renderContent = () => {
    const id = section.patternId;

    // ── Navbar ──
    if (id.startsWith("navbar")) {
      if (isEditorial && !isLuxury) {
        return (
          <div style={{ padding: `0 ${px}px`, height: isMobile ? 60 : 80, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${txt}0a` }}>
            <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, fontFamily: font, color: txt, letterSpacing: "0.02em", textTransform: "uppercase" as const }}>{brief.name || tc.brandName}</span>
            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: isTablet ? 20 : 36 }}>
                {tc.navLinks.slice(0, isTablet ? 3 : 5).map((l) => (
                  <span key={l} style={{ fontSize: 14, color: muted, fontFamily: body, fontWeight: 500 }}>{l}</span>
                ))}
              </div>
            )}
            <div style={{ ...btnOutline, padding: "8px 20px", fontSize: 12, borderRadius: 0, border: `1.5px solid ${txt}`, color: txt, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
              {isMobile ? "Menu" : tc.heroCtaPrimary}
            </div>
          </div>
        );
      }
      return (
        <div style={{ padding: `0 ${px}px`, height: isMobile ? 60 : 80, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: isLuxury ? "none" : `1px solid ${txt}08` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isLuxury && !isMobile && <div style={{ width: 22, height: 22, borderRadius: 3, background: acc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: bg }}>K</div>}
            <span style={{ fontSize: isMobile ? 16 : isLuxury ? 16 : 22, fontWeight: 700, fontFamily: font, color: txt, letterSpacing: isLuxury ? "0.1em" : undefined, textTransform: isLuxury ? "uppercase" as const : undefined }}>{brief.name || tc.brandName}</span>
          </div>
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: isTablet ? 20 : isLuxury ? 28 : 40 }}>
              {tc.navLinks.slice(0, isTablet ? 3 : 5).map((l) => (
                <span key={l} style={{ fontSize: isLuxury ? 12 : 15, color: muted, fontFamily: body, fontWeight: 500, letterSpacing: isLuxury ? "0.02em" : undefined }}>{l}</span>
              ))}
            </div>
          )}
          <div style={{ ...btnPrimary, padding: "8px 20px", fontSize: 13, background: isLuxury ? acc : pri, color: isLuxury ? bg : "#fff", borderRadius: isLuxury ? 4 : Math.min(br, 12) }}>
            {isMobile ? "Menu" : tc.heroCtaPrimary}
          </div>
        </div>
      );
    }

    // ── Hero ──
    if (id.startsWith("hero")) {
      if (id === "hero-fullbleed" || id === "hero-video") {
        if (isEditorial && !isLuxury) {
          const heroFontSize = isMobile ? 48 : isTablet ? 64 : 80;
          return (
            <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy * 0.5}px ${px}px ${sectionPy * 0.2}px` }}>
              <p style={{ fontSize: 11, color: muted, fontFamily: body, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>ACHIEVE YOUR FITNESS GOALS</p>
              <h1 style={{ fontSize: heroFontSize, fontWeight: 400, fontFamily: font, color: txt, lineHeight: 0.9, letterSpacing: "-0.03em", margin: "0 0 24px", textTransform: "uppercase" as const }}>
                {tc.heroTitle}{isMobile ? " " : <br />}{tc.heroTitleBreak}
              </h1>
              <div style={{ position: "relative", borderRadius: Math.min(br, 8), overflow: "hidden", aspectRatio: isMobile ? "16/10" : "16/7" }}>
                <Img src={IMG.hero} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)" }} />
                {!isMobile && (
                  <div style={{ position: "absolute", bottom: 24, left: 24 }}>
                    <h2 style={{ fontSize: isTablet ? 36 : 52, fontWeight: 800, fontFamily: font, color: "#fff", lineHeight: 0.95, margin: 0, textTransform: "uppercase" as const }}>{tc.contentTitle}</h2>
                  </div>
                )}
                <div style={{ position: "absolute", bottom: 24, right: 24, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#fff", fontFamily: body }}>3 min</span>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 10, color: "#fff", marginLeft: 1 }}>▶</span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: muted, fontFamily: body, maxWidth: 360, lineHeight: 1.6, marginTop: 12 }}>{tc.heroSubtitle}</p>
            </div>
          );
        }
        if (isLuxury) {
          return (
            <div style={{ position: "relative", minHeight: isMobile ? 420 : 600 }}>
              <Img src={IMG.hero} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${bg}dd 0%, ${bg}99 35%, transparent 65%)` }} />
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${bg}ff 0%, ${bg}cc 15%, transparent 50%)` }} />
              {!isMobile && (
                <div style={{ position: "absolute", top: isMobile ? 70 : 90, left: px, zIndex: 2 }}>
                  <span style={{ fontSize: 10, color: muted, fontFamily: body, textTransform: "uppercase", letterSpacing: "0.08em" }}>NEW YORK, USA</span>
                </div>
              )}
              <div style={{ position: "absolute", bottom: isMobile ? 80 : 100, left: px, zIndex: 2 }}>
                <h1 style={{ fontSize: isMobile ? 36 : isTablet ? 52 : 68, fontWeight: 300, fontFamily: font, color: txt, lineHeight: 0.92, letterSpacing: "-0.02em", margin: 0 }}>
                  {tc.heroTitle}<br />{tc.heroTitleBreak}
                </h1>
              </div>
              {tc.heroSplitCtas && !isMobile && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "grid", gridTemplateColumns: "1fr 1fr", zIndex: 2 }}>
                  {tc.heroSplitCtas.map((cta, i) => (
                    <div key={i} style={{ padding: `${isMobile ? 12 : 16}px ${px}px`, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${txt}15`, background: i === 0 ? `${bg}cc` : `${bg}88` }}>
                      <span style={{ fontSize: isMobile ? 12 : 13, color: txt, fontFamily: body, fontWeight: 500 }}>{cta}</span>
                      <span style={{ fontSize: 16, color: acc }}>→</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return (
          <div style={{ position: "relative", minHeight: isMobile ? 400 : 600, display: "flex", alignItems: "flex-end", paddingBottom: isMobile ? 40 : 80 }}>
            <Img src={IMG.hero} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${bg}ee 5%, ${bg}88 40%, transparent 70%)` }} />
            <div style={{ position: "relative", zIndex: 1, maxWidth: maxW, margin: "0 auto", width: "100%", padding: `0 ${px}px` }}>
              <h1 style={{ fontSize: isMobile ? 40 : 72, fontWeight: 800, fontFamily: font, color: txt, lineHeight: 0.95, letterSpacing: "-0.03em", margin: 0 }}>
                {tc.heroTitle}{isMobile ? " " : <br />}{tc.heroTitleBreak}
              </h1>
              <p style={{ fontSize: isMobile ? 16 : 20, color: muted, fontFamily: body, margin: "20px 0 0", maxWidth: 520, lineHeight: 1.6 }}>
                {tc.heroSubtitle}
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
                <div style={btnPrimary}>{tc.heroCtaPrimary}</div>
                {!isMobile && <div style={btnOutline}>{tc.heroCtaSecondary}</div>}
              </div>
            </div>
          </div>
        );
      }

      if (id === "hero-product" || id === "hero-editorial" || hint.layout === "split" || hint.layout === "asymmetric") {
        if (isEditorial && !isLuxury && tc.missionTitle) {
          return (
            <div style={{ maxWidth: isMobile ? "100%" : 580, margin: "0 auto", padding: `${sectionPy}px ${px}px`, textAlign: "center" }}>
              <div style={{ fontSize: isMobile ? 24 : 32, color: txt, marginBottom: isMobile ? 16 : 20 }}>✦</div>
              <h2 style={{ fontSize: isMobile ? 22 : isTablet ? 26 : 30, fontWeight: 800, fontFamily: font, color: txt, lineHeight: 1.15, letterSpacing: "-0.01em", margin: 0, textTransform: "uppercase" as const }}>
                {tc.missionTitle}
              </h2>
              <p style={{ fontSize: isMobile ? 12 : 13, color: muted, fontFamily: body, marginTop: 16, lineHeight: 1.7 }}>
                {tc.missionDesc}
              </p>
              <div style={{ display: "inline-flex", padding: "10px 24px", borderRadius: 0, border: `1.5px solid ${txt}`, color: txt, fontSize: 12, fontWeight: 600, fontFamily: body, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginTop: 24 }}>
                {tc.heroCtaPrimary}
              </div>
            </div>
          );
        }
        if (isLuxury && tc.aboutText) {
          return (
            <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy * 1.2}px ${px}px` }}>
              <div style={{ display: isMobile ? "block" : "flex", alignItems: "flex-start", gap: isMobile ? 24 : 60 }}>
                <div style={{ flex: 1.5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isMobile ? 20 : 32 }}>
                    <div style={{ width: 20, height: 1, background: acc }} />
                    <span style={{ fontSize: 10, fontWeight: 500, color: muted, fontFamily: body, textTransform: "uppercase", letterSpacing: "0.12em" }}>ABOUT US</span>
                  </div>
                  <h2 style={{ fontSize: isMobile ? 24 : isTablet ? 32 : 40, fontWeight: 400, fontFamily: font, color: txt, lineHeight: 1.25, letterSpacing: "-0.01em", margin: 0 }}>
                    {tc.aboutText}{" "}
                    <span style={{ color: acc }}>{tc.aboutHighlight}</span>
                  </h2>
                </div>
                {!isMobile && (
                  <div style={{ flex: 0.8, paddingTop: isTablet ? 40 : 60 }}>
                    <div style={{ width: "100%", height: 1, background: `${txt}12`, marginBottom: 16 }} />
                    <p style={{ fontSize: 12, color: `${txt}55`, fontFamily: body, lineHeight: 1.8 }}>{tc.heroSubtitle}</p>
                  </div>
                )}
              </div>
            </div>
          );
        }
        return (
          <div style={{ minHeight: isMobile ? 400 : 600, display: "flex", alignItems: "center", padding: `${sectionPy}px ${px}px` }}>
            <div style={{
              maxWidth: maxW, margin: "0 auto", width: "100%",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr",
              gap: isMobile ? 32 : 64, alignItems: "center",
            }}>
              <div>
                <h1 style={{ fontSize: h1Size, fontWeight: 800, fontFamily: font, color: txt, lineHeight: 1.05, letterSpacing: "-0.03em", margin: 0 }}>
                  {tc.heroTitle}{isMobile ? " " : <br />}{tc.heroTitleBreak}
                </h1>
                <p style={{ fontSize: bodySize, color: muted, fontFamily: body, margin: "20px 0 0", lineHeight: 1.6 }}>
                  {tc.heroSubtitle}
                </p>
                <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
                  <div style={btnPrimary}>{tc.heroCtaPrimary}</div>
                  <div style={btnOutline}>{tc.heroCtaSecondary}</div>
                </div>
              </div>
              <div style={{ borderRadius: Math.min(br, 20), overflow: "hidden", aspectRatio: "4/3" }}>
                <Img src={IMG.office} />
              </div>
            </div>
          </div>
        );
      }

      // Default centered hero
      return (
        <div style={{ minHeight: isMobile ? 400 : 600, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: `${sectionPy}px ${px}px` }}>
          <h1 style={{ fontSize: h1Size, fontWeight: 800, fontFamily: font, color: txt, lineHeight: 1.05, letterSpacing: "-0.03em", margin: 0, maxWidth: 800 }}>
            {tc.heroTitle}{isMobile ? " " : <br />}{tc.heroTitleBreak}
          </h1>
          <p style={{ fontSize: bodySize, color: muted, fontFamily: body, margin: "20px 0 0", maxWidth: 560, lineHeight: 1.6 }}>
            {tc.heroSubtitle}
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap", justifyContent: "center" }}>
            <div style={btnPrimary}>{tc.heroCtaPrimary}</div>
            <div style={btnOutline}>{tc.heroCtaSecondary}</div>
          </div>
        </div>
      );
    }

    // ── Features ──
    if (id.includes("bento") || id.startsWith("features")) {
      if (isEditorial && !isLuxury && tc.trainingCategories) {
        const catImages = [IMG.work1, IMG.work2, IMG.work3];
        return (
          <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy * 0.6}px ${px}px` }}>
            <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 8 : 10 }}>
              {tc.trainingCategories.map((cat, i) => (
                <div key={i} style={{ position: "relative", borderRadius: Math.min(br, 6), overflow: "hidden", height: isMobile ? 64 : isTablet ? 76 : 90 }}>
                  <Img src={catImages[i % catImages.length]} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "grayscale(30%)" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.35), rgba(0,0,0,0.15))" }} />
                  <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%", padding: `0 ${isMobile ? 16 : 28}px` }}>
                    <span style={{ fontSize: isMobile ? 14 : isTablet ? 16 : 18, fontWeight: 800, fontFamily: font, color: "#fff", textTransform: "uppercase" as const, letterSpacing: "0.02em" }}>{cat}</span>
                    <span style={{ fontSize: isMobile ? 16 : 20, color: "#fff" }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      if (isLuxury && tc.featuredBrand) {
        return (
          <div style={{ position: "relative", padding: `${sectionPy}px 0`, overflow: "hidden" }}>
            {!isMobile && (
              <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: isMobile ? 60 : isTablet ? 120 : 160, fontWeight: 800, fontFamily: font, color: `${txt}06`, letterSpacing: "0.06em", whiteSpace: "nowrap", lineHeight: 1, userSelect: "none" }}>
                {tc.featuredBrand}
              </div>
            )}
            <div style={{ position: "relative", zIndex: 1, maxWidth: maxW, margin: "0 auto", padding: `0 ${px}px` }}>
              <div style={{ maxWidth: isMobile ? "100%" : 500, margin: "0 auto", overflow: "hidden", aspectRatio: "16/9", position: "relative" }}>
                <Img src={tc.featuredImage || IMG.product} />
                <div style={{ position: "absolute", bottom: 0, left: "10%", right: "10%", height: 3, background: `radial-gradient(ellipse, ${acc}40, transparent)`, filter: "blur(6px)" }} />
              </div>
              <div style={{ display: isMobile ? "block" : "flex", alignItems: "flex-start", justifyContent: "space-between", marginTop: isMobile ? 24 : 40 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 3, height: 24, background: acc }} />
                    <h3 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, fontFamily: font, color: txt, margin: 0 }}>
                      {tc.featuredBrand} {tc.featuredModel}
                    </h3>
                  </div>
                  <p style={{ fontSize: 12, color: `${txt}44`, fontFamily: body, marginTop: 8, maxWidth: 300, lineHeight: 1.7 }}>{tc.featuredSubtitle}</p>
                </div>
                <div style={{ display: "flex", gap: isMobile ? 20 : 32, marginTop: isMobile ? 16 : 0 }}>
                  {tc.stats.slice(0, 3).map((s, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, fontFamily: font, color: txt }}>{s.num}</div>
                      <div style={{ fontSize: 10, color: muted, fontFamily: body, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px ${px}px` }}>
          <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 64 }}>
            <h2 style={{ fontSize: h2Size, fontWeight: 700, fontFamily: font, color: txt, letterSpacing: "-0.02em", margin: 0 }}>
              {tc.contentTitle}
            </h2>
            <p style={{ fontSize: bodySize - 2, color: muted, fontFamily: body, marginTop: 12 }}>
              {tc.contentDesc}
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: isMobile ? 16 : 24 }}>
            {tc.features.map((f, i) => (
              <div key={i} style={{ ...card, padding: isMobile ? 24 : 40, textAlign: "center" }}>
                <div style={{ width: isMobile ? 48 : 64, height: isMobile ? 48 : 64, margin: "0 auto 16px", borderRadius: br > 16 ? 32 : Math.min(br, 16), background: [pri, sec, acc][i] + "12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 22 : 28 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 600, fontFamily: font, color: txt, margin: 0 }}>{f.title}</h3>
                <p style={{ fontSize: isMobile ? 13 : 16, color: muted, fontFamily: body, marginTop: 8, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Stats ──
    if (id.startsWith("data-stats") || hint.layout === "stats") {
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy * 0.7}px ${px}px`, borderTop: `1px solid ${txt}08`, borderBottom: `1px solid ${txt}08` }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: isMobile ? 24 : 32 }}>
            {tc.stats.map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: isMobile ? 32 : 52, fontWeight: 800, fontFamily: font, color: [pri, sec, acc, pri][i], letterSpacing: "-0.03em", lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontSize: isMobile ? 11 : 14, color: muted, fontFamily: body, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Marquee / Brand Logos ──
    if (id.includes("marquee")) {
      if (isEditorial && !isLuxury) {
        return (
          <div style={{ padding: `${sectionPy * 0.35}px 0`, borderTop: `1px solid ${txt}0a`, borderBottom: `1px solid ${txt}0a`, overflow: "hidden" }}>
            <div style={{ display: "flex", gap: isMobile ? 8 : 10, paddingLeft: px, alignItems: "center" }}>
              {[...tc.marqueeItems, ...tc.marqueeItems].map((item, i) => (
                <div key={i} style={{
                  flexShrink: 0, padding: `${isMobile ? 6 : 8}px ${isMobile ? 14 : 20}px`, borderRadius: 999,
                  border: `1px solid ${txt}15`, background: i % 2 === 0 ? `${txt}06` : "transparent",
                  fontSize: isMobile ? 11 : 12, fontWeight: 500, color: txt, fontFamily: body, whiteSpace: "nowrap",
                }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        );
      }
      if (isLuxury && tc.brandLogos) {
        const logos = tc.brandLogos;
        const centerIdx = Math.floor(logos.length / 2);
        const visibleLogos = isMobile ? logos.slice(centerIdx - 1, centerIdx + 2) : logos;
        const visibleCenter = isMobile ? 1 : centerIdx;
        return (
          <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px ${px}px` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 20, height: 1, background: acc }} />
              <span style={{ fontSize: 10, fontWeight: 500, color: muted, fontFamily: body, textTransform: "uppercase", letterSpacing: "0.12em" }}>LUXURY RENTAL MAKES</span>
            </div>
            <p style={{ fontSize: 11, color: `${txt}44`, fontFamily: body, maxWidth: 300, lineHeight: 1.7, marginBottom: isMobile ? 20 : 32 }}>
              The finest purveyors of Lamborghini, Ferrari, and more.
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 8 : 12 }}>
              {visibleLogos.map((logo, i) => (
                <div key={i} style={{
                  width: i === visibleCenter ? (isMobile ? 80 : 110) : (isMobile ? 60 : 80),
                  height: i === visibleCenter ? (isMobile ? 80 : 110) : (isMobile ? 60 : 80),
                  borderRadius: 8, border: `1px solid ${txt}15`,
                  background: i === visibleCenter ? `${acc}10` : `${surf}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: i === visibleCenter ? (isMobile ? 11 : 13) : (isMobile ? 8 : 10), fontWeight: 600, color: i === visibleCenter ? acc : `${txt}55`, fontFamily: font, textAlign: "center" }}>{logo}</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: isMobile ? 16 : 24 }}>
              <div style={{ display: "inline-flex", padding: "8px 20px", borderRadius: 4, background: acc, color: bg, fontSize: 11, fontWeight: 600, fontFamily: body }}>
                Buy a {logos[centerIdx]}
              </div>
            </div>
          </div>
        );
      }
      const items = tc.marqueeItems;
      return (
        <div style={{ padding: `${sectionPy * 0.4}px 0`, borderTop: `1px solid ${txt}08`, borderBottom: `1px solid ${txt}08`, overflow: "hidden" }}>
          <p style={{ textAlign: "center", fontSize: 12, color: muted, fontFamily: body, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 24 }}>
            {tc.brandName}
          </p>
          <div style={{ display: "flex", gap: isMobile ? 40 : 80, alignItems: "center", paddingLeft: px }}>
            {[...items, ...items].map((label, i) => (
              <span key={i} style={{ flexShrink: 0, fontSize: isMobile ? 16 : 24, fontWeight: 600, color: `${txt}20`, fontFamily: font, whiteSpace: "nowrap" }}>
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
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px ${px}px` }}>
          <h2 style={{ fontSize: h2Size, fontWeight: 700, fontFamily: font, color: txt, textAlign: "center", marginBottom: isMobile ? 32 : 64, margin: 0, letterSpacing: "-0.02em" }}>
            Was {tc.brandName} Kunden sagen
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: isMobile ? 16 : 24, marginTop: isMobile ? 32 : 64 }}>
            {tc.testimonials.slice(0, gridCols).map((tm, i) => (
              <div key={i} style={{ ...card, padding: isMobile ? 20 : 32 }}>
                <p style={{ fontSize: isMobile ? 14 : 17, color: txt, fontFamily: body, lineHeight: 1.7, margin: 0 }}>
                  &ldquo;{tm.quote}&rdquo;
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
                  <img src={[IMG.team1, IMG.team2, IMG.team3][i % 3]} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: txt, fontFamily: body }}>{tm.name}</div>
                    <div style={{ fontSize: 12, color: muted, fontFamily: body }}>{tm.role}</div>
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
        return (
          <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px ${px}px` }}>
            <p style={{ fontSize: 11, color: muted, fontFamily: body, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: isMobile ? 20 : 28 }}>THE CLUB</p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {tc.pricingPlans.map((plan, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: `${isMobile ? 16 : 20}px 0`, borderBottom: `1px solid ${txt}0a`,
                }}>
                  <span style={{ fontSize: isMobile ? 24 : isTablet ? 32 : 38, fontWeight: 800, fontFamily: font, color: txt, textTransform: "uppercase" as const, letterSpacing: "-0.01em" }}>
                    {plan.name}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 24 : 40 }}>
                    <span style={{ fontSize: isMobile ? 18 : 24, color: txt }}>✦</span>
                    <span style={{ fontSize: isMobile ? 18 : 24, color: txt, fontWeight: 300 }}>+</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px ${px}px` }}>
          <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 64 }}>
            <h2 style={{ fontSize: h2Size, fontWeight: 700, fontFamily: font, color: txt, letterSpacing: "-0.02em", margin: 0 }}>{tc.brandName} Preise</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: isMobile ? 16 : 24, maxWidth: 960, margin: "0 auto" }}>
            {tc.pricingPlans.slice(0, gridCols).map((plan, i) => (
              <div key={i} style={{
                ...card, padding: isMobile ? 24 : 36, display: "flex", flexDirection: "column",
                border: plan.popular ? `2px solid ${pri}` : card.border, position: "relative",
              }}>
                {plan.popular && <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", fontSize: 11, fontWeight: 700, background: acc, color: "#fff", padding: "3px 12px", borderRadius: 999 }}>Beliebt</span>}
                <div style={{ fontSize: 18, fontWeight: 600, fontFamily: font, color: txt }}>{plan.name}</div>
                <div style={{ fontSize: isMobile ? 36 : 48, fontWeight: 800, fontFamily: font, color: txt, letterSpacing: "-0.03em", marginTop: 12 }}>{plan.price}</div>
                <div style={{ marginTop: 20, flex: 1 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ fontSize: 14, color: muted, fontFamily: body, padding: "6px 0", display: "flex", gap: 8 }}>
                      <span style={{ color: pri }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <div style={{ ...btnPrimary, width: "100%", marginTop: 20, background: plan.popular ? pri : "transparent", color: plan.popular ? "#fff" : txt, border: plan.popular ? "none" : `1.5px solid ${txt}18`, justifyContent: "center" }}>
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
        return (
          <div style={{ background: txt, padding: `${sectionPy * 1.1}px ${px}px`, textAlign: "center" }}>
            <div style={{ fontSize: isMobile ? 24 : 32, color: bg, marginBottom: isMobile ? 16 : 20 }}>✦</div>
            <h2 style={{ fontSize: isMobile ? 28 : isTablet ? 40 : 50, fontWeight: 800, fontFamily: font, color: bg, lineHeight: 1.0, letterSpacing: "-0.02em", margin: 0, maxWidth: 520, marginLeft: "auto", marginRight: "auto", textTransform: "uppercase" as const }}>
              {tc.ctaTitle}
            </h2>
            <p style={{ fontSize: isMobile ? 11 : 13, color: `${bg}77`, fontFamily: body, marginTop: 16, lineHeight: 1.7, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
              {tc.ctaSubtitle}
            </p>
            <div style={{ display: "inline-flex", padding: `${isMobile ? 8 : 10}px ${isMobile ? 20 : 24}px`, borderRadius: 0, border: `1.5px solid ${bg}`, color: bg, fontSize: 12, fontWeight: 600, fontFamily: body, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginTop: 20 }}>
              {tc.ctaCta}
            </div>
          </div>
        );
      }
      return (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: `${sectionPy}px ${px}px`, textAlign: "center" }}>
          <h2 style={{ fontSize: isMobile ? 32 : 48, fontWeight: 700, fontFamily: font, color: txt, margin: 0 }}>{tc.ctaTitle}</h2>
          <p style={{ fontSize: bodySize - 2, color: muted, fontFamily: body, marginTop: 12 }}>{tc.ctaSubtitle}</p>
          <div style={{ marginTop: 28 }}><div style={btnPrimary}>{tc.ctaCta}</div></div>
        </div>
      );
    }

    // ── Gallery ──
    if (id.includes("gallery") || id.includes("case") || id.includes("service")) {
      if (isEditorial && !isLuxury) {
        return (
          <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy * 0.6}px ${px}px` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 20 : 28 }}>
              <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 800, fontFamily: font, color: txt, textTransform: "uppercase" as const, letterSpacing: "0.02em" }}>
                {tc.galleryTitle}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: muted, fontFamily: body }}>See All</span>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${txt}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 9, color: txt }}>→</span>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 8 : 10 }}>
              {[
                { img: IMG.work1, title: tc.galleryCaptions[0] || "Training 1" },
                { img: IMG.work2, title: tc.galleryCaptions[1] || "Training 2" },
                { img: IMG.work3, title: tc.galleryCaptions[2] || "Training 3" },
                { img: IMG.abstract, title: "Cardio Zone" },
              ].slice(0, isMobile ? 2 : 4).map((p, i) => (
                <div key={i} style={{ position: "relative", borderRadius: Math.min(br, 6), overflow: "hidden", aspectRatio: "16/9" }}>
                  <Img src={p.img} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "grayscale(20%)" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.4))" }} />
                  <div style={{ position: "absolute", bottom: 12, left: 12 }}>
                    <span style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, fontFamily: font, color: "#fff", textTransform: "uppercase" as const }}>{p.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px ${px}px` }}>
          <h2 style={{ fontSize: h2Size, fontWeight: 700, fontFamily: font, color: txt, textAlign: "center", marginBottom: isMobile ? 32 : 64, margin: 0, letterSpacing: "-0.02em" }}>
            {tc.galleryTitle}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: isMobile ? 12 : 20, marginTop: isMobile ? 32 : 64 }}>
            {[IMG.work1, IMG.work2, IMG.work3].slice(0, gridCols).map((img, i) => (
              <div key={i} style={{ ...card }}>
                <div style={{ aspectRatio: "16/10", overflow: "hidden" }}><Img src={img} /></div>
                <div style={{ padding: isMobile ? 14 : 20 }}>
                  <span style={{ fontSize: 12, color: pri, fontWeight: 500, fontFamily: body }}>{tc.navLinks[i] || ""}</span>
                  <h3 style={{ fontSize: 16, fontWeight: 600, fontFamily: font, color: txt, margin: "4px 0 0" }}>{tc.galleryCaptions[i] || `Projekt ${i + 1}`}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Content: alternating / blog / big-text ──
    if (id.includes("big-text")) {
      if (isLuxury) {
        return (
          <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy * 1.2}px ${px}px` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isMobile ? 16 : 24 }}>
              <div style={{ width: 20, height: 1, background: acc }} />
              <span style={{ fontSize: 10, fontWeight: 500, color: muted, fontFamily: body, textTransform: "uppercase", letterSpacing: "0.12em" }}>ARRIVE IN STYLE</span>
            </div>
            <h2 style={{ fontSize: isMobile ? 48 : isTablet ? 72 : 100, fontWeight: 300, fontFamily: font, color: txt, lineHeight: 0.88, letterSpacing: "-0.04em", margin: 0, fontStyle: "italic" }}>
              {tc.bigText}{isMobile ? " " : <br />}<span style={{ color: acc, fontStyle: "italic" }}>{tc.bigTextHighlight}</span>
            </h2>
          </div>
        );
      }
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px ${px}px` }}>
          <h2 style={{ fontSize: isMobile ? 48 : 96, fontWeight: 800, fontFamily: font, color: txt, lineHeight: 0.95, letterSpacing: "-0.04em", margin: 0 }}>
            {tc.bigText}{isMobile ? " " : <br />}<span style={{ color: pri }}>{tc.bigTextHighlight}</span>
          </h2>
        </div>
      );
    }

    if (id.includes("image-text") || id.includes("alternating") || id.includes("blog")) {
      if (isLuxury) {
        return (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", minHeight: isMobile ? 300 : 420 }}>
            <div style={{ position: "relative", overflow: "hidden", minHeight: isMobile ? 200 : "auto" }}>
              <Img src={IMG.work1} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "grayscale(40%)" }} />
            </div>
            <div style={{ padding: `${sectionPy}px ${px}px`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h2 style={{ fontSize: isMobile ? 28 : isTablet ? 36 : 44, fontWeight: 300, fontFamily: font, color: txt, lineHeight: 1.05, letterSpacing: "-0.02em", margin: 0 }}>
                {tc.contentTitle}
              </h2>
              <p style={{ fontSize: 12, color: `${txt}55`, fontFamily: body, marginTop: 16, lineHeight: 1.8, maxWidth: 360 }}>
                {tc.contentDesc}
              </p>
            </div>
          </div>
        );
      }
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px ${px}px` }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 24 : 64, alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: isMobile ? 24 : 36, fontWeight: 700, fontFamily: font, color: txt, margin: 0 }}>{tc.contentTitle}</h3>
              <p style={{ fontSize: bodySize - 2, color: muted, fontFamily: body, marginTop: 12, lineHeight: 1.7 }}>
                {tc.contentDesc}
              </p>
              <span style={{ display: "inline-block", fontSize: 15, color: pri, fontWeight: 500, fontFamily: body, marginTop: 16 }}>Mehr erfahren →</span>
            </div>
            <div style={{ borderRadius: Math.min(br, 16), overflow: "hidden", aspectRatio: "4/3" }}>
              <Img src={IMG.work1} />
            </div>
          </div>
        </div>
      );
    }

    // ── Contact ──
    if (id.includes("contact")) {
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px ${px}px` }}>
          <h2 style={{ fontSize: h2Size, fontWeight: 700, fontFamily: font, color: txt, margin: 0 }}>{tc.contactTitle}</h2>
          <p style={{ fontSize: bodySize - 2, color: muted, fontFamily: body, marginTop: 12 }}>
            Schreib uns eine Nachricht.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginTop: 32 }}>
            <div style={{ height: 48, borderRadius: Math.min(br, 10), background: surf, border: `1px solid ${txt}0a`, padding: "0 16px", display: "flex", alignItems: "center", fontSize: 14, color: `${muted}88`, fontFamily: body }}>Name</div>
            <div style={{ height: 48, borderRadius: Math.min(br, 10), background: surf, border: `1px solid ${txt}0a`, padding: "0 16px", display: "flex", alignItems: "center", fontSize: 14, color: `${muted}88`, fontFamily: body }}>E-Mail</div>
          </div>
          <div style={{ height: 100, borderRadius: Math.min(br, 10), background: surf, border: `1px solid ${txt}0a`, padding: 16, fontSize: 14, color: `${muted}88`, fontFamily: body, marginTop: 12 }}>Nachricht</div>
          <div style={{ ...btnPrimary, marginTop: 16 }}>Absenden</div>
        </div>
      );
    }

    // ── Footer ──
    if (id.startsWith("footer")) {
      return (
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `48px ${px}px 24px`, borderTop: `1px solid ${txt}08` }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "1.5fr 1fr 1fr 1fr", gap: 32, marginBottom: 48 }}>
            <div>
              <span style={{ fontSize: 18, fontWeight: 700, fontFamily: font, color: txt }}>{brief.name || "Brand"}</span>
              <p style={{ fontSize: 14, color: muted, fontFamily: body, marginTop: 12 }}>{tc.footerTagline}</p>
            </div>
            {!isMobile && [
              { title: "Produkt", links: ["Features", "Preise"] },
              { title: "Legal", links: ["Impressum", "Datenschutz"] },
            ].map((col) => (
              <div key={col.title}>
                <div style={{ fontSize: 13, fontWeight: 600, color: txt, fontFamily: body, marginBottom: 16 }}>{col.title}</div>
                {col.links.map((l) => <div key={l} style={{ fontSize: 13, color: muted, fontFamily: body, padding: "4px 0" }}>{l}</div>)}
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${txt}08`, paddingTop: 16 }}>
            <span style={{ fontSize: 12, color: muted, fontFamily: body }}>© 2025 {brief.name || "Brand"}</span>
          </div>
        </div>
      );
    }

    // ── Default ──
    return (
      <div style={{ maxWidth: maxW, margin: "0 auto", padding: `${sectionPy}px ${px}px`, textAlign: "center" }}>
        <h2 style={{ fontSize: h2Size, fontWeight: 700, fontFamily: font, color: txt, margin: 0 }}>{section.label}</h2>
      </div>
    );
  };

  return (
    <div style={{ background: sectionBg, outline: isHighlighted ? `3px solid ${pri}` : "none", outlineOffset: -3 }}>
      {renderContent()}
    </div>
  );
}

// ── Device Frame Component ──

function DeviceFrameView({ device, brief, highlightSectionId }: {
  device: DeviceFrame;
  brief: DesignBrief;
  highlightSectionId?: string | null;
}) {
  const Icon = device.icon;
  return (
    <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {/* Device label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 16, paddingLeft: 4,
      }}>
        <Icon size={14} style={{ color: "var(--d3-text-tertiary)" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--d3-text-secondary)", fontFamily: "system-ui" }}>
          {device.label}
        </span>
        <span style={{ fontSize: 11, color: "var(--d3-text-ghost)", fontFamily: "monospace" }}>
          {device.width}px
        </span>
      </div>

      {/* Browser chrome + website */}
      <div style={{
        width: device.width,
        background: brief.colors.background,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 4px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
      }}>
        {/* Mini browser bar */}
        <div style={{
          height: 36, padding: "0 14px",
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--d3-surface)",
          borderBottom: "1px solid var(--d3-border-subtle)",
        }}>
          <div style={{ display: "flex", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f56" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffbd2e" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#27c93f" }} />
          </div>
          <div style={{
            flex: 1, height: 20, borderRadius: 5,
            background: "var(--d3-glass)", border: "1px solid var(--d3-glass-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 10, color: "var(--d3-text-ghost)", fontFamily: "monospace" }}>
              {brief.name.toLowerCase().replace(/\s+/g, "-")}.vercel.app
            </span>
          </div>
        </div>

        {/* Sections */}
        <div>
          {/* Load Google Fonts */}
          <link
            href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(brief.typography.headingFont || "Inter")}:wght@400;500;600;700;800;900&family=${encodeURIComponent(brief.typography.bodyFont || "Inter")}:wght@400;500;600;700&display=swap`}
            rel="stylesheet"
          />
          {brief.sections.map((section, i) => (
            <CanvasSection
              key={section.id}
              section={section}
              brief={brief}
              index={i}
              isHighlighted={highlightSectionId === section.id}
              deviceWidth={device.width}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Canvas Component ──

export default function CanvasPreview({ brief, highlightSectionId }: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.35);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const isEmpty = brief.sections.length === 0;

  // Zoom with scroll wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      setZoom((z) => clamp(z + delta, 0.08, 1.5));
    } else {
      // Pan with scroll
      setPan((p) => ({
        x: p.x - e.deltaX,
        y: p.y - e.deltaY,
      }));
    }
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Pan with middle mouse or spacebar+drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Fit all frames in view
  const fitToView = useCallback(() => {
    if (!canvasRef.current) return;
    const totalWidth = DEVICES.reduce((sum, d) => sum + d.width, 0) + CANVAS_GAP * (DEVICES.length - 1);
    const containerWidth = canvasRef.current.clientWidth - 80;
    const containerHeight = canvasRef.current.clientHeight - 80;
    const scaleX = containerWidth / totalWidth;
    const scaleY = containerHeight / 2000; // approximate content height
    const newZoom = clamp(Math.min(scaleX, scaleY), 0.08, 1);
    setZoom(newZoom);
    setPan({ x: 40, y: 40 });
  }, []);

  // Auto-fit on first render
  useEffect(() => {
    fitToView();
  }, [fitToView]);

  return (
    <div
      style={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        background: "var(--d3-bg)", overflow: "hidden",
      }}
    >
      {/* Toolbar */}
      <div style={{
        height: 40, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        borderBottom: "1px solid var(--d3-border-subtle)",
        background: "var(--d3-surface)",
        padding: "0 16px",
      }}>
        <button
          onClick={() => setZoom((z) => clamp(z - 0.05, 0.08, 1.5))}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--d3-text-secondary)", display: "flex" }}
        >
          <Minus size={14} />
        </button>
        <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--d3-text-tertiary)", minWidth: 40, textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => clamp(z + 0.05, 0.08, 1.5))}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--d3-text-secondary)", display: "flex" }}
        >
          <Plus size={14} />
        </button>
        <div style={{ width: 1, height: 16, background: "var(--d3-border-subtle)", margin: "0 4px" }} />
        <button
          onClick={fitToView}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--d3-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}
          title="Fit to view"
        >
          <Maximize2 size={14} />
          <span style={{ fontSize: 11, color: "var(--d3-text-tertiary)" }}>Fit</span>
        </button>
      </div>

      {/* Canvas area */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1, overflow: "hidden", position: "relative",
          cursor: isPanning ? "grabbing" : "default",
          // Dot grid background
          backgroundImage: `radial-gradient(circle, var(--d3-text-ghost) 0.5px, transparent 0.5px)`,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {isEmpty ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: "100%", gap: 12, color: "var(--d3-text-ghost)",
          }}>
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
              transformOrigin: "0 0",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              display: "flex",
              gap: CANVAS_GAP,
              paddingTop: FRAME_PADDING_TOP,
              willChange: "transform",
            }}
          >
            {DEVICES.map((device) => (
              <DeviceFrameView
                key={device.id}
                device={device}
                brief={brief}
                highlightSectionId={highlightSectionId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
