import { BlockType, BlockVariant, Block, Page, Project, DesignTokens } from "./types";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */

export interface BlueprintSection {
  type: BlockType;
  variant: BlockVariant;
  fields: Record<string, string>;
}

export interface Blueprint {
  name: string;
  sections: BlueprintSection[];
}

/* ─────────────────────────────────────────────────────────────────────────────
   BLOCK FIELD SCHEMAS — defines which fields each block type expects
───────────────────────────────────────────────────────────────────────────── */

export const BLOCK_FIELD_SCHEMA: Record<BlockType, string[]> = {
  navbar: ["logo", "links"],
  hero: ["headline", "subheadline", "cta", "image"],
  features: [
    "title",
    "subtitle",
    "feature1_title",
    "feature1_desc",
    "feature2_title",
    "feature2_desc",
    "feature3_title",
    "feature3_desc",
  ],
  stats: [
    "stat1_value",
    "stat1_label",
    "stat2_value",
    "stat2_label",
    "stat3_value",
    "stat3_label",
    "stat4_value",
    "stat4_label",
  ],
  testimonials: [
    "title",
    "quote1",
    "author1",
    "role1",
    "avatar1",
    "quote2",
    "author2",
    "role2",
    "avatar2",
  ],
  cta: ["headline", "subheadline", "cta"],
  pricing: ["title", "subtitle"],
  footer: ["logo", "copyright", "links"],
  custom: ["html"],
};

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  navbar: "Navigation",
  hero: "Hero",
  features: "Features",
  stats: "Statistiken",
  testimonials: "Testimonials",
  cta: "Call-to-Action",
  pricing: "Pricing",
  footer: "Footer",
  custom: "Custom",
};

export const BLOCK_TYPE_EMOJIS: Record<BlockType, string> = {
  navbar: "🔗",
  hero: "🦸",
  features: "✨",
  stats: "📊",
  testimonials: "💬",
  cta: "⚡",
  pricing: "💰",
  footer: "🔻",
  custom: "⌨️",
};

const VALID_BLOCK_TYPES: BlockType[] = [
  "navbar",
  "hero",
  "features",
  "stats",
  "testimonials",
  "cta",
  "pricing",
  "footer",
  "custom",
];

const VALID_VARIANTS: BlockVariant[] = ["A", "B", "C", "D", "E"];

/* ─────────────────────────────────────────────────────────────────────────────
   BLUEPRINT → MARKDOWN
───────────────────────────────────────────────────────────────────────────── */

export function blueprintToMarkdown(bp: Blueprint): string {
  const lines: string[] = [`# ${bp.name}`, ""];

  for (const section of bp.sections) {
    const variantPart =
      section.variant && section.variant !== "A"
        ? ` | variant: ${section.variant}`
        : "";
    lines.push(`## ${section.type}${variantPart}`);

    for (const [key, value] of Object.entries(section.fields)) {
      if (value !== undefined && value !== "") {
        lines.push(`- ${key}: ${value}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

/* ─────────────────────────────────────────────────────────────────────────────
   MARKDOWN → BLUEPRINT
───────────────────────────────────────────────────────────────────────────── */

export function markdownToBlueprint(md: string): Blueprint {
  const lines = md.split("\n");
  let name = "Mein Projekt";
  const sections: BlueprintSection[] = [];
  let current: BlueprintSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // # Project Name
    if (line.startsWith("# ") && !line.startsWith("## ")) {
      name = line.slice(2).trim();
      continue;
    }

    // ## blocktype | variant: B
    if (line.startsWith("## ")) {
      if (current) sections.push(current);

      const headerContent = line.slice(3).trim();
      const parts = headerContent.split("|").map((p) => p.trim());
      const rawType = parts[0].toLowerCase().replace(/[^a-z-]/g, "");
      const type = VALID_BLOCK_TYPES.includes(rawType as BlockType)
        ? (rawType as BlockType)
        : "custom";

      let variant: BlockVariant = "A";
      for (const part of parts.slice(1)) {
        const match = part.match(/variant:\s*([A-E])/i);
        if (match && VALID_VARIANTS.includes(match[1] as BlockVariant)) {
          variant = match[1] as BlockVariant;
        }
      }

      current = { type, variant, fields: {} };
      continue;
    }

    // - key: value
    if (line.startsWith("- ") && current) {
      const colonIdx = line.indexOf(":", 2);
      if (colonIdx > 2) {
        const key = line.slice(2, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        if (key) {
          current.fields[key] = value;
        }
      }
      continue;
    }
  }

  if (current) sections.push(current);

  return { name, sections };
}

/* ─────────────────────────────────────────────────────────────────────────────
   BLUEPRINT → PROJECT
───────────────────────────────────────────────────────────────────────────── */

const DEFAULT_TOKENS: DesignTokens = {
  id: "blueprint-tokens",
  name: "Blueprint Theme",
  primaryColor: "#3b82f6",
  secondaryColor: "#6366f1",
  accentColor: "#8b5cf6",
  backgroundColor: "#ffffff",
  surfaceColor: "#f8fafc",
  textColor: "#0f172a",
  textMuted: "#64748b",
  fontHeading: "Inter",
  fontBody: "Inter",
  borderRadius: "soft",
  spacing: "balanced",
};

export function blueprintToProject(
  bp: Blueprint,
  tokens?: Partial<DesignTokens>
): Project {
  const mergedTokens: DesignTokens = { ...DEFAULT_TOKENS, ...tokens };

  let blockCounter = 0;
  const blocks: Block[] = bp.sections.map((section) => {
    blockCounter++;
    return {
      id: `bp_${blockCounter}_${Date.now()}`,
      type: section.type,
      variant: section.variant,
      content: { ...section.fields },
    };
  });

  const page: Page = {
    id: `page_bp_${Date.now()}`,
    name: "Home",
    slug: "/",
    blocks,
  };

  return {
    id: `proj_bp_${Date.now()}`,
    name: bp.name,
    type: "blueprint",
    pages: [page],
    tokens: mergedTokens,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   PROJECT → BLUEPRINT (extract from existing project)
───────────────────────────────────────────────────────────────────────────── */

export function projectToBlueprint(project: Project): Blueprint {
  const firstPage = project.pages[0];
  if (!firstPage) {
    return { name: project.name, sections: [] };
  }

  const sections: BlueprintSection[] = firstPage.blocks.map((block) => ({
    type: block.type,
    variant: block.variant,
    fields: { ...block.content },
  }));

  return { name: project.name, sections };
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

export function createEmptySection(type: BlockType): BlueprintSection {
  const fields: Record<string, string> = {};
  const schema = BLOCK_FIELD_SCHEMA[type] || [];
  for (const key of schema) {
    fields[key] = "";
  }
  return { type, variant: "A", fields };
}

export function getBlueprintFieldSchema(type: BlockType): string[] {
  return BLOCK_FIELD_SCHEMA[type] || [];
}

export function genSectionId(): string {
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}
