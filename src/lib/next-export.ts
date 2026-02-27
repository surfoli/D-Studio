import { BlockOverrides, Project } from "./types";

export interface NextExportFile {
  path: string;
  content: string;
}

function normalizeExportPath(rawPath: string): string {
  return (rawPath || "")
    .replace(/\\/g, "/")
    .trim()
    .replace(/^\/+/, "")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "")
    .replace(/\/{2,}/g, "/");
}

interface ExportSiteData {
  projectName: string;
  tokens: Project["tokens"];
  pages: Array<{
    name: string;
    slug: string;
    blocks: Array<{
      type: string;
      variant: string;
      content: Record<string, string>;
      overrides?: BlockOverrides;
    }>;
  }>;
}

const PACKAGE_JSON_TEMPLATE = `{
  "name": "d3studio-export",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
`;

const TSCONFIG_TEMPLATE = `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
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
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;

const NEXT_ENV_TEMPLATE = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited manually.
`;

const NEXT_CONFIG_TEMPLATE = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
`;

const GITIGNORE_TEMPLATE = `.next
node_modules
.env*
!.env.example
`;

const README_TEMPLATE = `# D³ Studio Export

Dieses Projekt wurde aus D³ Studio exportiert.

## Starten

1. \`npm install\`
2. \`npm run dev\`

Die Routen sind als echte Next.js App-Router Seiten erzeugt worden (\`app/**/page.tsx\`).

## Assets / Bilder

Bilder werden in \`public/assets/\` abgelegt. Externe Bilder (URLs) werden direkt referenziert.
Lokale Bilder können über \`/assets/filename.jpg\` eingebunden werden.
`;

const LAYOUT_TEMPLATE = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "D³ Studio Export",
  description: "Generated with D³ Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;

const NOT_FOUND_TEMPLATE = `import Link from "next/link";

export default function NotFound() {
  return (
    <main className="bs-not-found">
      <h1>404</h1>
      <p>Diese Seite existiert nicht in diesem Export.</p>
      <Link href="/">Zur Startseite</Link>
    </main>
  );
}
`;

const GLOBALS_TEMPLATE = `:root {
  --bs-primary: #111111;
  --bs-secondary: #f5f5f5;
  --bs-accent: #2563eb;
  --bs-bg: #ffffff;
  --bs-surface: #f8f8f8;
  --bs-text: #111111;
  --bs-text-muted: #6b7280;
  --bs-font-heading: "Inter", sans-serif;
  --bs-font-body: "Inter", sans-serif;
  --bs-radius: 12px;
  --bs-spacing-factor: 1.25;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--bs-font-body);
  color: var(--bs-text);
  background: #ececec;
}

a {
  color: inherit;
  text-decoration: none;
}

.bs-page {
  min-height: 100vh;
  background: var(--bs-bg);
  color: var(--bs-text);
}

.bs-page-label {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: color-mix(in srgb, var(--bs-bg) 84%, white);
  border-bottom: 1px solid color-mix(in srgb, var(--bs-text) 8%, transparent);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.bs-page-label small {
  color: var(--bs-text-muted);
  font-size: 0.7rem;
}

.bs-block {
  width: 100%;
}

.bs-nav-shell,
.bs-footer-shell,
.bs-hero-wrap,
.bs-features-wrap,
.bs-stats-wrap,
.bs-testimonials-wrap,
.bs-cta-wrap {
  max-width: 1200px;
  margin: 0 auto;
}

.bs-nav-shell,
.bs-footer-shell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.bs-logo {
  font-weight: 700;
  letter-spacing: -0.02em;
}

.bs-links {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.bs-link {
  opacity: 0.68;
  transition: opacity 180ms ease;
}

.bs-link:hover {
  opacity: 1;
}

.bs-hero-wrap {
  display: grid;
  gap: 1.25rem;
}

.bs-vb .bs-hero-wrap {
  justify-items: start;
}

.bs-vc .bs-hero-wrap {
  grid-template-columns: 1fr 1fr;
  align-items: stretch;
}

.bs-hero-side {
  border-radius: var(--bs-radius);
  background: color-mix(in srgb, var(--bs-accent) 12%, var(--bs-surface));
  min-height: 280px;
  overflow: hidden;
  position: relative;
}

.bs-hero-side img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.bs-hero-bg-img {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.bs-hero-bg-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bs-hero-bg-img + .bs-hero-wrap {
  position: relative;
  z-index: 1;
}

.bs-block-has-bg {
  position: relative;
  overflow: hidden;
}

.bs-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.bs-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--bs-accent) 25%, transparent);
}

.bs-feature-img {
  width: 100%;
  aspect-ratio: 16/10;
  object-fit: cover;
  border-radius: var(--bs-radius);
  margin-bottom: 1rem;
}

.bs-cta-img {
  border-radius: var(--bs-radius);
  overflow: hidden;
}

.bs-cta-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.bs-heading {
  margin: 0;
  font-family: var(--bs-font-heading);
  letter-spacing: -0.02em;
}

.bs-subheading {
  margin: 0;
  color: var(--bs-text-muted);
  line-height: 1.65;
}

.bs-btn {
  width: fit-content;
  border: 0;
  border-radius: var(--bs-radius);
  padding: 0.75rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  background: var(--bs-text);
  color: var(--bs-bg);
}

.bs-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--bs-accent);
}

.bs-features-grid,
.bs-stats-grid,
.bs-testimonials-grid {
  display: grid;
  gap: 1.25rem;
}

.bs-features-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.bs-feature-card {
  padding: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--bs-text) 8%, transparent);
  border-radius: var(--bs-radius);
  background: color-mix(in srgb, var(--bs-surface) 80%, transparent);
}

.bs-feature-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1.5rem;
  padding: 1.1rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--bs-text) 10%, transparent);
}

.bs-feature-index {
  font-size: 2rem;
  font-weight: 700;
  opacity: 0.2;
}

.bs-stats-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.bs-stat {
  text-align: center;
}

.bs-stat-value {
  margin: 0;
  font-family: var(--bs-font-heading);
}

.bs-stat-label {
  margin-top: 0.4rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--bs-text-muted);
}

.bs-testimonials-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.bs-testimonial-card {
  border-radius: var(--bs-radius);
  padding: 1.25rem;
  background: color-mix(in srgb, var(--bs-surface) 85%, transparent);
}

.bs-quote {
  margin: 0;
  line-height: 1.7;
}

.bs-person {
  margin-top: 1rem;
  display: grid;
  gap: 0.2rem;
}

.bs-role {
  color: var(--bs-text-muted);
  font-size: 0.84rem;
}

.bs-cta-wrap {
  display: grid;
  gap: 1rem;
}

.bs-vb .bs-cta-wrap {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.bs-footer-shell {
  border-top: 1px solid color-mix(in srgb, var(--bs-text) 10%, transparent);
  color: var(--bs-text-muted);
  font-size: 0.86rem;
}

.bs-not-found {
  min-height: 100vh;
  display: grid;
  place-content: center;
  gap: 0.8rem;
  text-align: center;
}

.bs-not-found a {
  color: var(--bs-accent);
  font-weight: 600;
}

@media (max-width: 980px) {
  .bs-features-grid,
  .bs-stats-grid,
  .bs-testimonials-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bs-vc .bs-hero-wrap,
  .bs-vb .bs-cta-wrap {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .bs-page-label {
    position: static;
  }

  .bs-nav-shell,
  .bs-footer-shell {
    flex-direction: column;
    align-items: flex-start;
  }

  .bs-features-grid,
  .bs-stats-grid,
  .bs-testimonials-grid {
    grid-template-columns: 1fr;
  }
}
`;

const SITE_PAGE_RENDERER_TEMPLATE = `import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { siteData, type SiteBlock, type SiteBlockOverrides } from "@/lib/site-data";

const spacingMap = {
  compact: 1,
  balanced: 1.25,
  spacious: 1.5,
} as const;

const baseSpacingByType: Record<string, { y: number; x: number }> = {
  navbar: { y: 1.25, x: 2 },
  hero: { y: 6, x: 4 },
  features: { y: 5, x: 4 },
  stats: { y: 4, x: 4 },
  testimonials: { y: 5, x: 4 },
  cta: { y: 4, x: 4 },
  footer: { y: 1.5, x: 2 },
};

const radiusMap = {
  sharp: "0px",
  soft: "10px",
  rounded: "18px",
} as const;

type ContentMap = Record<string, string | undefined>;

export function renderSitePage(slug: string) {
  const normalizedSlug = normalizeSlug(slug);
  const page = siteData.pages.find(
    (candidate) => normalizeSlug(candidate.slug) === normalizedSlug
  );

  if (!page) {
    notFound();
  }

  const rootStyle = {
    "--bs-primary": siteData.tokens.primaryColor,
    "--bs-secondary": siteData.tokens.secondaryColor,
    "--bs-accent": siteData.tokens.accentColor,
    "--bs-bg": siteData.tokens.backgroundColor,
    "--bs-surface": siteData.tokens.surfaceColor,
    "--bs-text": siteData.tokens.textColor,
    "--bs-text-muted": siteData.tokens.textMuted,
    "--bs-font-heading": siteData.tokens.fontHeading,
    "--bs-font-body": siteData.tokens.fontBody,
    "--bs-radius": radiusMap[siteData.tokens.borderRadius] ?? radiusMap.soft,
    "--bs-spacing-factor": String(
      spacingMap[siteData.tokens.spacing] ?? spacingMap.balanced
    ),
  } as CSSProperties;

  return (
    <main className="bs-page" style={rootStyle}>
      <div className="bs-page-label">
        <span>{siteData.projectName}</span>
        <small>{page.name}</small>
      </div>

      {page.blocks.map((block, index) => {
        const hasImage = Boolean((block.content as Record<string, string>).image?.trim());
        const hasBg = hasImage && block.type === "hero" && (block.variant === "A" || block.variant === "B");
        return (
          <section
            key={index}
            className={"bs-block bs-" + block.type + " bs-v" + block.variant.toLowerCase() + (hasBg ? " bs-block-has-bg" : "")}
            style={getSectionStyle(block)}
          >
            {renderBlock(block)}
          </section>
        );
      })}
    </main>
  );
}

function renderBlock(block: SiteBlock) {
  const content = block.content as ContentMap;

  switch (block.type) {
    case "navbar": {
      const navLinks = resolveList(content.links, content, "link_");
      return (
        <div className="bs-nav-shell">
          <span className="bs-logo" style={getHeadingStyle(block, 1.2)}>
            {text(content.logo, siteData.projectName)}
          </span>
          <div className="bs-links" style={getBodyStyle(block, 0.9)}>
            {navLinks.map((label, index) => (
              <Link key={index} href={resolvePageHref(label)} className="bs-link">
                {label}
              </Link>
            ))}
          </div>
        </div>
      );
    }

    case "hero": {
      const heroImage = content.image?.trim();

      if (block.variant === "B") {
        return (
          <>
            {heroImage && (
              <div className="bs-hero-bg-img">
                <img src={heroImage} alt="" />
              </div>
            )}
            <div className="bs-hero-wrap">
              <span className="bs-eyebrow" style={getBodyStyle(block, 0.75)}>
                {text(content.cta, "Featured")}
              </span>
              <h1 className="bs-heading" style={getHeadingStyle(block, 4.2)}>
                {text(content.headline, "Build a clear message")}
              </h1>
              <p className="bs-subheading" style={getBodyStyle(block, 1.05)}>
                {text(content.subheadline, "Describe your offer in one sentence.")}
              </p>
            </div>
          </>
        );
      }

      if (block.variant === "C" || block.variant === "D") {
        return (
          <div className="bs-hero-wrap">
            <div>
              <h1 className="bs-heading" style={getHeadingStyle(block, 3.2)}>
                {text(content.headline, "A strong headline")}
              </h1>
              <p className="bs-subheading" style={getBodyStyle(block, 1)}>
                {text(content.subheadline, "A supporting statement for your hero block.")}
              </p>
              <button className="bs-btn" style={getButtonStyle(block)}>
                {text(content.cta, "Get Started")}
              </button>
            </div>
            <div className="bs-hero-side">
              {heroImage && <img src={heroImage} alt="" />}
            </div>
          </div>
        );
      }

      if (block.variant === "E") {
        return (
          <>
            <div className="bs-hero-wrap" style={{ justifyItems: "start" }}>
              <h1 className="bs-heading" style={getHeadingStyle(block, 3.75)}>
                {text(content.headline, "A modern homepage")}
              </h1>
              <p className="bs-subheading" style={getBodyStyle(block, 1.1)}>
                {text(content.subheadline, "Use this area to quickly explain your value proposition.")}
              </p>
              <button className="bs-btn" style={getButtonStyle(block)}>
                {text(content.cta, "Learn More")}
              </button>
            </div>
            {heroImage && (
              <div className="bs-hero-side" style={{ marginTop: "2rem", width: "100%" }}>
                <img src={heroImage} alt="" />
              </div>
            )}
          </>
        );
      }

      return (
        <>
          {heroImage && (
            <div className="bs-hero-bg-img">
              <img src={heroImage} alt="" />
            </div>
          )}
          <div className="bs-hero-wrap" style={{ textAlign: "center", justifyItems: "center" }}>
            <h1 className="bs-heading" style={getHeadingStyle(block, 3.75)}>
              {text(content.headline, "A modern homepage")}
            </h1>
            <p className="bs-subheading" style={getBodyStyle(block, 1.1)}>
              {text(content.subheadline, "Use this area to quickly explain your value proposition.")}
            </p>
            <button className="bs-btn" style={getButtonStyle(block)}>
              {text(content.cta, "Learn More")}
            </button>
          </div>
        </>
      );
    }

    case "features": {
      const featureItems = [1, 2, 3].map((index) => ({
        title: text(content["feature" + index + "_title"], "Feature " + index),
        description: text(content["feature" + index + "_desc"], "Describe this feature."),
        image: content["feature" + index + "_image"]?.trim(),
      }));
      const sectionImage = content.image?.trim();

      if (block.variant === "B") {
        return (
          <div className="bs-features-wrap">
            <h2 className="bs-heading" style={getHeadingStyle(block, 2.2)}>
              {text(content.title, "What we do")}
            </h2>
            <div>
              {featureItems.map((item, index) => (
                <article key={index} className="bs-feature-row">
                  <span className="bs-feature-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="bs-heading" style={getHeadingStyle(block, 1.2)}>
                      {item.title}
                    </h3>
                    <p className="bs-subheading" style={getBodyStyle(block, 0.95)}>
                      {item.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      }

      if (block.variant === "D" || block.variant === "E") {
        return (
          <div className="bs-features-wrap">
            <div style={{ display: "grid", gridTemplateColumns: sectionImage ? "1fr 1fr" : "1fr", gap: "2rem", alignItems: "center" }}>
              <div>
                <h2 className="bs-heading" style={getHeadingStyle(block, 2.2)}>
                  {text(content.title, "Features")}
                </h2>
                <p className="bs-subheading" style={{ ...getBodyStyle(block, 0.9), marginTop: "0.5rem" }}>
                  {text(content.subtitle, "A short supporting subtitle")}
                </p>
              </div>
              {sectionImage && (
                <div className="bs-hero-side">
                  <img src={sectionImage} alt="" />
                </div>
              )}
            </div>
            <div className="bs-features-grid">
              {featureItems.map((item, index) => (
                <article key={index} className="bs-feature-card">
                  {item.image && <img className="bs-feature-img" src={item.image} alt="" />}
                  <h3 className="bs-heading" style={getHeadingStyle(block, 1.1)}>
                    {item.title}
                  </h3>
                  <p className="bs-subheading" style={getBodyStyle(block, 0.9)}>
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        );
      }

      return (
        <div className="bs-features-wrap">
          <h2 className="bs-heading" style={getHeadingStyle(block, 2.2)}>
            {text(content.title, "Features")}
          </h2>
          <p className="bs-subheading" style={getBodyStyle(block, 0.9)}>
            {text(content.subtitle, "A short supporting subtitle")}
          </p>
          <div className="bs-features-grid">
            {featureItems.map((item, index) => (
              <article key={index} className="bs-feature-card">
                {item.image && <img className="bs-feature-img" src={item.image} alt="" />}
                <h3 className="bs-heading" style={getHeadingStyle(block, 1.1)}>
                  {item.title}
                </h3>
                <p className="bs-subheading" style={getBodyStyle(block, 0.9)}>
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      );
    }

    case "stats": {
      const stats = [1, 2, 3, 4].map((index) => ({
        value: text(content["stat" + index + "_value"], "0"),
        label: text(content["stat" + index + "_label"], "Metric"),
      }));

      return (
        <div className="bs-stats-wrap">
          <div className="bs-stats-grid">
            {stats.map((entry, index) => (
              <article key={index} className="bs-stat">
                <h3 className="bs-stat-value" style={getHeadingStyle(block, 2.4)}>
                  {entry.value}
                </h3>
                <p className="bs-stat-label" style={getBodyStyle(block, 0.74)}>
                  {entry.label}
                </p>
              </article>
            ))}
          </div>
        </div>
      );
    }

    case "testimonials": {
      if (block.variant === "B") {
        const avatar1 = content.avatar1?.trim();
        return (
          <div className="bs-testimonials-wrap">
            <h2 className="bs-heading" style={getHeadingStyle(block, 2.2)}>
              {text(content.title, "Testimonials")}
            </h2>
            <article className="bs-testimonial-card">
              <p className="bs-quote" style={getBodyStyle(block, 1.2)}>
                "{text(content.quote1, "A customer statement goes here.")}"
              </p>
              <div className="bs-person" style={{ ...getBodyStyle(block, 0.88), display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {avatar1 ? <img className="bs-avatar" src={avatar1} alt="" /> : <div className="bs-avatar-placeholder" />}
                <div>
                  <strong>{text(content.author1, "Customer")}</strong>
                  <span className="bs-role" style={{ display: "block" }}>{text(content.role1, "Role")}</span>
                </div>
              </div>
            </article>
          </div>
        );
      }

      const entries = [1, 2].map((index) => ({
        quote: text(content["quote" + index], "A customer statement goes here."),
        author: text(content["author" + index], "Customer"),
        role: text(content["role" + index], "Role"),
        avatar: content["avatar" + index]?.trim(),
      }));

      return (
        <div className="bs-testimonials-wrap">
          <h2 className="bs-heading" style={getHeadingStyle(block, 2.2)}>
            {text(content.title, "What clients say")}
          </h2>
          <div className="bs-testimonials-grid">
            {entries.map((entry, index) => (
              <article key={index} className="bs-testimonial-card">
                <p className="bs-quote" style={getBodyStyle(block, 0.95)}>
                  "{entry.quote}"
                </p>
                <div className="bs-person" style={{ ...getBodyStyle(block, 0.82), display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {entry.avatar ? <img className="bs-avatar" src={entry.avatar} alt="" /> : <div className="bs-avatar-placeholder" />}
                  <div>
                    <strong>{entry.author}</strong>
                    <span className="bs-role" style={{ display: "block" }}>{entry.role}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      );
    }

    case "cta": {
      const ctaImage = content.image?.trim();

      if (block.variant === "B") {
        return (
          <div className="bs-cta-wrap">
            <div>
              <h2 className="bs-heading" style={getHeadingStyle(block, 2)}>
                {text(content.headline, "Ready to get started?")}
              </h2>
              <p className="bs-subheading" style={getBodyStyle(block, 0.92)}>
                {text(content.subheadline, "Use this call to action to drive conversions.")}
              </p>
            </div>
            <button className="bs-btn" style={getButtonStyle(block)}>
              {text(content.cta, "Start now")}
            </button>
          </div>
        );
      }

      if (block.variant === "C" && ctaImage) {
        return (
          <div className="bs-cta-wrap" style={{ textAlign: "center" }}>
            <div className="bs-cta-img" style={{ maxHeight: "280px", margin: "0 auto 1.5rem" }}>
              <img src={ctaImage} alt="" />
            </div>
            <h2 className="bs-heading" style={getHeadingStyle(block, 2.2)}>
              {text(content.headline, "Let's build something great")}
            </h2>
            <p className="bs-subheading" style={getBodyStyle(block, 0.95)}>
              {text(content.subheadline, "Use this section for a final conversion prompt.")}
            </p>
            <button className="bs-btn" style={getButtonStyle(block)}>
              {text(content.cta, "Contact us")}
            </button>
          </div>
        );
      }

      return (
        <div className="bs-cta-wrap" style={{ textAlign: block.variant === "C" ? "center" : "left" }}>
          <h2 className="bs-heading" style={getHeadingStyle(block, 2.2)}>
            {text(content.headline, "Let's build something great")}
          </h2>
          <p className="bs-subheading" style={getBodyStyle(block, 0.95)}>
            {text(content.subheadline, "Use this section for a final conversion prompt.")}
          </p>
          <button className="bs-btn" style={getButtonStyle(block)}>
            {text(content.cta, "Contact us")}
          </button>
        </div>
      );
    }

    case "footer": {
      const footerLinks = resolveList(content.links, content, "footerlink_");
      return (
        <div className="bs-footer-shell">
          <span className="bs-logo" style={getHeadingStyle(block, 0.95)}>
            {text(content.logo, siteData.projectName)}
          </span>
          <span style={getBodyStyle(block, 0.78)}>
            {text(content.copyright, "© All rights reserved")}
          </span>
          <div className="bs-links" style={getBodyStyle(block, 0.78)}>
            {footerLinks.map((label, index) => (
              <Link key={index} href={resolvePageHref(label)} className="bs-link">
                {label}
              </Link>
            ))}
          </div>
        </div>
      );
    }

    default:
      return (
        <div className="bs-cta-wrap">
          <h2 className="bs-heading">Unsupported block: {block.type}</h2>
        </div>
      );
  }
}

function getSectionStyle(block: SiteBlock): CSSProperties {
  const overrides = block.overrides as SiteBlockOverrides | undefined;
  const spacingFactor = spacingMap[siteData.tokens.spacing] ?? spacingMap.balanced;
  const baseSpacing = baseSpacingByType[block.type] ?? { y: 4, x: 3 };

  const yPadding =
    "calc(" +
    String(baseSpacing.y * spacingFactor) +
    "rem + " +
    String(overrides?.paddingY ?? 0) +
    "px)";
  const xPadding =
    "calc(" +
    String(baseSpacing.x) +
    "rem + " +
    String(overrides?.paddingX ?? 0) +
    "px)";

  const style: CSSProperties = {
    paddingTop: yPadding,
    paddingBottom: yPadding,
    paddingLeft: xPadding,
    paddingRight: xPadding,
    backgroundColor: overrides?.backgroundColor ?? defaultBackground(block),
    color: overrides?.textColor ?? defaultTextColor(block),
  };

  if (overrides?.customFontHeading || overrides?.customFontBody) {
    style.fontFamily = overrides?.customFontHeading ?? overrides?.customFontBody;
  }

  return style;
}

function getHeadingStyle(block: SiteBlock, baseSizeRem: number): CSSProperties {
  const overrides = block.overrides as SiteBlockOverrides | undefined;
  const scale = clampScale(overrides?.fontSizeHeading);

  return {
    fontFamily: overrides?.customFontHeading ?? "var(--bs-font-heading)",
    fontSize: "calc(" + String(baseSizeRem) + "rem * " + String(scale) + ")",
  };
}

function getBodyStyle(block: SiteBlock, baseSizeRem: number): CSSProperties {
  const overrides = block.overrides as SiteBlockOverrides | undefined;
  const scale = clampScale(overrides?.fontSizeBody);

  return {
    fontFamily: overrides?.customFontBody ?? "var(--bs-font-body)",
    fontSize: "calc(" + String(baseSizeRem) + "rem * " + String(scale) + ")",
  };
}

function getButtonStyle(block: SiteBlock): CSSProperties {
  const overrides = block.overrides as SiteBlockOverrides | undefined;

  return {
    ...getBodyStyle(block, 0.9),
    backgroundColor: overrides?.accentColor ?? "var(--bs-accent)",
    color: block.variant === "A" || block.variant === "C" ? "var(--bs-secondary)" : "var(--bs-bg)",
  };
}

function resolveList(
  csvValue: string | undefined,
  content: ContentMap,
  indexedPrefix: string
): string[] {
  const baseValues = (csvValue ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const indexedMap = new Map<number, string>();

  for (const [key, value] of Object.entries(content)) {
    if (!key.startsWith(indexedPrefix)) continue;

    const index = Number(key.replace(indexedPrefix, ""));
    if (!Number.isFinite(index) || index < 0) continue;

    const nextValue = text(value, "");
    if (nextValue) {
      indexedMap.set(index, nextValue);
    }
  }

  const entryCount = Math.max(baseValues.length, indexedMap.size);
  const resolved: string[] = [];

  for (let index = 0; index < entryCount; index += 1) {
    const explicitValue = indexedMap.get(index);
    const csvEntry = baseValues[index];
    const nextValue = explicitValue || csvEntry;
    if (nextValue) {
      resolved.push(nextValue);
    }
  }

  return resolved.length > 0 ? resolved : ["Home"];
}

function resolvePageHref(label: string): string {
  const normalized = normalizeSlug(label);
  const fromSlug = siteData.pages.find(
    (page) => normalizeSlug(page.slug) === normalized
  );

  if (fromSlug) {
    return fromSlug.slug;
  }

  const fromName = siteData.pages.find(
    (page) => normalizeSegment(page.name) === normalizeSegment(label)
  );

  if (fromName) {
    return fromName.slug;
  }

  return "#";
}

function normalizeSlug(input: string): string {
  if (!input || input === "/") return "/";

  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .split("/")
    .map((segment) => normalizeSegment(segment))
    .filter(Boolean)
    .join("/");

  return cleaned ? "/" + cleaned : "/";
}

function normalizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function text(value: string | undefined, fallback: string): string {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function clampScale(value: number | undefined): number {
  const normalized = (value ?? 100) / 100;
  return Math.min(1.6, Math.max(0.6, normalized));
}

function defaultBackground(block: SiteBlock): string {
  if (
    (block.type === "cta" && block.variant === "A") ||
    (block.type === "stats" && block.variant === "B") ||
    (block.type === "features" && block.variant === "C")
  ) {
    return "var(--bs-primary)";
  }

  if (
    (block.type === "hero" && block.variant === "B") ||
    (block.type === "testimonials" && block.variant === "B") ||
    (block.type === "cta" && block.variant === "B") ||
    (block.type === "stats" && block.variant === "A")
  ) {
    return "var(--bs-surface)";
  }

  return "var(--bs-bg)";
}

function defaultTextColor(block: SiteBlock): string {
  if (
    (block.type === "cta" && block.variant === "A") ||
    (block.type === "stats" && block.variant === "B") ||
    (block.type === "features" && block.variant === "C")
  ) {
    return "var(--bs-secondary)";
  }

  return "var(--bs-text)";
}
`;

function extractDataUrlImages(
  pages: ExportSiteData["pages"]
): { pages: ExportSiteData["pages"]; assetFiles: NextExportFile[] } {
  const assetFiles: NextExportFile[] = [];
  let assetCounter = 0;

  const updatedPages = pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => {
      const updatedContent: Record<string, string> = {};

      for (const [key, value] of Object.entries(block.content)) {
        if (typeof value === "string" && value.startsWith("data:image/")) {
          const mimeMatch = value.match(/^data:image\/(\w+);base64,/);
          const ext = mimeMatch ? mimeMatch[1].replace("jpeg", "jpg") : "png";
          const fileName = `img_${++assetCounter}.${ext}`;
          const base64Data = value.replace(/^data:image\/\w+;base64,/, "");

          assetFiles.push({
            path: `public/assets/${fileName}`,
            content: base64Data,
          });

          updatedContent[key] = `/assets/${fileName}`;
        } else {
          updatedContent[key] = value;
        }
      }

      return { ...block, content: updatedContent };
    }),
  }));

  return { pages: updatedPages, assetFiles };
}

export function buildNextAppExport(project: Project): NextExportFile[] {
  const rawPages = normalizeProjectPages(project);
  const { pages: normalizedPages, assetFiles } = extractDataUrlImages(rawPages);
  const rootTargetSlug = normalizedPages.find((page) => page.slug === "/")
    ? "/"
    : normalizedPages[0]?.slug ?? "/";

  const routeFiles: NextExportFile[] = [];

  routeFiles.push({
    path: "app/page.tsx",
    content: buildRouteFile("HomePage", rootTargetSlug),
  });

  normalizedPages
    .filter((page) => page.slug !== "/")
    .forEach((page, index) => {
      routeFiles.push({
        path: slugToRouteFilePath(page.slug),
        content: buildRouteFile(toComponentName(page.name || "Page", index), page.slug),
      });
    });

  const baseFiles: NextExportFile[] = [
    { path: "package.json", content: PACKAGE_JSON_TEMPLATE },
    { path: "tsconfig.json", content: TSCONFIG_TEMPLATE },
    { path: "next-env.d.ts", content: NEXT_ENV_TEMPLATE },
    { path: "next.config.ts", content: NEXT_CONFIG_TEMPLATE },
    { path: ".gitignore", content: GITIGNORE_TEMPLATE },
    { path: "README.md", content: README_TEMPLATE },
    { path: "app/layout.tsx", content: LAYOUT_TEMPLATE },
    { path: "app/not-found.tsx", content: NOT_FOUND_TEMPLATE },
    { path: "app/globals.css", content: GLOBALS_TEMPLATE },
    { path: "components/site-page-renderer.tsx", content: SITE_PAGE_RENDERER_TEMPLATE },
    { path: "public/assets/.gitkeep", content: "# Assets folder for images\n" },
    {
      path: "lib/site-data.ts",
      content: buildSiteDataFile({
        projectName: project.name,
        tokens: project.tokens,
        pages: normalizedPages,
      }),
    },
  ];

  const allFiles = [...baseFiles, ...routeFiles, ...assetFiles];

  const normalizedFiles = allFiles
    .map((file) => ({ ...file, path: normalizeExportPath(file.path) }))
    .filter((file) => Boolean(file.path));

  return Array.from(
    new Map(normalizedFiles.map((file) => [file.path, file])).values()
  );
}

function buildSiteDataFile(siteData: ExportSiteData): string {
  const payload = JSON.stringify(siteData, null, 2);

  return [
    "export interface SiteBlockOverrides {",
    "  primaryColor?: string;",
    "  accentColor?: string;",
    "  backgroundColor?: string;",
    "  textColor?: string;",
    "  fontSizeHeading?: number;",
    "  fontSizeBody?: number;",
    "  paddingY?: number;",
    "  paddingX?: number;",
    "  customFontHeading?: string;",
    "  customFontBody?: string;",
    "}",
    "",
    "export interface SiteBlock {",
    "  type: string;",
    "  variant: string;",
    "  content: Record<string, string>;",
    "  overrides?: SiteBlockOverrides;",
    "}",
    "",
    "export interface SitePage {",
    "  name: string;",
    "  slug: string;",
    "  blocks: SiteBlock[];",
    "}",
    "",
    "export interface SiteProjectData {",
    "  projectName: string;",
    "  tokens: {",
    "    id: string;",
    "    name: string;",
    "    primaryColor: string;",
    "    secondaryColor: string;",
    "    accentColor: string;",
    "    backgroundColor: string;",
    "    surfaceColor: string;",
    "    textColor: string;",
    "    textMuted: string;",
    "    fontHeading: string;",
    "    fontBody: string;",
    "    borderRadius: \"sharp\" | \"soft\" | \"rounded\";",
    "    spacing: \"compact\" | \"balanced\" | \"spacious\";",
    "  };",
    "  pages: SitePage[];",
    "}",
    "",
    `export const siteData: SiteProjectData = ${payload};`,
    "",
  ].join("\n");
}

function normalizeProjectPages(project: Project): ExportSiteData["pages"] {
  const normalized = project.pages.map((page, pageIndex) => ({
    name: page.name || `Page ${pageIndex + 1}`,
    slug: normalizeSlug(page.slug || page.name || `page-${pageIndex + 1}`),
    blocks: page.blocks.map((block) => ({
      type: block.type,
      variant: block.variant,
      content: Object.fromEntries(
        Object.entries(block.content || {}).map(([key, value]) => [key, String(value ?? "")])
      ),
      overrides: sanitizeOverrides(block.overrides),
    })),
  }));

  if (!normalized.some((page) => page.slug === "/") && normalized[0]) {
    normalized[0] = { ...normalized[0], slug: "/" };
  }

  return normalized;
}

function sanitizeOverrides(overrides?: BlockOverrides): BlockOverrides | undefined {
  if (!overrides) {
    return undefined;
  }

  const cleaned = Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined && value !== null)
  ) as BlockOverrides;

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function normalizeSlug(rawSlug: string): string {
  if (!rawSlug || rawSlug === "/") {
    return "/";
  }

  const normalized = rawSlug
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .split("/")
    .map((segment, index) => sanitizeSegment(segment, index))
    .filter(Boolean)
    .join("/");

  return normalized ? `/${normalized}` : "/";
}

function sanitizeSegment(value: string, index: number): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || `page-${index + 1}`;
}

function slugToRouteFilePath(slug: string): string {
  const normalized = normalizeSlug(slug);
  if (normalized === "/") {
    return "app/page.tsx";
  }

  const segments = normalized
    .slice(1)
    .split("/")
    .map((segment, index) => sanitizeSegment(segment, index));

  return `app/${segments.join("/")}/page.tsx`;
}

function buildRouteFile(componentName: string, slug: string): string {
  return [
    'import { renderSitePage } from "@/components/site-page-renderer";',
    "",
    `export default function ${componentName}() {`,
    `  return renderSitePage(${JSON.stringify(normalizeSlug(slug))});`,
    "}",
    "",
  ].join("\n");
}

function toComponentName(input: string, index: number): string {
  const normalized = input
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join("");

  const base = normalized || `Page${index + 1}`;
  return base.endsWith("Page") ? base : `${base}Page`;
}
