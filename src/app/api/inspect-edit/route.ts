import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

interface InspectEditRequest {
  files: { path: string; content: string }[];
  element: {
    tagName: string;
    id: string | null;
    classes: string;
    directText: string | null;
    selectorPath: string;
    styles: Record<string, string>;
  };
  changes?: {
    property: string;
    value: string;
    previousValue: string;
  }[];
  textChange?: string;
  aiInstruction?: string;
  model?: string;
  language?: string;
}

function buildInspectEditPrompt(req: InspectEditRequest): string {
  const { element, changes, textChange, aiInstruction } = req;

  let task = "";

  if (changes && changes.length > 0) {
    task += "The user selected an element in the live preview and changed the following CSS properties using visual controls:\n\n";
    for (const c of changes) {
      task += `- ${c.property}: "${c.previousValue}" → "${c.value}"\n`;
    }
    task += "\n";
  }

  if (textChange !== undefined) {
    task += `The user changed the text content of the element from "${element.directText}" to "${textChange}".\n\n`;
  }

  if (aiInstruction) {
    task += `The user also gave this instruction: "${aiInstruction}"\n\n`;
  }

  task += `Find the exact file and location in the codebase where this element is defined, and make the requested changes.\n`;
  task += `For CSS/style changes, prefer modifying Tailwind classes if the project uses Tailwind. Otherwise modify inline styles or CSS files.\n`;
  task += `For text changes, find the exact string in the source and replace it.\n`;

  return task;
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.MODERATE);
  if (limited) return limited;

  try {
    const body = (await req.json()) as InspectEditRequest;
    const { files, element, model = "claude-sonnet-4-6", language = "de" } = body;

    if (!files || !element) {
      return NextResponse.json({ error: "Missing files or element" }, { status: 400 });
    }

    // Build file context — only include relevant files (not node_modules, not images)
    const relevantFiles = files.filter(
      (f) =>
        !f.path.includes("node_modules") &&
        !f.path.endsWith(".png") &&
        !f.path.endsWith(".jpg") &&
        !f.path.endsWith(".svg") &&
        !f.path.endsWith(".ico") &&
        !f.path.startsWith(".d3/") &&
        f.content.length < 50000
    );

    const fileContext = relevantFiles
      .map((f) => `===FILE: ${f.path}===\n${f.content}\n===END===`)
      .join("\n\n");

    const task = buildInspectEditPrompt(body);

    const langHint = language === "de"
      ? "Antworte auf Deutsch."
      : language === "en"
        ? "Respond in English."
        : language === "fr"
          ? "Réponds en français."
          : "Antworte auf Deutsch.";

    const systemPrompt = `You are D3 Studio's Inspect & Edit engine. The user is visually editing a live preview of their web application. They clicked on an element and made changes using visual controls (color pickers, sliders, text fields).

Your job: Find the EXACT file and code location where this element is defined, and apply the requested changes.

ELEMENT INFO:
- Tag: <${element.tagName}>
- ID: ${element.id || "none"}
- Classes: ${element.classes || "none"}
- Selector path: ${element.selectorPath}
- Current text: ${element.directText || "none"}
- Current styles: ${JSON.stringify(element.styles, null, 2)}

RULES:
1. Output ONLY the files that need to change using the format ===FILE: path=== ... ===END===
2. Output the COMPLETE file content, not just the changed lines
3. If using Tailwind, change Tailwind classes (e.g. text-lg → text-2xl, bg-blue-500 → bg-red-500)
4. If using inline styles, change the style values
5. For text changes, find and replace the exact string
6. Keep ALL other code unchanged — minimal edits only
7. ${langHint}

PROJECT FILES:
${fileContext}`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: "user", content: task }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Anthropic error:", errBody);
      return NextResponse.json({ error: `Anthropic API error: ${response.status}` }, { status: 502 });
    }

    const data = (await response.json()) as {
      content: { type: string; text?: string }[];
    };

    // Extract text response
    let fullText = "";
    for (const block of data.content) {
      if (block.type === "text" && block.text) {
        fullText += block.text;
      }
    }

    // Parse file updates from response
    const fileUpdates: { path: string; content: string }[] = [];
    const fileRegex = /===FILE:\s*(.+?)===\n([\s\S]*?)===END===/g;
    let match;
    while ((match = fileRegex.exec(fullText)) !== null) {
      const path = match[1].trim();
      const content = match[2].trimEnd();
      fileUpdates.push({ path, content });
    }

    // Extract any explanation text (outside file blocks)
    const explanation = fullText
      .replace(/===FILE:[\s\S]*?===END===/g, "")
      .trim();

    return NextResponse.json({
      fileUpdates,
      explanation: explanation || null,
      rawResponse: fullText,
    });
  } catch (error) {
    console.error("Inspect-edit error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Inspect edit failed" },
      { status: 500 }
    );
  }
}
