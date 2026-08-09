import type {
  DesignBrief,
  DesignBriefPage,
  DesignBriefSection,
} from "./design-brief";

export type PageCharacterPreset =
  | "saas-clean"
  | "editorial-premium"
  | "commerce-warm"
  | "app-dashboard"
  | "luxury-dark";

export type GraphPageKind = "landing" | "content" | "app" | "utility";
export type GraphPageStatus = "draft" | "planned" | "designed" | "coded" | "mixed" | "custom";

export interface LockedBlock {
  id: string;
  label: string;
  route: string;
  reason: string;
  componentPath?: string;
}

export interface GraphSection {
  id: string;
  patternId: string | null;
  label: string;
  description?: string;
  animation?: DesignBriefSection["animation"];
  source: "design" | "code" | "custom" | "mixed";
  componentPath?: string;
}

export interface GraphPage {
  id: string;
  name: string;
  slug: string;
  route: string;
  kind: GraphPageKind;
  character: PageCharacterPreset;
  status: GraphPageStatus;
  sections: GraphSection[];
  lockedBlocks: LockedBlock[];
  source: "brief" | "code" | "mixed";
}

export interface FeatureToggle {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  status: "planned" | "active" | "custom";
  routes: string[];
}

export interface ProjectGraph {
  version: 1;
  name: string;
  pages: GraphPage[];
  features: FeatureToggle[];
  navigation: string[];
  notes: string;
  updatedAt: number;
}

export interface FeatureIntent {
  action: "add" | "remove";
  featureId: FeatureToggle["id"];
  raw: string;
}

const GRAPH_VERSION = 1;

const FEATURE_DEFINITIONS: Array<Omit<FeatureToggle, "enabled" | "status">> = [
  { id: "auth", label: "Login", description: "Login und Zugangskontrolle", routes: ["/login"] },
  { id: "dashboard-shell", label: "Dashboard", description: "App-Shell mit geschuetztem Bereich", routes: ["/dashboard"] },
  { id: "blog-cms", label: "Blog", description: "Blog oder News-Bereich", routes: ["/blog"] },
  { id: "services", label: "Services", description: "Leistungen, Loesungen oder Angebotsseiten", routes: ["/services"] },
  { id: "case-studies", label: "Case Studies", description: "Referenzprojekte, Work oder Erfolgsgeschichten", routes: ["/work"] },
  { id: "resources", label: "Resources", description: "Ressourcen, Guides oder Download-Bereich", routes: ["/resources"] },
  { id: "docs-center", label: "Docs", description: "Dokumentation, Hilfe oder Wissensbereich", routes: ["/docs"] },
  { id: "pricing", label: "Pricing", description: "Preis- und Tarifdarstellung", routes: ["/pricing"] },
  { id: "faq", label: "FAQ", description: "Haeufige Fragen", routes: ["/faq"] },
  { id: "contact-form", label: "Kontaktformular", description: "Kontakt- oder Lead-Formular", routes: ["/contact"] },
  { id: "newsletter", label: "Newsletter", description: "Newsletter oder E-Mail-Eintrag", routes: ["/newsletter"] },
  { id: "booking", label: "Booking", description: "Terminbuchung oder Reservierung", routes: ["/booking"] },
  { id: "checkout", label: "Checkout", description: "Bezahl- oder Checkout-Schritt", routes: ["/checkout"] },
  { id: "team", label: "Team", description: "Team- oder Ueber-uns-Inhalte", routes: ["/team"] },
  { id: "gallery", label: "Galerie", description: "Portfolio oder Bildgalerie", routes: ["/gallery"] },
  { id: "testimonials", label: "Testimonials", description: "Kundenstimmen oder Social Proof", routes: ["/"] },
];

const FEATURE_KEYWORDS: Record<FeatureToggle["id"], string[]> = {
  auth: ["login", "anmeldung", "auth", "sign in", "signup", "sign up", "konto"],
  "dashboard-shell": ["dashboard", "app shell", "app", "workspace"],
  "blog-cms": ["blog", "news", "artikel", "cms"],
  services: ["services", "leistungen", "service", "solutions", "loesungen", "angebote"],
  "case-studies": ["case studies", "cases", "work", "referenzen", "projekte", "portfolio work"],
  resources: ["resources", "ressourcen", "guides", "downloads", "library"],
  "docs-center": ["docs", "documentation", "hilfe", "knowledge base", "wissensdatenbank", "dokumentation"],
  pricing: ["pricing", "preise", "preis", "tarif", "abo"],
  faq: ["faq", "fragen", "haeufige fragen", "help center"],
  "contact-form": ["kontakt", "contact", "formular", "lead"],
  newsletter: ["newsletter", "email liste", "e-mail liste", "subscribe"],
  booking: ["booking", "buchung", "reservierung", "appointment", "termin"],
  checkout: ["checkout", "bezahlung", "kasse", "payment"],
  team: ["team", "ueber uns", "about us", "about"],
  gallery: ["galerie", "gallery", "portfolio", "cases", "showcase"],
  testimonials: ["testimonial", "referenzen", "bewertungen", "reviews", "kundenstimmen"],
};

function toComparableProjectGraph(graph: ProjectGraph) {
  const { updatedAt: _updatedAt, ...comparableGraph } = graph;
  return comparableGraph;
}

export function getProjectGraphContentKey(graph: ProjectGraph): string {
  return JSON.stringify(toComparableProjectGraph(graph));
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function titleFromSlug(slug: string): string {
  if (!slug) return "Home";
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function kebabFromPascal(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function normalizeRoute(route: string): string {
  if (!route || route === "/") return "/";
  return `/${route.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function routeToSlug(route: string): string {
  return normalizeRoute(route).replace(/^\//, "");
}

function inferKind(route: string): GraphPageKind {
  if (route.startsWith("/dashboard") || route.startsWith("/app")) return "app";
  if (route.startsWith("/privacy") || route.startsWith("/impressum") || route.startsWith("/terms")) return "utility";
  if (route === "/") return "landing";
  return "content";
}

function inferCharacter(route: string, kind: GraphPageKind): PageCharacterPreset {
  if (kind === "app") return "app-dashboard";
  if (route.includes("pricing") || route.includes("checkout")) return "commerce-warm";
  if (route.includes("portfolio") || route.includes("gallery") || route.includes("team")) return "editorial-premium";
  return "saas-clean";
}

function labelFromPattern(patternId: string | null): string {
  if (!patternId) return "Custom Block";
  return patternId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function graphSectionFromBrief(
  section: DesignBriefSection,
  existing?: GraphSection
): GraphSection {
  return {
    id: existing?.id ?? section.id,
    patternId: section.patternId,
    label: section.label || labelFromPattern(section.patternId),
    description: section.description,
    animation: section.animation,
    source: existing?.source === "code" ? "mixed" : "design",
    componentPath: existing?.componentPath,
  };
}

function buildPageFromBrief(
  page: Pick<DesignBriefPage, "id" | "name" | "slug" | "sections"> & { route: string },
  existing?: GraphPage
): GraphPage {
  const kind = existing?.kind ?? inferKind(page.route);
  return {
    id: existing?.id ?? page.id,
    name: page.name,
    slug: page.slug,
    route: normalizeRoute(page.route),
    kind,
    character: existing?.character ?? inferCharacter(page.route, kind),
    status: page.sections.length > 0 ? (existing?.status === "coded" ? "mixed" : "designed") : (existing?.status ?? "draft"),
    sections: page.sections.map((section) =>
      graphSectionFromBrief(
        section,
        existing?.sections.find(
          (candidate) =>
            candidate.id === section.id ||
            (candidate.patternId && candidate.patternId === section.patternId)
        )
      )
    ),
    lockedBlocks: existing?.lockedBlocks ?? [],
    source: existing?.source === "code" ? "mixed" : "brief",
  };
}

function detectEnabledFeatures(brief: DesignBrief, pages: GraphPage[]): Set<FeatureToggle["id"]> {
  const enabled = new Set<FeatureToggle["id"]>();
  const allSections = [
    ...brief.sections,
    ...(brief.additionalPages ?? []).flatMap((page) => page.sections),
  ];

  for (const section of allSections) {
    if (section.patternId.startsWith("pricing")) enabled.add("pricing");
    if (section.patternId.startsWith("testimonials") || section.patternId.startsWith("social-proof")) enabled.add("testimonials");
    if (section.patternId === "interactive-contact") enabled.add("contact-form");
    if (section.patternId === "content-faq") enabled.add("faq");
    if (section.patternId === "cta-newsletter") enabled.add("newsletter");
    if (section.patternId === "content-team") enabled.add("team");
    if (section.patternId === "showcase-gallery") enabled.add("gallery");
    if (section.patternId === "content-blog-grid") enabled.add("blog-cms");
  }

  for (const page of pages) {
    if (page.route === "/blog") enabled.add("blog-cms");
    if (page.route === "/services") enabled.add("services");
    if (page.route === "/work" || page.route === "/cases") enabled.add("case-studies");
    if (page.route === "/resources") enabled.add("resources");
    if (page.route === "/docs" || page.route === "/help") enabled.add("docs-center");
    if (page.route === "/pricing") enabled.add("pricing");
    if (page.route === "/contact") enabled.add("contact-form");
    if (page.route === "/faq") enabled.add("faq");
    if (page.route === "/team") enabled.add("team");
    if (page.route === "/dashboard") enabled.add("dashboard-shell");
    if (page.route === "/login" || page.route === "/signup") enabled.add("auth");
    if (page.route === "/checkout") enabled.add("checkout");
    if (page.route === "/booking") enabled.add("booking");
    if (page.route === "/gallery" || page.route === "/portfolio") enabled.add("gallery");
  }

  return enabled;
}

function mergeFeatures(
  enabledSet: Set<FeatureToggle["id"]>,
  existing?: ProjectGraph
): FeatureToggle[] {
  return FEATURE_DEFINITIONS.map((feature) => {
    const existingFeature = existing?.features.find((candidate) => candidate.id === feature.id);
    const enabled = enabledSet.has(feature.id) || existingFeature?.enabled === true;
    return {
      ...feature,
      enabled,
      status: enabled
        ? existingFeature?.status ?? "active"
        : existingFeature?.status ?? "planned",
    };
  });
}

export function createProjectGraphFromBrief(
  brief: DesignBrief,
  existing?: ProjectGraph
): ProjectGraph {
  const pagesFromBrief: GraphPage[] = [
    buildPageFromBrief(
      { id: "home", name: "Home", slug: "", route: "/", sections: brief.sections },
      existing?.pages.find((page) => page.route === "/")
    ),
    ...(brief.additionalPages ?? []).map((page) =>
      buildPageFromBrief(
        { ...page, route: normalizeRoute(page.slug || page.name) },
        existing?.pages.find((candidate) => candidate.id === page.id || candidate.route === normalizeRoute(page.slug || page.name))
      )
    ),
  ];

  const enabledFeatures = detectEnabledFeatures(brief, pagesFromBrief);
  const navigation = pagesFromBrief.map((page) => page.route);

  return {
    version: GRAPH_VERSION,
    name: brief.name,
    pages: pagesFromBrief,
    features: mergeFeatures(enabledFeatures, existing),
    navigation,
    notes: existing?.notes ?? brief.notes ?? "",
    updatedAt: Date.now(),
  };
}

function inferRouteFromPath(path: string): string | null {
  if (path === "src/app/page.tsx") return "/";
  if (!path.startsWith("src/app/") || !path.endsWith("/page.tsx")) {
    return null;
  }
  const relative = path
    .replace(/^src\/app\//, "")
    .replace(/\/page\.tsx$/, "");
  return relative ? normalizeRoute(relative) : "/";
}

function readSectionImports(content: string): Array<{ patternId: string; componentPath: string }> {
  const matches = Array.from(
    content.matchAll(/from\s+["']@\/components\/sections\/([A-Za-z0-9/_-]+)["']/g)
  );
  return matches.map((match) => {
    const importPath = match[1];
    const name = importPath.split("/").pop() ?? importPath;
    return {
      patternId: kebabFromPascal(name),
      componentPath: `src/components/sections/${importPath}.tsx`,
    };
  });
}

function readCustomImports(content: string): string[] {
  return Array.from(
    content.matchAll(/from\s+["']@\/components\/(?!sections\/)([A-Za-z0-9/_-]+)["']/g)
  ).map((match) => `src/components/${match[1]}.tsx`);
}

function ensureUniqueLockedBlocks(blocks: LockedBlock[]): LockedBlock[] {
  const seen = new Set<string>();
  return blocks.filter((block) => {
    const key = `${block.route}:${block.label}:${block.componentPath ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeProjectGraphWithFiles(
  graph: ProjectGraph,
  files: Record<string, string> | Array<{ path: string; content: string }>
): ProjectGraph {
  const fileEntries = Array.isArray(files)
    ? files
    : Object.entries(files).map(([path, content]) => ({ path, content }));
  const nextPages = [...graph.pages];

  for (const file of fileEntries) {
    const route = inferRouteFromPath(file.path);
    if (!route) continue;

    const pageIndex = nextPages.findIndex((page) => page.route === route);
    const existing = pageIndex >= 0 ? nextPages[pageIndex] : undefined;
    const kind = existing?.kind ?? inferKind(route);
    const page = existing
      ? {
          ...existing,
          sections: [...existing.sections],
          lockedBlocks: [...existing.lockedBlocks],
        }
      : {
          id: route === "/" ? "home" : `graph_${routeToSlug(route) || "home"}`,
          name: titleFromSlug(routeToSlug(route)),
          slug: routeToSlug(route),
          route,
          kind,
          character: inferCharacter(route, kind),
          status: "custom" as GraphPageStatus,
          sections: [],
          lockedBlocks: [],
          source: "code" as const,
        };

    const importedSections = readSectionImports(file.content);
    const customImports = readCustomImports(file.content);

    if (importedSections.length > 0) {
      page.sections = importedSections.map((entry, index) => {
        const previous =
          page.sections.find((section) => section.componentPath === entry.componentPath) ??
          page.sections.find((section) => section.patternId === entry.patternId);
        return {
          id: previous?.id ?? `${page.id}_code_${index}_${entry.patternId}`,
          patternId: entry.patternId,
          label: previous?.label ?? labelFromPattern(entry.patternId),
          description: previous?.description ?? "Aus Code erkannt",
          animation: previous?.animation ?? "none",
          source:
            previous?.source === "design" || previous?.source === "mixed"
              ? "mixed"
              : "code",
          componentPath: entry.componentPath,
        };
      });
    }

    const lockedBlocks = [...page.lockedBlocks];
    if (customImports.length > 0 || (importedSections.length === 0 && file.content.includes("<main"))) {
      lockedBlocks.push({
        id: `${page.id}_locked_page`,
        label: route === "/" ? "Custom Home Block" : `${page.name} Custom Block`,
        route,
        reason:
          importedSections.length === 0
            ? "Die Route enthaelt freien Code ausserhalb der visuellen Sektionen."
            : "Zusatz-Komponenten aus dem Coding-Modus koennen nicht voll visuell bearbeitet werden.",
        componentPath: file.path,
      });
    }

    page.lockedBlocks = ensureUniqueLockedBlocks(lockedBlocks);
    page.source = existing ? (existing.source === "brief" ? "mixed" : existing.source) : "code";
    page.status = page.lockedBlocks.length > 0
      ? (page.sections.length > 0 ? "mixed" : "custom")
      : (page.sections.length > 0 ? "coded" : page.status);

    if (pageIndex >= 0) nextPages[pageIndex] = page;
    else nextPages.push(page);
  }

  const enabled = new Set(
    graph.features.filter((feature) => feature.enabled).map((feature) => feature.id)
  );
  for (const page of nextPages) {
    if (page.route === "/blog") enabled.add("blog-cms");
    if (page.route === "/services") enabled.add("services");
    if (page.route === "/work" || page.route === "/cases") enabled.add("case-studies");
    if (page.route === "/resources") enabled.add("resources");
    if (page.route === "/docs" || page.route === "/help") enabled.add("docs-center");
    if (page.route === "/dashboard") enabled.add("dashboard-shell");
    if (page.route === "/login" || page.route === "/signup") enabled.add("auth");
    if (page.route === "/contact") enabled.add("contact-form");
    if (page.route === "/pricing") enabled.add("pricing");
    if (page.route === "/faq") enabled.add("faq");
    if (page.route === "/team") enabled.add("team");
    if (page.route === "/checkout") enabled.add("checkout");
    if (page.route === "/booking") enabled.add("booking");
    if (page.route === "/gallery" || page.route === "/portfolio") enabled.add("gallery");
    for (const section of page.sections) {
      if (section.patternId?.startsWith("pricing")) enabled.add("pricing");
      if (section.patternId === "content-faq") enabled.add("faq");
      if (section.patternId === "cta-newsletter") enabled.add("newsletter");
      if (section.patternId === "content-team") enabled.add("team");
      if (section.patternId === "showcase-gallery") enabled.add("gallery");
      if (section.patternId === "content-blog-grid") enabled.add("blog-cms");
      if (section.patternId?.startsWith("testimonials") || section.patternId?.startsWith("social-proof")) enabled.add("testimonials");
    }
  }

  const sortedPages = [...nextPages].sort((a, b) =>
    a.route === "/" ? -1 : b.route === "/" ? 1 : a.route.localeCompare(b.route)
  );
  const nextGraph: ProjectGraph = {
    ...graph,
    pages: sortedPages,
    features: mergeFeatures(enabled, graph),
    navigation: sortedPages.map((page) => page.route),
    updatedAt: graph.updatedAt,
  };

  if (getProjectGraphContentKey(nextGraph) === getProjectGraphContentKey(graph)) {
    return graph;
  }

  return {
    ...nextGraph,
    updatedAt: Date.now(),
  };
}

function toBriefSection(section: GraphSection): DesignBriefSection | null {
  if (!section.patternId) return null;
  return {
    id: section.id,
    patternId: section.patternId,
    label: section.label || labelFromPattern(section.patternId),
    description: section.description,
    animation: section.animation ?? "none",
  };
}

export function applyGraphToBrief(brief: DesignBrief, graph: ProjectGraph): DesignBrief {
  const homePage = graph.pages.find((page) => page.route === "/");
  const additionalPages = graph.pages
    .filter((page) => page.route !== "/")
    .map((page) => ({
      id: page.id,
      name: page.name,
      slug: page.slug || routeToSlug(page.route),
      sections: page.sections
        .map(toBriefSection)
        .filter((section): section is DesignBriefSection => Boolean(section)),
    }));

  return {
    ...brief,
    name: graph.name || brief.name,
    sections: (homePage?.sections ?? [])
      .map(toBriefSection)
      .filter((section): section is DesignBriefSection => Boolean(section)),
    additionalPages,
    updatedAt: Date.now(),
  };
}

export function projectGraphToFiles(graph: ProjectGraph): Record<string, string> {
  return {
    ".d3/GRAPH.json": `${JSON.stringify(graph, null, 2)}\n`,
    ".d3/FEATURES.md": projectGraphToFeaturesMarkdown(graph),
  };
}

export function projectGraphToFeaturesMarkdown(graph: ProjectGraph): string {
  const enabled = graph.features.filter((feature) => feature.enabled);
  const disabled = graph.features.filter((feature) => !feature.enabled);

  const enabledText = enabled.length > 0
    ? enabled
        .map((feature) => `- [x] **${feature.label}** (\`${feature.id}\`) — ${feature.description}`)
        .join("\n")
    : "- [ ] Noch keine Features aktiviert";

  const disabledText = disabled.length > 0
    ? disabled
        .slice(0, 6)
        .map((feature) => `- [ ] ${feature.label} (\`${feature.id}\`)`)
        .join("\n")
    : "- [x] Alle Kernfeatures sind aktiv";

  return `# Features

## Aktiv
${enabledText}

## Noch moeglich
${disabledText}
`;
}

export function findFeatureIntents(input: string): FeatureIntent[] {
  const text = input.toLowerCase();
  const action = /(remove|entfern|loesch|deaktiv|without|ohne)/.test(text) ? "remove" : /(add|fueg|füge|aktivi|enable|mit)/.test(text) ? "add" : null;
  if (!action) return [];

  const intents: FeatureIntent[] = [];
  for (const [featureId, keywords] of Object.entries(FEATURE_KEYWORDS) as Array<[FeatureToggle["id"], string[]]>) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      intents.push({ action, featureId, raw: input });
    }
  }
  return intents;
}

function ensureFeaturePage(graph: ProjectGraph, route: string, name?: string, kind?: GraphPageKind): ProjectGraph {
  const normalized = normalizeRoute(route);
  if (graph.pages.some((page) => page.route === normalized)) return graph;

  const nextPage: GraphPage = {
    id: `feature_${routeToSlug(normalized) || "home"}`,
    name: name ?? titleFromSlug(routeToSlug(normalized)),
    slug: routeToSlug(normalized),
    route: normalized,
    kind: kind ?? inferKind(normalized),
    character: inferCharacter(normalized, kind ?? inferKind(normalized)),
    status: "planned",
    sections: [],
    lockedBlocks: [],
    source: "brief",
  };

  return {
    ...graph,
    pages: [...graph.pages, nextPage].sort((a, b) => (a.route === "/" ? -1 : b.route === "/" ? 1 : a.route.localeCompare(b.route))),
    navigation: [...new Set([...graph.navigation, normalized])],
    updatedAt: Date.now(),
  };
}

function removeFeaturePage(graph: ProjectGraph, routes: string[]): ProjectGraph {
  const normalizedRoutes = new Set(routes.map(normalizeRoute));
  const pages = graph.pages.filter((page) => !normalizedRoutes.has(page.route));
  return {
    ...graph,
    pages,
    navigation: graph.navigation.filter((route) => !normalizedRoutes.has(route)),
    updatedAt: Date.now(),
  };
}

function upsertHomeSection(graph: ProjectGraph, patternId: string, label: string): ProjectGraph {
  const pages = graph.pages.map((page) => {
    if (page.route !== "/") return page;
    if (page.sections.some((section) => section.patternId === patternId)) return page;
    return {
      ...page,
      sections: [
        ...page.sections,
        {
          id: `${page.id}_${patternId}`,
          patternId,
          label,
          description: "Per Textbefehl aktiviert",
          animation: "fade-up" as const,
          source: "design" as const,
        },
      ],
      status: page.status === "draft" ? "planned" : page.status,
    };
  });
  return { ...graph, pages, updatedAt: Date.now() };
}

function removeHomeSection(graph: ProjectGraph, patternId: string): ProjectGraph {
  return {
    ...graph,
    pages: graph.pages.map((page) =>
      page.route === "/"
        ? { ...page, sections: page.sections.filter((section) => section.patternId !== patternId) }
        : page
    ),
    updatedAt: Date.now(),
  };
}

export function applyFeatureIntentsToGraph(
  graph: ProjectGraph,
  intents: FeatureIntent[]
): ProjectGraph {
  let next = { ...graph, features: [...graph.features], pages: [...graph.pages], navigation: [...graph.navigation], updatedAt: Date.now() };

  for (const intent of intents) {
    const feature = FEATURE_DEFINITIONS.find((candidate) => candidate.id === intent.featureId);
    if (!feature) continue;

    next = {
      ...next,
      features: next.features.map((candidate) =>
        candidate.id === feature.id
          ? {
              ...candidate,
              enabled: intent.action === "add",
              status: intent.action === "add" ? "active" : "planned",
            }
          : candidate
      ),
    };

    if (intent.action === "add") {
      if (feature.id === "blog-cms") next = ensureFeaturePage(next, "/blog", "Blog");
      if (feature.id === "services") next = ensureFeaturePage(next, "/services", "Services");
      if (feature.id === "case-studies") next = ensureFeaturePage(next, "/work", "Work");
      if (feature.id === "resources") next = ensureFeaturePage(next, "/resources", "Resources");
      if (feature.id === "docs-center") next = ensureFeaturePage(next, "/docs", "Docs");
      if (feature.id === "pricing") next = ensureFeaturePage(next, "/pricing", "Pricing");
      if (feature.id === "faq") next = ensureFeaturePage(next, "/faq", "FAQ");
      if (feature.id === "contact-form") next = ensureFeaturePage(next, "/contact", "Kontakt");
      if (feature.id === "team") next = ensureFeaturePage(next, "/team", "Team");
      if (feature.id === "auth") next = ensureFeaturePage(next, "/login", "Login", "app");
      if (feature.id === "dashboard-shell") next = ensureFeaturePage(next, "/dashboard", "Dashboard", "app");
      if (feature.id === "booking") next = ensureFeaturePage(next, "/booking", "Booking", "app");
      if (feature.id === "checkout") next = ensureFeaturePage(next, "/checkout", "Checkout", "app");
      if (feature.id === "gallery") next = ensureFeaturePage(next, "/gallery", "Galerie");
      if (feature.id === "newsletter") next = upsertHomeSection(next, "cta-newsletter", "Newsletter");
      if (feature.id === "testimonials") next = upsertHomeSection(next, "testimonials-cards", "Testimonials");
    } else {
      next = removeFeaturePage(next, feature.routes);
      if (feature.id === "newsletter") next = removeHomeSection(next, "cta-newsletter");
      if (feature.id === "testimonials") next = removeHomeSection(next, "testimonials-cards");
    }
  }

  return { ...next, updatedAt: Date.now() };
}
