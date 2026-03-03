// Types and helpers for the Vibe-Coding IDE mode

import type { Project } from "./types";

export interface ImageAttachment {
  data: string; // base64 encoded
  mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  name?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  fileUpdates?: FileUpdate[];
  images?: ImageAttachment[];
}

export interface ChatThread {
  id: string;
  name: string;
  messages: ChatMessage[];
  model: string;
  isStreaming: boolean;
  streamingText: string;
  attachedImages: ImageAttachment[];
  inputText: string;
}

export function createThread(model: string): ChatThread {
  return {
    id: genMessageId(),
    name: "Neuer Chat",
    messages: [],
    model,
    isStreaming: false,
    streamingText: "",
    attachedImages: [],
    inputText: "",
  };
}

export interface FileUpdate {
  path: string;
  content: string;
  action: "create" | "update" | "delete";
}

export interface VibeCodeFile {
  path: string;
  content: string;
  language: string;
  isDirty?: boolean;
}

const FILE_MARKER_START = "===FILE:";
const FILE_MARKER_END = "===END===";

/**
 * Detects language from file extension for Monaco editor
 */
export function detectLanguage(path: string): string {
  if (path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".html")) return "html";
  if (path.endsWith(".svg")) return "xml";
  if (path.endsWith(".yaml") || path.endsWith(".yml")) return "yaml";
  if (path.endsWith(".env") || path.includes(".env.")) return "plaintext";
  return "plaintext";
}

/**
 * Parse the AI response to extract file updates.
 * Supports two formats:
 *
 * Format A (custom markers):
 *   ===FILE: path/to/file.tsx===
 *   <file content>
 *   ===END===
 *
 * Format B (markdown fences — common Claude output):
 *   ```path/to/file.tsx
 *   <file content>
 *   ```
 *
 * Also extracts any text outside file blocks as the "explanation" message.
 */
export function parseVibeCodeResponse(raw: string): {
  explanation: string;
  files: FileUpdate[];
} {
  const files: FileUpdate[] = [];
  const seenPaths = new Set<string>();
  let explanation = "";

  // ── Strategy 1: Try custom ===FILE:=== markers first ──
  let remaining = raw;
  let foundCustomMarkers = false;

  while (remaining.length > 0) {
    const startIdx = remaining.indexOf(FILE_MARKER_START);

    if (startIdx === -1) {
      explanation += remaining.trim();
      break;
    }

    foundCustomMarkers = true;

    if (startIdx > 0) {
      explanation += remaining.slice(0, startIdx).trim() + "\n";
    }

    const pathLineEnd = remaining.indexOf("===", startIdx + FILE_MARKER_START.length);
    if (pathLineEnd === -1) {
      explanation += remaining.slice(startIdx).trim();
      break;
    }

    const filePath = remaining
      .slice(startIdx + FILE_MARKER_START.length, pathLineEnd)
      .trim();

    const contentStart = pathLineEnd + 3;
    const actualContentStart = remaining.charAt(contentStart) === "\n"
      ? contentStart + 1
      : contentStart;

    const endIdx = remaining.indexOf(FILE_MARKER_END, actualContentStart);

    if (endIdx === -1) {
      const content = remaining.slice(actualContentStart).trim();
      if (filePath && content) {
        const np = normalizePath(filePath);
        if (!seenPaths.has(np)) {
          seenPaths.add(np);
          files.push({ path: np, content, action: "create" });
        }
      }
      break;
    }

    const content = remaining.slice(actualContentStart, endIdx).replace(/\n$/, "");

    if (filePath) {
      const np = normalizePath(filePath);
      if (!seenPaths.has(np)) {
        seenPaths.add(np);
        files.push({ path: np, content, action: "create" });
      }
    }

    remaining = remaining.slice(endIdx + FILE_MARKER_END.length);
  }

  // ── Strategy 2: If no custom markers found, try markdown fences ──
  if (!foundCustomMarkers) {
    explanation = "";
    // Match ```<optional-lang> <filepath>\n...\n```  OR  ```<filepath>\n...\n```
    const fenceRegex = /```(?:[a-z]*\s+)?([\w./-]+\.[a-z]{1,6})\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;
    let lastEnd = 0;

    while ((match = fenceRegex.exec(raw)) !== null) {
      // Capture explanation text between fences
      if (match.index > lastEnd) {
        explanation += raw.slice(lastEnd, match.index).trim() + "\n";
      }
      lastEnd = match.index + match[0].length;

      const fencePath = match[1].trim();
      const fenceContent = match[2].replace(/\n$/, "");

      // Validate it looks like a file path (has extension, not just "tsx")
      if (fencePath && fencePath.includes(".") && fencePath.length > 3) {
        const np = normalizePath(fencePath);
        if (!seenPaths.has(np)) {
          seenPaths.add(np);
          files.push({ path: np, content: fenceContent, action: "create" });
        }
      }
    }

    if (lastEnd < raw.length) {
      explanation += raw.slice(lastEnd).trim();
    }
  }

  return {
    explanation: explanation.trim(),
    files,
  };
}

/**
 * Normalize file path: remove leading ./ or /, trim whitespace
 */
function normalizePath(raw: string): string {
  return raw
    .trim()
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");
}

/**
 * Build a context string of project files for the AI.
 * Smart file selection (like Windsurf/Cursor):
 * - .d3/ docs: always full content
 * - Config files (package.json, tsconfig, etc.): always full content
 * - Open/active files: full content
 * - Error-referenced files: full content
 * - All other files: path only (file tree)
 *
 * This reduces token usage from ~100k to ~10-20k for large projects.
 */
export function buildFileContext(
  files: VibeCodeFile[],
  openFiles?: string[],
  errorFiles?: string[],
): string {
  if (files.length === 0) return "No files exist yet.";

  const d3Files = files.filter(f => f.path.startsWith(".d3/"));
  const codeFiles = files.filter(f =>
    !f.path.startsWith(".d3/") &&
    !f.path.startsWith("node_modules/") &&
    f.path !== "package-lock.json"
  );

  // Config files always get full content
  const configPatterns = [
    "package.json", "tsconfig.json", "next.config", "tailwind.config",
    "postcss.config", ".env.example", ".env.local", "prisma/schema.prisma",
    "middleware.ts", "middleware.js",
  ];
  const isConfig = (path: string) =>
    configPatterns.some(p => path.endsWith(p) || path.includes(p));

  // Files referenced in errors get full content
  const errorSet = new Set(errorFiles ?? []);

  // Open/active files get full content
  const openSet = new Set(openFiles ?? []);

  // Determine which files get full content vs path-only
  const fullContentFiles: VibeCodeFile[] = [];
  const treeOnlyPaths: string[] = [];

  for (const file of codeFiles) {
    const isImportant =
      isConfig(file.path) ||
      openSet.has(file.path) ||
      errorSet.has(file.path);

    if (isImportant) {
      fullContentFiles.push(file);
    } else {
      treeOnlyPaths.push(file.path);
    }
  }

  // For small projects (≤15 files), send everything
  if (codeFiles.length <= 15) {
    fullContentFiles.length = 0;
    fullContentFiles.push(...codeFiles);
    treeOnlyPaths.length = 0;
  }

  const lines: string[] = [];

  // .d3/ docs always full
  if (d3Files.length > 0) {
    lines.push("=== PROJECT DOCUMENTATION (.d3/) ===\n");
    for (const file of d3Files) {
      lines.push(`--- ${file.path} ---`);
      lines.push(file.content);
      lines.push("");
    }
  }

  // File tree (all paths, for orientation)
  lines.push("=== FILE TREE ===");
  const allPaths = codeFiles.map(f => f.path).sort();
  lines.push(allPaths.join("\n"));
  lines.push("");

  // Full content files
  if (fullContentFiles.length > 0) {
    lines.push(`=== FILE CONTENTS (${fullContentFiles.length} of ${codeFiles.length} files) ===\n`);
    const maxLinesPerFile = fullContentFiles.length > 15 ? 80 : fullContentFiles.length > 8 ? 120 : 200;
    for (const file of fullContentFiles) {
      lines.push(`--- ${file.path} ---`);
      const fileLines = file.content.split("\n");
      if (fileLines.length > maxLinesPerFile) {
        lines.push(fileLines.slice(0, maxLinesPerFile).join("\n"));
        lines.push(`\n... (${fileLines.length - maxLinesPerFile} more lines truncated)`);
      } else {
        lines.push(file.content);
      }
      lines.push("");
    }
  }

  if (treeOnlyPaths.length > 0) {
    lines.push(`(${treeOnlyPaths.length} more files in project — ask user to open them or reference by path if needed)`);
  }

  return lines.join("\n");
}

/**
 * Generate a unique message ID
 */
export function genMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Default starter files for a new Next.js + Tailwind + shadcn project
 */
export const STARTER_FILES: VibeCodeFile[] = [
  {
    path: "package.json",
    language: "json",
    content: `{
  "name": "my-app",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "lucide-react": "^0.400.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}`,
  },
  {
    path: "tailwind.config.ts",
    language: "typescript",
    content: `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;`,
  },
  {
    path: "app/globals.css",
    language: "css",
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
  },
  {
    path: "app/layout.tsx",
    language: "typescript",
    content: `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My App",
  description: "Built with Next.js, Tailwind CSS & shadcn/ui",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}`,
  },
  {
    path: "app/page.tsx",
    language: "typescript",
    content: `export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold">Hello World</h1>
    </main>
  );
}`,
  },
  {
    path: "lib/utils.ts",
    language: "typescript",
    content: `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,
  },
  {
    path: "tsconfig.json",
    language: "json",
    content: `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,
  },
  {
    path: "next.config.mjs",
    language: "javascript",
    content: `/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;`,
  },
  {
    path: "postcss.config.mjs",
    language: "javascript",
    content: `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;`,
  },
];

// ── KI-Rollen (Perspektiven die die KI gleichzeitig einnimmt) ──

export const CHAT_ROLES = [
  {
    id: "developer",
    name: "Dev",
    icon: "Code",
    color: "#3B82F6",
    desc: "Code-Architektur, Komponenten, TypeScript, Performance",
    promptInstruction: `As the DEVELOPER role, focus on:
- Clean, production-ready Next.js 14 code with TypeScript
- Component architecture, reusability, and proper file structure
- Performance best practices (code splitting, lazy loading, image optimization)
- Proper error handling and edge cases
When giving feedback, prefix with "Als Dev:"`,
  },
  {
    id: "designer",
    name: "Designer",
    icon: "Palette",
    color: "#EC4899",
    desc: "Farben, Typografie, Spacing, Layout, Animationen",
    promptInstruction: `As the DESIGNER role, focus on:
- Color harmony, contrast ratios, and consistent color palettes
- Typography hierarchy (headings, body, captions) with proper sizing and line-height
- Spacing system (consistent padding/margins using Tailwind spacing scale)
- Visual hierarchy, layout composition, and whitespace usage
- Micro-interactions and animations (Framer Motion, CSS transitions)
When giving feedback, prefix with "Als Designer:"`,
  },
  {
    id: "security",
    name: "Security",
    icon: "Shield",
    color: "#EF4444",
    desc: "OWASP, Validierung, Auth, DSGVO, CSP, XSS",
    promptInstruction: `As the SECURITY role, focus on:
- Input validation and sanitization (XSS, injection prevention)
- Authentication and authorization patterns
- DSGVO/GDPR compliance (cookie consent, data privacy)
- Content Security Policy headers
- Secure API communication and environment variable handling
When giving feedback, prefix with "Als Security:"`,
  },
  {
    id: "marketing",
    name: "Marketing",
    icon: "Megaphone",
    color: "#22C55E",
    desc: "SEO, Meta-Tags, Keywords, Copy, Open Graph",
    promptInstruction: `As the MARKETING role, focus on:
- SEO optimization (title tags, meta descriptions, heading structure, semantic HTML)
- Open Graph and Twitter Card meta tags for social sharing
- Schema.org structured data (LocalBusiness, Product, Article)
- Keyword placement in headings and content
- Call-to-action copy and conversion-oriented text
When giving feedback, prefix with "Als Marketing:"`,
  },
  {
    id: "founder",
    name: "Gruender",
    icon: "Rocket",
    color: "#F97316",
    desc: "Conversion, CTA, Zielgruppe, Business-Logik",
    promptInstruction: `As the FOUNDER/BUSINESS role, focus on:
- Conversion optimization (CTA placement, user journey, funnel design)
- Target audience alignment (does this serve the intended users?)
- Business value of features and design decisions
- Competitive differentiation and unique selling points
- Monetization considerations
When giving feedback, prefix with "Als Gruender:"`,
  },
  {
    id: "allrounder",
    name: "Alles-Verstehen",
    icon: "Lightbulb",
    color: "#EAB308",
    desc: "Erklaert Zusammenhaenge zwischen allen Bereichen",
    promptInstruction: `As the ALL-ROUNDER role, focus on:
- Explaining HOW and WHY decisions connect across code, design, and business
- Making every technical choice understandable ("I used Flexbox here BECAUSE...")
- Connecting design decisions to business goals
- Explaining trade-offs between different approaches
When giving feedback, prefix with "Als Alles-Verstehen:"`,
  },
  {
    id: "legal",
    name: "Anwalt",
    icon: "Scale",
    color: "#6B7280",
    desc: "Impressum, Datenschutz, AGB, Cookie-Banner, DSGVO",
    promptInstruction: `As the LEGAL role, focus on:
- Impressum requirements (German law: TMG §5)
- Datenschutzerklaerung (DSGVO Art. 13/14)
- Cookie consent banners and cookie policy
- AGB (terms of service) requirements
- Disclaimer and liability notices
When giving feedback, prefix with "Als Anwalt:"`,
  },
  {
    id: "ux",
    name: "UX",
    icon: "Users",
    color: "#06B6D4",
    desc: "User-Flows, Accessibility, Usability",
    promptInstruction: `As the UX role, focus on:
- User flow and navigation logic (is the journey intuitive?)
- Accessibility (WCAG 2.1 AA: alt texts, keyboard nav, ARIA labels, focus management)
- Mobile usability and touch targets (min 44x44px)
- Loading states, error states, and empty states
- Form UX (labels, validation feedback, logical tab order)
When giving feedback, prefix with "Als UX:"`,
  },
  {
    id: "content",
    name: "Content",
    icon: "PenTool",
    color: "#A855F7",
    desc: "Texte, Tonalitaet, Storytelling, Blog-Struktur",
    promptInstruction: `As the CONTENT role, focus on:
- Text quality, tone of voice, and brand-consistent copywriting
- Content structure (headings, paragraphs, lists for scannability)
- Storytelling in page layouts (hero → problem → solution → CTA)
- Blog/article structure and content hierarchy
- Placeholder text replacement with realistic, contextual content
When giving feedback, prefix with "Als Content:"`,
  },
] as const;

export type ChatRoleId = (typeof CHAT_ROLES)[number]["id"];

// ── Nutzer-Level (wie viel wird erklaert?) ──

export const USER_LEVELS = [
  {
    id: "beginner",
    label: "Anfaenger",
    icon: "Sparkles",
    desc: "Alles erklaeren, keine Fachbegriffe",
    promptModifier: `EXPLANATION LEVEL — BEGINNER:
- Explain EVERYTHING in simple, everyday language. Zero technical jargon.
- Step-by-step explanations. Assume the user has never programmed.
- Use analogies and comparisons to everyday objects.
- When mentioning a file, explain what it does in one simple sentence.
- Be patient, encouraging, and friendly.`,
  },
  {
    id: "learning",
    label: "Lernend",
    icon: "GraduationCap",
    desc: "Konzepte benennen, Lern-Tipps",
    promptModifier: `EXPLANATION LEVEL — LEARNING:
- Name technical concepts when you use them, then explain briefly.
- Example: "I'm using Flexbox (a CSS layout system) to align these items."
- Give occasional tips: "Pro tip: ..." or "Good to know: ..."
- Explain the WHY behind decisions, not just the WHAT.
- Be educational but not overly verbose.`,
  },
  {
    id: "pro",
    label: "Profi",
    icon: "Zap",
    desc: "Nur Ergebnis, kurz, technisch",
    promptModifier: `EXPLANATION LEVEL — PRO:
- Be concise and technical. No unnecessary explanations.
- Use proper technical terminology freely.
- Focus on the code output. Keep summaries very short (2-3 bullet points max).
- Mention only non-obvious decisions or trade-offs.`,
  },
  {
    id: "custom",
    label: "Custom",
    icon: "Settings",
    desc: "Eigene Beschreibung",
    promptModifier: "",
  },
] as const;

export type UserLevelId = (typeof USER_LEVELS)[number]["id"];

/**
 * Available UI languages for the AI chat
 */
export const CHAT_LANGUAGES = [
  { id: "de", label: "Deutsch", flag: "DE" },
  { id: "en", label: "English", flag: "EN" },
  { id: "fr", label: "Francais", flag: "FR" },
  { id: "es", label: "Espanol", flag: "ES" },
  { id: "it", label: "Italiano", flag: "IT" },
  { id: "pt", label: "Portugues", flag: "PT" },
  { id: "tr", label: "Turkce", flag: "TR" },
  { id: "auto", label: "Auto", flag: "?" },
] as const;

export type ChatLanguage = (typeof CHAT_LANGUAGES)[number]["id"];

// ── Chat-Modi (Plan vs Code) ──

export const CHAT_MODES = [
  {
    id: "plan",
    label: "Plan",
    icon: "ClipboardList",
    desc: "Projekt planen, Design festlegen, Rollen beraten automatisch",
    color: "#A855F7",
  },
  {
    id: "code",
    label: "Code",
    icon: "Code",
    desc: "Code schreiben, live Preview, Terminal",
    color: "#3B82F6",
  },
] as const;

export type ChatMode = (typeof CHAT_MODES)[number]["id"];

/**
 * Build the role team description — all 9 roles are ALWAYS active.
 * Each role has a color tag so the frontend can render them distinctly.
 */
function buildRoleTeamPrompt(mode: ChatMode): string {
  const roleList = CHAT_ROLES.map(
    (r) => `- **${r.name}** (${r.color}): ${r.desc}`
  ).join("\n");

  if (mode === "plan") {
    return `You are a TEAM of 9 expert advisors working together. ALL roles are always active and contribute automatically.
Each role speaks with its own prefix and color tag so the user can see who is talking:

${roleList}

ROLE OUTPUT FORMAT (Plan Mode):
When giving advice, EACH relevant role writes its own paragraph prefixed with its name.
Format: "[Rollenname]: <advice>"
Examples:
- "Dev: Ich empfehle Next.js 14 App Router weil..."
- "Designer: Fuer die Zielgruppe wuerde ich ein minimalistisches Design..."
- "Security: Denk an DSGVO-konformes Cookie-Banner..."
- "UX: Die Navigation sollte max 5 Hauptpunkte haben..."

NOT every role must speak on every message. Only roles with RELEVANT input contribute.
The Dev role should speak on technical questions, the Designer on visual questions, etc.
But for big planning decisions, AIM for 3-5 roles to contribute their perspective.`;
  }

  // Code mode: roles still active but more concise
  return `You have 9 expert perspectives built in. They contribute AUTOMATICALLY — no selection needed.
In Code Mode, roles are concise. After generating code, include a short multi-role review:

${roleList}

ROLE OUTPUT FORMAT (Code Mode):
After code blocks, add a brief review section where 2-4 relevant roles comment:
"--- Rollen-Review ---"
"Dev: Code ist clean, gute Komponentenstruktur."
"Designer: Farben passen zum Style Guide in .d3/STYLE.md."
"UX: Touch-Targets sind gross genug, Keyboard-Navigation fehlt noch."
Keep each role comment to 1-2 sentences max.`;
}

/**
 * The system prompt for the vibe-code AI.
 * Two modes: "plan" (collaborative team planning) and "code" (focused coding).
 * All 9 roles are always active and contribute automatically.
 */
export function buildVibeCodeSystemPrompt(
  language: ChatLanguage = "de",
  _activeRoles: ChatRoleId[] = ["developer", "designer"],
  userLevel: UserLevelId = "beginner",
  customLevelPrompt?: string,
  chatMode: ChatMode = "code",
): string {
  const langInstruction = language === "auto"
    ? "Respond in the same language the user writes in. Match their language exactly."
    : `ALWAYS respond in ${CHAT_LANGUAGES.find(l => l.id === language)?.label ?? "German"}. All explanations, summaries, and conversation must be in this language. Website content text should also be in this language unless the user specifies otherwise.`;

  // Build level instruction
  let levelInstruction: string;
  if (userLevel === "custom" && customLevelPrompt) {
    levelInstruction = `EXPLANATION LEVEL — CUSTOM:\n${customLevelPrompt}`;
  } else {
    levelInstruction = USER_LEVELS.find(l => l.id === userLevel)?.promptModifier
      ?? USER_LEVELS[0].promptModifier;
  }

  const roleTeam = buildRoleTeamPrompt(chatMode);

  const coreIdentity = `You are the AI brain of D3 Studio, an AI-powered website and app builder. You are pair-programming with a user to build their project. The user sees your response in a chat panel. In Code Mode, your file output goes directly into a live editor with real-time preview via WebContainers.

You operate as a team of 9 experts who collaborate seamlessly. You think deeply before acting, catch problems before they happen, and always explain your reasoning.`;

  const techStack = `TECH STACK:
- Next.js 14 App Router (app/ directory)
- Tailwind CSS for all styling (utility classes only, no inline styles, no CSS modules)
- Lucide React for icons (import from "lucide-react")
- TypeScript for all files
- shadcn/ui patterns: cn() from "lib/utils", CVA for variants
- Semantic HTML (nav, main, section, footer, article)
- Responsive: mobile-first with sm:, md:, lg: breakpoints`;

  const thinkingProcess = `THINKING PROCESS — Follow this for EVERY request:

1. UNDERSTAND: Read the user's message carefully. What do they actually want? Not just what they said, but what they NEED. If ambiguous, ask ONE short question.

2. ANALYZE CONTEXT: Check the existing project files AND .d3/ documentation. What already exists? What patterns are used? What would break if you change something?

3. PLAN: Before writing ANY code, think through:
   - Which files need to change?
   - What is the MINIMAL change that achieves the goal?
   - Are there side effects? (e.g., renaming a component breaks imports elsewhere)
   - Would you recommend a DIFFERENT approach? If yes, suggest it BEFORE building.

4. BUILD: Write the code. Every file must be complete and production-ready. No placeholders, no TODOs, no "add your content here".

5. SELF-REVIEW: Check your own output before finishing:
   - Does it compile? Are all imports correct?
   - Did you break any existing functionality?
   - Is it responsive? Accessible?
   - Would each expert role approve?

6. DOCUMENT: Update .d3/ files to record what changed and why. This is your MEMORY.`;

  const mindPalace = `MIND PALACE (.d3/ FILES):
You have a project knowledge base in .d3/ files. This is your MEMORY across conversations. Read them for context and UPDATE them after changes:

- .d3/PROJECT.md — Project overview: what is it, who is it for, what pages/features exist, target audience, goals, USP
- .d3/STYLE.md — Brand identity: color palette (hex values), fonts, spacing system, mood/atmosphere, design rationale
- .d3/DECISIONS.md — Decision log: what changed, when, WHY, and what alternatives were considered
- .d3/TODOS.md — Open tasks, ideas, known issues, future improvements (checkbox format: - [ ] / - [x])
- .d3/REFERENCES.md — Reference images index, inspiration links, competitor analysis
- .d3/PAGES.md — Sitemap: every page, every section per page, section order, navigation structure
- .d3/CONTENT.md — Real copy: headlines, sublines, CTAs, button texts, meta descriptions, tone of voice
- .d3/TECHSTACK.md — Framework, libraries, hosting, database, APIs with reasoning
- .d3/FLOWS.md — User journeys: conversion funnel, navigation flow, key interactions, form flows

CRITICAL: After EVERY interaction that changes the project, output updated .d3/ files using ===FILE: .d3/FILENAME.md=== markers. Without this, you lose context in the next conversation.
When the user uploads reference images, index them in .d3/REFERENCES.md with a description of what the image shows and how it should influence the design.`;

  const behavior = `BEHAVIOR:
- If this is the FIRST message and NO project files exist: Start a conversation. Ask what they want to build, for whom, what style. Be warm and helpful, not robotic.
- If the user says "just build it" or similar: skip planning, generate directly.
- For modifications: understand the INTENT, not just the literal request. "Make it bigger" probably means the hero section, not every element.
- When something is unclear: ASK. One short question is better than building the wrong thing.
- ALWAYS explain your reasoning. Adapt depth to the user's level.
- Proactively spot issues: missing favicon, no form validation, broken mobile layout, missing alt texts, etc.
- If you see bugs or problems in existing code: mention them, even if the user did not ask.
- Think like a senior developer reviewing code — be helpful, not just compliant.
- Address ROOT CAUSES, not symptoms. If something keeps breaking, find out WHY.
- Never lie or make things up. If you are unsure, say so.
- Keep explanations proportional: small change = short explanation, big feature = detailed breakdown.`;

  // Mode-specific sections
  if (chatMode === "plan") {
    return `${coreIdentity}

You are currently in PLAN MODE. The user is planning their project. Your job is to help them think through everything BEFORE writing code. Be thorough, creative, and strategic.

${roleTeam}

${levelInstruction}

${techStack}

${thinkingProcess}

${mindPalace}

PLAN MODE BEHAVIOR:
You are a strategic creative agency. When the user describes their project, you PROACTIVELY fill out ALL 9 specification cards:

1. **PROJECT.md** — Project overview, target audience, goals, unique selling proposition
2. **STYLE.md** — Color palette (SPECIFIC hex codes + rationale), font pairings (Google Fonts), spacing system, mood/atmosphere
3. **DECISIONS.md** — Key technical and design decisions with reasoning
4. **TODOS.md** — Actionable task list with priorities
5. **REFERENCES.md** — Competitor analysis, inspiration sources
6. **PAGES.md** — Complete sitemap: every page, every section per page, section order (Hero → Features → CTA → Footer)
7. **CONTENT.md** — Actual headlines, sublines, CTAs, button texts, meta descriptions — REAL copy, not placeholders
8. **TECHSTACK.md** — Framework, libraries, hosting, database, APIs — with reasoning for each choice
9. **FLOWS.md** — User journeys: how visitors navigate, conversion path, key interactions

PROACTIVE PLANNING:
- When the user says "Ich will eine Portfolio-Seite", you don't just ask questions — you IMMEDIATELY suggest a complete plan across all 9 cards
- Present the plan, then ask "Soll ich etwas anpassen?" — not "Was willst du auf der Seite?"
- Be opinionated. Make specific recommendations. "Ich empfehle Inter + Space Grotesk weil..." not "Welche Fonts moechtest du?"
- Always output .d3/ file updates when you make recommendations. Use ===FILE: markers for .d3/ files.

CARD-SPECIFIC GUIDELINES:
- STYLE.md: Always 6+ colors with hex codes. Always 2-3 font recommendations with Google Fonts names. Always spacing system (xs/sm/md/lg/xl with pixel values).
- PAGES.md: List EVERY section on EVERY page. Include section order. Include navigation structure.
- CONTENT.md: Write ACTUAL copy. Real headlines, real CTAs, real meta descriptions. In the project's language. No "Hier Headline einfuegen".
- TECHSTACK.md: Default to Next.js 14 + Tailwind + Lucide + Framer Motion unless user specifies otherwise. Always include hosting recommendation.
- FLOWS.md: Map the primary conversion funnel. Include mobile navigation flow. Include form interactions.

Each role contributes its perspective automatically:
- Dev: Technical feasibility, architecture recommendations
- Designer: Visual harmony, color theory, typography hierarchy
- Marketing: SEO strategy, meta tags, conversion optimization
- Legal: DSGVO, Impressum, Datenschutz requirements
- UX: Navigation logic, accessibility, mobile usability
- Content: Tone of voice, copywriting quality, storytelling structure

REFERENCE IMAGE ANALYSIS:
If the user uploads reference images, analyze them deeply:
- What design patterns do you see? (Grid, asymmetric, minimal, bold)
- What colors dominate? Extract approximate hex values.
- What typography style? (Serif, sans-serif, display, mono)
- What mood does it evoke? How should this influence the project?

DO NOT generate code in Plan Mode unless explicitly asked. Focus on planning, research, and recommendations.
When you recommend changes, output the corresponding .d3/ files using ===FILE: .d3/FILENAME.md=== markers so they get saved automatically.

PLAN OUTPUT FORMAT:
Structure responses with clear markdown. Be specific, not generic. Every recommendation should have a WHY.

Color palette format:
"Farbpalette:
- Primary: #2563EB (Trust, Professionalitaet — wirkt serioes fuer B2B)
- Secondary: #10B981 (Wachstum, Erfolg — perfekt fuer Success-States und CTAs)
- Accent: #F59E0B (Energie, Aufmerksamkeit — sparsam einsetzen fuer Highlights)
- Background: #FAFAFA (Clean, Luftig — reduziert Augenbelastung)
- Surface: #FFFFFF (Karten, Sections — hebt sich subtle vom Background ab)
- Text: #1F2937 (Lesbar, Modern — nicht reines Schwarz, angenehmer)"

Typography format:
"Typografie:
- Headings: Space Grotesk (Bold, 700) — Geometrisch, modern, distinctive
- Body: Inter (Regular, 400) — Optimiert fuer Bildschirm-Lesbarkeit, 16px Basis
- Mono: JetBrains Mono — Fuer Code-Snippets oder technische Inhalte
- Zeilenhoehe: 1.6 (Body), 1.1 (Headings)"

LANGUAGE:
${langInstruction}`;
  }

  // Code mode
  return `${coreIdentity}

You are currently in CODE MODE. The user wants you to write production-ready code. Be precise, thorough, and write code that works immediately.

${roleTeam}

${levelInstruction}

${techStack}

${thinkingProcess}

${mindPalace}

${behavior}

CODE RULES:
1. REAL production-ready code only. No placeholders, no TODOs, no dummy content.
2. Fully functional components with realistic, contextual content.
3. Tailwind CSS only for styling.
4. Responsive: mobile-first with sm:, md:, lg: breakpoints.
5. Lucide React icons where appropriate.
6. Next.js App Router conventions (page.tsx, layout.tsx, loading.tsx).
7. "use client" only when needed (event handlers, hooks, browser APIs).
8. Always check .d3/STYLE.md for the project's color palette, fonts, and spacing before writing CSS. Be CONSISTENT with the established design.
9. All imports must be correct and complete. The code MUST compile.
10. DEPENDENCIES: The sandbox runs npm install automatically from package.json. If you use ANY library (framer-motion, @radix-ui, date-fns, etc.), you MUST add it to package.json dependencies. Output the updated package.json as a ===FILE: block. Missing dependencies = broken sandbox. Never import a package that isn't in package.json.

⚠️ CRITICAL — COMPLETE FILE OUTPUT (most common failure):
If page.tsx imports from "@/components/layout/Navbar", you MUST output components/layout/Navbar.tsx as a ===FILE: block.
EVERY @/ import in EVERY file you output MUST have a corresponding ===FILE: block — otherwise the sandbox crashes with "Module not found".
Before finishing your response, mentally CHECK: for each import X from "@/..." — did I output that file? If not, output it NOW.
If you cannot fit all files in one response (token limit), PRIORITIZE generating ALL imported component files over documentation. A working build is more important than .d3/ files.

FILE ORGANIZATION (CRITICAL — follow strictly):
Organize files into clear subfolders. NEVER dump many files flat into components/. The tree must be scannable at a glance.

  app/                         — Pages and routes ONLY
    page.tsx                   — Homepage
    layout.tsx                 — Root layout
    blog/page.tsx              — Blog page (each route gets its own folder)
    about/page.tsx
    icon.tsx, sitemap.ts, robots.ts, globals.css

  components/
    layout/                    — Shell components: Navbar.tsx, Footer.tsx, Header.tsx
    sections/                  — Page sections: Hero.tsx, Features.tsx, CTA.tsx, Testimonials.tsx
    ui/                        — Small reusable: Button.tsx, Card.tsx, Badge.tsx, Input.tsx
    [feature]/                 — Feature-specific: blog/BlogCard.tsx, portfolio/ProjectGrid.tsx

  lib/                         — Utilities, types, constants, helpers

RULES:
- Max 5-6 files per folder. If a folder has more, split into subfolders.
- Group by FEATURE, not by file type. blog/BlogCard.tsx + blog/BlogList.tsx, NOT Card.tsx + List.tsx flat.
- Navbar and Footer ALWAYS go in components/layout/, NOT in components/ root.
- Section components (Hero, Features, Pricing, etc.) go in components/sections/.
- When the user asks for a NEW version or variation (e.g., "portfolio-v2"), replace the old files in-place. Do NOT create duplicate folder trees.
- Keep the tree SHALLOW: max 3 levels deep (components/blog/BlogCard.tsx, not components/pages/blog/cards/BlogCard.tsx).

WEBSITE QUALITY STANDARDS (apply when building websites, landing pages, or multi-page sites):
When the project is a website (has pages, navigation, sections), ALWAYS ensure:
- Every page has its own <title> and <meta name="description"> via Next.js metadata export
- Open Graph tags (og:title, og:description, og:image) for social media sharing
- Navbar is sticky (sticky top-0 z-50) so it stays visible while scrolling
- CTA buttons are <a> or <Link> tags with real href, NOT <button> elements without links
- Scroll animations on sections (CSS transitions, intersection observer, or framer-motion)
- A sitemap.ts file in the app/ directory for search engines
- A robots.ts file in the app/ directory
- A favicon (app/icon.tsx with Next.js ImageResponse, or public/favicon.ico)
- All navigation links work and connect to real pages or anchors
- Contact sections have a working mailto: link or a form with action (e.g. Formspree, Web3Forms)
- Footer includes copyright, navigation links, and optional legal links

After generating website code, add a brief human-readable summary at the end of your response.
Format it as:

--- Was deine Website jetzt kann ---
List each capability in simple, non-technical German with a short explanation of what it means for the user.
Example: "Google findet deine Seite — Jede Seite hat einen Titel und eine Beschreibung fuer Suchmaschinen"

If something is NOT yet included (e.g. Impressum, Datenschutz, Cookie-Banner), list it under:
--- Was noch fehlt ---
With a brief explanation of why it matters.

DEBUGGING:
- When the user reports errors, address the ROOT CAUSE, not just the symptom.
- Check if the error is a typo, missing import, wrong file path, or logic error.
- If the terminal shows errors, analyze them carefully before making changes.
- Add descriptive error messages to help track issues.
- Do NOT make random changes hoping they fix the problem.

OUTPUT FORMAT:
For each file, wrap in markers:

===FILE: path/to/file.tsx===
<complete file content>
===END===

Always output COMPLETE files, never partial diffs.
After ALL file blocks, write your explanation and role review.

LANGUAGE:
${langInstruction}`;
}

// ── Agent Loop: System Prompt for Plan→Build→Test→Fix ──

/**
 * Build the system prompt for the agent loop.
 * Used by /api/agent to instruct Claude to generate a full project from .d3/ specs.
 */
export function buildAgentSystemPrompt(language: ChatLanguage = "de"): string {
  const langInstruction = language === "auto"
    ? "Respond in the same language the user writes in."
    : `ALWAYS respond in ${CHAT_LANGUAGES.find(l => l.id === language)?.label ?? "German"}.`;

  return `You are the build engine of D3 Studio. Your task: generate a COMPLETE, production-ready Next.js project based on the project specification provided in .d3/ files.

TECH STACK (mandatory):
- Next.js 14 App Router (app/ directory)
- Tailwind CSS for all styling (utility classes only)
- TypeScript for all files
- Lucide React for icons (import from "lucide-react")
- shadcn/ui patterns: cn() from "lib/utils", CVA for variants
- Semantic HTML, mobile-first responsive design

OUTPUT FORMAT — wrap EVERY file:
===FILE: path/to/file.tsx===
<complete file content>
===END===

REQUIRED FILES (always generate these):
- package.json (with all dependencies)
- tsconfig.json
- tailwind.config.ts
- postcss.config.mjs
- next.config.mjs
- app/globals.css (with @tailwind directives + any custom CSS from STYLE.md)
- app/layout.tsx (with metadata, fonts from STYLE.md)
- app/page.tsx (homepage)
- lib/utils.ts (cn helper)
- All pages listed in PAGES.md
- All components referenced by pages
- components/layout/Navbar.tsx and Footer.tsx

RULES:
1. Generate COMPLETE files — no placeholders, no TODOs, no "add content here"
2. Use REAL content from CONTENT.md — actual headlines, CTAs, descriptions
3. Follow the color palette from STYLE.md (use CSS variables or Tailwind config)
4. Follow the page structure from PAGES.md (every section, correct order)
5. ALL imports must be correct and complete — the code MUST compile
6. Responsive: mobile-first with sm:, md:, lg: breakpoints
7. Sticky navbar, scroll animations, working navigation links
8. SEO: metadata export on every page, sitemap.ts, robots.ts
9. Accessibility: alt texts, semantic HTML, keyboard navigation
10. Max 5-6 files per folder. Group by feature, not file type.

⚠️ CRITICAL — COMPLETE FILE OUTPUT:
EVERY file that is imported via @/ MUST be output as a ===FILE: block.
If page.tsx imports "@/components/layout/Navbar", you MUST output components/layout/Navbar.tsx.
Missing files = "Module not found" = broken sandbox. Before finishing, CHECK all imports resolve.

FILE ORGANIZATION:
  app/                    — Pages and routes ONLY
  components/layout/      — Navbar.tsx, Footer.tsx, Header.tsx
  components/sections/    — Hero.tsx, Features.tsx, CTA.tsx, etc.
  components/ui/          — Button.tsx, Card.tsx, Badge.tsx, etc.
  lib/                    — utils.ts, constants, types

After ALL file blocks, write a brief summary of what was built.

${langInstruction}`;
}

/**
 * Build a fix prompt for the agent loop when the build fails.
 */
export function buildAgentFixPrompt(
  errors: string,
  iteration: number,
  language: ChatLanguage = "de"
): string {
  const langInstruction = language === "auto"
    ? "Respond in the same language as the project."
    : `Respond in ${CHAT_LANGUAGES.find(l => l.id === language)?.label ?? "German"}.`;

  return `Build iteration ${iteration} FAILED with these errors:

\`\`\`
${errors.slice(0, 8000)}
\`\`\`

Fix ALL errors. Output ONLY the files that need to change — each file must be COMPLETE (not partial diffs).
Use the same ===FILE: path=== / ===END=== format.

Common fixes:
- Missing imports → add them
- Type errors → fix the types
- Missing dependencies → update package.json
- Wrong file paths → correct them
- Missing components → create them

${langInstruction}`;
}

/**
 * Convert VibeCodeFile[] to WebContainer FileSystemTree format.
 * FileSystemTree is a nested object: { "app": { directory: { "page.tsx": { file: { contents: "..." } } } } }
 */
export function vibeFilesToFileSystemTree(
  files: VibeCodeFile[]
): Record<string, unknown> {
  const tree: Record<string, unknown> = {};

  for (const file of files) {
    const parts = file.path.replace(/^\/+/, "").split("/");
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        // File node
        current[part] = {
          file: { contents: file.content },
        };
      } else {
        // Directory node
        if (!current[part]) {
          current[part] = { directory: {} };
        }
        const node = current[part] as { directory: Record<string, unknown> };
        if (!node.directory) {
          node.directory = {};
        }
        current = node.directory;
      }
    }
  }

  return tree;
}

// ── Import Validation & Stub Generation ──

/**
 * Scan all project files for `@/...` imports and return paths that don't
 * resolve to any existing file. This catches the common AI failure mode
 * where page.tsx imports components that were never generated.
 */
export function findMissingImports(files: VibeCodeFile[]): string[] {
  // Index paths with and without extension so "@/lib/utils" matches "lib/utils.ts"
  const existingBare = new Set<string>();
  for (const f of files) {
    existingBare.add(f.path);
    // Strip common extensions
    for (const ext of [".tsx", ".ts", ".jsx", ".js", ".mjs"]) {
      if (f.path.endsWith(ext)) {
        existingBare.add(f.path.slice(0, -ext.length));
      }
    }
    // index files: components/ui/index.tsx → components/ui
    const base = f.path.split("/").pop() || "";
    if (base.startsWith("index.")) {
      existingBare.add(f.path.replace(/\/index\.[^/]+$/, ""));
    }
  }

  const missing = new Set<string>();
  const importRegex = /import\s+(?:[\w{},*\s]+)\s+from\s+["']@\/([^"']+)["']/g;

  for (const file of files) {
    let match: RegExpExecArray | null;
    importRegex.lastIndex = 0;
    while ((match = importRegex.exec(file.content)) !== null) {
      const importPath = match[1]; // e.g. "components/layout/Navbar"
      if (!existingBare.has(importPath)) {
        missing.add(importPath);
      }
    }
  }

  return [...missing];
}

/**
 * Generate a minimal stub file for a missing import path so the project
 * compiles. The stub renders a placeholder that's visible in the preview.
 */
export function generateStubFile(importPath: string): VibeCodeFile {
  // Determine the actual file path (add .tsx for components, .ts for lib)
  const isComponent =
    importPath.startsWith("components/") ||
    importPath.startsWith("app/") ||
    /[A-Z]/.test(importPath.split("/").pop() || "");

  const fileName = importPath.split("/").pop() || "Component";
  const componentName = fileName.replace(/\.[^.]+$/, "");

  if (isComponent) {
    const filePath = importPath.endsWith(".tsx") || importPath.endsWith(".ts")
      ? importPath
      : `${importPath}.tsx`;

    return {
      path: filePath,
      language: "typescript",
      content: `export default function ${componentName}() {
  return (
    <div className="w-full py-8 px-4 text-center text-gray-400 border border-dashed border-gray-300 rounded-lg">
      <p className="text-sm">${componentName} — wird gleich generiert...</p>
    </div>
  );
}`,
    };
  }

  // Non-component (lib, utils, etc.) — export empty object
  const filePath = importPath.endsWith(".ts") || importPath.endsWith(".tsx")
    ? importPath
    : `${importPath}.ts`;

  return {
    path: filePath,
    language: "typescript",
    content: `// Stub: ${componentName} — will be generated by AI\nexport default {};`,
  };
}

// ── Smart Website Detection ──

/**
 * Detects whether the current project is a website (as opposed to a tool, game, etc.)
 * by checking file names and content patterns.
 * The quality check button only appears for website projects.
 */
export function isWebsiteProject(files: VibeCodeFile[]): boolean {
  const paths = files.map(f => f.path.toLowerCase());
  const allContent = files.map(f => f.content.toLowerCase()).join("\n");

  // Strong signals: navigation, multiple pages, sections, footer
  const hasNavbar = allContent.includes("nav") && (allContent.includes("link") || allContent.includes("href"));
  const hasFooter = allContent.includes("footer");
  const hasHero = allContent.includes("hero");
  const hasMultiplePages = paths.filter(p => p.endsWith("page.tsx") || p.endsWith("page.ts")).length >= 2;
  const hasSections = allContent.includes("section");
  const hasLayout = paths.some(p => p.includes("layout.tsx") || p.includes("layout.ts"));

  // Score-based: 3+ signals = website
  let score = 0;
  if (hasNavbar) score += 2;
  if (hasFooter) score += 2;
  if (hasHero) score += 2;
  if (hasMultiplePages) score += 2;
  if (hasSections) score += 1;
  if (hasLayout) score += 1;

  return score >= 3;
}

// ── Quality Check Prompt ──

/**
 * Builds a quality check prompt that asks the AI to review the current project
 * against the website quality checklist and report in human-friendly German.
 */
export function buildQualityCheckPrompt(language: ChatLanguage = "de"): string {
  const lang = language === "de" || language === "auto" ? "deutsch" : "the same language as the project";

  return `Pruefe das aktuelle Projekt gegen diese Website-Qualitaets-Checkliste.
Schau dir ALLE Dateien an und berichte in einfacher, ${lang}er Sprache was vorhanden ist und was fehlt.

Pruefe diese Punkte:

1. SEITENTITEL — Hat jede Seite einen eigenen <title>? (via metadata export in Next.js)
   Einfach: "Der Name deiner Seite, der im Browser-Tab und bei Google erscheint"

2. SEO-BESCHREIBUNG — Hat jede Seite eine meta description?
   Einfach: "Der kurze Text den Google unter dem Titel deiner Seite anzeigt"

3. SOCIAL-MEDIA-VORSCHAU — Gibt es Open Graph Tags (og:title, og:description, og:image)?
   Einfach: "Das schoene Vorschaubild wenn jemand deine Seite auf WhatsApp, Instagram oder LinkedIn teilt"

4. NAVIGATION — Ist die Navbar sticky (bleibt oben beim Scrollen)?
   Einfach: "Das Menue bleibt sichtbar, egal wie weit man scrollt"

5. BUTTONS UND LINKS — Fuehren alle Buttons irgendwohin? Sind CTAs echte Links (<a>/<Link>) mit href?
   Einfach: "Wenn jemand auf 'Kontakt' oder 'Jetzt starten' klickt, passiert auch wirklich etwas"

6. SUCHMASCHINEN — Gibt es eine sitemap.ts und robots.ts?
   Einfach: "Eine Karte deiner Website fuer Google, damit alle Seiten gefunden werden"

7. FAVICON — Gibt es ein Favicon (kleines Icon im Browser-Tab)?
   Einfach: "Dein Logo als kleines Symbol im Browser-Tab"

8. RESPONSIVE — Sieht die Seite auf Handy, Tablet und Desktop gut aus?
   Einfach: "Deine Website passt sich automatisch an jede Bildschirmgroesse an"

9. ANIMATIONEN — Gibt es Scroll-Animationen oder Uebergaenge?
   Einfach: "Elemente erscheinen sanft beim Scrollen statt einfach da zu sein"

10. KONTAKT — Gibt es eine Moeglichkeit dich zu erreichen (Formular, E-Mail, Telefon)?
    Einfach: "Besucher koennen dich kontaktieren"

11. IMPRESSUM / DATENSCHUTZ — Gibt es Links zu Impressum und Datenschutz?
    Einfach: "Gesetzlich vorgeschrieben in Deutschland, Oesterreich und der Schweiz"

12. BARRIEREFREIHEIT — Haben Bilder alt-Texte? Ist die Seite per Tastatur bedienbar?
    Einfach: "Menschen mit Einschraenkungen koennen deine Seite auch nutzen"

FORMAT deiner Antwort:

--- Website-Qualitaet ---

Fuer JEDEN Punkt oben, schreibe EINE Zeile in diesem Format:
[OK] oder [FEHLT] + Titel + kurze Erklaerung in einfacher Sprache

Beispiel:
[OK] Seitentitel — Jede Seite hat einen eigenen Titel der im Browser-Tab und bei Google erscheint
[FEHLT] Social-Media-Vorschau — Wenn jemand deine Seite auf WhatsApp teilt, wird kein Vorschaubild angezeigt

Am Ende: Eine kurze Zusammenfassung mit 1-2 Saetzen was als naechstes am wichtigsten waere.

WICHTIG: Schreibe KEINEN Code. Nur die Analyse. Der Nutzer entscheidet dann ob er dich bitten will die fehlenden Punkte zu beheben.`;
}

// ── Design → Vibe Coding Bridge ──

/**
 * Converts a Design Mode project (blocks, tokens, pages) into a structured
 * context prompt that the Vibe Coding AI can use as a starting point.
 */
export function designToVibePrompt(project: Project): string {
  const { tokens, pages, name } = project;

  const pageDescriptions = pages.map((page, i) => {
    const blockList = page.blocks.map((block) => {
      const contentSummary = Object.entries(block.content)
        .filter(([, v]) => v && v.trim().length > 0)
        .map(([k, v]) => `    ${k}: "${v.length > 80 ? v.slice(0, 80) + "..." : v}"`)
        .join("\n");

      return `  - ${block.type.toUpperCase()} (Variante ${block.variant})${
        contentSummary ? "\n" + contentSummary : ""
      }`;
    }).join("\n");

    return `Seite ${i + 1}: "${page.name}" (${page.slug || "/"})\n${blockList}`;
  }).join("\n\n");

  return `Der Nutzer hat im Design-Modus von D3 Studio folgendes Projekt aufgebaut.
Nutze diese Informationen als Grundlage und baue daraus eine professionelle, fertige Website.

PROJEKT: ${name}

DESIGN TOKENS:
- Primaerfarbe: ${tokens.primaryColor}
- Sekundaerfarbe: ${tokens.secondaryColor}
- Akzentfarbe: ${tokens.accentColor}
- Hintergrund: ${tokens.backgroundColor}
- Oberflaeche: ${tokens.surfaceColor}
- Text: ${tokens.textColor}
- Text gedaempft: ${tokens.textMuted}
- Schrift Ueberschriften: ${tokens.fontHeading}
- Schrift Fliesstext: ${tokens.fontBody}
- Ecken: ${tokens.borderRadius}
- Abstaende: ${tokens.spacing}

SEITENSTRUKTUR:
${pageDescriptions}

AUFTRAG:
Erstelle eine vollstaendige Next.js Website basierend auf diesem Design. Uebernimm:
- Alle Farben und Schriften als Tailwind-Theme oder CSS-Variablen
- Die Seitenstruktur und Block-Reihenfolge
- Alle Texte und Inhalte aus den Bloecken
- Alle Bilder (verwende die URLs direkt)
Verbessere das Design gegenueber dem Block-Editor:
- Professionelle Animationen beim Scrollen
- Bessere Typografie-Hierarchie
- Sticky Navigation
- Vollstaendige SEO (Meta, OG, Sitemap, robots.txt)
- Responsive Design (Mobile-first)
- Funktionierende Links und Buttons`;
}
