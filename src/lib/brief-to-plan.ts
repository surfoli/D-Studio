// ── Brief → Plan Markdown ──
// Converts a DesignBrief into .d3/ markdown files for Plan Mode.
// Called when a template is selected or when plan files are empty.

import type { DesignBrief } from "./design-brief";
import {
  createProjectGraphFromBrief,
  projectGraphToFeaturesMarkdown,
} from "./project-graph";
import { CMS_SECTION_MAP, detectCmsTypes } from "./section-code-templates";

export interface PlanFile {
  path: string;
  content: string;
}

// ── Main entry point ──

export function generatePlanMarkdownFromBrief(brief: DesignBrief): PlanFile[] {
  return [
    { path: ".d3/PROJECT.md", content: generateProjectMarkdown(brief) },
    { path: ".d3/BUSINESS.md", content: generateBusinessMarkdown(brief) },
    { path: ".d3/STYLE.md", content: generateStyleMarkdown(brief) },
    { path: ".d3/DECISIONS.md", content: generateDecisionsMarkdown(brief) },
    { path: ".d3/TODOS.md", content: generateTodosMarkdown(brief) },
    { path: ".d3/REFERENCES.md", content: generateReferencesMarkdown(brief) },
    { path: ".d3/PAGES.md", content: generatePagesMarkdown(brief) },
    { path: ".d3/FEATURES.md", content: generateFeaturesMarkdown(brief) },
    { path: ".d3/MODULES.md", content: generateModulesMarkdown(brief) },
    { path: ".d3/CONTENT.md", content: generateContentMarkdown(brief) },
    { path: ".d3/TECHSTACK.md", content: generateTechStackMarkdown(brief) },
    { path: ".d3/SYNC.md", content: generateSyncMarkdown(brief) },
    { path: ".d3/FLOWS.md", content: generateFlowsMarkdown(brief) },
  ];
}

interface BusinessProfile {
  category: string;
  audience: string[];
  primaryGoal: string;
  primaryCta: string;
  recommendedPages: string[];
  opportunities: string[];
  heroHeadline: string;
  heroSubline: string;
  templateMode: string;
}

interface BriefPageSnapshot {
  name: string;
  route: string;
  sections: DesignBrief["sections"];
}

function inferBusinessProfile(brief: DesignBrief): BusinessProfile {
  const haystack = `${brief.name} ${brief.contentTheme ?? ""} ${brief.notes}`.toLowerCase();

  if (/(saas|software|platform|app|dashboard|tool|workspace)/.test(haystack)) {
    return {
      category: "B2B SaaS",
      audience: ["Produktteams", "Gruender", "Operations-Teams"],
      primaryGoal: "Produktinteresse in Demo, Trial oder Signup verwandeln",
      primaryCta: "Demo anfragen",
      recommendedPages: ["Home", "Pricing", "Features", "FAQ", "Kontakt", "Login"],
      opportunities: [
        "Use Cases und Rollen-spezifische Seiten staerken die Conversion",
        "Social Proof, ROI-Rechner und FAQ nehmen Kaufwiderstaende frueh raus",
        "Ein modularer Ressourcenbereich kann spaeter SEO-Traffic bringen",
      ],
      heroHeadline: "Weniger Reibung. Mehr Fortschritt.",
      heroSubline: "Eine klare Produktseite, die Vertrauen aufbaut und Besucher sauber in Demo oder Trial fuehrt.",
      templateMode: "Schnellster Start: SaaS-Template als Basis, danach Features und Inhalte modular erweitern.",
    };
  }

  if (/(agency|studio|portfolio|creative|branding|freelance|design)/.test(haystack)) {
    return {
      category: "Service / Agency",
      audience: ["KMU", "Marketing-Teams", "Founder", "Premium-Kunden"],
      primaryGoal: "Qualifizierte Leads ueber Cases, Expertise und Kontaktpunkte gewinnen",
      primaryCta: "Projekt anfragen",
      recommendedPages: ["Home", "Leistungen", "Cases", "About", "Kontakt"],
      opportunities: [
        "Case Studies mit klaren Ergebnissen und Zahlen werden zum wichtigsten Vertrauenshebel",
        "Service-Seiten koennen fuer konkrete Zielbranchen oder Pakete differenzieren",
        "Ein modularer Prozess-Abschnitt hilft, den Verkaufsprozess zu entlasten",
      ],
      heroHeadline: "Starke digitale Auftritte fuer Unternehmen mit Anspruch.",
      heroSubline: "Eine professionelle Website, die Stil, Kompetenz und messbare Ergebnisse sichtbar macht.",
      templateMode: "Hybrid-Start: Agency-Template als Fundament, danach Cases und Services wie Lego-Bausteine kombinieren.",
    };
  }

  if (/(shop|store|commerce|e-commerce|product|sku|checkout)/.test(haystack)) {
    return {
      category: "E-Commerce",
      audience: ["Mobile-first Kauefer", "Wiederkehrende Kunden", "Preisvergleichende Besucher"],
      primaryGoal: "Vertrauen aufbauen und Besucher moeglichst reibungslos zum Kauf bringen",
      primaryCta: "Jetzt kaufen",
      recommendedPages: ["Home", "Katalog", "Produkt", "FAQ", "Kontakt", "Checkout Info"],
      opportunities: [
        "Produktvergleich, Bewertungen und Versandinfos reduzieren Abbruchraten",
        "Sammlungsseiten helfen beim Skalieren auf mehrere Produkte oder Kategorien",
        "Module fuer Bundles, Reviews und FAQs lassen sich spaeter billig wiederverwenden",
      ],
      heroHeadline: "Vertrauen in Sekunden. Kaufabschluss ohne Umwege.",
      heroSubline: "Eine modulare Shop-Struktur, die Produkte klar praesentiert und Huerden vor dem Checkout senkt.",
      templateMode: "Guenstiger Start: Shop-Template mit wiederverwendbaren Produkt-, Review- und FAQ-Modulen.",
    };
  }

  return {
    category: "Business Website",
    audience: ["Interessenten", "Bestandskunden", "Partner"],
    primaryGoal: "Leads, Vertrauen und klare Orientierung fuer das Angebot schaffen",
    primaryCta: "Kontakt aufnehmen",
    recommendedPages: ["Home", "Leistungen", "About", "Kontakt", "Rechtliches"],
    opportunities: [
      "Klare Angebotsseiten sparen spaeter Sales-Erklaeraufwand",
      "Ein modularer Seitenbaum erleichtert Wachstum ohne kompletten Relaunch",
      "Business-Empfehlungen und Templates helfen bei guenstigem Projektstart",
    ],
    heroHeadline: "Eine professionelle Website, die Geschaeft und Marke sauber verbindet.",
    heroSubline: "Von Struktur bis Umsetzung: modular geplant, sichtbar dokumentiert und spaeter kontrolliert erweiterbar.",
    templateMode: "Empfehlung: zuerst mit Template-Bausteinen planen, dann nur kritische Bereiche individuell ausbauen.",
  };
}

function getAllPages(brief: DesignBrief): BriefPageSnapshot[] {
  return [
    { name: "Home", route: "/", sections: brief.sections },
    ...(brief.additionalPages ?? []).map((page) => ({
      name: page.name,
      route: normalizeRoute(page.slug),
      sections: page.sections,
    })),
  ];
}

function normalizeRoute(slug?: string): string {
  if (!slug) return "/";
  return `/${slug.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function routeLabel(route: string): string {
  if (route === "/") return "Home";
  return route
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

function humanizeRouteList(routes: string[]): string {
  if (routes.length === 0) return "Home";
  return routes.map((route) => routeLabel(route)).join(", ");
}

function listSections(sections: DesignBrief["sections"]): string {
  if (sections.length === 0) return "- Noch keine Sektionen definiert";
  return sections
    .map((section) => `- **${section.label}** (\`${section.patternId}\`)${section.description ? ` - ${section.description}` : ""}`)
    .join("\n");
}

function collectUniqueSections(brief: DesignBrief): Array<{ label: string; patternId: string; description?: string }> {
  const seen = new Set<string>();
  const ordered = [
    ...brief.sections,
    ...(brief.additionalPages ?? []).flatMap((page) => page.sections),
  ];

  return ordered.flatMap((section) => {
    if (seen.has(section.patternId)) return [];
    seen.add(section.patternId);
    return [{
      label: section.label,
      patternId: section.patternId,
      description: section.description,
    }];
  });
}

function guessMetaDescription(brief: DesignBrief, profile: BusinessProfile): string {
  const summary = brief.notes.trim();
  if (summary) return summary.slice(0, 160);
  return `${brief.name} - ${profile.category} Website mit klarer Struktur, professionellem Auftritt und sauberem Conversion-Fokus.`;
}

function generateProjectMarkdown(brief: DesignBrief): string {
  const profile = inferBusinessProfile(brief);
  const pages = getAllPages(brief);

  return `# ${brief.name}

## Website-Typ
- **Kategorie**: ${profile.category}
- **Projektmodus**: Professionelle Multi-Page Website, nicht nur Landingpage

## Zielgruppen
${profile.audience.map((item) => `- ${item}`).join("\n")}

## Hauptziel
- ${profile.primaryGoal}

## Projektumfang
- **Aktuelle Seiten**: ${pages.length}
- **Navigationskern**: ${humanizeRouteList(pages.map((page) => page.route))}
- **Primäre CTA**: ${profile.primaryCta}

## Nutzenversprechen
- ${profile.heroHeadline}
- ${profile.heroSubline}

## Planungshinweis
- Das Projekt soll so dokumentiert sein, dass Inhalte, Seitenbaum, Module und Technik spaeter sichtbar und editierbar bleiben.
`;
}

function generateBusinessMarkdown(brief: DesignBrief): string {
  const profile = inferBusinessProfile(brief);

  return `# Business Fit

## Bereich
- **Business-Bereich**: ${profile.category}
- **Hauptziel**: ${profile.primaryGoal}
- **Top-CTA**: ${profile.primaryCta}

## Pflichtseiten fuer diesen Bereich
${profile.recommendedPages.map((page) => `- ${page}`).join("\n")}

## Empfehlungen
${profile.opportunities.map((item) => `- ${item}`).join("\n")}

## Guenstige Startstrategie
- ${profile.templateMode}
- Plane zuerst Struktur, Copy und Module. Schalte Live-Sync erst dann voll ein, wenn der Kern freigegeben ist.
- Nutze wiederverwendbare Template-Bausteine, damit neue Seiten spaeter wie Lego zusammengesetzt werden koennen.
`;
}

// ── .d3/STYLE.md — Design System ──

export function generateStyleMarkdown(brief: DesignBrief): string {
  const c = brief.colors;
  const t = brief.typography;
  const s = brief.spacing;
  const st = brief.style;

  const spacingLabel =
    s.system === "compact" ? "Kompakt (4px Basis)" :
    s.system === "relaxed" ? "Entspannt (8px Basis, viel Weißraum)" :
    "Ausgewogen (8px Basis)";

  const radiusLabel =
    st.borderRadius === "sharp" ? "Scharf (0px)" :
    st.borderRadius === "rounded" ? "Gerundet (1rem)" :
    st.borderRadius === "pill" ? "Pill (9999px)" :
    "Weich (0.5rem)";

  return `# Design & Stil

## Stimmung / Mood
${st.mood || "clean-saas"}

## Farbpalette
- **Primary**: ${c.primary}
- **Secondary**: ${c.secondary}
- **Accent**: ${c.accent}
- **Background**: ${c.background}
- **Surface**: ${c.surface}
- **Text**: ${c.text}
- **Text Muted**: ${c.textMuted}

## Typografie
- **Heading Font**: ${t.headingFont || "Inter"}
- **Body Font**: ${t.bodyFont || "Inter"}
- **Mono Font**: ${t.monoFont || "JetBrains Mono"}
- **Basis-Größe**: ${t.baseSize || 16}px
- **Typografische Skala**: ${t.scale || 1.25}

## Abstände
${spacingLabel}

## Border Radius
${radiusLabel}

## Dark Mode
${st.darkMode ? "Ja — dunkles Design" : "Nein — helles Design"}
`;
}

// ── .d3/PAGES.md — Seiten & Sektionen ──

export function generatePagesMarkdown(brief: DesignBrief): string {
  const pages = getAllPages(brief);
  const pageTree = pages
    .map((page) => `- \`${page.route}\` - ${page.name}`)
    .join("\n");

  const additionalPages = (brief.additionalPages ?? [])
    .map((page) => `### /${page.slug} - ${page.name}\n${listSections(page.sections)}`)
    .join("\n\n");

  const navigation = pages.length > 0
    ? pages.map((page) => `- ${page.name} -> \`${page.route}\``).join("\n")
    : "- Navigation noch offen";

  return `# Seiten & Routen

## Seitenbaum
${pageTree || "- \`/\` - Home"}

## Home (/)
${listSections(brief.sections)}

${additionalPages ? `## Weitere Seiten\n\n${additionalPages}\n\n` : ""}## Navigation
${navigation}
`;
}

// ── .d3/TECHSTACK.md — Tech Stack ──

export function generateTechStackMarkdown(brief: DesignBrief): string {
  const hasCms = detectCmsTypes(brief).length > 0;
  const cmsPatterns = brief.sections
    .filter((s) => CMS_SECTION_MAP[s.patternId])
    .map((s) => `- ${s.label} → ${CMS_SECTION_MAP[s.patternId]}`)
    .join("\n");

  return `# Tech Stack

## Framework
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**

## Styling
- **Tailwind CSS v3**
- **Framer Motion** (Animationen)

## Fonts
- **${brief.typography.headingFont || "Inter"}** (Überschriften, via next/font/google)
- **${brief.typography.bodyFont || "Inter"}** (Fließtext, via next/font/google)

## Deployment
- **Vercel** (empfohlen)
${hasCms ? `
## CMS / Backend
- **Supabase** (Datenbank für dynamische Inhalte)
- Erkannte CMS-Sektionen:
${cmsPatterns}
` : ""}
## Build Output
- Statisch optimiert
- Image Optimization via next/image
- SEO-ready (Metadata API)
`;
}

export function generateDecisionsMarkdown(brief: DesignBrief): string {
  const profile = inferBusinessProfile(brief);

  return `# Entscheidungen

## Produkt-Entscheidungen
- **Site Scope**: Multi-Page Aufbau fuer ${profile.category}
- **Planungslogik**: Seiten, Features und Module bleiben als editierbare Spezifikation sichtbar

## Design-Entscheidungen
- **Design-System zuerst**: Farben, Schriften und Spacing werden zentral dokumentiert
- **Module statt Einzelbau**: Wiederverwendbare Bausteine sparen spaeter Zeit und Budget

## Technik-Entscheidungen
- **Framework**: Next.js 16 mit React 19 fuer langfristige Erweiterbarkeit
- **Deployment**: Vercel als Standard-Hosting
- **Optionale Datenbasis**: Supabase nur einschalten, wenn CMS, Auth oder dynamische Inhalte wirklich noetig sind
`;
}

export function generateTodosMarkdown(brief: DesignBrief): string {
  const profile = inferBusinessProfile(brief);

  return `# Aufgaben

## Offen
- [ ] Finalen Seitenbaum fuer ${profile.category} bestaetigen
- [ ] Kernmodule priorisieren und als Lego-Bausteine freigeben
- [ ] Hero, CTA und Hauptangebote textlich schaerfen
- [ ] Rechtliches pruefen: Impressum, Datenschutz, Kontaktpunkte
- [ ] Mobile Navigation und Conversion-Pfad testen

## Spaeter
- [ ] SEO- oder Ressourcenbereich planen
- [ ] Analytics / Tracking nur fuer wirklich relevante Ziele aktivieren
- [ ] CMS oder Login nur dann aktivieren, wenn es im Business-Case wirklich gebraucht wird
`;
}

export function generateReferencesMarkdown(brief: DesignBrief): string {
  const profile = inferBusinessProfile(brief);

  return `# Referenzen

## Stilrichtungen
- ${profile.category}
- Professionell, klar, markentauglich

## Wettbewerber / Benchmarks
- Wer sieht in diesem Markt schon stark aus?
- Welche Seiten funktionieren gut auf Mobile?
- Welche CTAs oder Angebotsdarstellungen sind ueberzeugend?

## Zu sammeln
- Moodboards
- Konkurrenzseiten
- gute Navigationsbeispiele
- starke Modul- oder Template-Referenzen
`;
}

export function generateFeaturesMarkdown(brief: DesignBrief): string {
  return projectGraphToFeaturesMarkdown(createProjectGraphFromBrief(brief));
}

export function generateModulesMarkdown(brief: DesignBrief): string {
  const profile = inferBusinessProfile(brief);
  const modules = collectUniqueSections(brief);

  const moduleLines = modules.length > 0
    ? modules.map((module) => `- **${module.label}** (\`${module.patternId}\`)${module.description ? ` - ${module.description}` : ""}`).join("\n")
    : "- Noch keine Module definiert";

  return `# Module & Templates

## Aktive Baukasten-Module
${moduleLines}

## Template-Strategie
- **Startmodus**: ${profile.templateMode}
- **Bauweise**: Seiten werden aus wiederverwendbaren Modulen wie Lego zusammengesetzt
- **KI-Nutzung**: Ganze Seitenbaeume koennen aus Business-Empfehlungen generiert oder aus Templates uebernommen werden

## Wiederverwendung
- Hero-, CTA-, FAQ- und Footer-Module sollten projektweit konsistent bleiben
- Neue Seiten sollen bevorzugt aus vorhandenen Modulen zusammengesetzt werden, bevor Full-Custom gebaut wird
`;
}

export function generateContentMarkdown(brief: DesignBrief): string {
  const profile = inferBusinessProfile(brief);
  const metaDescription = guessMetaDescription(brief, profile);

  return `# Content & Copy

## Tonalitaet
- Klar, professionell, konkret
- Nutzen vor Buzzwords
- Kurze Saetze, starke CTAs

## Hero
- **Headline**: "${profile.heroHeadline}"
- **Subline**: "${profile.heroSubline}"
- **CTA**: "${profile.primaryCta}"

## Kernbotschaften
- ${brief.name} soll in wenigen Sekunden verstaendlich sein
- Die wichtigsten Leistungen oder Produkte muessen ueber Module klar getrennt erkennbar sein
- Jede Kernseite braucht einen klaren naechsten Schritt

## Meta
- **Title**: "${brief.name} | ${profile.category}"
- **Description**: "${metaDescription}"
`;
}

export function generateSyncMarkdown(brief: DesignBrief): string {
  const profile = inferBusinessProfile(brief);

  return `# Sync & Uebergabe

## Betriebsmodi
1. **Template-Modus** - guenstig planen, Struktur und Module zuerst festziehen
2. **Hybrid-Modus** - Templates plus KI-generierte Seiten oder Unterseiten
3. **Live-Sync** - Design und Code laufen direkt zusammen, wenn das Projekt freigegeben ist

## Empfehlung fuer ${profile.category}
- Erst mit Template-Basis und Modul-Baukasten starten
- Live-Sync bewusst an oder aus schalten, je nach Budgetphase und Aenderungsrisiko
- Nur freigegebene Seiten oder Module direkt bis in den Code synchronisieren

## Sichtbarkeit
- Plan, Design und Code sollen den gleichen Projektstand nachvollziehbar zeigen
- Aenderungen muessen sichtbar, editierbar und rueckverfolgbar bleiben
`;
}

export function generateFlowsMarkdown(brief: DesignBrief): string {
  const profile = inferBusinessProfile(brief);
  const pages = getAllPages(brief);

  return `# User Flows

## Hauptpfad
1. Besucher landet auf der passenden Einstiegsseite
2. Nutzenversprechen und Beweise werden innerhalb weniger Scrolls sichtbar
3. Besucher wechselt auf relevante Unterseite oder direkt zur Haupt-CTA
4. ${profile.primaryGoal}

## Navigation
- Kernnavigation: ${humanizeRouteList(pages.map((page) => page.route))}
- Footer enthaelt immer Legal, Kontakt und sekundare Einstiege
- Mobile Navigation muss in maximal 2 Ebenen bleiben

## Interaktionen
- Deutliche CTA pro Kernseite
- Module sollen ohne Bruch zwischen Seiten wiederverwendbar sein
- Formulare, FAQs und Kontaktpunkte muessen fuer Mobile zuerst gedacht werden
`;
}
