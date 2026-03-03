// ── Design Patterns — Section templates + Animation presets for Design Mode ──

export interface SectionPattern {
  id: string;
  category: SectionCategory;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  defaultAnimation: AnimationPreset;
  // Wireframe layout hint for preview
  wireframe: WireframeHint;
}

export type SectionCategory =
  | "hero" | "features" | "content" | "showcase"
  | "social-proof" | "pricing" | "cta" | "navigation"
  | "footer" | "data" | "interactive";

export type AnimationPreset =
  | "fade-up" | "fade-in" | "slide-left" | "slide-right"
  | "scale-in" | "stagger" | "parallax" | "scroll-reveal"
  | "clip-reveal" | "counter" | "marquee" | "none";

export interface WireframeHint {
  height: "sm" | "md" | "lg" | "xl"; // relative section height
  layout:
    | "full" | "split" | "grid-2" | "grid-3" | "grid-4"
    | "centered" | "alternating" | "cards"
    | "bento" | "hero-image" | "stats" | "marquee"
    | "gallery" | "service-cards" | "overlap" | "asymmetric";
  hasImage: boolean;
}

// ── Animation Presets ──

export const ANIMATION_PRESETS: { id: AnimationPreset; label: string; description: string }[] = [
  { id: "fade-up", label: "Fade Up", description: "Erscheint von unten mit Fade" },
  { id: "fade-in", label: "Fade In", description: "Sanftes Einblenden" },
  { id: "slide-left", label: "Slide Left", description: "Gleitet von rechts rein" },
  { id: "slide-right", label: "Slide Right", description: "Gleitet von links rein" },
  { id: "scale-in", label: "Scale In", description: "Wächst von klein nach groß" },
  { id: "stagger", label: "Stagger", description: "Kinder erscheinen nacheinander" },
  { id: "parallax", label: "Parallax", description: "Parallax-Effekt beim Scrollen" },
  { id: "scroll-reveal", label: "Scroll Reveal", description: "Erscheint beim Scrollen in den Viewport" },
  { id: "clip-reveal", label: "Clip Reveal", description: "Clip-path Animation, modern reveal" },
  { id: "counter", label: "Counter", description: "Zahlen zählen hoch" },
  { id: "marquee", label: "Marquee", description: "Horizontales Durchlaufen" },
  { id: "none", label: "Keine", description: "Keine Animation" },
];

// ── Section Patterns ──

export const SECTION_PATTERNS: SectionPattern[] = [
  // ── Navigation ──
  {
    id: "navbar-minimal",
    category: "navigation",
    label: "Navbar Minimal",
    description: "Logo links, Links rechts, clean",
    icon: "Menu",
    defaultAnimation: "none",
    wireframe: { height: "sm", layout: "full", hasImage: false },
  },
  {
    id: "navbar-centered",
    category: "navigation",
    label: "Navbar Centered",
    description: "Logo zentriert, Links links & rechts",
    icon: "AlignCenter",
    defaultAnimation: "none",
    wireframe: { height: "sm", layout: "centered", hasImage: false },
  },
  {
    id: "navbar-transparent",
    category: "navigation",
    label: "Navbar Transparent",
    description: "Transparente Nav über Hero, wird sticky beim Scrollen",
    icon: "Eye",
    defaultAnimation: "none",
    wireframe: { height: "sm", layout: "full", hasImage: false },
  },

  // ── Hero ──
  {
    id: "hero-centered",
    category: "hero",
    label: "Hero Centered",
    description: "Großer Titel zentriert, Subtitle, CTA-Buttons",
    icon: "AlignCenter",
    defaultAnimation: "fade-up",
    wireframe: { height: "xl", layout: "centered", hasImage: false },
  },
  {
    id: "hero-split",
    category: "hero",
    label: "Hero Split",
    description: "Text links, Bild/Mockup rechts",
    icon: "Columns2",
    defaultAnimation: "fade-up",
    wireframe: { height: "xl", layout: "split", hasImage: true },
  },
  {
    id: "hero-fullbleed",
    category: "hero",
    label: "Hero Full-Bleed",
    description: "Fullscreen-Bild, Text-Overlay unten links, wie Saeki/NexLaw",
    icon: "Maximize",
    defaultAnimation: "clip-reveal",
    wireframe: { height: "xl", layout: "hero-image", hasImage: true },
  },
  {
    id: "hero-video",
    category: "hero",
    label: "Hero Video",
    description: "Fullscreen Video/Bild Hintergrund mit Overlay-Text",
    icon: "Play",
    defaultAnimation: "fade-in",
    wireframe: { height: "xl", layout: "hero-image", hasImage: true },
  },
  {
    id: "hero-minimal",
    category: "hero",
    label: "Hero Minimal",
    description: "Nur Headline + ein CTA, viel Whitespace",
    icon: "Type",
    defaultAnimation: "fade-in",
    wireframe: { height: "lg", layout: "centered", hasImage: false },
  },
  {
    id: "hero-editorial",
    category: "hero",
    label: "Hero Editorial",
    description: "Riesige Serif-Headline, Subtext, eleganter Stil wie NexLaw",
    icon: "Heading1",
    defaultAnimation: "clip-reveal",
    wireframe: { height: "xl", layout: "asymmetric", hasImage: true },
  },
  {
    id: "hero-product",
    category: "hero",
    label: "Hero Product",
    description: "Produkt im Zentrum, Features drumherum, wie Nike Aysen",
    icon: "Package",
    defaultAnimation: "scale-in",
    wireframe: { height: "xl", layout: "overlap", hasImage: true },
  },

  // ── Features ──
  {
    id: "features-3col",
    category: "features",
    label: "Features 3-Spaltig",
    description: "3 Feature-Karten mit Icons nebeneinander",
    icon: "LayoutGrid",
    defaultAnimation: "stagger",
    wireframe: { height: "md", layout: "grid-3", hasImage: false },
  },
  {
    id: "features-bento",
    category: "features",
    label: "Features Bento",
    description: "Asymmetrisches Bento-Grid mit unterschiedlichen Kartengrößen",
    icon: "Grid3x3",
    defaultAnimation: "stagger",
    wireframe: { height: "lg", layout: "bento", hasImage: true },
  },
  {
    id: "features-bento-advanced",
    category: "features",
    label: "Bento Advanced",
    description: "Komplexes Bento mit Bildern, Stats, Icons — wie Nike Aysen",
    icon: "Grid3x3",
    defaultAnimation: "stagger",
    wireframe: { height: "xl", layout: "bento", hasImage: true },
  },
  {
    id: "features-alternating",
    category: "features",
    label: "Features Alternierend",
    description: "Bild/Text abwechselnd links/rechts",
    icon: "ArrowLeftRight",
    defaultAnimation: "scroll-reveal",
    wireframe: { height: "lg", layout: "alternating", hasImage: true },
  },
  {
    id: "features-list",
    category: "features",
    label: "Features Liste",
    description: "Vertikale Liste mit Icons und Beschreibungen",
    icon: "List",
    defaultAnimation: "fade-up",
    wireframe: { height: "md", layout: "centered", hasImage: false },
  },
  {
    id: "features-icons-grid",
    category: "features",
    label: "Feature Icons Grid",
    description: "4x2 oder 3x2 Grid mit Icon + kurzer Text",
    icon: "LayoutGrid",
    defaultAnimation: "stagger",
    wireframe: { height: "md", layout: "grid-4", hasImage: false },
  },

  // ── Showcase (Neu!) ──
  {
    id: "showcase-product",
    category: "showcase",
    label: "Produkt Showcase",
    description: "Großes Produktbild mit Details, Badges und CTA",
    icon: "Package",
    defaultAnimation: "parallax",
    wireframe: { height: "xl", layout: "overlap", hasImage: true },
  },
  {
    id: "showcase-gallery",
    category: "showcase",
    label: "Bild-Galerie",
    description: "Masonry/Grid-Galerie mit Hover-Effekten",
    icon: "GalleryHorizontal",
    defaultAnimation: "stagger",
    wireframe: { height: "lg", layout: "gallery", hasImage: true },
  },
  {
    id: "showcase-comparison",
    category: "showcase",
    label: "Vorher/Nachher",
    description: "Split-Screen Vergleich mit Slider",
    icon: "Columns2",
    defaultAnimation: "scroll-reveal",
    wireframe: { height: "lg", layout: "split", hasImage: true },
  },
  {
    id: "showcase-service-cards",
    category: "showcase",
    label: "Service Cards",
    description: "Karten mit Bild, Tags und Beschreibung — wie NexLaw",
    icon: "CreditCard",
    defaultAnimation: "stagger",
    wireframe: { height: "lg", layout: "service-cards", hasImage: true },
  },
  {
    id: "showcase-case-studies",
    category: "showcase",
    label: "Case Studies",
    description: "Projekt-Karten mit großem Bild, Overlay-Text, Tags",
    icon: "FolderOpen",
    defaultAnimation: "stagger",
    wireframe: { height: "lg", layout: "cards", hasImage: true },
  },

  // ── Content ──
  {
    id: "content-text",
    category: "content",
    label: "Text Section",
    description: "Headline + Fließtext, ideal für About",
    icon: "FileText",
    defaultAnimation: "fade-up",
    wireframe: { height: "md", layout: "centered", hasImage: false },
  },
  {
    id: "content-big-text",
    category: "content",
    label: "Big Statement",
    description: "Riesige Headline über volle Breite, max. Typografie-Impact",
    icon: "Heading1",
    defaultAnimation: "clip-reveal",
    wireframe: { height: "lg", layout: "centered", hasImage: false },
  },
  {
    id: "content-image-text",
    category: "content",
    label: "Bild + Text",
    description: "Großes Bild mit Text daneben",
    icon: "Image",
    defaultAnimation: "slide-left",
    wireframe: { height: "md", layout: "split", hasImage: true },
  },
  {
    id: "content-logo-wall",
    category: "content",
    label: "Logo Wall",
    description: "Logos von Partnern/Kunden in einer Reihe",
    icon: "Building2",
    defaultAnimation: "fade-in",
    wireframe: { height: "sm", layout: "marquee", hasImage: true },
  },
  {
    id: "content-marquee",
    category: "content",
    label: "Marquee / Ticker",
    description: "Endlos scrollender Text oder Logos, modern und dynamisch",
    icon: "MoveHorizontal",
    defaultAnimation: "marquee",
    wireframe: { height: "sm", layout: "marquee", hasImage: false },
  },
  {
    id: "content-team",
    category: "content",
    label: "Team Section",
    description: "Team-Mitglieder mit Foto, Name, Rolle",
    icon: "Users",
    defaultAnimation: "stagger",
    wireframe: { height: "md", layout: "grid-4", hasImage: true },
  },
  {
    id: "content-faq",
    category: "content",
    label: "FAQ Accordion",
    description: "Fragen & Antworten mit aufklappbaren Bereichen",
    icon: "HelpCircle",
    defaultAnimation: "fade-up",
    wireframe: { height: "md", layout: "centered", hasImage: false },
  },
  {
    id: "content-blog-grid",
    category: "content",
    label: "Blog / News Grid",
    description: "Artikel-Karten mit Bild, Datum, Titel",
    icon: "Newspaper",
    defaultAnimation: "stagger",
    wireframe: { height: "lg", layout: "cards", hasImage: true },
  },

  // ── Data (Neu!) ──
  {
    id: "data-stats",
    category: "data",
    label: "Stats / Metriken",
    description: "Große Zahlen mit Labels — wie Ferro (+456k, 38Mt)",
    icon: "BarChart3",
    defaultAnimation: "counter",
    wireframe: { height: "md", layout: "stats", hasImage: false },
  },
  {
    id: "data-stats-split",
    category: "data",
    label: "Stats Split",
    description: "Zahlen links, Beschreibung rechts — modernes Data-Layout",
    icon: "BarChart3",
    defaultAnimation: "counter",
    wireframe: { height: "md", layout: "split", hasImage: false },
  },
  {
    id: "data-progress",
    category: "data",
    label: "Progress / Vergleich",
    description: "Fortschrittsbalken, Vergleichswerte, Metriken",
    icon: "TrendingUp",
    defaultAnimation: "scroll-reveal",
    wireframe: { height: "md", layout: "stats", hasImage: false },
  },
  {
    id: "data-timeline",
    category: "data",
    label: "Timeline",
    description: "Chronologische Darstellung von Meilensteinen",
    icon: "Clock",
    defaultAnimation: "stagger",
    wireframe: { height: "lg", layout: "centered", hasImage: false },
  },

  // ── Social Proof ──
  {
    id: "testimonials-cards",
    category: "social-proof",
    label: "Testimonials Karten",
    description: "Kundenstimmen als Karten-Grid",
    icon: "Quote",
    defaultAnimation: "stagger",
    wireframe: { height: "md", layout: "grid-3", hasImage: false },
  },
  {
    id: "testimonials-carousel",
    category: "social-proof",
    label: "Testimonials Carousel",
    description: "Scrollbarer Testimonial-Slider",
    icon: "GalleryHorizontal",
    defaultAnimation: "fade-in",
    wireframe: { height: "md", layout: "centered", hasImage: false },
  },
  {
    id: "social-proof-banner",
    category: "social-proof",
    label: "Social Proof Banner",
    description: "\"Über 10.000 Nutzer\" — kompakte Zeile",
    icon: "Users",
    defaultAnimation: "fade-up",
    wireframe: { height: "sm", layout: "centered", hasImage: false },
  },
  {
    id: "social-proof-marquee",
    category: "social-proof",
    label: "Logo Marquee",
    description: "Endlos scrollende Partner-Logos",
    icon: "MoveHorizontal",
    defaultAnimation: "marquee",
    wireframe: { height: "sm", layout: "marquee", hasImage: true },
  },

  // ── Pricing ──
  {
    id: "pricing-2tier",
    category: "pricing",
    label: "Pricing 2 Tiers",
    description: "Free + Pro nebeneinander",
    icon: "CreditCard",
    defaultAnimation: "stagger",
    wireframe: { height: "lg", layout: "grid-2", hasImage: false },
  },
  {
    id: "pricing-3tier",
    category: "pricing",
    label: "Pricing 3 Tiers",
    description: "Free + Pro + Enterprise mit Highlight",
    icon: "CreditCard",
    defaultAnimation: "stagger",
    wireframe: { height: "lg", layout: "grid-3", hasImage: false },
  },

  // ── CTA ──
  {
    id: "cta-banner",
    category: "cta",
    label: "CTA Banner",
    description: "Breiter Banner mit Headline + Button",
    icon: "Megaphone",
    defaultAnimation: "scale-in",
    wireframe: { height: "sm", layout: "centered", hasImage: false },
  },
  {
    id: "cta-split",
    category: "cta",
    label: "CTA Split",
    description: "Text links, Formular/Button rechts",
    icon: "Columns2",
    defaultAnimation: "fade-up",
    wireframe: { height: "md", layout: "split", hasImage: false },
  },
  {
    id: "cta-newsletter",
    category: "cta",
    label: "Newsletter Signup",
    description: "E-Mail-Eingabe + Subscribe-Button",
    icon: "Mail",
    defaultAnimation: "fade-up",
    wireframe: { height: "sm", layout: "centered", hasImage: false },
  },
  {
    id: "cta-fullscreen",
    category: "cta",
    label: "CTA Fullscreen",
    description: "Fullscreen CTA mit großer Headline und Accent-Farbe",
    icon: "Maximize",
    defaultAnimation: "parallax",
    wireframe: { height: "lg", layout: "centered", hasImage: false },
  },

  // ── Interactive (Neu!) ──
  {
    id: "interactive-contact",
    category: "interactive",
    label: "Kontakt-Formular",
    description: "Formular mit Inputs, Labels und Submit-Button",
    icon: "Send",
    defaultAnimation: "fade-up",
    wireframe: { height: "lg", layout: "split", hasImage: false },
  },
  {
    id: "interactive-map",
    category: "interactive",
    label: "Map + Kontakt",
    description: "Karte links, Kontaktinfos rechts",
    icon: "MapPin",
    defaultAnimation: "fade-in",
    wireframe: { height: "md", layout: "split", hasImage: true },
  },

  // ── Footer ──
  {
    id: "footer-minimal",
    category: "footer",
    label: "Footer Minimal",
    description: "Copyright + ein paar Links",
    icon: "Minus",
    defaultAnimation: "none",
    wireframe: { height: "sm", layout: "full", hasImage: false },
  },
  {
    id: "footer-columns",
    category: "footer",
    label: "Footer Spalten",
    description: "Multi-Column Footer mit Link-Gruppen",
    icon: "LayoutGrid",
    defaultAnimation: "none",
    wireframe: { height: "md", layout: "grid-4", hasImage: false },
  },
  {
    id: "footer-big",
    category: "footer",
    label: "Footer XXL",
    description: "Großer Footer mit Newsletter, Sitemap, Social Links",
    icon: "LayoutGrid",
    defaultAnimation: "none",
    wireframe: { height: "lg", layout: "grid-4", hasImage: false },
  },
];

// ── Helpers ──

export function getPatternsByCategory(category: SectionCategory): SectionPattern[] {
  return SECTION_PATTERNS.filter((p) => p.category === category);
}

export function getPatternById(id: string): SectionPattern | undefined {
  return SECTION_PATTERNS.find((p) => p.id === id);
}

export const SECTION_CATEGORIES: { id: SectionCategory; label: string; icon: string }[] = [
  { id: "navigation", label: "Navigation", icon: "Menu" },
  { id: "hero", label: "Hero", icon: "Sparkles" },
  { id: "features", label: "Features", icon: "LayoutGrid" },
  { id: "showcase", label: "Showcase", icon: "Eye" },
  { id: "content", label: "Inhalt", icon: "FileText" },
  { id: "data", label: "Daten & Stats", icon: "BarChart3" },
  { id: "social-proof", label: "Social Proof", icon: "Quote" },
  { id: "pricing", label: "Pricing", icon: "CreditCard" },
  { id: "cta", label: "Call to Action", icon: "Megaphone" },
  { id: "interactive", label: "Interaktiv", icon: "MousePointerClick" },
  { id: "footer", label: "Footer", icon: "PanelBottom" },
];
