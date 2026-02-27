"use client";

import { motion } from "framer-motion";
import { X, Moon, Sun, Monitor, Zap, Search } from "lucide-react";
import {
  AppSettings,
  AI_MODELS,
  CANVAS_BACKGROUNDS,
} from "@/lib/settings";

interface Props {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onUpdate, onClose }: Props) {
  const update = (patch: Partial<AppSettings>) =>
    onUpdate({ ...settings, ...patch });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 360 }}
        className="relative w-full max-w-[480px] max-h-[85vh] overflow-y-auto rounded-2xl"
        style={{
          background: settings.theme === "dark" ? "#1a1a1a" : "#fff",
          border: `1px solid ${settings.theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
          color: settings.theme === "dark" ? "#e5e5e5" : "#111",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            borderBottom: `1px solid ${settings.theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
          }}
        >
          <h2 className="text-[15px] font-semibold">Einstellungen</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{
              background: settings.theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6">
          {/* Theme */}
          <SettingsSection title="Erscheinungsbild" theme={settings.theme}>
            <div className="flex gap-2">
              {([
                { id: "light" as const, icon: <Sun size={14} />, label: "Hell" },
                { id: "dark" as const, icon: <Moon size={14} />, label: "Dunkel" },
              ]).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => update({ theme: opt.id })}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-medium transition-all"
                  style={{
                    background:
                      settings.theme === opt.id
                        ? settings.theme === "dark"
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(0,0,0,0.08)"
                        : "transparent",
                    border: `1px solid ${
                      settings.theme === opt.id
                        ? settings.theme === "dark"
                          ? "rgba(255,255,255,0.15)"
                          : "rgba(0,0,0,0.12)"
                        : "transparent"
                    }`,
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </SettingsSection>

          {/* Canvas Background */}
          <SettingsSection title="Canvas Hintergrund" theme={settings.theme}>
            <div className="grid grid-cols-6 gap-2">
              {CANVAS_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => update({ canvasBackground: bg.id })}
                  title={bg.label}
                  className="w-full aspect-square rounded-xl transition-all"
                  style={{
                    background: bg.id,
                    border:
                      settings.canvasBackground === bg.id
                        ? "2px solid #3b82f6"
                        : `1px solid ${settings.theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                    transform: settings.canvasBackground === bg.id ? "scale(1.1)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </SettingsSection>

          {/* Zoom Speed */}
          <SettingsSection title="Zoom-Geschwindigkeit" theme={settings.theme}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
                style={{
                  background: settings.theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  border: `1px solid ${settings.theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                }}
              >
                <Search size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium">Scroll-Zoom Speed</span>
                    <span className="text-[11px] font-mono" style={{ opacity: 0.5 }}>
                      {(["Sehr langsam", "Langsam", "Normal", "Schnell", "Sehr schnell"] as const)[(settings.zoomSpeed || 3) - 1]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={settings.zoomSpeed || 3}
                    onChange={(e) => update({ zoomSpeed: Number(e.target.value) })}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 ${((settings.zoomSpeed || 3) - 1) * 25}%, ${settings.theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"} ${((settings.zoomSpeed || 3) - 1) * 25}%)`,
                      accentColor: "#3b82f6",
                    }}
                  />
                  <div className="flex justify-between text-[9px]" style={{ opacity: 0.3 }}>
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                  </div>
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* AI Model */}
          <SettingsSection title="KI-Modell" theme={settings.theme}>
            <div className="flex flex-col gap-1.5">
              {AI_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => update({ aiModel: model.id })}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[12px] transition-all"
                  style={{
                    background:
                      settings.aiModel === model.id
                        ? settings.theme === "dark"
                          ? "rgba(59,130,246,0.15)"
                          : "rgba(59,130,246,0.08)"
                        : "transparent",
                    border: `1px solid ${
                      settings.aiModel === model.id
                        ? "rgba(59,130,246,0.3)"
                        : settings.theme === "dark"
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.06)"
                    }`,
                  }}
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-semibold">{model.label}</span>
                    <span style={{ opacity: 0.5, fontSize: 10 }}>{model.desc}</span>
                  </div>
                  {settings.aiModel === model.id && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </SettingsSection>

          {/* Cascade Mode */}
          <SettingsSection title="Workflow" theme={settings.theme}>
            <ToggleRow
              label="Cascade-Modus"
              description="KI erstellt zuerst einen Plan, dann den Code"
              icon={<Zap size={13} />}
              checked={settings.cascadeMode}
              onChange={(v) => update({ cascadeMode: v })}
              theme={settings.theme}
            />
            <ToggleRow
              label="Auto-Speichern"
              description="Projekt automatisch speichern"
              icon={<Monitor size={13} />}
              checked={settings.autoSave}
              onChange={(v) => update({ autoSave: v })}
              theme={settings.theme}
            />
          </SettingsSection>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SettingsSection({
  title,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  theme,
  children,
}: {
  title: string;
  theme: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ opacity: 0.4 }}
      >
        {title}
      </span>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  icon,
  checked,
  onChange,
  theme,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  theme: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[12px] transition-all"
      style={{
        background: theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
      }}
    >
      <div className="flex items-center gap-2.5">
        <span style={{ opacity: 0.5 }}>{icon}</span>
        <div className="flex flex-col items-start gap-0.5">
          <span className="font-medium">{label}</span>
          <span style={{ opacity: 0.4, fontSize: 10 }}>{description}</span>
        </div>
      </div>
      <div
        className="w-9 h-5 rounded-full transition-all relative"
        style={{
          background: checked ? "#3b82f6" : theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
        }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm"
          style={{ left: checked ? 18 : 2 }}
        />
      </div>
    </button>
  );
}
