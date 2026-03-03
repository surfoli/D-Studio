"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  Code2,
  MousePointerClick,
  Rocket,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: <Layers size={28} />,
    title: "Plan Mode",
    description:
      "Beschreibe dein Projekt in natürlicher Sprache. Die AI erstellt automatisch einen strukturierten Plan mit Seiten, Design, Content und Tech-Stack.",
    accent: "#818cf8",
  },
  {
    icon: <Code2 size={28} />,
    title: "Build Mode",
    description:
      "Die AI generiert den kompletten Code. Der Agent Loop plant, baut, testet und fixt automatisch — bis alles läuft.",
    accent: "#34d399",
  },
  {
    icon: <MousePointerClick size={28} />,
    title: "Inspect & Edit",
    description:
      "Klick auf jedes Element in der Live-Preview. Ändere Farben, Fonts, Größen — sofort sichtbar. Die AI schreibt den Code automatisch um.",
    accent: "#f59e0b",
  },
  {
    icon: <Rocket size={28} />,
    title: "1-Click Deploy",
    description:
      "Dein Projekt ist fertig? Ein Klick — und es ist live auf Vercel. Keine Config, kein Terminal, kein Stress.",
    accent: "#f472b6",
  },
];

const STORAGE_KEY = "d3_onboarding_done";

export function hasSeenOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function markOnboardingDone(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, "true");
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      markOnboardingDone();
      onComplete();
    }
  }, [step, onComplete]);

  const handleSkip = useCallback(() => {
    markOnboardingDone();
    onComplete();
  }, [onComplete]);

  const current = STEPS[step];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.97 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-2xl max-w-md w-full mx-4 overflow-hidden"
        style={{
          background: "var(--d3-surface)",
          border: "1px solid var(--d3-glass-border)",
          boxShadow: `0 24px 80px rgba(0,0,0,0.4), 0 0 80px ${current.accent}15`,
        }}
      >
        {/* Progress bar */}
        <div className="flex gap-1.5 px-8 pt-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full transition-all duration-500"
              style={{
                background: i <= step ? current.accent : "var(--d3-glass-border)",
                opacity: i <= step ? 1 : 0.3,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 pt-8 pb-6 text-center">
          {/* Icon */}
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{
              background: `${current.accent}15`,
              color: current.accent,
              border: `1px solid ${current.accent}30`,
            }}
          >
            {current.icon}
          </div>

          {/* Title */}
          <h2
            className="text-xl font-bold mb-3"
            style={{ color: "var(--d3-text)" }}
          >
            {current.title}
          </h2>

          {/* Description */}
          <p
            className="text-[13px] leading-relaxed mb-8"
            style={{ color: "var(--d3-text-muted)" }}
          >
            {current.description}
          </p>

          {/* Step indicator */}
          <div
            className="text-[10px] font-medium mb-6"
            style={{ color: "var(--d3-text-tertiary)" }}
          >
            {step + 1} / {STEPS.length}
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-between px-8 py-4"
          style={{
            borderTop: "1px solid var(--d3-glass-border)",
            background: "var(--d3-glass)",
          }}
        >
          <button
            onClick={handleSkip}
            className="text-[11px] transition-colors"
            style={{ color: "var(--d3-text-tertiary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--d3-text-muted)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--d3-text-tertiary)")}
          >
            Überspringen
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-[12px] font-semibold transition-all"
            style={{
              background: current.accent,
              color: "#fff",
              boxShadow: `0 4px 16px ${current.accent}40`,
            }}
          >
            {step < STEPS.length - 1 ? (
              <>
                Weiter
                <ArrowRight size={13} />
              </>
            ) : (
              <>
                Los geht&apos;s
                <Sparkles size={13} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
