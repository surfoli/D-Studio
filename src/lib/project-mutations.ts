import type { Project, Page, Block, BlockOverrides, DesignTokens, BlockVariant } from "./types";

// ── Generic helpers for immutable project updates ──

/**
 * Update a specific block within a project immutably.
 * Returns the same project reference if the updater returns the same block.
 */
export function updateBlock(
  project: Project,
  pageId: string,
  blockId: string,
  updater: (block: Block) => Block
): Project {
  const pageIndex = project.pages.findIndex((p) => p.id === pageId);
  if (pageIndex === -1) return project;

  const page = project.pages[pageIndex];
  const blockIndex = page.blocks.findIndex((b) => b.id === blockId);
  if (blockIndex === -1) return project;

  const block = page.blocks[blockIndex];
  const nextBlock = updater(block);
  if (nextBlock === block) return project;

  const nextBlocks = page.blocks.slice();
  nextBlocks[blockIndex] = nextBlock;

  const nextPages = project.pages.slice();
  nextPages[pageIndex] = { ...page, blocks: nextBlocks };

  return { ...project, pages: nextPages };
}

/**
 * Update a specific page within a project immutably.
 */
export function updatePage(
  project: Project,
  pageId: string,
  updater: (page: Page) => Page
): Project {
  const pageIndex = project.pages.findIndex((p) => p.id === pageId);
  if (pageIndex === -1) return project;

  const page = project.pages[pageIndex];
  const nextPage = updater(page);
  if (nextPage === page) return project;

  const nextPages = project.pages.slice();
  nextPages[pageIndex] = nextPage;

  return { ...project, pages: nextPages };
}

/**
 * Map over all blocks across all pages. Only creates new arrays when something changes.
 */
export function mapBlocks(
  project: Project,
  mapper: (block: Block, page: Page) => Block
): Project {
  let projectChanged = false;

  const nextPages = project.pages.map((page) => {
    let pageChanged = false;

    const nextBlocks = page.blocks.map((block) => {
      const nextBlock = mapper(block, page);
      if (nextBlock !== block) pageChanged = true;
      return nextBlock;
    });

    if (!pageChanged) return page;
    projectChanged = true;
    return { ...page, blocks: nextBlocks };
  });

  return projectChanged ? { ...project, pages: nextPages } : project;
}

/**
 * Map over all pages. Only creates new arrays when something changes.
 */
export function mapPages(
  project: Project,
  mapper: (page: Page) => Page
): Project {
  let changed = false;

  const nextPages = project.pages.map((page) => {
    const nextPage = mapper(page);
    if (nextPage !== page) changed = true;
    return nextPage;
  });

  return changed ? { ...project, pages: nextPages } : project;
}

// ── Concrete mutation functions ──

export function swapVariant(
  project: Project,
  pageId: string,
  blockId: string,
  variant: BlockVariant
): Project {
  return updateBlock(project, pageId, blockId, (block) =>
    block.variant === variant ? block : { ...block, variant }
  );
}

export function swapBlockContent(
  project: Project,
  pageId: string,
  blockId: string,
  newType: string,
  newVariant: BlockVariant,
  newContent: Record<string, string>
): Project {
  return updateBlock(project, pageId, blockId, (block) => {
    if (block.type === newType && block.variant === newVariant) {
      const sameContent =
        Object.keys(block.content).length === Object.keys(newContent).length &&
        Object.entries(newContent).every(([k, v]) => block.content[k] === v);
      if (sameContent) return block;
    }
    return {
      ...block,
      type: newType as Block["type"],
      variant: newVariant,
      content: newContent,
    };
  });
}

export function moveBlock(
  project: Project,
  pageId: string,
  blockId: string,
  direction: "up" | "down"
): Project {
  return updatePage(project, pageId, (page) => {
    const idx = page.blocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return page;

    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= page.blocks.length) return page;

    const nextBlocks = page.blocks.slice();
    [nextBlocks[idx], nextBlocks[newIdx]] = [nextBlocks[newIdx], nextBlocks[idx]];
    return { ...page, blocks: nextBlocks };
  });
}

export function updateBlockOverrides(
  project: Project,
  pageId: string,
  blockId: string,
  overrides: BlockOverrides
): Project {
  return updateBlock(project, pageId, blockId, (block) => {
    const hasChanges = Object.entries(overrides).some(
      ([key, value]) => block.overrides?.[key as keyof BlockOverrides] !== value
    );
    if (!hasChanges) return block;
    return { ...block, overrides: { ...block.overrides, ...overrides } };
  });
}

export function updateBlockContent(
  project: Project,
  pageId: string,
  blockId: string,
  contentKey: string,
  value: string
): Project {
  if (!contentKey) return project;

  return updateBlock(project, pageId, blockId, (block) => {
    const nextContent: Record<string, string> = {
      ...block.content,
      [contentKey]: value,
    };

    // Sync indexed nav links back to canonical links field
    const navLinkIndex = contentKey.startsWith("link_") ? Number(contentKey.slice(5)) : NaN;
    if (Number.isInteger(navLinkIndex) && navLinkIndex >= 0) {
      const links = (block.content.links || "").split(",").map((s) => s.trim());
      while (links.length <= navLinkIndex) links.push("");
      links[navLinkIndex] = value;
      nextContent.links = links.join(", ");
    }

    const footerLinkIndex = contentKey.startsWith("footerlink_")
      ? Number(contentKey.slice(11))
      : NaN;
    if (Number.isInteger(footerLinkIndex) && footerLinkIndex >= 0) {
      const links = (block.content.links || "").split(",").map((s) => s.trim());
      while (links.length <= footerLinkIndex) links.push("");
      links[footerLinkIndex] = value;
      nextContent.links = links.join(", ");
    }

    const hasChanges = Object.keys(nextContent).some(
      (key) => nextContent[key] !== block.content[key]
    );
    if (!hasChanges) return block;

    return { ...block, content: nextContent };
  });
}

export function updateThemeTokens(
  project: Project,
  tokenUpdates: Partial<DesignTokens>
): Project {
  const hasChanges = Object.entries(tokenUpdates).some(
    ([key, value]) => project.tokens[key as keyof DesignTokens] !== value
  );
  if (!hasChanges) return project;

  return {
    ...project,
    tokens: { ...project.tokens, ...tokenUpdates },
  };
}

const BLOCK_COLOR_OVERRIDE_KEYS: Array<keyof BlockOverrides> = [
  "primaryColor",
  "accentColor",
  "backgroundColor",
  "textColor",
];

export function clearBlockColorOverrides(project: Project): Project {
  return mapBlocks(project, (block) => {
    if (!block.overrides) return block;

    const hasColorOverride = Object.keys(block.overrides).some((key) =>
      BLOCK_COLOR_OVERRIDE_KEYS.includes(key as keyof BlockOverrides)
    );
    if (!hasColorOverride) return block;

    const nextOverrides = Object.fromEntries(
      Object.entries(block.overrides).filter(
        ([key]) => !BLOCK_COLOR_OVERRIDE_KEYS.includes(key as keyof BlockOverrides)
      )
    ) as BlockOverrides;

    return {
      ...block,
      overrides: Object.keys(nextOverrides).length > 0 ? nextOverrides : undefined,
    };
  });
}

export const VARIANT_OPTIONS: BlockVariant[] = ["A", "B", "C"];

export function getRandomVariant(currentVariant: BlockVariant): BlockVariant {
  const available = VARIANT_OPTIONS.filter((v) => v !== currentVariant);
  const pool = available.length > 0 ? available : VARIANT_OPTIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function remixAllBlocks(project: Project): Project {
  return mapBlocks(project, (block) => {
    const nextVariant = getRandomVariant(block.variant);
    return nextVariant === block.variant ? block : { ...block, variant: nextVariant };
  });
}

export function removeBlock(
  project: Project,
  pageId: string,
  blockId: string
): Project {
  return updatePage(project, pageId, (page) => {
    const nextBlocks = page.blocks.filter((b) => b.id !== blockId);
    if (nextBlocks.length === page.blocks.length) return page;
    return { ...page, blocks: nextBlocks };
  });
}

export function addBlock(
  project: Project,
  pageId: string,
  afterBlockId: string | null,
  newBlock: Block
): Project {
  return updatePage(project, pageId, (page) => {
    let insertAt = page.blocks.length;
    if (afterBlockId !== null) {
      const idx = page.blocks.findIndex((b) => b.id === afterBlockId);
      if (idx !== -1) insertAt = idx + 1;
    }

    const nextBlocks = [
      ...page.blocks.slice(0, insertAt),
      newBlock,
      ...page.blocks.slice(insertAt),
    ];
    return { ...page, blocks: nextBlocks };
  });
}

// ── Navbar link helpers ──

function updateNavbarLinks(
  page: Page,
  updater: (links: string[]) => string[] | null
): Page {
  let changed = false;
  const nextBlocks = page.blocks.map((block) => {
    if (block.type !== "navbar") return block;
    const links = (block.content.links || "").split(",").map((l) => l.trim()).filter(Boolean);
    const result = updater(links);
    if (result === null) return block;
    changed = true;
    return {
      ...block,
      content: { ...block.content, links: result.join(", ") },
    };
  });
  return changed ? { ...page, blocks: nextBlocks } : page;
}

export function addNavbarLinkToAllPages(project: Project, pageName: string): Project {
  return mapPages(project, (page) =>
    updateNavbarLinks(page, (links) => {
      if (links.some((l) => l.toLowerCase() === pageName.toLowerCase())) return null;
      return [...links, pageName];
    })
  );
}

export function removeNavbarLinkFromAllPages(project: Project, pageName: string): Project {
  return mapPages(project, (page) =>
    updateNavbarLinks(page, (links) => {
      const filtered = links.filter((l) => l.toLowerCase() !== pageName.toLowerCase());
      if (filtered.length === links.length) return null;
      return filtered;
    })
  );
}

export function renameNavbarLinkInAllPages(
  project: Project,
  oldName: string,
  newName: string
): Project {
  return mapPages(project, (page) =>
    updateNavbarLinks(page, (links) => {
      const updated = links.map((l) =>
        l.toLowerCase() === oldName.toLowerCase() ? newName : l
      );
      if (updated.join(", ") === links.join(", ")) return null;
      return updated;
    })
  );
}
