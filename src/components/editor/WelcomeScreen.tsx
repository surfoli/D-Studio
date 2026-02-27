"use client";

import { Sparkles } from "lucide-react";

interface WelcomeCard {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  prompt: string;
}

const WELCOME_CARDS: WelcomeCard[] = [
  {
    id: "portfolio",
    emoji: "🎨",
    title: "Portfolio",
    desc: "Kreative Arbeiten zeigen",
    prompt:
      "Erstelle eine Portfolio-Website für eine Motion Designerin mit Cases, About, Kundenstimmen und Kontaktbereich.",
  },
  {
    id: "startup",
    emoji: "🚀",
    title: "Startup",
    desc: "Produkt überzeugend pitchen",
    prompt:
      "Baue eine moderne Startup-Website mit klarer Value Proposition, Feature-Übersicht, Zahlen/Stats, Testimonials und starker CTA.",
  },
  {
    id: "agency",
    emoji: "💼",
    title: "Agentur",
    desc: "Projekte & Team vorstellen",
    prompt:
      "Erstelle eine Website für eine Kreativagentur mit Hero, ausgewählten Projekten, Team, Kundenstimmen und Kontakt.",
  },
  {
    id: "freelancer",
    emoji: "👤",
    title: "Freelancer",
    desc: "Services & Referenzen",
    prompt:
      "Erstelle eine persönliche Website für einen Freelance-Entwickler mit Hero, Services, Referenzen und Kontaktformular.",
  },
  {
    id: "landing",
    emoji: "⚡",
    title: "Landing Page",
    desc: "Conversion-optimiert",
    prompt:
      "Baue eine überzeugende Landing Page für ein neues Produkt mit starkem Hero, Features, Social Proof und Conversion-CTA.",
  },
];

interface Props {
  welcomePrompt: string;
  onWelcomePromptChange: (v: string) => void;
  onSubmit: (prompt: string) => void;
  theme: "light" | "dark";
}

export default function WelcomeScreen({
  welcomePrompt,
  onWelcomePromptChange,
  onSubmit,
  theme,
}: Props) {
  const isDark = theme === "dark";
  const bg = isDark ? "#0d0d0d" : "#f7f7f7";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const textPrimary = isDark ? "#e5e5e5" : "rgba(0,0,0,0.85)";
  const textMuted = isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.4)";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "#fff";

  const canSubmit = welcomePrompt.trim().length >= 6;

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: bg }}
    >
      <div className="flex flex-col items-center max-w-[560px] w-full px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span
            className="text-[15px] font-semibold tracking-wide"
            style={{ color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.6)" }}
          >
            D³ Studio
          </span>
        </div>

        <h1
          className="text-[28px] sm:text-[36px] font-bold text-center leading-tight mb-2"
          style={{ color: textPrimary }}
        >
          Was möchtest du bauen?
        </h1>
        <p className="text-[14px] text-center mb-8" style={{ color: textMuted }}>
          Beschreibe deine Website oder wähle eine Vorlage
        </p>

        {/* Prompt input */}
        <div className="w-full mb-6">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: inputBg,
              border: `1px solid ${cardBorder}`,
              boxShadow: isDark ? "none" : "0 4px 24px rgba(0,0,0,0.06)",
            }}
          >
            <textarea
              value={welcomePrompt}
              onChange={(e) => onWelcomePromptChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
                  e.preventDefault();
                  onSubmit(welcomePrompt);
                }
              }}
              rows={3}
              autoFocus
              placeholder="z.B. Eine moderne Portfolio-Seite für einen Fotografen…"
              className="w-full resize-none px-4 py-3.5 text-[14px] leading-relaxed outline-none bg-transparent"
              style={{ color: textPrimary }}
            />
            <div className="flex items-center justify-between px-4 pb-3">
              <span className="text-[10px]" style={{ color: textMuted }}>
                ⌘↵ Generieren
              </span>
              <button
                onClick={() => canSubmit && onSubmit(welcomePrompt)}
                disabled={!canSubmit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
                style={{
                  background: canSubmit ? (isDark ? "#fff" : "#111") : "rgba(128,128,128,0.12)",
                  color: canSubmit ? (isDark ? "#111" : "#fff") : textMuted,
                  cursor: canSubmit ? "pointer" : "default",
                }}
              >
                <Sparkles size={13} />
                Erstellen
              </button>
            </div>
          </div>
        </div>

        {/* Template cards */}
        <div className="w-full">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-3 block text-center"
            style={{ color: textMuted }}
          >
            Oder starte mit einer Vorlage
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {WELCOME_CARDS.map((card) => (
              <button
                key={card.id}
                onClick={() => onSubmit(card.prompt)}
                className="group flex flex-col items-center gap-1.5 rounded-xl px-3 py-4 transition-all hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                }}
              >
                <span className="text-[22px] mb-0.5">{card.emoji}</span>
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: textPrimary }}
                >
                  {card.title}
                </span>
                <span
                  className="text-[10px] text-center leading-tight"
                  style={{ color: textMuted }}
                >
                  {card.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
