export type BlockType =
  | "hero"
  | "features"
  | "cta"
  | "testimonials"
  | "footer"
  | "navbar"
  | "stats"
  | "pricing"
  | "custom";

export type BlockVariant = "A" | "B" | "C" | "D" | "E";

export interface BlockOverrides {
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  secondaryColor?: string;
  fontSizeHeading?: number;
  fontSizeBody?: number;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: "left" | "center" | "right";
  paddingY?: number;
  paddingX?: number;
  customFontHeading?: string;
  customFontBody?: string;
  radius?: number;
  buttonScale?: number;
  buttonRadius?: number;
  surfaceRadius?: number;
  opacity?: number;
}

export interface Block {
  id: string;
  type: BlockType;
  variant: BlockVariant;
  content: Record<string, string>;
  overrides?: BlockOverrides;
}

export interface Page {
  id: string;
  name: string;
  slug: string;
  blocks: Block[];
}

export interface DesignTokens {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textMuted: string;
  fontHeading: string;
  fontBody: string;
  borderRadius: "sharp" | "soft" | "rounded";
  spacing: "compact" | "balanced" | "spacious";
}

export interface Project {
  id: string;
  name: string;
  type: string;
  pages: Page[];
  tokens: DesignTokens;
}

export interface ProjectDraftBlock {
  type: BlockType;
  variant: BlockVariant;
  content: Record<string, string>;
  overrides?: BlockOverrides;
}

export interface ProjectDraftPage {
  name: string;
  slug: string;
  blocks: ProjectDraftBlock[];
}

export interface ProjectDraft {
  name: string;
  type: string;
  tokenPresetId: string;
  pages: ProjectDraftPage[];
}

export interface SelectedElement {
  pageId: string;
  blockId: string;
  elementType: "text" | "image" | "block";
  contentKey?: string;
  rect?: DOMRect;
}

export type EditorMode = "onboarding" | "canvas";

export type ProMode = boolean;

export type ZoomLevel = "overview" | "page" | "edit";
