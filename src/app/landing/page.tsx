"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Layers,
  Code2,
  MousePointerClick,
  Rocket,
  Sparkles,
  Zap,
  Eye,
  ArrowRight,
  Check,
  Github,
  Globe,
  Shield,
} from "lucide-react";

const FEATURES = [
  {
    icon: <Layers size={22} />,
    title: "Plan Mode",
    desc: "Beschreibe dein Projekt. Die AI erstellt Seiten, Design, Content und Tech-Stack — strukturiert als .d3/ Karten.",
    accent: "#818cf8",
  },
  {
    icon: <Zap size={22} />,
    title: "Agent Loop",
    desc: "Plan → Build → Test → Fix. Vollautomatisch in max 3 Iterationen. Keine manuellen Fixes nötig.",
    accent: "#34d399",
  },
  {
    icon: <MousePointerClick size={22} />,
    title: "Inspect & Edit",
    desc: "Klick auf jedes Element. Ändere Farben, Fonts, Größen — live. Die AI passt den Code automatisch an.",
    accent: "#f59e0b",
  },
  {
    icon: <Rocket size={22} />,
    title: "1-Click Deploy",
    desc: "Fertig? Ein Klick — live auf Vercel. Kein Terminal, keine Config, kein DevOps.",
    accent: "#f472b6",
  },
  {
    icon: <Eye size={22} />,
    title: "Live Preview",
    desc: "Echte Linux VM via E2B. Kein Fake-Preview — dein Projekt läuft wirklich, mit allen Dependencies.",
    accent: "#60a5fa",
  },
  {
    icon: <Shield size={22} />,
    title: "9 AI Experten",
    desc: "Dev, Designer, Security, Marketing, UX, Legal, Content — wähle die Perspektive, die du brauchst.",
    accent: "#a78bfa",
  },
];

const COMPARISONS = [
  { label: "Visuelle Kontrolle", us: true, them: false },
  { label: "Echte Linux VM", us: true, them: false },
  { label: "Agent Loop (auto-fix)", us: true, them: false },
  { label: "1-Click Deploy", us: true, them: true },
  { label: "Inspect & Edit", us: true, them: false },
  { label: "Plan Mode", us: true, them: false },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

export default function LandingPage() {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--d3-bg)", color: "var(--d3-text)" }}
    >
      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: "rgba(10,10,10,0.95)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-base font-black tracking-tight">D³</span>
          <span className="text-base font-black tracking-widest">STUDIO</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg text-[12px] font-medium transition-all"
            style={{
              background: "var(--d3-glass)",
              border: "1px solid var(--d3-glass-border)",
              color: "var(--d3-text-secondary)",
            }}
          >
            Login
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg text-[12px] font-semibold transition-all"
            style={{ background: "#818cf8", color: "#fff" }}
          >
            Kostenlos starten
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 px-6 text-center overflow-hidden">
        {/* Glow */}
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-20"
          style={{ background: "linear-gradient(135deg, #818cf8, #f472b6)" }}
        />

        <motion.div {...fadeUp} className="relative z-10 max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium mb-6"
            style={{
              background: "rgba(129,140,248,0.1)",
              border: "1px solid rgba(129,140,248,0.2)",
              color: "#818cf8",
            }}
          >
            <Sparkles size={12} />
            AI-powered Coding Studio
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] mb-6"
            style={{ letterSpacing: "-0.04em" }}
          >
            Beschreibe es.
            <br />
            <span style={{ color: "#818cf8" }}>Wir bauen es.</span>
          </h1>

          <p
            className="text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed"
            style={{ color: "var(--d3-text-muted)" }}
          >
            D3 Studio plant, generiert, testet und deployed dein Projekt —
            und du kannst jedes Element visuell editieren.
            Keine Vorkenntnisse nötig.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold transition-all"
              style={{
                background: "#818cf8",
                color: "#fff",
                boxShadow: "0 8px 32px rgba(129,140,248,0.3)",
              }}
            >
              Jetzt starten
              <ArrowRight size={16} />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium transition-all"
              style={{
                background: "var(--d3-glass)",
                border: "1px solid var(--d3-glass-border)",
                color: "var(--d3-text-secondary)",
              }}
            >
              <Github size={16} />
              GitHub
            </a>
          </div>
        </motion.div>
      </section>

      {/* ── Features Grid ── */}
      <section className="py-20 px-6">
        <motion.div {...fadeUp} className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Alles was du brauchst
          </h2>
          <p className="text-[14px]" style={{ color: "var(--d3-text-muted)" }}>
            Von der Idee zum fertigen Produkt — in Minuten.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl p-6"
              style={{
                background: "var(--d3-surface)",
                border: "1px solid var(--d3-glass-border)",
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{
                  background: `${f.accent}15`,
                  color: f.accent,
                  border: `1px solid ${f.accent}25`,
                }}
              >
                {f.icon}
              </div>
              <h3 className="text-[14px] font-bold mb-2">{f.title}</h3>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--d3-text-muted)" }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="py-20 px-6">
        <motion.div {...fadeUp} className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Warum D3 Studio?
          </h2>
          <p className="text-[14px]" style={{ color: "var(--d3-text-muted)" }}>
            Was andere versprechen, liefern wir wirklich.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          className="max-w-lg mx-auto rounded-xl overflow-hidden"
          style={{
            background: "var(--d3-surface)",
            border: "1px solid var(--d3-glass-border)",
          }}
        >
          <div
            className="grid grid-cols-3 text-[11px] font-bold px-5 py-3"
            style={{ borderBottom: "1px solid var(--d3-glass-border)" }}
          >
            <span style={{ color: "var(--d3-text-muted)" }}>Feature</span>
            <span className="text-center" style={{ color: "#818cf8" }}>D3 Studio</span>
            <span className="text-center" style={{ color: "var(--d3-text-tertiary)" }}>Andere Tools</span>
          </div>
          {COMPARISONS.map((c) => (
            <div
              key={c.label}
              className="grid grid-cols-3 text-[12px] px-5 py-3"
              style={{ borderBottom: "1px solid var(--d3-glass-border)" }}
            >
              <span style={{ color: "var(--d3-text-secondary)" }}>{c.label}</span>
              <span className="flex justify-center">
                {c.us ? (
                  <Check size={14} className="text-emerald-400" />
                ) : (
                  <span className="text-white/20">—</span>
                )}
              </span>
              <span className="flex justify-center">
                {c.them ? (
                  <Check size={14} className="text-white/30" />
                ) : (
                  <span className="text-white/20">—</span>
                )}
              </span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 text-center">
        <motion.div {...fadeUp} className="relative max-w-xl mx-auto">
          <div
            className="absolute inset-0 rounded-2xl blur-[60px] opacity-15"
            style={{ background: "linear-gradient(135deg, #818cf8, #34d399)" }}
          />
          <div
            className="relative rounded-2xl p-10"
            style={{
              background: "var(--d3-surface)",
              border: "1px solid var(--d3-glass-border)",
            }}
          >
            <Globe size={28} className="mx-auto mb-4" style={{ color: "#818cf8" }} />
            <h2 className="text-xl sm:text-2xl font-bold mb-3">
              Bereit loszulegen?
            </h2>
            <p className="text-[13px] mb-8" style={{ color: "var(--d3-text-muted)" }}>
              Kostenlos starten. Keine Kreditkarte nötig.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-[14px] font-bold transition-all"
              style={{
                background: "#818cf8",
                color: "#fff",
                boxShadow: "0 8px 32px rgba(129,140,248,0.3)",
              }}
            >
              Jetzt kostenlos starten
              <Sparkles size={16} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="py-8 px-6 text-center text-[11px]"
        style={{
          borderTop: "1px solid var(--d3-glass-border)",
          color: "var(--d3-text-tertiary)",
        }}
      >
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="font-black">D³</span>
          <span className="font-black tracking-widest">STUDIO</span>
        </div>
        <p>Du triffst Entscheidungen, das System designt.</p>
      </footer>
    </div>
  );
}
