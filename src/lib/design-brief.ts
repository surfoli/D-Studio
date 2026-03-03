// ── Design Brief — The structured output of Design Mode ──
// This is the AI-native design specification that feeds into Build Mode.

import type { AnimationPreset } from "./design-patterns";

export interface DesignBriefColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
}

export interface DesignBriefTypography {
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  scale: number; // e.g. 1.25 (major third)
  baseSize: number; // e.g. 16
}

export interface DesignBriefSpacing {
  system: "compact" | "balanced" | "relaxed";
  baseUnit: number; // e.g. 4 or 8
}

export interface DesignBriefAnimation {
  id: string;
  label: string;
  type: AnimationPreset;
}

export interface SectionContent {
  headline?: string;
  subheading?: string;
  body?: string;
  ctaText?: string;
  ctaUrl?: string;
  imageUrl?: string;
}

export interface DesignBriefSection {
  id: string;
  patternId: string;
  label: string;
  description?: string;
  animation: AnimationPreset;
  content?: SectionContent;
}

export interface DesignBriefStyle {
  mood: string; // e.g. "minimal-glass", "bold-vibrant", "corporate-clean"
  borderRadius: "sharp" | "soft" | "rounded" | "pill";
  darkMode: boolean;
}

export interface DesignBriefPage {
  id: string;
  name: string;      // e.g. "Über uns"
  slug: string;      // e.g. "about" → generates /about
  sections: DesignBriefSection[];
}

export interface DesignBrief {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  // Source
  sourceUrl?: string;
  sourceScreenshot?: string; // base64
  // Design System
  colors: DesignBriefColors;
  typography: DesignBriefTypography;
  spacing: DesignBriefSpacing;
  style: DesignBriefStyle;
  // Layout — home page sections (backward compatible)
  sections: DesignBriefSection[];
  // Additional pages (/about, /pricing, etc.)
  additionalPages?: DesignBriefPage[];
  // Content theme for preview imagery (e.g. "automotive", "fitness", "restaurant")
  contentTheme?: string;
  // Free-form notes from chat
  notes: string;
}

// ── Defaults ──

export const DEFAULT_COLORS_DARK: DesignBriefColors = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  accent: "#f59e0b",
  background: "#0a0a0a",
  surface: "#141414",
  text: "#ebebeb",
  textMuted: "#a0a0a0",
};

export const DEFAULT_COLORS_LIGHT: DesignBriefColors = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  accent: "#f59e0b",
  background: "#ffffff",
  surface: "#f5f5f5",
  text: "#171717",
  textMuted: "#6b7280",
};

export const DEFAULT_COLORS: DesignBriefColors = DEFAULT_COLORS_DARK;

export const DEFAULT_TYPOGRAPHY: DesignBriefTypography = {
  headingFont: "Inter",
  bodyFont: "Inter",
  monoFont: "JetBrains Mono",
  scale: 1.25,
  baseSize: 16,
};

export const DEFAULT_SPACING: DesignBriefSpacing = {
  system: "balanced",
  baseUnit: 4,
};

export const DEFAULT_STYLE: DesignBriefStyle = {
  mood: "minimal-dark",
  borderRadius: "soft",
  darkMode: true,
};

export function createDesignBrief(name?: string): DesignBrief {
  return {
    id: `brief_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name || "Neues Design",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    colors: { ...DEFAULT_COLORS },
    typography: { ...DEFAULT_TYPOGRAPHY },
    spacing: { ...DEFAULT_SPACING },
    style: { ...DEFAULT_STYLE },
    sections: [],
    notes: "",
  };
}

// ── Storage ──

const BRIEF_STORAGE_KEY = "d3studio.design-brief";

function briefKey(projectId?: string): string {
  return projectId ? `${BRIEF_STORAGE_KEY}.${projectId}` : BRIEF_STORAGE_KEY;
}

export function saveDesignBrief(brief: DesignBrief, projectId?: string): void {
  try {
    brief.updatedAt = Date.now();
    const key = briefKey(projectId);
    localStorage.setItem(key, JSON.stringify(brief));
    // Also save to global key for backward compat
    if (projectId) localStorage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(brief));
  } catch { /* ignore */ }
}

export function loadDesignBrief(projectId?: string): DesignBrief | null {
  try {
    if (projectId) {
      // Project-specific: only return the brief for THIS project
      const raw = localStorage.getItem(briefKey(projectId));
      if (!raw) return null;
      return JSON.parse(raw) as DesignBrief;
    }
    // No projectId: use global key (backward compat for DesignMode/page.tsx)
    const raw = localStorage.getItem(BRIEF_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DesignBrief;
  } catch {
    return null;
  }
}

export function clearDesignBrief(projectId?: string): void {
  try {
    if (projectId) localStorage.removeItem(briefKey(projectId));
    localStorage.removeItem(BRIEF_STORAGE_KEY);
  } catch { /* ignore */ }
}

// ── Brief → AI Prompt (used by Build Mode) ──

export function designBriefToPrompt(brief: DesignBrief): string {
  const sectionList = brief.sections.length > 0
    ? brief.sections.map((s, i) => `  ${i + 1}. ${s.label}${s.description ? ` — ${s.description}` : ""} (Animation: ${s.animation}, Pattern: ${s.patternId})`).join("\n")
    : "  (Noch keine Sektionen definiert)";

  // Build pattern-specific implementation hints
  const patternHints = brief.sections.map((s) => {
    const hints: Record<string, string> = {
      "hero-fullbleed": "Full-viewport height. Use next/image with fill + object-cover. Gradient overlay from bottom (70% height). Bold headline (clamp(2.5rem, 5vw, 5rem)) positioned bottom-left. Accent-colored CTA button. Optional transparent navbar overlay at top.",
      "hero-editorial": "Asymmetric 60/40 split. Left side: full-bleed image with gradient. Right side: stacked cards with image thumbnails and tag chips. Use a large serif heading font (like Playfair Display). Subtle border treatments.",
      "hero-product": "Product image centered with floating UI cards around it (badges, ratings, specs). Use absolute positioning with subtle shadows. Cards should have backdrop-blur. Think Apple product pages.",
      "hero-video": "Full-viewport with autoplay muted video or hero image. Dark gradient overlay. Large centered text. Play button optional.",
      "features-bento": "CSS Grid with grid-template-areas for asymmetric layout. Mix card sizes: one large (span 2 rows), medium, and small. Each card gets different content: icon+text, stat number, small image, CTA. Rounded corners, subtle borders, hover lift effect.",
      "features-bento-advanced": "Complex bento: 3-column grid, first card spans 2 rows with large image. Include a stats card (+456k style), an image card, and a wide CTA card spanning 2 columns. Use the accent color for the stats card background.",
      "data-stats": "Large numbers (clamp(2rem, 4vw, 4rem)) with monospace or display font. Counter animation on scroll (use Framer Motion useInView + animate). Label below each number. Can use a colored background section.",
      "data-stats-split": "Left: big stat numbers stacked. Right: descriptive text with bullet points. Asymmetric split layout.",
      "data-progress": "Horizontal progress bars with animated fill on scroll. Compare values side by side. Use accent colors for bars.",
      "content-marquee": "Infinite horizontal scroll using CSS animation (translateX). Duplicate content for seamless loop. Use large uppercase text with letter-spacing or partner logos. No JavaScript needed — pure CSS.",
      "content-big-text": "Single massive headline (clamp(3rem, 8vw, 8rem)) spanning full width. Mix regular and italic/colored words for emphasis. Minimal padding, maximum typographic impact.",
      "content-blog-grid": "3-column card grid. Each card: image top (aspect-ratio: 16/9), date tag, title, excerpt. Hover: image scale 1.05 with overflow hidden. Use next/image.",
      "showcase-service-cards": "2x2 or 3-column grid. Each card: title, description, tag chips (border pills), and a thumbnail image on the right. Like NexLaw's service sections. Subtle hover state.",
      "showcase-gallery": "Masonry or CSS grid with varying heights. First item spans 2 rows. Hover overlay with title. Use next/image with object-cover. Smooth scale transition on hover.",
      "showcase-product": "Large product hero image centered. Floating detail cards with specs. Rating badge. Price tag. CTA button. Think premium e-commerce.",
      "showcase-case-studies": "Large cards with background image, dark overlay, white text. Tags/categories as pills. Hover: overlay opacity change. Link to case study detail.",
      "social-proof-marquee": "Infinite scrolling logo strip. Use CSS animation. Grayscale logos that become colored on hover. Duplicate logos for seamless loop.",
      "testimonials-cards": "3-column grid of quote cards. Avatar (rounded), name, role, quote text. Star rating optional. Subtle card with border.",
      "cta-fullscreen": "Full-width section with accent/primary background color. Large white headline centered. Single prominent CTA button. Optional subtle pattern or gradient background.",
      "interactive-contact": "Split layout: left side has heading + description + contact info. Right side has the form (name, email, message, submit). Use glass-style form inputs.",
      "content-faq": "Accordion with + / - toggle icons. Clean borders between items. Smooth height animation on open/close. Use Framer Motion AnimatePresence.",
      "content-team": "4-column grid of team member cards. Round avatar photo, name, role. Optional social links. Hover: subtle lift.",
      "footer-big": "4+ column grid: logo + description, navigation links (3 groups), newsletter signup with email input. Bottom bar: copyright, legal links, social icons.",
    };
    return hints[s.patternId] ? `  → ${s.label}: ${hints[s.patternId]}` : null;
  }).filter(Boolean).join("\n");

  const radiusMap: Record<string, string> = {
    sharp: "0px (sharp corners, industrial feel)",
    soft: "8px (slightly rounded, modern default)",
    rounded: "16px (generous rounding, friendly feel)",
    pill: "9999px (fully rounded, playful/modern)",
  };

  return `=== DESIGN BRIEF ===
Der Nutzer hat im Design-Modus ein professionelles Design-System festgelegt.
Baue daraus eine HOCHWERTIGE Website auf Dribbble/Awwwards-Niveau.

PROJEKT: ${brief.name}
${brief.sourceUrl ? `REFERENZ-URL: ${brief.sourceUrl}` : ""}

FARBEN:
- Primary: ${brief.colors.primary}
- Secondary: ${brief.colors.secondary}
- Accent: ${brief.colors.accent}
- Background: ${brief.colors.background}
- Surface: ${brief.colors.surface}
- Text: ${brief.colors.text}
- Text Muted: ${brief.colors.textMuted}

TYPOGRAFIE:
- Headings: ${brief.typography.headingFont} (Google Fonts, importiere via next/font/google)
- Body: ${brief.typography.bodyFont} (Google Fonts)
- Mono: ${brief.typography.monoFont}
- Scale Ratio: ${brief.typography.scale} (${brief.typography.baseSize}px Basis)
- Nutze Fluid Typography: clamp() fuer alle Ueberschriften (h1: clamp(2.5rem, 5vw, 5rem), h2: clamp(1.8rem, 3vw, 3rem))
- Typografie-Hierarchie: h1 fuer Hero, h2 fuer Section-Titel, h3 fuer Cards, p fuer Body

SPACING: ${brief.spacing.system} (${brief.spacing.baseUnit}px Basis-Einheit)
- ${brief.spacing.system === "compact" ? "Enge Abstaende, dichte Layouts, wenig Padding" : brief.spacing.system === "relaxed" ? "Grosszuegige Abstaende, viel Whitespace, atmende Layouts" : "Ausgewogene Abstaende, Standard-Sections-Padding (py-24 bis py-32)"}

STIL:
- Mood: ${brief.style.mood}
- Border-Radius: ${brief.style.borderRadius} → ${radiusMap[brief.style.borderRadius] || brief.style.borderRadius}
- Dark Mode: ${brief.style.darkMode ? "Ja — dunkler Hintergrund, helle Texte, subtile Glassmorphism-Effekte, glow accents" : "Nein — heller Hintergrund, dunkle Texte, klare Kontraste, dezente Schatten"}

SEKTIONEN (in dieser Reihenfolge bauen):
${sectionList}

${patternHints ? `PATTERN-SPEZIFISCHE IMPLEMENTIERUNG:\n${patternHints}\n` : ""}
${brief.notes ? `NOTIZEN:\n${brief.notes}\n` : ""}

=== DESIGN-QUALITAETS-STANDARDS ===

VISUELLES NIVEAU — Dribbble/Awwwards Quality:
- Jede Section muss visuell beeindruckend sein, nicht nur funktional
- Nutze Licht und Schatten bewusst (box-shadow: 0 1px 3px, 0 4px 20px layered)
- Hover-States fuer ALLE interaktiven Elemente (Cards: translateY(-4px) + shadow, Buttons: opacity/scale, Links: underline animation)
- Micro-Interactions: Button-Ripple, Card-Lift, Link-Hover-Underline, Focus-Ring
- Konsistente Spacing-Rhythm: Section-Padding mindestens py-20 md:py-28 lg:py-32
- Bilder: Nutze Unsplash-URLs als Platzhalter (https://images.unsplash.com/photo-...) mit next/image, NICHT leere Platzhalter

ANIMATIONEN:
- fade-up: Framer Motion, initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
- stagger: Parent mit staggerChildren: 0.1, Kinder mit fade-up
- scale-in: initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
- clip-reveal: Clip-path animation von inset(100% 0 0 0) zu inset(0)
- counter: useInView + useMotionValue + useTransform fuer Zaehl-Animation
- marquee: CSS @keyframes marquee { from { translateX(0) } to { translateX(-50%) } } mit dupliziertem Content
- parallax: useScroll + useTransform fuer Parallax-Offset
- scroll-reveal: IntersectionObserver oder Framer Motion whileInView

LAYOUT-PATTERNS:
- Bento Grid: CSS Grid mit grid-template-areas und span-2 Zellen
- Full-Bleed Hero: min-h-screen, relative, Image fill, gradient overlay
- Asymmetric: grid-cols-[3fr_2fr] oder flex mit ungleichen flex-Werten
- Overlap: position relative/absolute, negative margins oder translate
- Service Cards: Grid mit Bild-Thumbnail rechts, Tags als border-pills
- Marquee: overflow-hidden Container, CSS translateX animation, duplizierter Content

TECHNISCHE ANFORDERUNGEN:
- Alle Farben als CSS-Variablen in globals.css UND Tailwind-Config
- Google Fonts via next/font/google (nicht CDN-Link)
- Responsive: Mobile-first, Breakpoints sm/md/lg/xl
- SEO: Meta-Tags, OG-Tags, structured data, semantic HTML
- Accessibility: aria-labels, focus-visible, skip-nav, alt-texts
- Performance: next/image fuer alle Bilder, lazy loading
- Framer Motion fuer alle Animationen (nicht CSS-only)
- Saubere Komponenten-Struktur: eine Datei pro Section-Komponente
=== END DESIGN BRIEF ===`;
}
