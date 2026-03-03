import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { TOKEN_PRESETS } from "@/lib/design-tokens";
import {
  BlockType,
  BlockVariant,
  ProjectDraft,
  ProjectDraftBlock,
  ProjectDraftPage,
} from "@/lib/types";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_TOKEN_PRESET = "clean-light";
const SUPPORTED_BLOCK_TYPES: BlockType[] = [
  "navbar",
  "hero",
  "features",
  "stats",
  "testimonials",
  "cta",
  "footer",
];
const SUPPORTED_VARIANTS: BlockVariant[] = ["A", "B", "C"];

const DEFAULT_CONTENT_BY_BLOCK: Record<BlockType, Record<string, string>> = {
  navbar: {
    logo: "Studio",
    links: "Home,Services,About,Contact",
  },
  hero: {
    headline: "We design websites that convert",
    subheadline:
      "Beautiful, fast, and strategic websites for ambitious brands.",
    cta: "Start Project",
  },
  features: {
    title: "What we offer",
    subtitle: "Services tailored to your goals",
    feature1_title: "Brand Strategy",
    feature1_desc: "Clear positioning and messaging for your audience.",
    feature2_title: "Web Design",
    feature2_desc: "Modern, conversion-focused interfaces.",
    feature3_title: "Development",
    feature3_desc: "Fast, reliable implementation with clean code.",
  },
  stats: {
    stat1_value: "120+",
    stat1_label: "Projects",
    stat2_value: "98%",
    stat2_label: "Satisfaction",
    stat3_value: "11",
    stat3_label: "Years",
    stat4_value: "24h",
    stat4_label: "Response Time",
  },
  testimonials: {
    title: "Loved by clients",
    quote1: "The new website doubled our qualified leads.",
    author1: "Alex Martin",
    role1: "Founder",
    quote2: "Clear process, strong design taste, great execution.",
    author2: "Lea Berger",
    role2: "Marketing Lead",
  },
  cta: {
    headline: "Ready to build your next website?",
    subheadline:
      "Tell us about your goals and we'll craft a custom direction.",
    cta: "Book a Call",
  },
  footer: {
    logo: "Studio",
    copyright: "© 2026 Studio. All rights reserved.",
    links: "Imprint,Privacy,Terms",
  },
  pricing: {
    title: "Plans",
  },
  custom: {
    html: "",
  },
};

const FALLBACK_BLOCKS: ProjectDraftBlock[] = [
  {
    type: "navbar",
    variant: "A",
    content: DEFAULT_CONTENT_BY_BLOCK.navbar,
  },
  {
    type: "hero",
    variant: "A",
    content: DEFAULT_CONTENT_BY_BLOCK.hero,
  },
  {
    type: "features",
    variant: "A",
    content: DEFAULT_CONTENT_BY_BLOCK.features,
  },
  {
    type: "stats",
    variant: "A",
    content: DEFAULT_CONTENT_BY_BLOCK.stats,
  },
  {
    type: "testimonials",
    variant: "A",
    content: DEFAULT_CONTENT_BY_BLOCK.testimonials,
  },
  {
    type: "cta",
    variant: "A",
    content: DEFAULT_CONTENT_BY_BLOCK.cta,
  },
  {
    type: "footer",
    variant: "A",
    content: DEFAULT_CONTENT_BY_BLOCK.footer,
  },
];

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}

function sanitizeSlug(slug: string, index: number): string {
  if (!slug) return index === 0 ? "/" : `/page-${index + 1}`;

  const normalized = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\/+$/, "");

  if (!normalized || normalized === "-") {
    return index === 0 ? "/" : `/page-${index + 1}`;
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function normalizeBlock(rawBlock: unknown, prompt: string): ProjectDraftBlock | null {
  if (!isRecord(rawBlock)) return null;

  const rawType = typeof rawBlock.type === "string" ? rawBlock.type : "";
  if (!SUPPORTED_BLOCK_TYPES.includes(rawType as BlockType)) return null;

  const type = rawType as BlockType;
  const variant = SUPPORTED_VARIANTS.includes(rawBlock.variant as BlockVariant)
    ? (rawBlock.variant as BlockVariant)
    : "A";

  const defaults = DEFAULT_CONTENT_BY_BLOCK[type] || {};
  const mergedContent: Record<string, string> = { ...defaults };

  if (isRecord(rawBlock.content)) {
    for (const [key, value] of Object.entries(rawBlock.content)) {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        mergedContent[key] = String(value);
      }
    }
  }

  if (type === "hero" && !mergedContent.headline) {
    mergedContent.headline = `Website concept for ${prompt.slice(0, 42).trim()}`;
  }

  const overrides = isRecord(rawBlock.overrides)
    ? (rawBlock.overrides as ProjectDraftBlock["overrides"])
    : undefined;

  return {
    type,
    variant,
    content: mergedContent,
    overrides,
  };
}

function normalizePage(rawPage: unknown, index: number, prompt: string): ProjectDraftPage {
  if (!isRecord(rawPage)) {
    return {
      name: index === 0 ? "Home" : `Page ${index + 1}`,
      slug: index === 0 ? "/" : `/page-${index + 1}`,
      blocks: FALLBACK_BLOCKS,
    };
  }

  const name =
    typeof rawPage.name === "string" && rawPage.name.trim().length > 0
      ? rawPage.name.trim()
      : index === 0
        ? "Home"
        : `Page ${index + 1}`;

  const slug = sanitizeSlug(typeof rawPage.slug === "string" ? rawPage.slug : "", index);

  const rawBlocks = Array.isArray(rawPage.blocks) ? rawPage.blocks : [];
  const blocks = rawBlocks
    .map((block) => normalizeBlock(block, prompt))
    .filter((block): block is ProjectDraftBlock => block !== null);

  return {
    name,
    slug,
    blocks: blocks.length > 0 ? blocks : FALLBACK_BLOCKS,
  };
}

function normalizeDraft(rawDraft: unknown, prompt: string): ProjectDraft {
  const draft = isRecord(rawDraft) ? rawDraft : {};
  const presetIds = new Set(TOKEN_PRESETS.map((preset) => preset.id));

  const tokenPresetId =
    typeof draft.tokenPresetId === "string" && presetIds.has(draft.tokenPresetId)
      ? draft.tokenPresetId
      : DEFAULT_TOKEN_PRESET;

  const rawPages = Array.isArray(draft.pages) ? draft.pages.slice(0, 4) : [];

  const pages =
    rawPages.length > 0
      ? rawPages.map((page, index) => normalizePage(page, index, prompt))
      : [
          {
            name: "Home",
            slug: "/",
            blocks: FALLBACK_BLOCKS,
          },
        ];

  return {
    name:
      typeof draft.name === "string" && draft.name.trim().length > 0
        ? draft.name.trim()
        : "Prompt Project",
    type:
      typeof draft.type === "string" && draft.type.trim().length > 0
        ? draft.type.trim()
        : "custom",
    tokenPresetId,
    pages,
  };
}

function repairJson(raw: string): string {
  let repaired = raw
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\x00-\x1f]/g, (ch) => (ch === "\n" || ch === "\r" || ch === "\t" ? ch : ""));

  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;

  for (const ch of repaired) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") openBraces++;
    if (ch === "}") openBraces--;
    if (ch === "[") openBrackets++;
    if (ch === "]") openBrackets--;
  }

  while (openBrackets > 0) { repaired += "]"; openBrackets--; }
  while (openBraces > 0) { repaired += "}"; openBraces--; }

  return repaired;
}

function extractJson(text: string): unknown {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates: string[] = [];

  if (fencedMatch?.[1]) candidates.push(fencedMatch[1].trim());
  candidates.push(text.trim());

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }
  if (firstBrace !== -1) {
    candidates.push(text.slice(firstBrace));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next
    }
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(repairJson(candidate));
    } catch {
      // try next
    }
  }

  return null;
}

function buildSystemPrompt(): string {
  const presetList = TOKEN_PRESETS.map((preset) => preset.id).join(", ");
  const blockList = SUPPORTED_BLOCK_TYPES.join(", ");

  return [
    "You are a senior web designer creating website blueprints for a block editor.",
    "CRITICAL: Your entire response must be a single valid JSON object. No markdown fences, no explanation, no text before or after the JSON.",
    "Start your response with { and end with }.",
    "",
    "JSON schema (follow exactly):",
    "{",
    '  "name": "string — project name",',
    '  "type": "string — e.g. portfolio, startup, agency",',
    `  "tokenPresetId": "one of: ${presetList}",`,
    '  "pages": [',
    "    {",
    '      "name": "string — page name",',
    '      "slug": "string — must start with /",',
    '      "blocks": [',
    "        {",
    `          "type": "one of: ${blockList}",`,
    '          "variant": "A or B or C",',
    '          "content": { "key": "string value" }',
    "        }",
    "      ]",
    "    }",
    "  ]",
    "}",
    "",
    "Rules:",
    "- Make all content concrete, specific, and publication-ready in the language of the user request.",
    "- Normal page block order: navbar → hero → features → stats → testimonials → cta → footer.",
    "- Use only the standard content keys for each block type.",
    "- navbar content keys: logo, links (comma-separated)",
    "- hero content keys: headline, subheadline, cta",
    "- features content keys: title, subtitle, feature1_title, feature1_desc, feature2_title, feature2_desc, feature3_title, feature3_desc",
    "- stats content keys: stat1_value, stat1_label, stat2_value, stat2_label, stat3_value, stat3_label, stat4_value, stat4_label",
    "- testimonials content keys: title, quote1, author1, role1, quote2, author2, role2",
    "- cta content keys: headline, subheadline, cta",
    "- footer content keys: logo, copyright, links (comma-separated)",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.STANDARD_AI);
  if (limited) return limited;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY fehlt. Bitte in .env.local setzen und den Dev-Server neu starten." },
      { status: 500 }
    );
  }

  let body: { prompt?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const selectedModel = typeof body?.model === "string" && body.model.trim()
    ? body.model.trim()
    : undefined;

  if (prompt.length < 6) {
    return NextResponse.json(
      { error: "Bitte gib einen aussagekräftigen Prompt ein (mindestens 6 Zeichen)." },
      { status: 400 }
    );
  }

  const anthropicResponse = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: selectedModel || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: 0.8,
      stream: true,
      system: buildSystemPrompt(),
      messages: [
        {
          role: "user",
          content: `Generate a website blueprint for this request:\n\n${prompt}`,
        },
      ],
    }),
  });

  if (!anthropicResponse.ok) {
    const errorText = await anthropicResponse.text();
    return NextResponse.json(
      { error: `Anthropic API Fehler (${anthropicResponse.status}): ${errorText.slice(0, 240)}` },
      { status: 502 }
    );
  }

  const anthropicBody = anthropicResponse.body;
  if (!anthropicBody) {
    return NextResponse.json({ error: "Kein Stream vom API erhalten." }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      const reader = anthropicBody.getReader();

      try {
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const event = JSON.parse(jsonStr) as {
                type?: string;
                delta?: { type?: string; text?: string };
              };

              if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta" &&
                typeof event.delta.text === "string"
              ) {
                const chunk = event.delta.text;
                fullText += chunk;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "delta", text: chunk })}\n\n`)
                );
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }

        // Parse and normalize the complete text
        const parsed = extractJson(fullText);

        if (parsed) {
          const projectDraft = normalizeDraft(parsed, prompt);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done", projectDraft })}\n\n`)
          );
        } else {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: "Die KI-Antwort konnte nicht als JSON gelesen werden. Bitte Prompt präzisieren." })}\n\n`
            )
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stream-Fehler";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
