import type { Project, Block, BlockOverrides, BlockType } from "./types";

// ── Breakpoints ──
const MOBILE_MAX = 500;
const TABLET_MAX = 800;

// ── Per-block-type heading scale targets (mobile) ──
const MOBILE_HEADING_SCALE: Partial<Record<BlockType, number>> = {
  hero: 72,
  features: 78,
  cta: 75,
  testimonials: 78,
  stats: 78,
  footer: 85,
  navbar: 88,
};

const TABLET_HEADING_SCALE: Partial<Record<BlockType, number>> = {
  hero: 85,
  features: 90,
  cta: 88,
  testimonials: 90,
  stats: 90,
};

// ── Override computation ──

interface FixOverrides {
  fontSizeHeading?: number;
  fontSizeBody?: number;
  paddingX?: number;
  paddingY?: number;
  buttonScale?: number;
  letterSpacing?: number;
}

function computeMobileOverrides(block: Block): FixOverrides {
  const headingTarget = MOBILE_HEADING_SCALE[block.type] ?? 76;
  return {
    fontSizeHeading: headingTarget,
    fontSizeBody: 90,
    paddingX: -20,
    paddingY: -12,
    buttonScale: 82,
    letterSpacing: -2,
  };
}

function computeTabletOverrides(block: Block): FixOverrides {
  const headingTarget = TABLET_HEADING_SCALE[block.type] ?? 92;
  return {
    fontSizeHeading: headingTarget,
    fontSizeBody: 95,
    paddingX: -10,
    paddingY: -6,
    buttonScale: 90,
  };
}

function mergeOverrides(
  existing: BlockOverrides | undefined,
  fixes: FixOverrides
): BlockOverrides {
  const merged: BlockOverrides = { ...(existing || {}) };

  // Only apply fix if the user hasn't set a manual value
  if (fixes.fontSizeHeading !== undefined && existing?.fontSizeHeading === undefined) {
    merged.fontSizeHeading = fixes.fontSizeHeading;
  }
  if (fixes.fontSizeBody !== undefined && existing?.fontSizeBody === undefined) {
    merged.fontSizeBody = fixes.fontSizeBody;
  }
  if (fixes.paddingX !== undefined && existing?.paddingX === undefined) {
    merged.paddingX = fixes.paddingX;
  }
  if (fixes.paddingY !== undefined && existing?.paddingY === undefined) {
    merged.paddingY = fixes.paddingY;
  }
  if (fixes.buttonScale !== undefined && existing?.buttonScale === undefined) {
    merged.buttonScale = fixes.buttonScale;
  }
  if (fixes.letterSpacing !== undefined && existing?.letterSpacing === undefined) {
    merged.letterSpacing = fixes.letterSpacing;
  }

  return merged;
}

// ── Public API ──

export function autoFixProject(project: Project, viewportWidth: number): Project {
  if (viewportWidth >= TABLET_MAX) {
    return project;
  }

  const isMobile = viewportWidth < MOBILE_MAX;

  let hasChanged = false;

  const nextPages = project.pages.map((page) => {
    let pageChanged = false;

    const nextBlocks = page.blocks.map((block) => {
      const fixes = isMobile
        ? computeMobileOverrides(block)
        : computeTabletOverrides(block);

      const nextOverrides = mergeOverrides(block.overrides, fixes);

      // Check if anything actually changed
      const overridesChanged = JSON.stringify(nextOverrides) !== JSON.stringify(block.overrides || {});
      if (!overridesChanged) {
        return block;
      }

      hasChanged = true;
      pageChanged = true;

      return {
        ...block,
        overrides: nextOverrides,
      };
    });

    return pageChanged ? { ...page, blocks: nextBlocks } : page;
  });

  if (!hasChanged) {
    return project;
  }

  return {
    ...project,
    pages: nextPages,
  };
}

export function clearResponsiveFixes(project: Project): Project {
  const RESPONSIVE_KEYS: (keyof BlockOverrides)[] = [
    "fontSizeHeading",
    "fontSizeBody",
    "paddingX",
    "paddingY",
    "buttonScale",
    "letterSpacing",
  ];

  let hasChanged = false;

  const nextPages = project.pages.map((page) => {
    let pageChanged = false;

    const nextBlocks = page.blocks.map((block) => {
      if (!block.overrides) return block;

      const hasResponsiveOverride = RESPONSIVE_KEYS.some(
        (key) => block.overrides?.[key] !== undefined
      );
      if (!hasResponsiveOverride) return block;

      const cleaned = Object.fromEntries(
        Object.entries(block.overrides).filter(
          ([key]) => !RESPONSIVE_KEYS.includes(key as keyof BlockOverrides)
        )
      ) as BlockOverrides;

      hasChanged = true;
      pageChanged = true;

      return {
        ...block,
        overrides: Object.keys(cleaned).length > 0 ? cleaned : undefined,
      };
    });

    return pageChanged ? { ...page, blocks: nextBlocks } : page;
  });

  if (!hasChanged) return project;

  return { ...project, pages: nextPages };
}
