"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Sparkles, ArrowRight, Zap } from "lucide-react";

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  accent: string;
  popular?: boolean;
  cta: string;
}

const TIERS: PricingTier[] = [
  {
    name: "Free",
    price: "0€",
    period: "/Monat",
    description: "Zum Ausprobieren. Perfekt für erste Projekte.",
    features: [
      "3 Projekte",
      "AI Chat (Claude Haiku)",
      "Plan Mode",
      "Build Mode",
      "E2B Sandbox Preview",
      "Community Support",
    ],
    accent: "#94a3b8",
    cta: "Kostenlos starten",
  },
  {
    name: "Pro",
    price: "29€",
    period: "/Monat",
    description: "Für Freelancer und kleine Teams. Volle Power.",
    features: [
      "Unbegrenzte Projekte",
      "AI Chat (Claude Sonnet 4)",
      "Agent Loop (auto-fix)",
      "Inspect & Edit",
      "1-Click Vercel Deploy",
      "GitHub Integration",
      "9 AI-Experten Rollen",
      "Priority Support",
    ],
    accent: "#818cf8",
    popular: true,
    cta: "Pro werden",
  },
  {
    name: "Team",
    price: "79€",
    period: "/Monat",
    description: "Für Teams und Agenturen. Collaboration + API.",
    features: [
      "Alles aus Pro",
      "5 Team-Mitglieder",
      "Shared Projects",
      "Custom Domains",
      "API Access",
      "Whitelabel Option",
      "Dedicated Support",
      "SLA 99.9%",
    ],
    accent: "#f59e0b",
    cta: "Team starten",
  },
];

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function PricingPage() {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--d3-bg)", color: "var(--d3-text)" }}
    >
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <Link href="/landing" className="flex items-center gap-1.5">
          <span className="text-base font-black tracking-tight">D³</span>
          <span className="text-base font-black tracking-widest">STUDIO</span>
        </Link>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg text-[12px] font-medium transition-all"
          style={{
            background: "var(--d3-glass)",
            border: "1px solid var(--d3-glass-border)",
            color: "var(--d3-text-secondary)",
          }}
        >
          Zum Studio
        </Link>
      </nav>

      {/* Header */}
      <section className="pt-16 pb-12 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium mb-6"
            style={{
              background: "rgba(129,140,248,0.1)",
              border: "1px solid rgba(129,140,248,0.2)",
              color: "#818cf8",
            }}
          >
            <Zap size={12} />
            Einfache Preise
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4" style={{ letterSpacing: "-0.04em" }}>
            Wähle deinen Plan
          </h1>
          <p className="text-[14px] max-w-md mx-auto" style={{ color: "var(--d3-text-muted)" }}>
            Starte kostenlos. Upgrade wenn du mehr brauchst. Keine versteckten Kosten.
          </p>
        </motion.div>
      </section>

      {/* Pricing Cards */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease }}
              className="relative rounded-2xl p-6 flex flex-col"
              style={{
                background: "var(--d3-surface)",
                border: tier.popular
                  ? `2px solid ${tier.accent}`
                  : "1px solid var(--d3-glass-border)",
                boxShadow: tier.popular
                  ? `0 8px 40px ${tier.accent}20`
                  : "none",
              }}
            >
              {/* Popular badge */}
              {tier.popular && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold"
                  style={{
                    background: tier.accent,
                    color: "#fff",
                    boxShadow: `0 4px 12px ${tier.accent}40`,
                  }}
                >
                  Beliebtester Plan
                </div>
              )}

              {/* Header */}
              <div className="mb-5">
                <h3 className="text-[14px] font-bold mb-1">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black" style={{ color: tier.accent }}>
                    {tier.price}
                  </span>
                  <span className="text-[12px]" style={{ color: "var(--d3-text-tertiary)" }}>
                    {tier.period}
                  </span>
                </div>
                <p className="text-[11px] mt-2" style={{ color: "var(--d3-text-muted)" }}>
                  {tier.description}
                </p>
              </div>

              {/* Features */}
              <div className="flex-1 space-y-2.5 mb-6">
                {tier.features.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <Check size={13} style={{ color: tier.accent, flexShrink: 0 }} />
                    <span className="text-[12px]" style={{ color: "var(--d3-text-secondary)" }}>
                      {f}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link
                href="/"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-all"
                style={{
                  background: tier.popular ? tier.accent : "var(--d3-glass)",
                  color: tier.popular ? "#fff" : "var(--d3-text-secondary)",
                  border: tier.popular ? "none" : "1px solid var(--d3-glass-border)",
                  boxShadow: tier.popular ? `0 4px 16px ${tier.accent}30` : "none",
                }}
              >
                {tier.cta}
                <ArrowRight size={13} />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-xl font-bold text-center mb-8">Häufige Fragen</h2>
          <div className="space-y-4">
            {[
              {
                q: "Kann ich jederzeit upgraden oder kündigen?",
                a: "Ja. Upgrade sofort, Kündigung zum Ende des Abrechnungszeitraums. Keine Mindestlaufzeit.",
              },
              {
                q: "Was passiert mit meinen Projekten im Free Plan?",
                a: "Deine Projekte bleiben erhalten. Du kannst sie jederzeit exportieren oder weiterbearbeiten.",
              },
              {
                q: "Brauche ich Programmierkenntnisse?",
                a: "Nein. D3 Studio ist für alle Level — von Anfänger bis Profi. Die AI macht den Code.",
              },
              {
                q: "Welche AI-Modelle werden verwendet?",
                a: "Free nutzt Claude Haiku (schnell), Pro und Team nutzen Claude Sonnet 4 (stark). Du kannst das Modell jederzeit wechseln.",
              },
            ].map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl p-5"
                style={{
                  background: "var(--d3-surface)",
                  border: "1px solid var(--d3-glass-border)",
                }}
              >
                <h3 className="text-[13px] font-bold mb-2">{faq.q}</h3>
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--d3-text-muted)" }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
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
