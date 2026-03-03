// ── Sync Brief → Sandbox Code ──
// When the DesignBrief changes, this updates CSS variables and Tailwind config
// in the running E2B sandbox for instant hot-reload.

import type { DesignBrief } from "./design-brief";

// ── Generate only the CSS variables portion (for live patching) ──

export function briefToCSS(brief: DesignBrief): string {
  const c = brief.colors;
  const br = borderRadiusValue(brief.style.borderRadius);

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: ${c.primary};
  --color-secondary: ${c.secondary};
  --color-accent: ${c.accent};
  --color-background: ${c.background};
  --color-surface: ${c.surface};
  --color-text: ${c.text};
  --color-text-muted: ${c.textMuted};
  --radius: ${br};
}

body {
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-body), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::selection {
  background: ${c.primary}33;
  color: ${c.text};
}

html {
  scroll-behavior: smooth;
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${c.textMuted}33; border-radius: 3px; }

@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.animate-marquee {
  animation: marquee 30s linear infinite;
}
`;
}

// ── Generate Tailwind config with brief colors ──

export function briefToTailwindConfig(brief: DesignBrief): string {
  const c = brief.colors;
  return `import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "${c.primary}",
        secondary: "${c.secondary}",
        accent: "${c.accent}",
        background: "${c.background}",
        surface: "${c.surface}",
        foreground: "${c.text}",
        muted: "${c.textMuted}",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        brand: "${borderRadiusValue(brief.style.borderRadius)}",
      },
    },
  },
  plugins: [],
};
export default config;
`;
}

// ── Sync function — writes updated files to sandbox ──

export interface SyncOptions {
  writeFile: (path: string, content: string) => Promise<void>;
}

export async function syncBriefToCode(
  brief: DesignBrief,
  opts: SyncOptions
): Promise<void> {
  // Write updated CSS variables (triggers hot reload)
  await opts.writeFile("app/globals.css", briefToCSS(brief));

  // Write updated Tailwind config (triggers recompile)
  await opts.writeFile("tailwind.config.ts", briefToTailwindConfig(brief));
}

// ── Helper ──

function borderRadiusValue(br: string): string {
  switch (br) {
    case "sharp": return "0px";
    case "soft": return "0.5rem";
    case "rounded": return "1rem";
    case "pill": return "9999px";
    default: return "0.5rem";
  }
}
