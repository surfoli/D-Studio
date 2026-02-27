export interface AppSettings {
  theme: "light" | "dark";
  canvasBackground: string;
  aiModel: string;
  cascadeMode: boolean;
  autoSave: boolean;
  zoomSpeed: number; // 1–5, default 3
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  canvasBackground: "#f0efed",
  aiModel: "claude-sonnet-4-20250514",
  cascadeMode: false,
  autoSave: true,
  zoomSpeed: 3,
};

// Maps zoomSpeed 1–5 to a multiplier for the wheel delta
export const ZOOM_SPEED_MULTIPLIERS: Record<number, number> = {
  1: 0.5,
  2: 1,
  3: 2.5,
  4: 5,
  5: 10,
};

export const AI_MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", desc: "Schnell & günstig" },
  { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet", desc: "Bewährt & zuverlässig" },
  { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", desc: "Ultraschnell" },
];

export const CANVAS_BACKGROUNDS = [
  { id: "#f0efed", label: "Warm Grau" },
  { id: "#e8e8e8", label: "Neutral" },
  { id: "#1a1a1a", label: "Dunkel" },
  { id: "#0d1117", label: "GitHub Dark" },
  { id: "#f5f0eb", label: "Creme" },
  { id: "#eef2f7", label: "Blau-Grau" },
];

const SETTINGS_KEY = "d3studio.settings";

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
