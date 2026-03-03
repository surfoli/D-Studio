// ── Section Code Templates ──
// Generates real Next.js/React code from a DesignBrief.
// Template selected in Design Mode → files written immediately to project store.

import type { DesignBrief } from "./design-brief";

// ── Font helpers ──

const GOOGLE_FONT_WEIGHTS = "400;500;600;700;800;900";

function googleFontUrl(font: string): string {
  return `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, "+")}:wght@${GOOGLE_FONT_WEIGHTS}&display=swap`;
}

const RADIUS_MAP: Record<string, string> = {
  sharp: "0px",
  soft: "8px",
  rounded: "16px",
  pill: "9999px",
};

// ── globals.css ──

export function generateGlobalCSS(brief: DesignBrief): string {
  const r = RADIUS_MAP[brief.style.borderRadius] ?? "8px";
  const headingUrl = googleFontUrl(brief.typography.headingFont);
  const bodyUrl = brief.typography.bodyFont !== brief.typography.headingFont
    ? googleFontUrl(brief.typography.bodyFont)
    : null;

  return `@import url('${headingUrl}');
${bodyUrl ? `@import url('${bodyUrl}');` : ""}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --color-primary:    ${brief.colors.primary};
  --color-secondary:  ${brief.colors.secondary};
  --color-accent:     ${brief.colors.accent};
  --color-bg:         ${brief.colors.background};
  --color-surface:    ${brief.colors.surface};
  --color-text:       ${brief.colors.text};
  --color-muted:      ${brief.colors.textMuted};
  --font-heading:     '${brief.typography.headingFont}', sans-serif;
  --font-body:        '${brief.typography.bodyFont}', sans-serif;
  --radius:           ${r};
  --radius-sm:        calc(${r} * 0.5);
  --radius-lg:        calc(${r} * 2);
  --spacing:          ${brief.spacing.baseUnit}px;
}

html { scroll-behavior: smooth; }

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: ${brief.typography.baseSize}px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  line-height: 1.15;
  letter-spacing: -0.02em;
}

a { color: inherit; text-decoration: none; }
img { max-width: 100%; height: auto; }

::selection {
  background: var(--color-primary);
  color: #fff;
}

:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
`;
}

// ── layout.tsx ──

export function generateLayoutTsx(brief: DesignBrief): string {
  const title = brief.name || "Meine Website";
  const description = brief.notes?.slice(0, 160) || `${title} — professionelle Website`;

  return `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${title}",
  description: "${description}",
  openGraph: {
    title: "${title}",
    description: "${description}",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
`;
}

// ── page.tsx — assembles all sections ──

export function generatePageTsx(brief: DesignBrief): string {
  if (brief.sections.length === 0) {
    return `export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: "var(--font-body)", color: "var(--color-muted)" }}>Noch keine Sektionen hinzugefügt.</p>
    </main>
  );
}
`;
  }

  const imports = brief.sections
    .map((s) => {
      const name = toPascalCase(s.patternId);
      return `import { ${name} } from "@/components/sections/${name}";`;
    })
    .join("\n");

  const renders = brief.sections
    .map((s) => `      <${toPascalCase(s.patternId)} />`)
    .join("\n");

  return `${imports}

export default function Home() {
  return (
    <main>
${renders}
    </main>
  );
}
`;
}

// ── helpers ──

function toPascalCase(id: string): string {
  return id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

export function getComponentName(patternId: string): string {
  return toPascalCase(patternId);
}

export function getComponentPath(patternId: string): string {
  return `src/components/sections/${toPascalCase(patternId)}.tsx`;
}

// ── Section generators ──

type SectionGenerator = (brief: DesignBrief) => string;

// Navbar Minimal
function genNavbarMinimal(brief: DesignBrief): string {
  return `"use client";
import { useState } from "react";
import Link from "next/link";

export function NavbarMinimal() {
  const [open, setOpen] = useState(false);
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 64, background: "var(--color-bg)", borderBottom: "1px solid rgba(128,128,128,0.12)" }}>
      <Link href="/" style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1.125rem", letterSpacing: "-0.03em", color: "var(--color-text)" }}>
        ${brief.name}
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {["Features", "Preise", "Über uns"].map((item) => (
          <Link key={item} href={\`/#\${item.toLowerCase()}\`} style={{ fontSize: "0.875rem", color: "var(--color-muted)", transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--color-muted)")}>
            {item}
          </Link>
        ))}
        <a href="#contact" style={{ padding: "8px 18px", borderRadius: "var(--radius)", background: "var(--color-primary)", color: "#fff", fontSize: "0.875rem", fontWeight: 600, transition: "opacity 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
          Loslegen
        </a>
      </div>
    </nav>
  );
}
`;
}

// Navbar Transparent
function genNavbarTransparent(brief: DesignBrief): string {
  return `"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export function NavbarTransparent() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 64, transition: "background 0.3s, box-shadow 0.3s", background: scrolled ? "var(--color-bg)" : "transparent", boxShadow: scrolled ? "0 1px 0 rgba(128,128,128,0.12)" : "none" }}>
      <Link href="/" style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1.125rem", letterSpacing: "-0.03em", color: "var(--color-text)" }}>
        ${brief.name}
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {["Features", "Preise", "Über uns"].map((item) => (
          <Link key={item} href={\`/#\${item.toLowerCase()}\`} style={{ fontSize: "0.875rem", color: "var(--color-muted)", transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--color-muted)")}>
            {item}
          </Link>
        ))}
        <a href="#contact" style={{ padding: "8px 18px", borderRadius: "var(--radius)", background: "var(--color-primary)", color: "#fff", fontSize: "0.875rem", fontWeight: 600, transition: "opacity 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
          Loslegen
        </a>
      </div>
    </nav>
  );
}
`;
}

// Hero Centered
function genHeroCentered(brief: DesignBrief): string {
  return `"use client";
import { motion } from "framer-motion";

export function HeroCentered() {
  return (
    <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px", background: "var(--color-bg)" }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 9999, border: "1px solid rgba(128,128,128,0.2)", marginBottom: 24, fontSize: "0.8125rem", color: "var(--color-muted)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent)", display: "inline-block" }} />
          Jetzt neu: Version 2.0 ist live
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2.5rem, 6vw, 5.5rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, color: "var(--color-text)", maxWidth: 800, margin: "0 auto 24px" }}>
          Baue etwas<br />
          <span style={{ color: "var(--color-primary)" }}>Außergewöhnliches</span>
        </h1>
        <p style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)", color: "var(--color-muted)", maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.6 }}>
          ${brief.name} hilft dir, schneller zu starten, besser zu wachsen und mehr zu erreichen als je zuvor.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="#start" style={{ padding: "14px 28px", borderRadius: "var(--radius)", background: "var(--color-primary)", color: "#fff", fontWeight: 700, fontSize: "0.9375rem", transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            Kostenlos starten →
          </a>
          <a href="#demo" style={{ padding: "14px 28px", borderRadius: "var(--radius)", border: "1px solid rgba(128,128,128,0.2)", color: "var(--color-text)", fontWeight: 600, fontSize: "0.9375rem", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            Demo ansehen
          </a>
        </div>
      </motion.div>
    </section>
  );
}
`;
}

// Hero Split
function genHeroSplit(brief: DesignBrief): string {
  return `"use client";
import { motion } from "framer-motion";
import Image from "next/image";

export function HeroSplit() {
  return (
    <section style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", gap: 0, background: "var(--color-bg)", paddingTop: 64 }}>
      <motion.div initial={{ opacity: 0, x: -32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} style={{ padding: "80px 64px 80px 80px" }}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 16 }}>
          Neu — ${brief.name}
        </p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2.2rem, 4vw, 4rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, color: "var(--color-text)", marginBottom: 24 }}>
          Die bessere Art,<br />dein Business<br />zu führen.
        </h1>
        <p style={{ fontSize: "1.0625rem", color: "var(--color-muted)", lineHeight: 1.65, marginBottom: 36, maxWidth: 420 }}>
          Alles was du brauchst, an einem Ort. Schneller, einfacher, besser.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="#start" style={{ padding: "14px 28px", borderRadius: "var(--radius)", background: "var(--color-primary)", color: "#fff", fontWeight: 700, fontSize: "0.9375rem", transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            Jetzt starten
          </a>
          <a href="#mehr" style={{ padding: "14px 28px", borderRadius: "var(--radius)", border: "1px solid rgba(128,128,128,0.2)", color: "var(--color-text)", fontWeight: 600, fontSize: "0.9375rem" }}>
            Mehr erfahren
          </a>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }} style={{ position: "relative", height: "100vh" }}>
        <Image
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&q=80"
          alt="Hero Bild"
          fill
          style={{ objectFit: "cover" }}
          priority
        />
      </motion.div>
    </section>
  );
}
`;
}

// Hero Minimal
function genHeroMinimal(brief: DesignBrief): string {
  return `"use client";
import { motion } from "framer-motion";

export function HeroMinimal() {
  return (
    <section style={{ minHeight: "80vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "120px 80px 80px", background: "var(--color-bg)" }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(3rem, 7vw, 7rem)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 0.95, color: "var(--color-text)", maxWidth: 900, marginBottom: 40 }}>
          ${brief.name}
        </h1>
        <a href="#start" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: "var(--radius)", background: "var(--color-primary)", color: "#fff", fontWeight: 700, fontSize: "0.9375rem" }}>
          Loslegen →
        </a>
      </motion.div>
    </section>
  );
}
`;
}

// Features 3-Column
function genFeatures3col(_brief: DesignBrief): string {
  return `"use client";
import { motion } from "framer-motion";

const features = [
  { icon: "⚡", title: "Blitzschnell", desc: "Optimiert für maximale Performance. Ladezeiten unter 1 Sekunde." },
  { icon: "🔒", title: "Sicher", desc: "Enterprise-Grade Sicherheit. Deine Daten sind bei uns in guten Händen." },
  { icon: "🎨", title: "Anpassbar", desc: "Vollständig anpassbar an dein Brand. Kein technisches Wissen nötig." },
];

export function Features3col() {
  return (
    <section style={{ padding: "96px 80px", background: "var(--color-bg)" }}>
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ textAlign: "center", marginBottom: 64 }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 3vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text)", marginBottom: 16 }}>
          Alles drin, nichts vergessen
        </h2>
        <p style={{ fontSize: "1.0625rem", color: "var(--color-muted)", maxWidth: 480, margin: "0 auto" }}>
          Die wichtigsten Features, die dein Business braucht — von Anfang an dabei.
        </p>
      </motion.div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {features.map((f, i) => (
          <motion.div key={f.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
            style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(128,128,128,0.12)", background: "var(--color-surface)", transition: "transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
            <div style={{ fontSize: "2rem", marginBottom: 16 }}>{f.icon}</div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>{f.title}</h3>
            <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", lineHeight: 1.6 }}>{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
`;
}

// Features Bento
function genFeaturesBento(_brief: DesignBrief): string {
  return `"use client";
import { motion } from "framer-motion";

export function FeaturesBento() {
  return (
    <section style={{ padding: "96px 80px", background: "var(--color-bg)" }}>
      <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2rem, 4vw, 3.5rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "var(--color-text)", marginBottom: 48, maxWidth: 600 }}>
        Gebaut für die Art, wie du arbeitest.
      </motion.h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "auto auto", gap: 16 }}>
        {/* Large card */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          style={{ gridColumn: "span 2", gridRow: "span 2", padding: 40, borderRadius: "var(--radius-lg)", background: "var(--color-primary)", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "flex-end", minHeight: 300 }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🚀</div>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 800, marginBottom: 8 }}>Blitzstart garantiert</h3>
          <p style={{ opacity: 0.8, lineHeight: 1.5 }}>Von Null auf fertige Website in weniger als 10 Minuten.</p>
        </motion.div>
        {/* Small cards */}
        {[
          { icon: "🎯", title: "Präzise", desc: "Pixel-perfekte Ergebnisse" },
          { icon: "📊", title: "Analytisch", desc: "Daten die Sinn ergeben" },
        ].map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.1 }}
            style={{ padding: 28, borderRadius: "var(--radius-lg)", background: "var(--color-surface)", border: "1px solid rgba(128,128,128,0.12)" }}>
            <div style={{ fontSize: "1.75rem", marginBottom: 12 }}>{c.icon}</div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>{c.title}</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{c.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
`;
}

// Stats / Metriken
function genDataStats(brief: DesignBrief): string {
  return `"use client";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useRef, useEffect } from "react";

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString("de-DE") + suffix);
  useEffect(() => { if (inView) animate(count, to, { duration: 1.5, ease: "easeOut" }); }, [inView, to, count]);
  return <motion.span ref={ref}>{rounded}</motion.span>;
}

const stats = [
  { value: 10000, suffix: "+", label: "Aktive Nutzer" },
  { value: 98, suffix: "%", label: "Kundenzufriedenheit" },
  { value: 24, suffix: "/7", label: "Support" },
  { value: 50, suffix: "ms", label: "Ladezeit" },
];

export function DataStats() {
  return (
    <section style={{ padding: "96px 80px", background: "var(--color-surface)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40 }}>
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2.5rem, 4vw, 4rem)", fontWeight: 900, color: "var(--color-primary)", letterSpacing: "-0.04em", lineHeight: 1 }}>
              <Counter to={s.value} suffix={s.suffix} />
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginTop: 8 }}>{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
`;
}

// Testimonials Cards
function genTestimonialsCards(_brief: DesignBrief): string {
  return `"use client";
import { motion } from "framer-motion";

const testimonials = [
  { name: "Anna M.", role: "CEO, TechStart", quote: "Unglaublich einfach zu benutzen. Wir haben unsere Website in einem Tag fertig gestellt." },
  { name: "Thomas K.", role: "Freelancer", quote: "Die beste Investition für mein Business. Mehr Kunden, weniger Aufwand." },
  { name: "Sarah L.", role: "Marketing Manager", quote: "Endlich ein Tool, das hält was es verspricht. Absolut empfehlenswert!" },
];

export function TestimonialsCards() {
  return (
    <section style={{ padding: "96px 80px", background: "var(--color-bg)" }}>
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 64 }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 3vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text)", marginBottom: 12 }}>
          Was unsere Kunden sagen
        </h2>
      </motion.div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {testimonials.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(128,128,128,0.12)", background: "var(--color-surface)" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 16, color: "var(--color-accent)" }}>★★★★★</div>
            <p style={{ fontSize: "0.9375rem", color: "var(--color-text)", lineHeight: 1.65, marginBottom: 24, fontStyle: "italic" }}>
              &ldquo;{t.quote}&rdquo;
            </p>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--color-text)" }}>{t.name}</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{t.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
`;
}

// Pricing 3 Tiers
function genPricing3tier(brief: DesignBrief): string {
  return `"use client";
import { motion } from "framer-motion";

const plans = [
  { name: "Starter", price: "0", period: "/ Monat", features: ["1 Projekt", "5 Seiten", "Basic Support", "SSL Zertifikat"], cta: "Kostenlos starten", highlight: false },
  { name: "Pro", price: "29", period: "/ Monat", features: ["10 Projekte", "Unbegrenzte Seiten", "Priority Support", "Custom Domain", "Analytics"], cta: "Pro starten", highlight: true },
  { name: "Enterprise", price: "99", period: "/ Monat", features: ["Unbegrenzte Projekte", "Team-Zugang", "Dedizierter Support", "SLA Garantie", "API Zugang"], cta: "Kontakt aufnehmen", highlight: false },
];

export function Pricing3tier() {
  return (
    <section style={{ padding: "96px 80px", background: "var(--color-bg)" }}>
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 64 }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 3vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text)", marginBottom: 12 }}>
          Einfache Preise, kein Kleingedrucktes
        </h2>
        <p style={{ fontSize: "1.0625rem", color: "var(--color-muted)" }}>Starte kostenlos, skaliere wenn du wächst.</p>
      </motion.div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 960, margin: "0 auto" }}>
        {plans.map((plan, i) => (
          <motion.div key={plan.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            style={{ padding: 36, borderRadius: "var(--radius-lg)", border: plan.highlight ? \`2px solid \${brief.colors.primary}\` : "1px solid rgba(128,128,128,0.12)", background: plan.highlight ? "var(--color-primary)" : "var(--color-surface)", position: "relative" }}>
            {plan.highlight && (
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--color-accent)", color: "#fff", fontSize: "0.75rem", fontWeight: 700, padding: "4px 12px", borderRadius: 9999 }}>
                Beliebteste Wahl
              </div>
            )}
            <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.875rem", letterSpacing: "0.05em", textTransform: "uppercase", color: plan.highlight ? "rgba(255,255,255,0.8)" : "var(--color-muted)", marginBottom: 8 }}>{plan.name}</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "3rem", fontWeight: 900, color: plan.highlight ? "#fff" : "var(--color-text)", letterSpacing: "-0.04em" }}>€{plan.price}</span>
              <span style={{ fontSize: "0.875rem", color: plan.highlight ? "rgba(255,255,255,0.7)" : "var(--color-muted)" }}>{plan.period}</span>
            </div>
            <ul style={{ listStyle: "none", marginBottom: 32, display: "flex", flexDirection: "column", gap: 10 }}>
              {plan.features.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", color: plan.highlight ? "rgba(255,255,255,0.9)" : "var(--color-text)" }}>
                  <span style={{ color: plan.highlight ? "#fff" : "var(--color-accent)", fontWeight: 700 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a href="#contact" style={{ display: "block", textAlign: "center", padding: "12px 24px", borderRadius: "var(--radius)", background: plan.highlight ? "#fff" : "var(--color-primary)", color: plan.highlight ? "var(--color-primary)" : "#fff", fontWeight: 700, fontSize: "0.9375rem", transition: "opacity 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              {plan.cta}
            </a>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
`;
}

// CTA Banner
function genCtaBanner(brief: DesignBrief): string {
  return `"use client";
import { motion } from "framer-motion";

export function CtaBanner() {
  return (
    <section style={{ padding: "96px 80px", background: "var(--color-primary)", textAlign: "center" }}>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2rem, 4vw, 3.5rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", marginBottom: 20 }}>
          Bereit loszulegen?
        </h2>
        <p style={{ fontSize: "1.125rem", color: "rgba(255,255,255,0.75)", marginBottom: 40, maxWidth: 480, margin: "0 auto 40px" }}>
          Starte noch heute kostenlos mit ${brief.name} und erlebe den Unterschied.
        </p>
        <a href="#start" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 36px", borderRadius: "var(--radius)", background: "#fff", color: "var(--color-primary)", fontWeight: 800, fontSize: "1rem", transition: "opacity 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
          Kostenlos starten →
        </a>
      </motion.div>
    </section>
  );
}
`;
}

// CTA Newsletter
function genCtaNewsletter(_brief: DesignBrief): string {
  return `"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export function CtaNewsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setDone(true);
  };
  return (
    <section style={{ padding: "96px 80px", background: "var(--color-surface)", textAlign: "center" }}>
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text)", marginBottom: 12 }}>
          Bleib auf dem Laufenden
        </h2>
        <p style={{ fontSize: "1rem", color: "var(--color-muted)", marginBottom: 32 }}>
          Keine Spam-Mails. Nur die wichtigsten Updates.
        </p>
        {done ? (
          <p style={{ fontSize: "1rem", color: "var(--color-accent)", fontWeight: 600 }}>✓ Danke! Du bist dabei.</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: 12, maxWidth: 460, margin: "0 auto" }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="deine@email.de" required
              style={{ flex: 1, padding: "12px 18px", borderRadius: "var(--radius)", border: "1px solid rgba(128,128,128,0.2)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: "0.9375rem", outline: "none" }} />
            <button type="submit" style={{ padding: "12px 24px", borderRadius: "var(--radius)", background: "var(--color-primary)", color: "#fff", fontWeight: 700, fontSize: "0.9375rem", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
              Anmelden
            </button>
          </form>
        )}
      </motion.div>
    </section>
  );
}
`;
}

// Content Big Text
function genContentBigText(brief: DesignBrief): string {
  return `"use client";
import { motion } from "framer-motion";

export function ContentBigText() {
  return (
    <section style={{ padding: "120px 80px", background: "var(--color-bg)", overflow: "hidden" }}>
      <motion.h2 initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(3rem, 9vw, 9rem)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 0.9, color: "var(--color-text)" }}>
        ${brief.name}.<br />
        <span style={{ color: "var(--color-primary)" }}>Einfach.</span><br />
        Schnell.
      </motion.h2>
    </section>
  );
}
`;
}

// Logo Wall / Marquee
function genContentLogoWall(_brief: DesignBrief): string {
  return `"use client";

const logos = ["Acme Corp", "Globex", "Initech", "Umbrella", "Stark Industries", "Wayne Enterprises", "Oscorp"];

export function ContentLogoWall() {
  return (
    <section style={{ padding: "48px 0", background: "var(--color-surface)", overflow: "hidden" }}>
      <p style={{ textAlign: "center", fontSize: "0.8125rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 32 }}>
        Vertraut von führenden Unternehmen
      </p>
      <div style={{ display: "flex", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 64, animation: "marquee 20s linear infinite", whiteSpace: "nowrap" }}>
          {[...logos, ...logos].map((logo, i) => (
            <span key={i} style={{ fontSize: "1.0625rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-muted)", opacity: 0.5 }}>
              {logo}
            </span>
          ))}
        </div>
      </div>
      <style>{\`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      \`}</style>
    </section>
  );
}
`;
}

// Contact Form
function genInteractiveContact(brief: DesignBrief): string {
  return `"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export function InteractiveContact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setSent(true); };
  const inputStyle = { width: "100%", padding: "12px 16px", borderRadius: "var(--radius)", border: "1px solid rgba(128,128,128,0.2)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: "0.9375rem", outline: "none", fontFamily: "var(--font-body)" };
  return (
    <section style={{ padding: "96px 80px", background: "var(--color-bg)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, maxWidth: 960, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2rem, 3vw, 3rem)", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--color-text)", marginBottom: 20 }}>
            Lass uns reden.
          </h2>
          <p style={{ fontSize: "1rem", color: "var(--color-muted)", lineHeight: 1.65, marginBottom: 32 }}>
            Hast du Fragen oder möchtest du mehr über ${brief.name} erfahren? Wir freuen uns auf deine Nachricht.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>📧 hallo@${brief.name.toLowerCase().replace(/\s/g, "")}.de</span>
            <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>📍 München, Deutschland</span>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          {sent ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-accent)", fontWeight: 600, fontSize: "1.125rem" }}>
              ✓ Nachricht gesendet! Wir melden uns bald.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input style={inputStyle} placeholder="Dein Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <input style={inputStyle} type="email" placeholder="E-Mail Adresse" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              <textarea style={{ ...inputStyle, minHeight: 140, resize: "vertical" }} placeholder="Deine Nachricht..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required />
              <button type="submit" style={{ padding: "14px 28px", borderRadius: "var(--radius)", background: "var(--color-primary)", color: "#fff", fontWeight: 700, fontSize: "0.9375rem", border: "none", cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                Absenden →
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
`;
}

// Footer Minimal
function genFooterMinimal(brief: DesignBrief): string {
  return `export function FooterMinimal() {
  return (
    <footer style={{ padding: "32px 80px", borderTop: "1px solid rgba(128,128,128,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-bg)" }}>
      <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.9375rem", color: "var(--color-text)", letterSpacing: "-0.02em" }}>
        ${brief.name}
      </span>
      <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
        © {new Date().getFullYear()} ${brief.name}. Alle Rechte vorbehalten.
      </span>
      <div style={{ display: "flex", gap: 24 }}>
        {["Impressum", "Datenschutz"].map(link => (
          <a key={link} href={\`/\${link.toLowerCase()}\`} style={{ fontSize: "0.8125rem", color: "var(--color-muted)", transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--color-muted)")}>
            {link}
          </a>
        ))}
      </div>
    </footer>
  );
}
`;
}

// Footer Columns
function genFooterColumns(brief: DesignBrief): string {
  return `export function FooterColumns() {
  return (
    <footer style={{ padding: "64px 80px 32px", background: "var(--color-surface)", borderTop: "1px solid rgba(128,128,128,0.08)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
        <div>
          <p style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1.0625rem", color: "var(--color-text)", marginBottom: 12, letterSpacing: "-0.02em" }}>${brief.name}</p>
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", lineHeight: 1.65, maxWidth: 240 }}>
            Die intelligente Lösung für moderne Unternehmen. Einfach, schnell, sicher.
          </p>
        </div>
        {[["Produkt", ["Features", "Preise", "Changelog", "Roadmap"]], ["Unternehmen", ["Über uns", "Blog", "Karriere", "Kontakt"]], ["Rechtliches", ["Impressum", "Datenschutz", "AGB", "Cookies"]]].map(([title, links]) => (
          <div key={title as string}>
            <p style={{ fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 16 }}>{title as string}</p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {(links as string[]).map(link => (
                <li key={link}>
                  <a href={\`/\${link.toLowerCase().replace(/\\s/g, "-")}\`} style={{ fontSize: "0.875rem", color: "var(--color-muted)", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--color-muted)")}>
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid rgba(128,128,128,0.12)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>© {new Date().getFullYear()} ${brief.name}</span>
        <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>Gebaut mit D³ Studio</span>
      </div>
    </footer>
  );
}
`;
}

// ── Master generator map ──

const SECTION_GENERATORS: Record<string, SectionGenerator> = {
  "navbar-minimal": genNavbarMinimal,
  "navbar-centered": genNavbarMinimal,
  "navbar-transparent": genNavbarTransparent,
  "hero-centered": genHeroCentered,
  "hero-split": genHeroSplit,
  "hero-minimal": genHeroMinimal,
  "hero-fullbleed": genHeroSplit,
  "hero-video": genHeroSplit,
  "hero-editorial": genHeroSplit,
  "hero-product": genHeroCentered,
  "features-3col": genFeatures3col,
  "features-bento": genFeaturesBento,
  "features-bento-advanced": genFeaturesBento,
  "features-alternating": genFeatures3col,
  "features-list": genFeatures3col,
  "features-icons-grid": genFeatures3col,
  "data-stats": genDataStats,
  "data-stats-split": genDataStats,
  "data-progress": genDataStats,
  "testimonials-cards": genTestimonialsCards,
  "testimonials-carousel": genTestimonialsCards,
  "social-proof-banner": genTestimonialsCards,
  "social-proof-marquee": genContentLogoWall,
  "content-text": genContentBigText,
  "content-big-text": genContentBigText,
  "content-logo-wall": genContentLogoWall,
  "content-marquee": genContentLogoWall,
  "pricing-2tier": genPricing3tier,
  "pricing-3tier": genPricing3tier,
  "cta-banner": genCtaBanner,
  "cta-split": genCtaBanner,
  "cta-newsletter": genCtaNewsletter,
  "cta-fullscreen": genCtaBanner,
  "interactive-contact": genInteractiveContact,
  "footer-minimal": genFooterMinimal,
  "footer-columns": genFooterColumns,
  "footer-big": genFooterColumns,
};

// ── Public API ──

export interface GeneratedFile {
  path: string;
  content: string;
}

export function generateSectionFile(patternId: string, brief: DesignBrief): GeneratedFile | null {
  const gen = SECTION_GENERATORS[patternId];
  if (!gen) return null;

  // Find matching section in brief to get user-edited content
  const section = brief.sections.find((s) => s.patternId === patternId);
  const briefWithContent = section?.content
    ? { ...brief, _sectionContent: section.content }
    : brief;

  return {
    path: getComponentPath(patternId),
    content: gen(briefWithContent as DesignBrief),
  };
}

export function generateAdditionalPageTsx(brief: DesignBrief, page: import("./design-brief").DesignBriefPage): string {
  if (page.sections.length === 0) {
    return `export default function ${toPascalCase(page.slug || page.name)}Page() {
  return (
    <main style={{ minHeight: "100vh", paddingTop: 64 }}>
      <section style={{ padding: "96px 80px" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2rem, 4vw, 4rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "var(--color-text)" }}>${page.name}</h1>
      </section>
    </main>
  );
}
`;
  }

  const imports = page.sections
    .map((s) => {
      const name = toPascalCase(s.patternId);
      return `import { ${name} } from "@/components/sections/${name}";`;
    })
    .join("\n");

  const renders = page.sections
    .map((s) => `      <${toPascalCase(s.patternId)} />`)
    .join("\n");

  return `${imports}

export default function ${toPascalCase(page.slug || page.name)}Page() {
  return (
    <main>
${renders}
    </main>
  );
}
`;
}

export function generatePackageJson(brief: DesignBrief): string {
  const projectName = brief.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return JSON.stringify({
    name: projectName,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "next lint",
    },
    dependencies: {
      next: "15.0.0",
      react: "^18.3.0",
      "react-dom": "^18.3.0",
      "framer-motion": "^11.0.0",
    },
    devDependencies: {
      typescript: "^5",
      "@types/node": "^20",
      "@types/react": "^18",
      "@types/react-dom": "^18",
    },
  }, null, 2);
}

export function generateNextConfig(): string {
  return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
`;
}

export function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: { "@/*": ["./src/*"] },
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  }, null, 2);
}

export function generateAllProjectFiles(
  brief: DesignBrief,
  opts?: { supabaseUrl?: string; supabaseAnonKey?: string }
): Record<string, string> {
  const files: Record<string, string> = {};

  files["src/app/globals.css"] = generateGlobalCSS(brief);
  files["src/app/layout.tsx"] = generateLayoutTsx(brief);
  files["src/app/page.tsx"] = generatePageTsx(brief);
  files["package.json"] = generatePackageJson(brief);
  files["next.config.ts"] = generateNextConfig();
  files["tsconfig.json"] = generateTsConfig();

  // Home page sections
  for (const section of brief.sections) {
    const file = generateSectionFile(section.patternId, brief);
    if (file) {
      files[file.path] = file.content;
    }
  }

  // Additional pages
  for (const page of brief.additionalPages ?? []) {
    const slug = page.slug || page.name.toLowerCase();
    files[`src/app/${slug}/page.tsx`] = generateAdditionalPageTsx(brief, page);
    for (const section of page.sections) {
      const file = generateSectionFile(section.patternId, brief);
      if (file && !files[file.path]) {
        files[file.path] = file.content;
      }
    }
  }

  // Invisible CMS — auto-generate /admin + supabase client if CMS sections present
  const supabaseUrl = opts?.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = opts?.supabaseAnonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (supabaseUrl && supabaseAnonKey) {
    const cmsFiles = generateCmsFiles(brief, supabaseUrl, supabaseAnonKey);
    Object.assign(files, cmsFiles);
  }

  // Update package.json to include @supabase/supabase-js if CMS is used
  const cmsTypes = detectCmsTypes(brief);
  if (cmsTypes.length > 0) {
    try {
      const pkg = JSON.parse(files["package.json"]);
      pkg.dependencies["@supabase/supabase-js"] = "^2";
      files["package.json"] = JSON.stringify(pkg, null, 2);
    } catch { /* ignore */ }
  }

  return files;
}

export function generateCSSOnly(brief: DesignBrief): string {
  return generateGlobalCSS(brief);
}

// ── Invisible CMS ──
// Detected automatically when Blog / Team / Testimonials sections are added.
// User never sets up Supabase — D³ Studio's own instance is used.

export type CmsContentType = "articles" | "team" | "testimonials";

export const CMS_SECTION_MAP: Record<string, CmsContentType> = {
  "blog-grid": "articles",
  "blog-list": "articles",
  "content-blog": "articles",
  "team-grid": "team",
  "team-list": "team",
  "testimonials-cards": "testimonials",
  "testimonials-carousel": "testimonials",
};

export function detectCmsTypes(brief: DesignBrief): CmsContentType[] {
  const types = new Set<CmsContentType>();
  const allSections = [
    ...brief.sections,
    ...(brief.additionalPages ?? []).flatMap((p) => p.sections),
  ];
  for (const s of allSections) {
    const t = CMS_SECTION_MAP[s.patternId];
    if (t) types.add(t);
  }
  return Array.from(types);
}

export function generateSupabaseClient(supabaseUrl: string, supabaseAnonKey: string): string {
  return `import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "${supabaseUrl}";
const supabaseAnonKey = "${supabaseAnonKey}";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
`;
}

export function generateAdminRoute(brief: DesignBrief, cmsTypes: CmsContentType[]): string {
  return `"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<string>("${cmsTypes[0] ?? "articles"}");
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const projectId = "${brief.id}";

  const tabs: { key: string; label: string; fields: string[] }[] = [
${cmsTypes.map((t) => {
  const fields =
    t === "articles" ? ["title", "body", "author", "published_at"] :
    t === "team" ? ["name", "role", "bio", "image_url"] :
    ["author", "quote", "role", "company"];
  return `    { key: "${t}", label: "${t === "articles" ? "Artikel" : t === "team" ? "Team" : "Testimonials"}", fields: ${JSON.stringify(fields)} },`;
}).join("\n")}
  ];

  const activeTabData = tabs.find((t) => t.key === activeTab);

  useEffect(() => {
    loadItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function loadItems() {
    setLoading(true);
    const { data } = await supabase
      .from(\`\${activeTab}_\${projectId.replace(/[^a-z0-9]/gi, "_")}\`)
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }

  async function saveItem() {
    const tableName = \`\${activeTab}_\${projectId.replace(/[^a-z0-9]/gi, "_")}\`;
    await supabase.from(tableName).insert({ ...form, project_id: projectId });
    setForm({});
    setShowForm(false);
    loadItems();
  }

  async function deleteItem(id: string) {
    const tableName = \`\${activeTab}_\${projectId.replace(/[^a-z0-9]/gi, "_")}\`;
    await supabase.from(tableName).delete().eq("id", id);
    loadItems();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ padding: "16px 32px", background: "#fff", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 800, letterSpacing: "-0.03em", color: "#0a0a0a", margin: 0 }}>${brief.name}</h1>
          <p style={{ fontSize: "0.75rem", color: "#a0a0a0", margin: 0 }}>Content Manager</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ padding: "8px 18px", borderRadius: 8, background: "#0a0a0a", color: "#fff", fontWeight: 700, fontSize: "0.875rem", border: "none", cursor: "pointer" }}>
          + Neu
        </button>
      </header>
      {/* Tabs */}
      <div style={{ padding: "0 32px", borderBottom: "1px solid #e8e8e8", background: "#fff", display: "flex", gap: 0 }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: "12px 16px", border: "none", cursor: "pointer", fontSize: "0.8125rem", fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? "#0a0a0a" : "#a0a0a0", background: "transparent", borderBottom: activeTab === t.key ? "2px solid #0a0a0a" : "2px solid transparent", marginBottom: -1, transition: "all 0.12s" }}>
            {t.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div style={{ padding: 32 }}>
        {loading ? (
          <p style={{ color: "#a0a0a0", fontSize: "0.875rem" }}>Lade...</p>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <p style={{ fontSize: "1rem", color: "#a0a0a0", marginBottom: 16 }}>Noch keine Einträge</p>
            <button onClick={() => setShowForm(true)}
              style={{ padding: "10px 24px", borderRadius: 8, background: "#0a0a0a", color: "#fff", fontWeight: 700, fontSize: "0.875rem", border: "none", cursor: "pointer" }}>
              Ersten Eintrag erstellen
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((item) => (
              <div key={item.id as string} style={{ padding: "16px 20px", background: "#fff", borderRadius: 10, border: "1px solid #e8e8e8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#0a0a0a", margin: "0 0 2px" }}>
                    {(item.title || item.name || item.author) as string}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#a0a0a0", margin: 0 }}>
                    {item.role as string || item.company as string || ""}
                  </p>
                </div>
                <button onClick={() => deleteItem(item.id as string)}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e8e8e8", background: "transparent", color: "#ef4444", fontSize: "0.75rem", cursor: "pointer" }}>
                  Löschen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Form Modal */}
      {showForm && activeTabData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 480, maxHeight: "80vh", overflow: "auto" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 800, margin: "0 0 20px", letterSpacing: "-0.02em" }}>Neuer Eintrag</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeTabData.fields.map((field) => (
                <div key={field}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#a0a0a0", display: "block", marginBottom: 4 }}>{field}</label>
                  {field === "body" || field === "bio" || field === "quote" ? (
                    <textarea value={form[field] ?? ""} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      rows={3} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e8e8e8", fontSize: "0.875rem", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
                  ) : (
                    <input value={form[field] ?? ""} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e8e8e8", fontSize: "0.875rem", outline: "none" }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={() => { setShowForm(false); setForm({}); }}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e8e8e8", background: "transparent", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}>
                Abbrechen
              </button>
              <button onClick={saveItem}
                style={{ flex: 2, padding: "10px", borderRadius: 8, background: "#0a0a0a", color: "#fff", fontWeight: 700, fontSize: "0.875rem", border: "none", cursor: "pointer" }}>
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;
}

export function generateCmsFiles(
  brief: DesignBrief,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Record<string, string> {
  const cmsTypes = detectCmsTypes(brief);
  if (cmsTypes.length === 0) return {};

  return {
    "src/lib/supabase.ts": generateSupabaseClient(supabaseUrl, supabaseAnonKey),
    "src/app/admin/page.tsx": generateAdminRoute(brief, cmsTypes),
  };
}
