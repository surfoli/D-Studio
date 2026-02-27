"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TOKEN_PRESETS } from "@/lib/design-tokens";

interface Props {
  onComplete: (config: {
    name: string;
    type: string;
    tokenPresetId: string;
  }) => void;
}

const PROJECT_TYPES = [
  { id: "agency", label: "Agency", desc: "Creative studio, design agency" },
  { id: "startup", label: "Startup", desc: "Tech company, SaaS product" },
  { id: "freelancer", label: "Freelancer", desc: "Personal portfolio, services" },
  { id: "restaurant", label: "Restaurant", desc: "Gastro, Café, Bar" },
];

export default function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [tokenId, setTokenId] = useState("");

  const steps = [
    {
      title: "What's your project called?",
      subtitle: "Give your project a name",
    },
    {
      title: "What are you building?",
      subtitle: "This helps us generate the right pages and content",
    },
    {
      title: "Pick a vibe",
      subtitle: "Choose the mood that fits your brand",
    },
  ];

  const canProceed =
    (step === 0 && name.length > 0) ||
    (step === 1 && type.length > 0) ||
    (step === 2 && tokenId.length > 0);

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      onComplete({ name, type, tokenPresetId: tokenId });
    }
  };

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ backgroundColor: "#f5f4f2" }}
    >
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="flex gap-2 mb-12">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[2px] flex-1 rounded-full transition-all duration-500"
              style={{
                backgroundColor:
                  i <= step ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.06)",
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Title */}
            <h1
              className="text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Inter', sans-serif", color: "#111" }}
            >
              {steps[step].title}
            </h1>
            <p className="mt-3 text-sm" style={{ color: "rgba(0,0,0,0.35)" }}>{steps[step].subtitle}</p>

            {/* Step content */}
            <div className="mt-10">
              {step === 0 && (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canProceed && handleNext()}
                  placeholder="e.g. Studio, Müller Elektro, Café Noir..."
                  autoFocus
                  className="w-full bg-transparent border-b border-black/10 focus:border-black/30 outline-none text-2xl pb-4 placeholder:text-black/15 transition-colors"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#111" }}
                />
              )}

              {step === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  {PROJECT_TYPES.map((pt) => (
                    <button
                      key={pt.id}
                      onClick={() => setType(pt.id)}
                      className="flex flex-col items-start p-5 rounded-2xl text-left transition-all"
                      style={{
                        backgroundColor:
                          type === pt.id
                            ? "rgba(0,0,0,0.05)"
                            : "#fff",
                        border:
                          type === pt.id
                            ? "1px solid rgba(0,0,0,0.15)"
                            : "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      <span className="text-sm font-medium" style={{ color: "#111" }}>
                        {pt.label}
                      </span>
                      <span className="text-xs mt-1" style={{ color: "rgba(0,0,0,0.3)" }}>
                        {pt.desc}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 gap-3">
                  {TOKEN_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setTokenId(preset.id)}
                      className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
                      style={{
                        backgroundColor:
                          tokenId === preset.id
                            ? "rgba(0,0,0,0.05)"
                            : "#fff",
                        border:
                          tokenId === preset.id
                            ? "1px solid rgba(0,0,0,0.15)"
                            : "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      {/* Color preview */}
                      <div className="flex gap-1.5 shrink-0">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: preset.primaryColor }}
                        />
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: preset.accentColor }}
                        />
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: preset.backgroundColor, border: "1px solid rgba(0,0,0,0.08)" }}
                        />
                      </div>
                      <div>
                        <span className="text-sm font-medium" style={{ color: "#111" }}>
                          {preset.name}
                        </span>
                        <span className="text-xs ml-3" style={{ color: "rgba(0,0,0,0.3)" }}>
                          {preset.fontHeading.includes("Georgia") ? "Serif" : "Sans-serif"} · {preset.borderRadius} · {preset.spacing}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-12 flex items-center justify-between">
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            className="text-xs transition-colors"
            style={{ color: "rgba(0,0,0,0.25)", visibility: step > 0 ? "visible" : "hidden" }}
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="px-6 py-2.5 text-sm font-medium rounded-xl transition-all"
            style={{
              backgroundColor: canProceed
                ? "#111"
                : "rgba(0,0,0,0.04)",
              color: canProceed ? "#fff" : "rgba(0,0,0,0.2)",
              cursor: canProceed ? "pointer" : "default",
            }}
          >
            {step === 2 ? "Generate" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
