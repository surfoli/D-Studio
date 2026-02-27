import { BlockType, BlockVariant, Block } from "./types";

export interface SectionTemplate {
  id: string;
  type: BlockType;
  variant: BlockVariant;
  label: string;
  description: string;
  emoji: string;
  content: Record<string, string>;
}

export const SECTION_TEMPLATES: SectionTemplate[] = [
  // ── Navbar ──────────────────────────────────────────────────────────────
  {
    id: "navbar-a",
    type: "navbar",
    variant: "A",
    label: "Navbar",
    description: "Logo + Links",
    emoji: "🔗",
    content: { logo: "Brand", links: "Home,About,Contact" },
  },

  // ── Hero ─────────────────────────────────────────────────────────────────
  {
    id: "hero-a",
    type: "hero",
    variant: "A",
    label: "Hero – Centered",
    description: "Großer Titel, Untertitel, CTA + Hintergrundbild",
    emoji: "🦸",
    content: {
      headline: "Build something great",
      subheadline: "A short description that explains your value proposition clearly.",
      cta: "Get Started",
      image: "",
    },
  },
  {
    id: "hero-b",
    type: "hero",
    variant: "B",
    label: "Hero – Split",
    description: "Text links + Hintergrundbild",
    emoji: "🦸",
    content: {
      headline: "Your headline here",
      subheadline: "Supporting text that gives context and builds trust.",
      cta: "Learn More",
      image: "",
    },
  },
  {
    id: "hero-c",
    type: "hero",
    variant: "C",
    label: "Hero – Bild rechts",
    description: "Text + Bild nebeneinander",
    emoji: "🦸",
    content: {
      headline: "Simple. Powerful. Yours.",
      subheadline: "Everything you need, nothing you don't.",
      cta: "Explore",
      image: "",
    },
  },

  // ── Features ─────────────────────────────────────────────────────────────
  {
    id: "features-a",
    type: "features",
    variant: "A",
    label: "Features – Grid",
    description: "3-spaltige Feature-Karten",
    emoji: "✨",
    content: {
      title: "Why choose us",
      subtitle: "Core benefits",
      feature1_title: "Fast",
      feature1_desc: "Optimized for speed from day one.",
      feature2_title: "Reliable",
      feature2_desc: "99.9% uptime, always available.",
      feature3_title: "Secure",
      feature3_desc: "Enterprise-grade security built in.",
    },
  },
  {
    id: "features-b",
    type: "features",
    variant: "B",
    label: "Features – List",
    description: "Horizontale Feature-Liste",
    emoji: "✨",
    content: {
      title: "Everything you need",
      subtitle: "All in one place",
      feature1_title: "Collaboration",
      feature1_desc: "Work together in real time.",
      feature2_title: "Analytics",
      feature2_desc: "Deep insights at a glance.",
      feature3_title: "Integrations",
      feature3_desc: "Connect your favourite tools.",
    },
  },
  {
    id: "features-c",
    type: "features",
    variant: "C",
    label: "Features – Highlight",
    description: "Großes Feature mit Details",
    emoji: "✨",
    content: {
      title: "The smarter way",
      subtitle: "Key features",
      feature1_title: "AI-powered",
      feature1_desc: "Intelligent automation that saves hours.",
      feature2_title: "No-code",
      feature2_desc: "Build without writing a single line.",
      feature3_title: "Scalable",
      feature3_desc: "Grows with your business.",
    },
  },

  // ── Stats ─────────────────────────────────────────────────────────────────
  {
    id: "stats-a",
    type: "stats",
    variant: "A",
    label: "Stats",
    description: "4 Kennzahlen nebeneinander",
    emoji: "📊",
    content: {
      stat1_value: "10k+",
      stat1_label: "Customers",
      stat2_value: "99%",
      stat2_label: "Satisfaction",
      stat3_value: "50+",
      stat3_label: "Countries",
      stat4_value: "24/7",
      stat4_label: "Support",
    },
  },

  // ── Testimonials ─────────────────────────────────────────────────────────
  {
    id: "testimonials-a",
    type: "testimonials",
    variant: "A",
    label: "Testimonials",
    description: "Kundenstimmen mit Avataren",
    emoji: "💬",
    content: {
      title: "What our customers say",
      quote1: "This product changed the way we work. Absolutely love it.",
      author1: "Anna M.",
      role1: "CEO, Acme Inc.",
      avatar1: "",
      quote2: "Incredible quality and support. Highly recommended.",
      author2: "Tom B.",
      role2: "Founder, Startup XY",
      avatar2: "",
    },
  },
  {
    id: "testimonials-b",
    type: "testimonials",
    variant: "B",
    label: "Testimonials – Cards",
    description: "Karten-Layout mit Avatar",
    emoji: "💬",
    content: {
      title: "Trusted by thousands",
      quote1: "We saw a 3× increase in conversions within the first month.",
      author1: "Lisa K.",
      role1: "Marketing Lead",
      avatar1: "",
      quote2: "The best investment we made this year.",
      author2: "David R.",
      role2: "Product Manager",
      avatar2: "",
    },
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  {
    id: "cta-a",
    type: "cta",
    variant: "A",
    label: "CTA – Dark",
    description: "Dunkler Call-to-Action",
    emoji: "⚡",
    content: {
      headline: "Ready to get started?",
      subheadline: "Join thousands of teams already using our platform.",
      cta: "Start for free",
    },
  },
  {
    id: "cta-b",
    type: "cta",
    variant: "B",
    label: "CTA – Light",
    description: "Heller Call-to-Action",
    emoji: "⚡",
    content: {
      headline: "Take the next step",
      subheadline: "No credit card required. Cancel anytime.",
      cta: "Try it free",
    },
  },
  {
    id: "cta-c",
    type: "cta",
    variant: "C",
    label: "CTA – Minimal",
    description: "Schlichter Abschluss",
    emoji: "⚡",
    content: {
      headline: "Let's talk",
      subheadline: "We'd love to hear about your project.",
      cta: "Contact us",
    },
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  {
    id: "footer-a",
    type: "footer",
    variant: "A",
    label: "Footer",
    description: "Logo, Links, Copyright",
    emoji: "🔻",
    content: {
      logo: "Brand",
      copyright: "© 2026 Brand. All rights reserved.",
      links: "Privacy,Terms,Imprint",
    },
  },
];

export const SECTION_TEMPLATE_GROUPS: Array<{
  label: string;
  emoji: string;
  types: BlockType[];
}> = [
  { label: "Navigation", emoji: "🔗", types: ["navbar"] },
  { label: "Hero", emoji: "🦸", types: ["hero"] },
  { label: "Features", emoji: "✨", types: ["features"] },
  { label: "Stats", emoji: "📊", types: ["stats"] },
  { label: "Testimonials", emoji: "💬", types: ["testimonials"] },
  { label: "CTA", emoji: "⚡", types: ["cta"] },
  { label: "Footer", emoji: "🔻", types: ["footer"] },
  { label: "Custom Code", emoji: "⌨️", types: ["custom"] },
];

// ── Custom Code Block ──────────────────────────────────────────────────────
SECTION_TEMPLATES.push({
  id: "custom-a",
  type: "custom",
  variant: "A",
  label: "Custom Code",
  description: "Eigenes HTML/CSS/JS schreiben",
  emoji: "⌨️",
  content: { html: "" },
});

export function templateToBlock(template: SectionTemplate): Omit<Block, "id"> {
  return {
    type: template.type,
    variant: template.variant,
    content: { ...template.content },
  };
}
