import { Project, Page, Block, ProjectDraft } from "./types";
import { TOKEN_PRESETS } from "./design-tokens";

let idCounter = 0;
function genId(): string {
  return `id_${++idCounter}_${Date.now()}`;
}

const PROJECT_TEMPLATES: Record<
  string,
  { pages: { name: string; slug: string; blocks: Omit<Block, "id">[] }[] }
> = {
  agency: {
    pages: [
      {
        name: "Home",
        slug: "/",
        blocks: [
          {
            type: "navbar",
            variant: "A",
            content: {
              logo: "Studio",
              links: "Work,About,Contact",
            },
          },
          {
            type: "hero",
            variant: "A",
            content: {
              headline: "We craft digital experiences that matter",
              subheadline:
                "A design studio focused on brand identity, web design, and creative direction for forward-thinking companies.",
              cta: "View Our Work",
            },
          },
          {
            type: "features",
            variant: "A",
            content: {
              title: "What We Do",
              subtitle: "Our core services",
              feature1_title: "Brand Identity",
              feature1_desc:
                "Complete visual identity systems that tell your story and connect with your audience.",
              feature2_title: "Web Design",
              feature2_desc:
                "Beautiful, fast websites that convert visitors into customers.",
              feature3_title: "Creative Direction",
              feature3_desc:
                "Strategic creative guidance for campaigns, launches, and brand evolution.",
            },
          },
          {
            type: "stats",
            variant: "A",
            content: {
              stat1_value: "150+",
              stat1_label: "Projects Completed",
              stat2_value: "12",
              stat2_label: "Years Experience",
              stat3_value: "98%",
              stat3_label: "Client Satisfaction",
              stat4_value: "40+",
              stat4_label: "Awards Won",
            },
          },
          {
            type: "testimonials",
            variant: "A",
            content: {
              title: "What Clients Say",
              quote1:
                "They transformed our brand completely. The results exceeded all expectations.",
              author1: "Sarah Chen",
              role1: "CEO, TechFlow",
              quote2:
                "Working with this team was a game-changer for our business.",
              author2: "Marcus Weber",
              role2: "Founder, Nomad Studio",
            },
          },
          {
            type: "cta",
            variant: "A",
            content: {
              headline: "Ready to start your project?",
              subheadline:
                "Let's create something extraordinary together.",
              cta: "Get in Touch",
            },
          },
          {
            type: "footer",
            variant: "A",
            content: {
              logo: "Studio",
              copyright: "© 2026 Studio. All rights reserved.",
              links: "Privacy,Terms,Imprint",
            },
          },
        ],
      },
      {
        name: "Work",
        slug: "/work",
        blocks: [
          {
            type: "navbar",
            variant: "A",
            content: {
              logo: "Studio",
              links: "Work,About,Contact",
            },
          },
          {
            type: "hero",
            variant: "B",
            content: {
              headline: "Selected Work",
              subheadline:
                "A collection of projects we're proud of. Each one crafted with care and purpose.",
              cta: "Filter by Category",
            },
          },
          {
            type: "features",
            variant: "B",
            content: {
              title: "Featured Projects",
              subtitle: "Recent case studies",
              feature1_title: "Aura Cosmetics",
              feature1_desc: "Brand identity & packaging design for a luxury skincare line.",
              feature2_title: "FinVault",
              feature2_desc: "Complete web platform for a fintech startup.",
              feature3_title: "Nordic Trails",
              feature3_desc: "Visual identity for a sustainable outdoor brand.",
            },
          },
          {
            type: "cta",
            variant: "B",
            content: {
              headline: "Have a project in mind?",
              subheadline: "We'd love to hear about it.",
              cta: "Start a Conversation",
            },
          },
          {
            type: "footer",
            variant: "A",
            content: {
              logo: "Studio",
              copyright: "© 2026 Studio. All rights reserved.",
              links: "Privacy,Terms,Imprint",
            },
          },
        ],
      },
      {
        name: "About",
        slug: "/about",
        blocks: [
          {
            type: "navbar",
            variant: "A",
            content: {
              logo: "Studio",
              links: "Work,About,Contact",
            },
          },
          {
            type: "hero",
            variant: "C",
            content: {
              headline: "We believe design is a force for good",
              subheadline:
                "Founded in 2014, we're a team of designers, developers, and strategists who love what we do.",
              cta: "Meet the Team",
            },
          },
          {
            type: "stats",
            variant: "A",
            content: {
              stat1_value: "24",
              stat1_label: "Team Members",
              stat2_value: "3",
              stat2_label: "Offices",
              stat3_value: "150+",
              stat3_label: "Happy Clients",
              stat4_value: "12",
              stat4_label: "Countries Served",
            },
          },
          {
            type: "testimonials",
            variant: "A",
            content: {
              title: "Our Values",
              quote1:
                "We approach every project with curiosity and a commitment to excellence.",
              author1: "Design First",
              role1: "Core Value",
              quote2:
                "Long-term partnerships over one-off projects. We grow together.",
              author2: "Collaboration",
              role2: "Core Value",
            },
          },
          {
            type: "footer",
            variant: "A",
            content: {
              logo: "Studio",
              copyright: "© 2026 Studio. All rights reserved.",
              links: "Privacy,Terms,Imprint",
            },
          },
        ],
      },
      {
        name: "Contact",
        slug: "/contact",
        blocks: [
          {
            type: "navbar",
            variant: "A",
            content: {
              logo: "Studio",
              links: "Work,About,Contact",
            },
          },
          {
            type: "hero",
            variant: "B",
            content: {
              headline: "Let's Talk",
              subheadline:
                "Have a project in mind or just want to say hello? We'd love to hear from you.",
              cta: "hello@studio.com",
            },
          },
          {
            type: "cta",
            variant: "C",
            content: {
              headline: "Visit Us",
              subheadline:
                "Studio HQ — Kreuzbergstraße 12, 10965 Berlin, Germany",
              cta: "Get Directions",
            },
          },
          {
            type: "footer",
            variant: "A",
            content: {
              logo: "Studio",
              copyright: "© 2026 Studio. All rights reserved.",
              links: "Privacy,Terms,Imprint",
            },
          },
        ],
      },
    ],
  },
};

export function generateProject(
  name: string,
  type: string,
  tokenPresetId: string
): Project {
  const template = PROJECT_TEMPLATES[type] || PROJECT_TEMPLATES.agency;
  const tokens =
    TOKEN_PRESETS.find((t) => t.id === tokenPresetId) || TOKEN_PRESETS[0];

  const pages: Page[] = template.pages.map((p) => ({
    id: genId(),
    name: p.name,
    slug: p.slug,
    blocks: p.blocks.map((b) => ({
      ...b,
      id: genId(),
    })),
  }));

  return {
    id: genId(),
    name,
    type,
    pages,
    tokens,
  };
}

export function createProjectFromDraft(draft: ProjectDraft): Project {
  const tokens =
    TOKEN_PRESETS.find((token) => token.id === draft.tokenPresetId) ||
    TOKEN_PRESETS[0];

  const pages: Page[] = draft.pages.map((page, pageIndex) => ({
    id: genId(),
    name: page.name || `Page ${pageIndex + 1}`,
    slug: page.slug.startsWith("/") ? page.slug : `/${page.slug}`,
    blocks: page.blocks.map((block) => ({
      id: genId(),
      type: block.type,
      variant: block.variant,
      content: Object.fromEntries(
        Object.entries(block.content || {}).map(([key, value]) => [
          key,
          String(value ?? ""),
        ])
      ),
      overrides: block.overrides,
    })),
  }));

  return {
    id: genId(),
    name: draft.name || "Prompt Project",
    type: draft.type || "custom",
    pages,
    tokens,
  };
}
