import { Project, Block, BlockOverrides, DesignTokens } from "./types";

// ── Helpers ──

const radiusMap: Record<string, string> = { sharp: "0px", soft: "10px", rounded: "18px" };
const spacingMap: Record<string, number> = { compact: 1, balanced: 1.25, spacious: 1.5 };

const baseSpacingByType: Record<string, { y: number; x: number }> = {
  navbar: { y: 1.25, x: 2 },
  hero: { y: 6, x: 4 },
  features: { y: 5, x: 4 },
  stats: { y: 4, x: 4 },
  testimonials: { y: 5, x: 4 },
  cta: { y: 4, x: 4 },
  footer: { y: 1.5, x: 2 },
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function text(value: string | undefined, fallback: string): string {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function clampScale(value: number | undefined): number {
  const normalized = (value ?? 100) / 100;
  return Math.min(1.6, Math.max(0.6, normalized));
}

function headingStyle(block: Block, baseSizeRem: number): string {
  const o = block.overrides;
  const scale = clampScale(o?.fontSizeHeading);
  const font = o?.customFontHeading ? `font-family:${esc(o.customFontHeading)};` : "font-family:var(--bs-font-heading);";
  return `${font}font-size:calc(${baseSizeRem}rem * ${scale})`;
}

function bodyStyle(block: Block, baseSizeRem: number): string {
  const o = block.overrides;
  const scale = clampScale(o?.fontSizeBody);
  const font = o?.customFontBody ? `font-family:${esc(o.customFontBody)};` : "font-family:var(--bs-font-body);";
  return `${font}font-size:calc(${baseSizeRem}rem * ${scale})`;
}

function btnStyle(block: Block): string {
  const o = block.overrides;
  const base = bodyStyle(block, 0.9);
  const bg = o?.accentColor ? `background-color:${esc(o.accentColor)}` : "background-color:var(--bs-accent)";
  const color =
    block.variant === "A" || block.variant === "C"
      ? "color:var(--bs-secondary)"
      : "color:var(--bs-bg)";
  return `${base};${bg};${color}`;
}

function defaultBackground(block: Block): string {
  if (
    (block.type === "cta" && block.variant === "A") ||
    (block.type === "stats" && block.variant === "B") ||
    (block.type === "features" && block.variant === "C")
  ) return "var(--bs-primary)";
  if (
    (block.type === "hero" && block.variant === "B") ||
    (block.type === "testimonials" && block.variant === "B") ||
    (block.type === "cta" && block.variant === "B") ||
    (block.type === "stats" && block.variant === "A")
  ) return "var(--bs-surface)";
  return "var(--bs-bg)";
}

function defaultTextColor(block: Block): string {
  if (
    (block.type === "cta" && block.variant === "A") ||
    (block.type === "stats" && block.variant === "B") ||
    (block.type === "features" && block.variant === "C")
  ) return "var(--bs-secondary)";
  return "var(--bs-text)";
}

function sectionStyle(block: Block, tokens: DesignTokens): string {
  const o = block.overrides;
  const spacingFactor = spacingMap[tokens.spacing] ?? 1.25;
  const base = baseSpacingByType[block.type] ?? { y: 4, x: 3 };

  const yPad = `calc(${base.y * spacingFactor}rem + ${o?.paddingY ?? 0}px)`;
  const xPad = `calc(${base.x}rem + ${o?.paddingX ?? 0}px)`;
  const bg = o?.backgroundColor ?? defaultBackground(block);
  const color = o?.textColor ?? defaultTextColor(block);

  let s = `padding:${yPad} ${xPad};background-color:${bg};color:${color}`;
  if (o?.customFontHeading || o?.customFontBody) {
    s += `;font-family:${esc(o?.customFontHeading ?? o?.customFontBody ?? "")}`;
  }
  return s;
}

// ── Page navigation helpers ──

interface NormalizedPage {
  name: string;
  slug: string;
  blocks: Block[];
}

function normalizeSlug(raw: string): string {
  if (!raw || raw === "/") return "/";
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .split("/")
    .map((s) =>
      s
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .filter(Boolean)
    .join("/");
  return cleaned ? `/${cleaned}` : "/";
}

function normalizePages(project: Project): NormalizedPage[] {
  const pages = project.pages.map((page, i) => ({
    name: page.name || `Page ${i + 1}`,
    slug: normalizeSlug(page.slug || page.name || `page-${i + 1}`),
    blocks: page.blocks,
  }));
  if (!pages.some((p) => p.slug === "/") && pages[0]) {
    pages[0] = { ...pages[0], slug: "/" };
  }
  return pages;
}

function resolveList(
  csvValue: string | undefined,
  content: Record<string, string>,
  prefix: string
): string[] {
  const baseValues = (csvValue ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const indexedMap = new Map<number, string>();
  for (const [key, value] of Object.entries(content)) {
    if (!key.startsWith(prefix)) continue;
    const idx = Number(key.replace(prefix, ""));
    if (!Number.isFinite(idx) || idx < 0) continue;
    const v = (value ?? "").trim();
    if (v) indexedMap.set(idx, v);
  }

  const count = Math.max(baseValues.length, indexedMap.size);
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const v = indexedMap.get(i) || baseValues[i];
    if (v) result.push(v);
  }
  return result.length > 0 ? result : ["Home"];
}

function resolvePageHref(label: string, pages: NormalizedPage[]): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  for (const page of pages) {
    const pageNorm = page.slug
      .replace(/^\//, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    if (pageNorm === normalized) return page.slug;

    const nameNorm = page.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    if (nameNorm === normalized) return page.slug;
  }
  return "#";
}

function pageHref(slug: string): string {
  return slug === "/" ? "#/" : `#${slug}`;
}

// ── Block HTML renderers ──

function renderBlock(block: Block, pages: NormalizedPage[], projectName: string): string {
  const c = block.content;

  switch (block.type) {
    case "navbar": {
      const links = resolveList(c.links, c, "link_");
      return `<div class="bs-nav-shell">
        <span class="bs-logo" style="${headingStyle(block, 1.2)}">${esc(text(c.logo, projectName))}</span>
        <div class="bs-links" style="${bodyStyle(block, 0.9)}">
          ${links.map((l) => `<a href="${pageHref(resolvePageHref(l, pages))}" class="bs-link">${esc(l)}</a>`).join("\n")}
        </div>
      </div>`;
    }

    case "hero": {
      const img = c.image?.trim();

      if (block.variant === "B") {
        return `${img ? `<div class="bs-hero-bg-img"><img src="${esc(img)}" alt=""></div>` : ""}
          <div class="bs-hero-wrap">
            <span class="bs-eyebrow" style="${bodyStyle(block, 0.75)}">${esc(text(c.cta, "Featured"))}</span>
            <h1 class="bs-heading" style="${headingStyle(block, 4.2)}">${esc(text(c.headline, "Build a clear message"))}</h1>
            <p class="bs-subheading" style="${bodyStyle(block, 1.05)}">${esc(text(c.subheadline, "Describe your offer in one sentence."))}</p>
          </div>`;
      }

      if (block.variant === "C" || block.variant === "D") {
        return `<div class="bs-hero-wrap">
          <div>
            <h1 class="bs-heading" style="${headingStyle(block, 3.2)}">${esc(text(c.headline, "A strong headline"))}</h1>
            <p class="bs-subheading" style="${bodyStyle(block, 1)}">${esc(text(c.subheadline, "A supporting statement for your hero block."))}</p>
            <button class="bs-btn" style="${btnStyle(block)}">${esc(text(c.cta, "Get Started"))}</button>
          </div>
          <div class="bs-hero-side">${img ? `<img src="${esc(img)}" alt="">` : ""}</div>
        </div>`;
      }

      if (block.variant === "E") {
        return `<div class="bs-hero-wrap" style="justify-items:start">
            <h1 class="bs-heading" style="${headingStyle(block, 3.75)}">${esc(text(c.headline, "A modern homepage"))}</h1>
            <p class="bs-subheading" style="${bodyStyle(block, 1.1)}">${esc(text(c.subheadline, "Use this area to quickly explain your value proposition."))}</p>
            <button class="bs-btn" style="${btnStyle(block)}">${esc(text(c.cta, "Learn More"))}</button>
          </div>
          ${img ? `<div class="bs-hero-side" style="margin-top:2rem;width:100%"><img src="${esc(img)}" alt=""></div>` : ""}`;
      }

      // variant A (default)
      return `${img ? `<div class="bs-hero-bg-img"><img src="${esc(img)}" alt=""></div>` : ""}
        <div class="bs-hero-wrap" style="text-align:center;justify-items:center">
          <h1 class="bs-heading" style="${headingStyle(block, 3.75)}">${esc(text(c.headline, "A modern homepage"))}</h1>
          <p class="bs-subheading" style="${bodyStyle(block, 1.1)}">${esc(text(c.subheadline, "Use this area to quickly explain your value proposition."))}</p>
          <button class="bs-btn" style="${btnStyle(block)}">${esc(text(c.cta, "Learn More"))}</button>
        </div>`;
    }

    case "features": {
      const items = [1, 2, 3].map((i) => ({
        title: text(c[`feature${i}_title`], `Feature ${i}`),
        desc: text(c[`feature${i}_desc`], "Describe this feature."),
        image: c[`feature${i}_image`]?.trim(),
      }));
      const sectionImage = c.image?.trim();

      if (block.variant === "B") {
        return `<div class="bs-features-wrap">
          <h2 class="bs-heading" style="${headingStyle(block, 2.2)}">${esc(text(c.title, "What we do"))}</h2>
          <div>
            ${items.map((item, i) => `<article class="bs-feature-row">
              <span class="bs-feature-index">${String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 class="bs-heading" style="${headingStyle(block, 1.2)}">${esc(item.title)}</h3>
                <p class="bs-subheading" style="${bodyStyle(block, 0.95)}">${esc(item.desc)}</p>
              </div>
            </article>`).join("\n")}
          </div>
        </div>`;
      }

      if (block.variant === "D" || block.variant === "E") {
        return `<div class="bs-features-wrap">
          <div style="display:grid;grid-template-columns:${sectionImage ? "1fr 1fr" : "1fr"};gap:2rem;align-items:center">
            <div>
              <h2 class="bs-heading" style="${headingStyle(block, 2.2)}">${esc(text(c.title, "Features"))}</h2>
              <p class="bs-subheading" style="${bodyStyle(block, 0.9)};margin-top:0.5rem">${esc(text(c.subtitle, "A short supporting subtitle"))}</p>
            </div>
            ${sectionImage ? `<div class="bs-hero-side"><img src="${esc(sectionImage)}" alt=""></div>` : ""}
          </div>
          <div class="bs-features-grid">
            ${items.map((item) => `<article class="bs-feature-card">
              ${item.image ? `<img class="bs-feature-img" src="${esc(item.image)}" alt="">` : ""}
              <h3 class="bs-heading" style="${headingStyle(block, 1.1)}">${esc(item.title)}</h3>
              <p class="bs-subheading" style="${bodyStyle(block, 0.9)}">${esc(item.desc)}</p>
            </article>`).join("\n")}
          </div>
        </div>`;
      }

      // variant A / C
      return `<div class="bs-features-wrap">
        <h2 class="bs-heading" style="${headingStyle(block, 2.2)}">${esc(text(c.title, "Features"))}</h2>
        <p class="bs-subheading" style="${bodyStyle(block, 0.9)}">${esc(text(c.subtitle, "A short supporting subtitle"))}</p>
        <div class="bs-features-grid">
          ${items.map((item) => `<article class="bs-feature-card">
            ${item.image ? `<img class="bs-feature-img" src="${esc(item.image)}" alt="">` : ""}
            <h3 class="bs-heading" style="${headingStyle(block, 1.1)}">${esc(item.title)}</h3>
            <p class="bs-subheading" style="${bodyStyle(block, 0.9)}">${esc(item.desc)}</p>
          </article>`).join("\n")}
        </div>
      </div>`;
    }

    case "stats": {
      const stats = [1, 2, 3, 4].map((i) => ({
        value: text(c[`stat${i}_value`], "0"),
        label: text(c[`stat${i}_label`], "Metric"),
      }));
      return `<div class="bs-stats-wrap">
        <div class="bs-stats-grid">
          ${stats.map((s) => `<article class="bs-stat">
            <h3 class="bs-stat-value" style="${headingStyle(block, 2.4)}">${esc(s.value)}</h3>
            <p class="bs-stat-label" style="${bodyStyle(block, 0.74)}">${esc(s.label)}</p>
          </article>`).join("\n")}
        </div>
      </div>`;
    }

    case "testimonials": {
      if (block.variant === "B") {
        const avatar1 = c.avatar1?.trim();
        return `<div class="bs-testimonials-wrap">
          <h2 class="bs-heading" style="${headingStyle(block, 2.2)}">${esc(text(c.title, "Testimonials"))}</h2>
          <article class="bs-testimonial-card">
            <p class="bs-quote" style="${bodyStyle(block, 1.2)}">"${esc(text(c.quote1, "A customer statement goes here."))}"</p>
            <div class="bs-person" style="${bodyStyle(block, 0.88)};display:flex;align-items:center;gap:0.75rem">
              ${avatar1 ? `<img class="bs-avatar" src="${esc(avatar1)}" alt="">` : `<div class="bs-avatar-placeholder"></div>`}
              <div>
                <strong>${esc(text(c.author1, "Customer"))}</strong>
                <span class="bs-role" style="display:block">${esc(text(c.role1, "Role"))}</span>
              </div>
            </div>
          </article>
        </div>`;
      }

      const entries = [1, 2].map((i) => ({
        quote: text(c[`quote${i}`], "A customer statement goes here."),
        author: text(c[`author${i}`], "Customer"),
        role: text(c[`role${i}`], "Role"),
        avatar: c[`avatar${i}`]?.trim(),
      }));
      return `<div class="bs-testimonials-wrap">
        <h2 class="bs-heading" style="${headingStyle(block, 2.2)}">${esc(text(c.title, "What clients say"))}</h2>
        <div class="bs-testimonials-grid">
          ${entries.map((e) => `<article class="bs-testimonial-card">
            <p class="bs-quote" style="${bodyStyle(block, 0.95)}">"${esc(e.quote)}"</p>
            <div class="bs-person" style="${bodyStyle(block, 0.82)};display:flex;align-items:center;gap:0.75rem">
              ${e.avatar ? `<img class="bs-avatar" src="${esc(e.avatar)}" alt="">` : `<div class="bs-avatar-placeholder"></div>`}
              <div>
                <strong>${esc(e.author)}</strong>
                <span class="bs-role" style="display:block">${esc(e.role)}</span>
              </div>
            </div>
          </article>`).join("\n")}
        </div>
      </div>`;
    }

    case "cta": {
      const ctaImage = c.image?.trim();
      if (block.variant === "B") {
        return `<div class="bs-cta-wrap">
          <div>
            <h2 class="bs-heading" style="${headingStyle(block, 2)}">${esc(text(c.headline, "Ready to get started?"))}</h2>
            <p class="bs-subheading" style="${bodyStyle(block, 0.92)}">${esc(text(c.subheadline, "Use this call to action to drive conversions."))}</p>
          </div>
          <button class="bs-btn" style="${btnStyle(block)}">${esc(text(c.cta, "Start now"))}</button>
        </div>`;
      }
      if (block.variant === "C" && ctaImage) {
        return `<div class="bs-cta-wrap" style="text-align:center">
          <div class="bs-cta-img" style="max-height:280px;margin:0 auto 1.5rem"><img src="${esc(ctaImage)}" alt=""></div>
          <h2 class="bs-heading" style="${headingStyle(block, 2.2)}">${esc(text(c.headline, "Let's build something great"))}</h2>
          <p class="bs-subheading" style="${bodyStyle(block, 0.95)}">${esc(text(c.subheadline, "Use this section for a final conversion prompt."))}</p>
          <button class="bs-btn" style="${btnStyle(block)}">${esc(text(c.cta, "Contact us"))}</button>
        </div>`;
      }
      const align = block.variant === "C" ? "center" : "left";
      return `<div class="bs-cta-wrap" style="text-align:${align}">
        <h2 class="bs-heading" style="${headingStyle(block, 2.2)}">${esc(text(c.headline, "Let's build something great"))}</h2>
        <p class="bs-subheading" style="${bodyStyle(block, 0.95)}">${esc(text(c.subheadline, "Use this section for a final conversion prompt."))}</p>
        <button class="bs-btn" style="${btnStyle(block)}">${esc(text(c.cta, "Contact us"))}</button>
      </div>`;
    }

    case "footer": {
      const links = resolveList(c.links, c, "footerlink_");
      return `<div class="bs-footer-shell">
        <span class="bs-logo" style="${headingStyle(block, 0.95)}">${esc(text(c.logo, projectName))}</span>
        <span style="${bodyStyle(block, 0.78)}">${esc(text(c.copyright, "© All rights reserved"))}</span>
        <div class="bs-links" style="${bodyStyle(block, 0.78)}">
          ${links.map((l) => `<a href="${pageHref(resolvePageHref(l, pages))}" class="bs-link">${esc(l)}</a>`).join("\n")}
        </div>
      </div>`;
    }

    default:
      return `<div class="bs-cta-wrap"><h2 class="bs-heading">Unsupported: ${esc(block.type)}</h2></div>`;
  }
}

// ── Main export ──

export function buildPreviewHTML(project: Project): string {
  const pages = normalizePages(project);
  const tokens = project.tokens;

  const pagesHTML = pages
    .map((page) => {
      const blocksHTML = page.blocks
        .map((block) => {
          const hasImage = Boolean(block.content.image?.trim());
          const hasBg =
            hasImage && block.type === "hero" && (block.variant === "A" || block.variant === "B");
          const cls = `bs-block bs-${block.type} bs-v${block.variant.toLowerCase()}${hasBg ? " bs-block-has-bg" : ""}`;
          return `<section class="${cls}" style="${sectionStyle(block, tokens)}">${renderBlock(block, pages, project.name)}</section>`;
        })
        .join("\n");

      return `<div class="bs-page-container" data-page-slug="${esc(page.slug)}">
        ${blocksHTML}
      </div>`;
    })
    .join("\n");

  const rootVars = `
    --bs-primary: ${tokens.primaryColor};
    --bs-secondary: ${tokens.secondaryColor};
    --bs-accent: ${tokens.accentColor};
    --bs-bg: ${tokens.backgroundColor};
    --bs-surface: ${tokens.surfaceColor};
    --bs-text: ${tokens.textColor};
    --bs-text-muted: ${tokens.textMuted};
    --bs-font-heading: ${tokens.fontHeading};
    --bs-font-body: ${tokens.fontBody};
    --bs-radius: ${radiusMap[tokens.borderRadius] ?? "10px"};
    --bs-spacing-factor: ${spacingMap[tokens.spacing] ?? 1.25};
  `;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(project.name)} – Preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Georgia&display=swap" rel="stylesheet">
<style>
:root { ${rootVars} }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--bs-font-body);
  color: var(--bs-text);
  background: var(--bs-bg);
  min-height: 100vh;
}
a { color: inherit; text-decoration: none; }
.bs-page-container { display: none; min-height: 100vh; background: var(--bs-bg); color: var(--bs-text); }
.bs-page-container.active { display: block; }
.bs-block { width: 100%; }
.bs-nav-shell, .bs-footer-shell, .bs-hero-wrap, .bs-features-wrap, .bs-stats-wrap, .bs-testimonials-wrap, .bs-cta-wrap {
  max-width: 1200px; margin: 0 auto;
}
.bs-nav-shell, .bs-footer-shell { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.bs-logo { font-weight: 700; letter-spacing: -0.02em; }
.bs-links { display: flex; flex-wrap: wrap; gap: 1rem; }
.bs-link { opacity: 0.68; transition: opacity 180ms ease; cursor: pointer; }
.bs-link:hover { opacity: 1; }
.bs-hero-wrap { display: grid; gap: 1.25rem; }
.bs-vb .bs-hero-wrap { justify-items: start; }
.bs-vc .bs-hero-wrap { grid-template-columns: 1fr 1fr; align-items: stretch; }
.bs-hero-side { border-radius: var(--bs-radius); background: color-mix(in srgb, var(--bs-accent) 12%, var(--bs-surface)); min-height: 280px; overflow: hidden; position: relative; }
.bs-hero-side img { width: 100%; height: 100%; object-fit: cover; display: block; }
.bs-hero-bg-img { position: absolute; inset: 0; z-index: 0; }
.bs-hero-bg-img img { width: 100%; height: 100%; object-fit: cover; }
.bs-hero-bg-img + .bs-hero-wrap { position: relative; z-index: 1; }
.bs-block-has-bg { position: relative; overflow: hidden; }
.bs-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.bs-avatar-placeholder { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; background: color-mix(in srgb, var(--bs-accent) 25%, transparent); }
.bs-feature-img { width: 100%; aspect-ratio: 16/10; object-fit: cover; border-radius: var(--bs-radius); margin-bottom: 1rem; }
.bs-cta-img { border-radius: var(--bs-radius); overflow: hidden; }
.bs-cta-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.bs-heading { margin: 0; font-family: var(--bs-font-heading); letter-spacing: -0.02em; }
.bs-subheading { margin: 0; color: var(--bs-text-muted); line-height: 1.65; }
.bs-btn { width: fit-content; border: 0; border-radius: var(--bs-radius); padding: 0.75rem 1.25rem; font-size: 0.9rem; font-weight: 600; background: var(--bs-text); color: var(--bs-bg); cursor: pointer; transition: opacity 150ms; }
.bs-btn:hover { opacity: 0.85; }
.bs-eyebrow { font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--bs-accent); }
.bs-features-grid, .bs-stats-grid, .bs-testimonials-grid { display: grid; gap: 1.25rem; }
.bs-features-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.bs-feature-card { padding: 1.25rem; border: 1px solid color-mix(in srgb, var(--bs-text) 8%, transparent); border-radius: var(--bs-radius); background: color-mix(in srgb, var(--bs-surface) 80%, transparent); }
.bs-feature-row { display: grid; grid-template-columns: auto 1fr; gap: 1.5rem; padding: 1.1rem 0; border-bottom: 1px solid color-mix(in srgb, var(--bs-text) 10%, transparent); }
.bs-feature-index { font-size: 2rem; font-weight: 700; opacity: 0.2; }
.bs-stats-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.bs-stat { text-align: center; }
.bs-stat-value { margin: 0; font-family: var(--bs-font-heading); }
.bs-stat-label { margin-top: 0.4rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--bs-text-muted); }
.bs-testimonials-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.bs-testimonial-card { border-radius: var(--bs-radius); padding: 1.25rem; background: color-mix(in srgb, var(--bs-surface) 85%, transparent); }
.bs-quote { margin: 0; line-height: 1.7; }
.bs-person { margin-top: 1rem; display: grid; gap: 0.2rem; }
.bs-role { color: var(--bs-text-muted); font-size: 0.84rem; }
.bs-cta-wrap { display: grid; gap: 1rem; }
.bs-vb .bs-cta-wrap { grid-template-columns: 1fr auto; align-items: center; }
.bs-footer-shell { border-top: 1px solid color-mix(in srgb, var(--bs-text) 10%, transparent); color: var(--bs-text-muted); font-size: 0.86rem; }

@media (max-width: 980px) {
  .bs-features-grid, .bs-stats-grid, .bs-testimonials-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bs-vc .bs-hero-wrap, .bs-vb .bs-cta-wrap { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .bs-nav-shell, .bs-footer-shell { flex-direction: column; align-items: flex-start; }
  .bs-features-grid, .bs-stats-grid, .bs-testimonials-grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>
${pagesHTML}
<script>
(function() {
  var pages = document.querySelectorAll('.bs-page-container');
  var slugs = [];
  pages.forEach(function(p) { slugs.push(p.getAttribute('data-page-slug')); });

  function navigate() {
    var hash = location.hash.replace(/^#/, '') || '/';
    var found = false;
    pages.forEach(function(p) {
      var slug = p.getAttribute('data-page-slug');
      if (slug === hash) {
        p.classList.add('active');
        found = true;
      } else {
        p.classList.remove('active');
      }
    });
    if (!found && pages.length > 0) {
      pages[0].classList.add('active');
    }
    window.scrollTo(0, 0);
    // notify parent of URL change
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'bs-preview-navigate', slug: hash }, '*');
    }
  }

  window.addEventListener('hashchange', navigate);
  navigate();

  // listen for parent navigation commands
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'bs-preview-goto') {
      location.hash = e.data.slug || '/';
    }
  });
})();
</script>
</body>
</html>`;
}
