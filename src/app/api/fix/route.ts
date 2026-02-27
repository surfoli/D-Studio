import { NextRequest, NextResponse } from "next/server";
import { BlockOverrides } from "@/lib/types";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

interface BlockSummary {
  id: string;
  type: string;
  variant: string;
  contentKeys: string[];
  currentOverrides?: BlockOverrides;
}

interface FixRequest {
  blocks: BlockSummary[];
  viewportWidth: number;
  model?: string;
}

interface FixResult {
  blockId: string;
  overrides: Partial<BlockOverrides>;
}

function buildFixSystemPrompt(viewportWidth: number): string {
  return [
    "You are a responsive design expert fixing layout issues for a block-based website editor.",
    `The user is previewing their website at ${viewportWidth}px viewport width.`,
    "",
    "You will receive a list of blocks with their types, variants, and current overrides.",
    "Your job is to return per-block override adjustments that fix responsive issues at this viewport width.",
    "",
    "Available override keys and their meaning:",
    "- fontSizeHeading: percentage (100 = default, 72 = 72% of base). Range: 60-140",
    "- fontSizeBody: percentage (100 = default). Range: 70-120",
    "- paddingX: pixel offset added to base padding. Range: -30 to 40",
    "- paddingY: pixel offset added to base padding. Range: -24 to 56",
    "- buttonScale: percentage for button size (100 = default). Range: 70-160",
    "- letterSpacing: value in 1/100 em units. Range: -10 to 20",
    "- lineHeight: percentage (140 = 1.4). Range: 100-180",
    "",
    "Guidelines for mobile (< 500px):",
    "- Hero headings should be 68-76% to avoid awkward wrapping",
    "- Body text 88-94%",
    "- Reduce horizontal padding by 16-24px",
    "- Reduce vertical padding by 8-16px",
    "- Buttons 78-88%",
    "- Tighten letter spacing slightly",
    "",
    "Guidelines for tablet (500-800px):",
    "- Hero headings 82-90%",
    "- Body text 92-98%",
    "- Reduce horizontal padding by 8-14px",
    "- Reduce vertical padding by 4-10px",
    "",
    "CRITICAL: Your entire response must be a single valid JSON array. No markdown fences, no explanation.",
    'Format: [{ "blockId": "...", "overrides": { ... } }, ...]',
    "Only include blocks that need fixes. Omit blocks that look fine.",
    "Do NOT include overrides that already exist on the block (check currentOverrides).",
  ].join("\n");
}

function extractJson(text: string): unknown {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates: string[] = [];

  if (fencedMatch?.[1]) candidates.push(fencedMatch[1].trim());
  candidates.push(text.trim());

  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    candidates.push(text.slice(firstBracket, lastBracket + 1));
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next
    }
  }

  return null;
}

function normalizeFixes(raw: unknown, validBlockIds: Set<string>): FixResult[] {
  if (!Array.isArray(raw)) return [];

  const VALID_KEYS: (keyof BlockOverrides)[] = [
    "fontSizeHeading",
    "fontSizeBody",
    "paddingX",
    "paddingY",
    "buttonScale",
    "letterSpacing",
    "lineHeight",
  ];

  return raw
    .filter(
      (item): item is { blockId: string; overrides: Record<string, unknown> } =>
        typeof item === "object" &&
        item !== null &&
        typeof item.blockId === "string" &&
        validBlockIds.has(item.blockId) &&
        typeof item.overrides === "object" &&
        item.overrides !== null
    )
    .map((item) => {
      const cleaned: Partial<BlockOverrides> = {};
      for (const key of VALID_KEYS) {
        const val = item.overrides[key];
        if (typeof val === "number") {
          (cleaned as Record<string, number>)[key] = val;
        }
      }
      return { blockId: item.blockId, overrides: cleaned };
    })
    .filter((item) => Object.keys(item.overrides).length > 0);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY fehlt." },
      { status: 500 }
    );
  }

  let body: FixRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body." },
      { status: 400 }
    );
  }

  const { blocks, viewportWidth, model } = body;

  if (!Array.isArray(blocks) || blocks.length === 0) {
    return NextResponse.json(
      { error: "Keine Blöcke zum Fixen." },
      { status: 400 }
    );
  }

  if (typeof viewportWidth !== "number" || viewportWidth < 100) {
    return NextResponse.json(
      { error: "Ungültige Viewport-Breite." },
      { status: 400 }
    );
  }

  const validBlockIds = new Set(blocks.map((b) => b.id));

  const blocksDescription = blocks
    .map(
      (b) =>
        `- Block "${b.id}" (type: ${b.type}, variant: ${b.variant}, contentKeys: [${b.contentKeys.join(", ")}]${
          b.currentOverrides
            ? `, currentOverrides: ${JSON.stringify(b.currentOverrides)}`
            : ""
        })`
    )
    .join("\n");

  try {
    const anthropicResponse = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:
          model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
        max_tokens: 2048,
        temperature: 0.3,
        system: buildFixSystemPrompt(viewportWidth),
        messages: [
          {
            role: "user",
            content: `Fix responsive issues for these blocks at ${viewportWidth}px viewport:\n\n${blocksDescription}`,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      return NextResponse.json(
        {
          error: `Anthropic API Fehler (${anthropicResponse.status}): ${errorText.slice(0, 240)}`,
        },
        { status: 502 }
      );
    }

    const result = (await anthropicResponse.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const textContent = result.content
      ?.filter((c) => c.type === "text" && typeof c.text === "string")
      .map((c) => c.text)
      .join("");

    if (!textContent) {
      return NextResponse.json(
        { error: "Leere Antwort vom API." },
        { status: 502 }
      );
    }

    const parsed = extractJson(textContent);
    const fixes = normalizeFixes(parsed, validBlockIds);

    return NextResponse.json({ fixes });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
