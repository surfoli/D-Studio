// Types and helpers for the Vibe-Coding IDE mode

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  fileUpdates?: FileUpdate[];
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
 */
export function buildFileContext(files: VibeCodeFile[]): string {
  if (files.length === 0) return "No files exist yet.";

  const lines = ["Current project files:\n"];

  for (const file of files) {
    lines.push(`--- ${file.path} ---`);
    // Truncate very large files to save tokens
    const maxLines = 150;
    const fileLines = file.content.split("\n");
    if (fileLines.length > maxLines) {
      lines.push(fileLines.slice(0, maxLines).join("\n"));
      lines.push(`\n... (${fileLines.length - maxLines} more lines truncated)`);
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
    <html lang="en">
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
];

/**
 * The system prompt for the vibe-code AI
 */
export function buildVibeCodeSystemPrompt(): string {
  return `You are an expert Next.js developer and UI designer. You write production-ready code using:

- **Next.js 14** App Router (app/ directory)
- **Tailwind CSS** for all styling (utility classes, no custom CSS unless absolutely needed)
- **Lucide React** for icons (import from "lucide-react")
- **TypeScript** for all files
- **shadcn/ui patterns**: use utility functions like \`cn()\` from "lib/utils", CVA for variants

RULES:
1. Write REAL, production-ready code. No placeholders, no TODOs, no "add your code here".
2. Every component must be fully functional with real content.
3. Use Tailwind CSS classes for ALL styling. No inline styles, no CSS modules.
4. Use semantic HTML elements (nav, main, section, footer, article).
5. Make all pages responsive (mobile-first with sm:, md:, lg: breakpoints).
6. Use Lucide React icons where appropriate (import { Icon } from "lucide-react").
7. Follow Next.js App Router conventions (page.tsx, layout.tsx, loading.tsx).
8. Export components as default exports.
9. Use "use client" directive only when needed (event handlers, hooks, browser APIs).

OUTPUT FORMAT:
For each file you create or modify, wrap it in markers:

===FILE: path/to/file.tsx===
<complete file content>
===END===

You can output multiple files. Always include the complete file content, never partial updates.
Before and after file blocks, you may include brief explanations.

IMPORTANT:
- When the user asks to modify existing code, output the COMPLETE updated file (not just the diff).
- Keep the project structure clean: app/ for pages, components/ for reusable components, lib/ for utilities.
- Use German text for content if the user writes in German.`;
}
