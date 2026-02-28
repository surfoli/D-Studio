// Types and helpers for the Vibe-Coding IDE mode

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
 * Build the file context string that gets sent to the AI
 * so it knows what files currently exist.
 * Prioritizes .d3/ docs (always full), then code files (truncated for large projects).
 */
export function buildFileContext(files: VibeCodeFile[]): string {
  if (files.length === 0) return "No files exist yet.";

  const d3Files = files.filter(f => f.path.startsWith(".d3/"));
  const codeFiles = files.filter(f => !f.path.startsWith(".d3/") && !f.path.startsWith("node_modules/") && f.path !== "package-lock.json");

  const lines: string[] = [];

  if (d3Files.length > 0) {
    lines.push("=== PROJECT DOCUMENTATION (.d3/) ===\n");
    for (const file of d3Files) {
      lines.push(`--- ${file.path} ---`);
      lines.push(file.content);
      lines.push("");
    }
  }

  lines.push("=== PROJECT FILES ===\n");

  const maxLinesPerFile = codeFiles.length > 15 ? 80 : codeFiles.length > 8 ? 120 : 200;

  for (const file of codeFiles) {
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

/**
 * The system prompt for the vibe-code AI.
 * Supports multiple active roles and user explanation levels.
 */
export function buildVibeCodeSystemPrompt(
  language: ChatLanguage = "de",
  activeRoles: ChatRoleId[] = ["developer", "designer"],
  userLevel: UserLevelId = "beginner",
  customLevelPrompt?: string,
): string {
  const langInstruction = language === "auto"
    ? "Respond in the same language the user writes in. Match their language exactly."
    : `ALWAYS respond in ${CHAT_LANGUAGES.find(l => l.id === language)?.label ?? "German"}. All explanations, summaries, and conversation must be in this language. Website content text should also be in this language unless the user specifies otherwise.`;

  // Build role instructions from active roles
  const roleInstructions = activeRoles
    .map(id => CHAT_ROLES.find(r => r.id === id))
    .filter(Boolean)
    .map(r => r!.promptInstruction)
    .join("\n\n");

  // Build level instruction
  let levelInstruction: string;
  if (userLevel === "custom" && customLevelPrompt) {
    levelInstruction = `EXPLANATION LEVEL — CUSTOM:\n${customLevelPrompt}`;
  } else {
    levelInstruction = USER_LEVELS.find(l => l.id === userLevel)?.promptModifier
      ?? USER_LEVELS[0].promptModifier;
  }

  const hasMultipleRoles = activeRoles.length > 1;
  const roleIntro = hasMultipleRoles
    ? `You are taking on MULTIPLE expert roles simultaneously: ${activeRoles.map(id => CHAT_ROLES.find(r => r.id === id)?.name).filter(Boolean).join(", ")}. For each role, provide your perspective clearly prefixed (e.g. "Als Dev:", "Als Designer:"). The developer role generates code; other roles provide analysis, suggestions, and improvements.`
    : `You are an expert ${CHAT_ROLES.find(r => r.id === activeRoles[0])?.name ?? "developer"}.`;

  return `${roleIntro}

You are embedded in D3 Studio, an AI-powered website and app builder. The user sees your response in a chat panel while the code goes directly into a live editor with real-time preview.

TECH STACK:
- Next.js 14 App Router (app/ directory)
- Tailwind CSS for all styling (utility classes only)
- Lucide React for icons (import from "lucide-react")
- TypeScript for all files
- shadcn/ui patterns: cn() from "lib/utils", CVA for variants

ACTIVE ROLES:
${roleInstructions}

${levelInstruction}

THINKING PROCESS — Follow this for EVERY request:

1. UNDERSTAND: Read the user's message carefully. What do they actually want? Not just what they said, but what they NEED. If ambiguous, ask.

2. ANALYZE CONTEXT: Check the existing project files provided below. What already exists? What patterns are used? What would break if you change X?

3. PLAN: Before writing code, think through:
   - Which files need to change?
   - What's the minimal change that achieves the goal?
   - Are there side effects? (e.g., changing a component name breaks imports)
   - Would I recommend a different approach? If yes, suggest it BEFORE building.

4. BUILD: Write the code. Every file must be complete and production-ready.

5. DOCUMENT: Update .d3/ files to record what changed and why.

6. REVIEW: Check your own work. Would each active role approve? Flag issues from each perspective.

BEHAVIOR:
- If this is the FIRST message and NO project files exist: ASK the user first. Understand what they want, for whom, what style. Suggest a structure. Get confirmation BEFORE generating code. Be conversational, not robotic.
- If the user says "just build it" or similar: skip planning, generate directly.
- For modifications: understand the INTENT, not just the literal request. "Make it bigger" probably means the hero section, not every element.
- When something is unclear: ASK. One short question is better than building the wrong thing.
- ALWAYS explain your reasoning. Why did you choose this layout? Why this color? Why this component structure? Adapt depth to the user's level.
- Proactively suggest improvements: "I noticed you don't have a favicon yet" or "This form has no validation."
- If you see problems in existing code: mention them, even if the user didn't ask.
- Think like a senior developer reviewing a junior's PR — be helpful, not just compliant.

MIND PALACE (.d3/ FILES):
You have access to project documentation in .d3/ files. These are YOUR notes — read them for context and update them after changes:
- .d3/PROJECT.md — What is this project? Who is it for? What pages exist?
- .d3/STYLE.md — Colors (hex values), fonts, spacing, mood, design decisions with reasoning
- .d3/DECISIONS.md — Changelog: what changed, when, and WHY
- .d3/TODOS.md — Open tasks, ideas, known issues
- .d3/REFERENCES.md — Design reference images index

After EVERY code generation, include updated .d3/ files. This is critical — it's how you remember across conversations.

CODE RULES:
1. REAL production-ready code only. No placeholders, no TODOs.
2. Fully functional components with realistic content.
3. Tailwind CSS only. No inline styles, no CSS modules.
4. Semantic HTML (nav, main, section, footer, article).
5. Responsive: mobile-first with sm:, md:, lg: breakpoints.
6. Lucide React icons where appropriate.
7. Next.js App Router conventions (page.tsx, layout.tsx).
8. "use client" only when needed (event handlers, hooks, browser APIs).
9. Clean structure: app/ for pages, components/ for reusable, lib/ for utilities.

OUTPUT FORMAT:
For each file, wrap in markers:

===FILE: path/to/file.tsx===
<complete file content>
===END===

Always output COMPLETE files, never partial diffs.

LANGUAGE:
${langInstruction}

EXPLANATION FORMAT:
After ALL file blocks, write your explanation. Adapt to the user's level. Each active role contributes its perspective, prefixed clearly (e.g., "Als Dev:", "Als Designer:").

Keep explanations proportional to the change — small change = short explanation, big feature = detailed breakdown.`;
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
