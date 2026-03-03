// ── Brief → Code Generator ──
// Converts a DesignBrief into real React/Tailwind/Next.js files
// that can be written directly into the E2B sandbox.

import type { DesignBrief, DesignBriefSection } from "./design-brief";
import { getPatternById } from "./design-patterns";

export interface GeneratedFile {
  path: string;
  content: string;
}

// ── Main entry point ──

export function briefToCode(brief: DesignBrief): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // 1. package.json
  files.push({ path: "package.json", content: generatePackageJson(brief) });

  // 2. tailwind.config.ts
  files.push({ path: "tailwind.config.ts", content: generateTailwindConfig(brief) });

  // 3. app/globals.css
  files.push({ path: "app/globals.css", content: generateGlobalCSS(brief) });

  // 4. app/layout.tsx
  files.push({ path: "app/layout.tsx", content: generateLayout(brief) });

  // 5. app/page.tsx — imports and renders all sections
  files.push({ path: "app/page.tsx", content: generatePage(brief) });

  // 6. Individual section components
  for (const section of brief.sections) {
    const component = generateSectionComponent(section, brief);
    if (component) files.push(component);
  }

  return files;
}

// ── Generate CSS variables from brief ──

export function generateBriefCSS(brief: DesignBrief): string {
  const c = brief.colors;
  return `:root {
  --color-primary: ${c.primary};
  --color-secondary: ${c.secondary};
  --color-accent: ${c.accent};
  --color-background: ${c.background};
  --color-surface: ${c.surface};
  --color-text: ${c.text};
  --color-text-muted: ${c.textMuted};
}`;
}

// ── Helpers ──

function borderRadiusValue(br: string): string {
  switch (br) {
    case "sharp": return "0px";
    case "soft": return "0.5rem";
    case "rounded": return "1rem";
    case "pill": return "9999px";
    default: return "0.5rem";
  }
}

function componentName(section: DesignBriefSection): string {
  // Convert patternId to PascalCase component name
  return section.patternId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

function fileName(section: DesignBriefSection): string {
  return componentName(section) + ".tsx";
}

// ── package.json ──

function generatePackageJson(brief: DesignBrief): string {
  return JSON.stringify(
    {
      name: brief.name.toLowerCase().replace(/\s+/g, "-") || "d3-project",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev --turbopack",
        build: "next build",
        start: "next start",
      },
      dependencies: {
        next: "15.1.0",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
        "framer-motion": "^11.15.0",
        "lucide-react": "^0.460.0",
      },
      devDependencies: {
        typescript: "^5.7.0",
        "@types/node": "^22.0.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        tailwindcss: "^3.4.0",
        postcss: "^8.0.0",
        autoprefixer: "^10.0.0",
        "tailwind-merge": "^2.0.0",
      },
    },
    null,
    2
  );
}

// ── tailwind.config.ts ──

function generateTailwindConfig(brief: DesignBrief): string {
  const c = brief.colors;
  return `import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "${c.primary}",
        secondary: "${c.secondary}",
        accent: "${c.accent}",
        background: "${c.background}",
        surface: "${c.surface}",
        foreground: "${c.text}",
        muted: "${c.textMuted}",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        brand: "${borderRadiusValue(brief.style.borderRadius)}",
      },
    },
  },
  plugins: [],
};
export default config;
`;
}

// ── globals.css ──

function generateGlobalCSS(brief: DesignBrief): string {
  const c = brief.colors;
  const br = borderRadiusValue(brief.style.borderRadius);

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: ${c.primary};
  --color-secondary: ${c.secondary};
  --color-accent: ${c.accent};
  --color-background: ${c.background};
  --color-surface: ${c.surface};
  --color-text: ${c.text};
  --color-text-muted: ${c.textMuted};
  --radius: ${br};
}

body {
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-body), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::selection {
  background: ${c.primary}33;
  color: ${c.text};
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Custom scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${c.textMuted}33; border-radius: 3px; }

/* Marquee animation */
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.animate-marquee {
  animation: marquee 30s linear infinite;
}
`;
}

// ── layout.tsx ──

function generateLayout(brief: DesignBrief): string {
  const headingFont = brief.typography.headingFont || "Inter";
  const bodyFont = brief.typography.bodyFont || "Inter";
  // Convert font names to valid next/font/google identifiers
  const headingId = headingFont.replace(/\s+/g, "_");
  const bodyId = bodyFont.replace(/\s+/g, "_");
  const sameFont = headingFont === bodyFont;

  return `import type { Metadata } from "next";
import { ${headingId}${sameFont ? "" : `, ${bodyId}`} } from "next/font/google";
import "./globals.css";

const headingFont = ${headingId}({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

${sameFont ? `const bodyFont = headingFont;` : `const bodyFont = ${bodyId}({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});`}

export const metadata: Metadata = {
  title: "${brief.name}",
  description: "Built with D3 Studio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={\`\${headingFont.variable} \${bodyFont.variable}\`}>
      <body>{children}</body>
    </html>
  );
}
`;
}

// ── page.tsx ──

function generatePage(brief: DesignBrief): string {
  const imports = brief.sections
    .map((s) => `import ${componentName(s)} from "@/components/${fileName(s).replace(".tsx", "")}";`)
    .join("\n");

  const components = brief.sections
    .map((s) => `      <${componentName(s)} />`)
    .join("\n");

  return `${imports}

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
${components}
    </main>
  );
}
`;
}

// ── Section component generator ──

function generateSectionComponent(section: DesignBriefSection, brief: DesignBrief): GeneratedFile | null {
  const pattern = getPatternById(section.patternId);
  if (!pattern) return null;

  const name = componentName(section);
  const path = `components/${fileName(section)}`;

  // Determine which template to use based on pattern category + id
  const code = getSectionTemplate(section, brief, name);

  return { path, content: code };
}

function motionWrapper(animation: string): { importMotion: boolean; wrapStart: string; wrapEnd: string; childMotion: string } {
  switch (animation) {
    case "fade-up":
      return {
        importMotion: true,
        wrapStart: `<motion.section initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}`,
        wrapEnd: `</motion.section>`,
        childMotion: "",
      };
    case "fade-in":
      return {
        importMotion: true,
        wrapStart: `<motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}`,
        wrapEnd: `</motion.section>`,
        childMotion: "",
      };
    case "scale-in":
      return {
        importMotion: true,
        wrapStart: `<motion.section initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}`,
        wrapEnd: `</motion.section>`,
        childMotion: "",
      };
    case "stagger":
      return {
        importMotion: true,
        wrapStart: `<motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={{ visible: { transition: { staggerChildren: 0.12 } } }}`,
        wrapEnd: `</motion.section>`,
        childMotion: `variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}`,
      };
    default:
      return { importMotion: false, wrapStart: `<section`, wrapEnd: `</section>`, childMotion: "" };
  }
}

// ── Section Templates ──

function getSectionTemplate(section: DesignBriefSection, brief: DesignBrief, name: string): string {
  const id = section.patternId;
  const m = motionWrapper(section.animation);
  const useClient = m.importMotion ? `"use client";\n\n` : "";
  const motionImport = m.importMotion ? `import { motion } from "framer-motion";\n` : "";
  const childAttr = m.childMotion ? `\n              ${m.childMotion}` : "";

  // ── Navigation patterns ──
  if (id.startsWith("navbar")) {
    return `${useClient}${motionImport}
export default function ${name}() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-foreground/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <a href="/" className="text-xl font-heading font-bold text-foreground tracking-tight">
          ${brief.name || "Brand"}
        </a>
        <div className="hidden md:flex items-center gap-8">
          {["Produkte", "Features", "Preise", "Blog"].map((link) => (
            <a key={link} href={\`#\${link.toLowerCase()}\`} className="text-sm text-muted hover:text-foreground transition-colors duration-200">
              {link}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a href="#" className="text-sm text-muted hover:text-foreground transition-colors">Login</a>
          <a href="#contact" className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-brand hover:opacity-90 transition-opacity">
            Kontakt
          </a>
        </div>
      </div>
    </nav>
  );
}
`;
  }

  // ── Hero patterns ──
  if (id.startsWith("hero")) {
    if (id === "hero-fullbleed" || id === "hero-video") {
      return `${useClient}${motionImport}import Image from "next/image";

export default function ${name}() {
  return (
    ${m.wrapStart} className="relative min-h-screen flex items-end pb-20 md:pb-32">
      <Image
        src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&h=1080&fit=crop"
        alt="Hero"
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
        <h1 className="font-heading text-[clamp(2.5rem,6vw,6rem)] font-800 leading-[0.95] tracking-tight text-foreground max-w-4xl">
          Gestalte die<br />Zukunft
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted max-w-xl leading-relaxed">
          Innovation beginnt mit einer Idee. Wir machen sie Realit&auml;t.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a href="#contact" className="px-8 py-4 bg-primary text-white font-semibold rounded-brand hover:opacity-90 transition-all text-base">
            Projekt starten
          </a>
          <a href="#features" className="px-8 py-4 border border-foreground/10 text-foreground font-medium rounded-brand hover:bg-surface transition-all text-base">
            Mehr erfahren
          </a>
        </div>
      </div>
    ${m.wrapEnd}
  );
}
`;
    }

    if (id === "hero-product" || id === "hero-editorial") {
      return `${useClient}${motionImport}import Image from "next/image";

export default function ${name}() {
  return (
    ${m.wrapStart} className="relative min-h-screen flex items-center pt-20">
      <div className="max-w-7xl mx-auto px-6 w-full grid md:grid-cols-[1.2fr_1fr] gap-12 items-center">
        <div>
          <span className="inline-block px-4 py-1.5 text-xs font-medium text-primary border border-primary/20 rounded-full mb-6">
            Neu: Version 2.0
          </span>
          <h1 className="font-heading text-[clamp(2.5rem,5vw,5rem)] font-800 leading-[1.05] tracking-tight text-foreground">
            Baue etwas Au&szlig;ergew&ouml;hnliches
          </h1>
          <p className="mt-6 text-lg text-muted leading-relaxed max-w-lg">
            Die Plattform f&uuml;r moderne Teams, die schneller und besser liefern wollen.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#" className="px-8 py-4 bg-primary text-white font-semibold rounded-brand hover:opacity-90 transition-all">
              Jetzt starten
            </a>
            <a href="#" className="px-8 py-4 border border-foreground/10 text-foreground font-medium rounded-brand hover:bg-surface transition-all">
              Demo ansehen
            </a>
          </div>
        </div>
        <div className="relative aspect-[4/3] rounded-brand overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop"
            alt="Product"
            fill
            className="object-cover"
          />
        </div>
      </div>
    ${m.wrapEnd}
  );
}
`;
    }

    // Default hero (centered)
    return `${useClient}${motionImport}
export default function ${name}() {
  return (
    ${m.wrapStart} className="min-h-screen flex items-center justify-center text-center pt-20">
      <div className="max-w-4xl mx-auto px-6">
        <span className="inline-block px-4 py-1.5 text-xs font-medium text-primary border border-primary/20 rounded-full mb-6">
          Willkommen
        </span>
        <h1 className="font-heading text-[clamp(2.5rem,5vw,5rem)] font-800 leading-[1.05] tracking-tight text-foreground">
          Design trifft<br />Performance
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
          Erstelle beeindruckende Websites in Minuten, nicht Monaten.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="#" className="px-8 py-4 bg-primary text-white font-semibold rounded-brand hover:opacity-90 transition-all text-base">
            Kostenlos starten
          </a>
          <a href="#" className="px-8 py-4 border border-foreground/10 text-foreground font-medium rounded-brand hover:bg-surface transition-all text-base">
            Demo ansehen
          </a>
        </div>
      </div>
    ${m.wrapEnd}
  );
}
`;
  }

  // ── Features patterns ──
  if (id.startsWith("features") && (id.includes("bento") || id.includes("advanced"))) {
    return `${useClient}${motionImport}import Image from "next/image";

export default function ${name}() {
  return (
    ${m.wrapStart} className="py-24 md:py-32" id="features">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-heading text-[clamp(1.8rem,3vw,3rem)] font-bold tracking-tight text-foreground">
            Alles was du brauchst
          </h2>
          <p className="mt-4 text-muted text-lg max-w-2xl mx-auto">
            Eine Plattform, endlose M&ouml;glichkeiten.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Large card — spans 2 rows */}
          <${m.importMotion ? "motion." : ""}div${childAttr} className="md:row-span-2 relative rounded-brand overflow-hidden bg-surface border border-foreground/5 min-h-[320px]">
            <Image src="https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=600&h=800&fit=crop" alt="Feature" fill className="object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <h3 className="text-xl font-heading font-bold text-foreground">Kreative Freiheit</h3>
              <p className="mt-2 text-sm text-muted">Grenzenlose M&ouml;glichkeiten f&uuml;r dein Design.</p>
            </div>
          </${m.importMotion ? "motion." : ""}div>
          {/* Stats card */}
          <${m.importMotion ? "motion." : ""}div${childAttr} className="rounded-brand bg-accent/5 border border-accent/10 p-8 flex flex-col justify-center">
            <div className="text-4xl font-heading font-800 text-accent">+456k</div>
            <div className="mt-2 text-sm text-muted">Aktive Nutzer weltweit</div>
          </${m.importMotion ? "motion." : ""}div>
          {/* Image card */}
          <${m.importMotion ? "motion." : ""}div${childAttr} className="rounded-brand overflow-hidden relative min-h-[160px]">
            <Image src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop" alt="Tech" fill className="object-cover" />
          </${m.importMotion ? "motion." : ""}div>
          {/* Wide CTA card */}
          <${m.importMotion ? "motion." : ""}div${childAttr} className="md:col-span-2 rounded-brand bg-surface border border-foreground/5 p-8 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-heading font-bold text-foreground">Enterprise-Ready</h3>
              <p className="mt-1 text-sm text-muted">Skalierbar, sicher und zuverl&auml;ssig.</p>
            </div>
            <a href="#" className="px-6 py-3 bg-primary text-white text-sm font-medium rounded-brand hover:opacity-90 transition-opacity shrink-0">
              Erfahre mehr
            </a>
          </${m.importMotion ? "motion." : ""}div>
        </div>
      </div>
    ${m.wrapEnd}
  );
}
`;
  }

  if (id.startsWith("features")) {
    return `${useClient}${motionImport}
const features = [
  { icon: "\u26A1", title: "Blitzschnell", desc: "Optimierte Performance f\u00FCr jedes Projekt." },
  { icon: "\uD83D\uDD12", title: "Sicher", desc: "Enterprise-grade Sicherheit als Standard." },
  { icon: "\uD83C\uDFA8", title: "Flexibel", desc: "Passe alles an deine Bed\u00FCrfnisse an." },
];

export default function ${name}() {
  return (
    ${m.wrapStart} className="py-24 md:py-32" id="features">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-heading text-[clamp(1.8rem,3vw,3rem)] font-bold tracking-tight text-foreground">
            Warum wir?
          </h2>
          <p className="mt-4 text-muted text-lg max-w-2xl mx-auto">
            Alles was du brauchst, in einer Plattform.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <${m.importMotion ? "motion." : ""}div key={i}${childAttr} className="rounded-brand bg-surface border border-foreground/5 p-8 text-center hover:border-primary/20 hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 mx-auto rounded-brand bg-primary/10 flex items-center justify-center text-2xl mb-5">
                {f.icon}
              </div>
              <h3 className="font-heading font-semibold text-foreground text-lg">{f.title}</h3>
              <p className="mt-3 text-sm text-muted leading-relaxed">{f.desc}</p>
            </${m.importMotion ? "motion." : ""}div>
          ))}
        </div>
      </div>
    ${m.wrapEnd}
  );
}
`;
  }

  // ── Data / Stats ──
  if (id.startsWith("data-stats")) {
    return `${useClient}${motionImport}
const stats = [
  { value: "10M+", label: "Downloads" },
  { value: "99.9%", label: "Uptime" },
  { value: "150+", label: "L\u00E4nder" },
  { value: "+456k", label: "Nutzer" },
];

export default function ${name}() {
  return (
    ${m.wrapStart} className="py-20 md:py-28 border-y border-foreground/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <${m.importMotion ? "motion." : ""}div key={i}${childAttr} className="text-center">
              <div className="font-heading text-[clamp(2rem,4vw,3.5rem)] font-800 tracking-tight" style={{ color: ["var(--color-primary)", "var(--color-secondary)", "var(--color-accent)", "var(--color-primary)"][i] }}>
                {s.value}
              </div>
              <div className="mt-2 text-sm text-muted uppercase tracking-wider">{s.label}</div>
            </${m.importMotion ? "motion." : ""}div>
          ))}
        </div>
      </div>
    ${m.wrapEnd}
  );
}
`;
  }

  // ── Social Proof / Marquee ──
  if (id.includes("marquee")) {
    return `${useClient}${motionImport}
const brands = ["Stripe", "Vercel", "GitHub", "Figma", "Notion", "Slack", "Linear", "Framer"];

export default function ${name}() {
  return (
    ${m.wrapStart} className="py-16 border-y border-foreground/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-8 text-center">
        <p className="text-sm text-muted uppercase tracking-wider">Vertrauen von f&uuml;hrenden Unternehmen</p>
      </div>
      <div className="relative">
        <div className="flex animate-marquee gap-16 items-center">
          {[...brands, ...brands].map((brand, i) => (
            <span key={i} className="text-2xl font-heading font-semibold text-foreground/20 hover:text-foreground/50 transition-colors whitespace-nowrap shrink-0">
              {brand}
            </span>
          ))}
        </div>
      </div>
    ${m.wrapEnd}
  );
}
`;
  }

  // ── Testimonials ──
  if (id.includes("testimonial")) {
    return `${useClient}${motionImport}import Image from "next/image";

const testimonials = [
  { name: "Anna M\u00FCller", role: "CEO, TechStart", quote: "Die beste Plattform die wir je genutzt haben. Absolut empfehlenswert.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" },
  { name: "Max Weber", role: "CTO, DesignCo", quote: "Hat unsere Entwicklungszeit um 60% reduziert. Ein Game-Changer.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" },
  { name: "Lisa Schmidt", role: "Head of Design", quote: "Intuitiv, schnell und wundersch\u00F6n. Genau was wir gesucht haben.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face" },
];

export default function ${name}() {
  return (
    ${m.wrapStart} className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="font-heading text-[clamp(1.8rem,3vw,3rem)] font-bold tracking-tight text-foreground text-center mb-16">
          Was unsere Kunden sagen
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <${m.importMotion ? "motion." : ""}div key={i}${childAttr} className="rounded-brand bg-surface border border-foreground/5 p-8 hover:border-primary/20 transition-colors">
              <p className="text-foreground leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <Image src={t.avatar} alt={t.name} width={40} height={40} className="rounded-full object-cover" />
                <div>
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted">{t.role}</div>
                </div>
              </div>
            </${m.importMotion ? "motion." : ""}div>
          ))}
        </div>
      </div>
    ${m.wrapEnd}
  );
}
`;
  }

  // ── Pricing ──
  if (id.startsWith("pricing")) {
    return `${useClient}${motionImport}import { Check } from "lucide-react";

const plans = [
  { name: "Free", price: "\u20AC0", period: "/Monat", features: ["5 Projekte", "1 GB Speicher", "Community Support", "Basic Analytics"], cta: "Kostenlos starten", popular: false },
  { name: "Pro", price: "\u20AC29", period: "/Monat", features: ["Unbegrenzte Projekte", "100 GB Speicher", "Priority Support", "Advanced Analytics", "Custom Domain", "API Zugang"], cta: "Pro werden", popular: true },
  { name: "Team", price: "\u20AC79", period: "/Monat", features: ["Alles aus Pro", "Team Collaboration", "SSO / SAML", "SLA 99.9%", "Dedicated Account Manager"], cta: "Team starten", popular: false },
];

export default function ${name}() {
  return (
    ${m.wrapStart} className="py-24 md:py-32" id="pricing">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-heading text-[clamp(1.8rem,3vw,3rem)] font-bold tracking-tight text-foreground">
            Einfache, transparente Preise
          </h2>
          <p className="mt-4 text-muted text-lg">W&auml;hle den Plan der zu dir passt.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <${m.importMotion ? "motion." : ""}div key={i}${childAttr}
              className={\`rounded-brand p-8 flex flex-col \${plan.popular ? "bg-primary text-white border-2 border-primary relative" : "bg-surface border border-foreground/5"}\`}
            >
              {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-white text-xs font-bold rounded-full">Beliebt</span>}
              <div className="text-lg font-heading font-semibold">{plan.name}</div>
              <div className="mt-4">
                <span className="text-4xl font-heading font-800 tracking-tight">{plan.price}</span>
                <span className={\`text-sm \${plan.popular ? "text-white/70" : "text-muted"}\`}>{plan.period}</span>
              </div>
              <ul className="mt-8 space-y-3 flex-1">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <Check size={16} className={plan.popular ? "text-white/80" : "text-primary"} />
                    <span className={plan.popular ? "text-white/90" : "text-muted"}>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="#" className={\`mt-8 block text-center py-3 px-6 rounded-brand font-semibold text-sm transition-all \${plan.popular ? "bg-white text-primary hover:bg-white/90" : "bg-primary text-white hover:opacity-90"}\`}>
                {plan.cta}
              </a>
            </${m.importMotion ? "motion." : ""}div>
          ))}
        </div>
      </div>
    ${m.wrapEnd}
  );
}
`;
  }

  // ── CTA ──
  if (id.startsWith("cta")) {
    return `${useClient}${motionImport}
export default function ${name}() {
  return (
    ${m.wrapStart} className="py-24 md:py-32">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-heading text-[clamp(1.8rem,3vw,3.5rem)] font-bold tracking-tight text-foreground">
          Bereit loszulegen?
        </h2>
        <p className="mt-4 text-lg text-muted max-w-xl mx-auto">
          Starte noch heute kostenlos und erlebe den Unterschied.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="#" className="px-10 py-4 bg-primary text-white font-semibold rounded-brand hover:opacity-90 transition-all text-base">
            Jetzt starten &rarr;
          </a>
        </div>
      </div>
    ${m.wrapEnd}
  );
}
`;
  }

  // ── Showcase / Gallery / Service Cards ──
  if (id.includes("gallery") || id.includes("case-stud")) {
    return `${useClient}${motionImport}import Image from "next/image";

const projects = [
  { title: "Dashboard Redesign", category: "UI/UX", img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop" },
  { title: "Mobile App", category: "Development", img: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&h=400&fit=crop" },
  { title: "Brand Identity", category: "Branding", img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop" },
  { title: "E-Commerce", category: "Webdesign", img: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=400&fit=crop" },
  { title: "Marketing Site", category: "Frontend", img: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=600&h=400&fit=crop" },
  { title: "SaaS Platform", category: "Full-Stack", img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop" },
];

export default function ${name}() {
  return (
    ${m.wrapStart} className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="font-heading text-[clamp(1.8rem,3vw,3rem)] font-bold tracking-tight text-foreground text-center mb-16">
          Unsere Arbeiten
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p, i) => (
            <${m.importMotion ? "motion." : ""}div key={i}${childAttr} className="group rounded-brand overflow-hidden bg-surface border border-foreground/5 hover:border-primary/20 transition-all">
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image src={p.img} alt={p.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5">
                <span className="text-xs text-primary font-medium">{p.category}</span>
                <h3 className="mt-1 font-heading font-semibold text-foreground">{p.title}</h3>
              </div>
            </${m.importMotion ? "motion." : ""}div>
          ))}
        </div>
      </div>
    ${m.wrapEnd}
  );
}
`;
  }

  if (id.includes("service")) {
    return `${useClient}${motionImport}import Image from "next/image";

const services = [
  { title: "Webdesign", desc: "Responsive, moderne Websites die begeistern.", tags: ["UI/UX", "Figma"], img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop" },
  { title: "Entwicklung", desc: "Full-Stack L\u00F6sungen mit modernsten Technologien.", tags: ["React", "Node.js"], img: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=300&fit=crop" },
  { title: "Branding", desc: "Visuelle Identit\u00E4t die im Ged\u00E4chtnis bleibt.", tags: ["Logo", "CI"], img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=300&fit=crop" },
  { title: "Marketing", desc: "Digitale Strategien die Ergebnisse liefern.", tags: ["SEO", "Ads"], img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop" },
];

export default function ${name}() {
  return (
    ${m.wrapStart} className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="font-heading text-[clamp(1.8rem,3vw,3rem)] font-bold tracking-tight text-foreground text-center mb-16">
          Unsere Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((s, i) => (
            <${m.importMotion ? "motion." : ""}div key={i}${childAttr} className="rounded-brand bg-surface border border-foreground/5 p-6 flex gap-6 items-center hover:border-primary/20 transition-all">
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-foreground text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.desc}</p>
                <div className="mt-3 flex gap-2">
                  {s.tags.map((tag) => (
                    <span key={tag} className="text-xs px-3 py-1 rounded-full border border-foreground/10 text-muted">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="w-32 h-24 rounded-brand overflow-hidden shrink-0 relative">
                <Image src={s.img} alt={s.title} fill className="object-cover" />
              </div>
            </${m.importMotion ? "motion." : ""}div>
          ))}
        </div>
      </div>
    ${m.wrapEnd}
  );
}
`;
  }

  if (id.includes("product")) {
    return `${useClient}${motionImport}import Image from "next/image";

export default function ${name}() {
  return (
    ${m.wrapStart} className="py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6 relative flex items-center justify-center">
        <div className="relative w-80 h-80 md:w-96 md:h-96 rounded-brand overflow-hidden shadow-2xl">
          <Image src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop" alt="Product" fill className="object-cover" />
        </div>
        <div className="absolute top-4 right-[15%] rounded-brand bg-surface/90 backdrop-blur-xl border border-foreground/5 px-4 py-2 flex items-center gap-2 shadow-lg">
          <span className="text-primary text-lg">\u2605</span>
          <span className="font-semibold text-foreground">4.9</span>
          <span className="text-xs text-muted">(2.4k)</span>
        </div>
        <div className="absolute bottom-4 left-[10%] rounded-brand bg-surface/90 backdrop-blur-xl border border-foreground/5 px-5 py-3 shadow-lg">
          <div className="text-2xl font-heading font-bold text-foreground">\u20AC 129</div>
          <div className="text-xs text-muted">Premium Edition</div>
        </div>
      </div>
    ${m.wrapEnd}
  );
}
`;
  }

  // ── Content patterns ──
  if (id.includes("big-text")) {
    return `${useClient}${motionImport}
export default function ${name}() {
  return (
    ${m.wrapStart} className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="font-heading text-[clamp(3rem,8vw,8rem)] font-800 leading-[0.95] tracking-tight text-foreground">
          Wir glauben an<br />
          <span className="text-primary">gutes Design.</span>
        </h2>
      </div>
    ${m.wrapEnd}
  );
}
`;
  }

  if (id.includes("image-text") || id.includes("alternating")) {
    return `${useClient}${motionImport}import Image from "next/image";

const rows = [
  { title: "Intuitives Design", desc: "Erstelle Layouts per Drag & Drop \u2014 ohne Code.", img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop" },
  { title: "Echtzeit-Zusammenarbeit", desc: "Arbeite gleichzeitig mit deinem Team an Projekten.", img: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop" },
];

export default function ${name}() {
  return (
    ${m.wrapStart} className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 space-y-24">
        {rows.map((row, i) => (
          <div key={i} className={\`flex flex-col \${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-12\`}>
            <div className="flex-1 space-y-4">
              <h3 className="font-heading text-2xl md:text-3xl font-bold text-foreground">{row.title}</h3>
              <p className="text-muted text-lg leading-relaxed">{row.desc}</p>
              <a href="#" className="inline-block text-primary font-medium hover:underline">Mehr erfahren \u2192</a>
            </div>
            <div className="flex-1 relative aspect-[4/3] rounded-brand overflow-hidden">
              <Image src={row.img} alt={row.title} fill className="object-cover" />
            </div>
          </div>
        ))}
      </div>
    ${m.wrapEnd}
  );
}
`;
  }

  if (id.includes("blog")) {
    return `${useClient}${motionImport}import Image from "next/image";

const posts = [
  { title: "Die Zukunft des Webdesigns", date: "15. Feb 2025", img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop", excerpt: "Wie KI und neue Technologien das Webdesign ver\u00E4ndern." },
  { title: "Performance Optimierung", date: "8. Feb 2025", img: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&h=400&fit=crop", excerpt: "Best Practices f\u00FCr schnelle Websites." },
  { title: "Design Systems aufbauen", date: "1. Feb 2025", img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop", excerpt: "Konsistenz durch strukturierte Design Tokens." },
];

export default function ${name}() {
  return (
    ${m.wrapStart} className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="font-heading text-[clamp(1.8rem,3vw,3rem)] font-bold tracking-tight text-foreground text-center mb-16">
          Aus dem Blog
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((p, i) => (
            <${m.importMotion ? "motion." : ""}div key={i}${childAttr} className="group rounded-brand overflow-hidden bg-surface border border-foreground/5">
              <div className="relative aspect-[16/9] overflow-hidden">
                <Image src={p.img} alt={p.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6">
                <span className="text-xs text-muted">{p.date}</span>
                <h3 className="mt-2 font-heading font-semibold text-foreground">{p.title}</h3>
                <p className="mt-2 text-sm text-muted">{p.excerpt}</p>
              </div>
            </${m.importMotion ? "motion." : ""}div>
          ))}
        </div>
      </div>
    ${m.wrapEnd}
  );
}
`;
  }

  // ── Interactive (Contact / FAQ) ──
  if (id.includes("contact")) {
    return `${useClient}${motionImport}
export default function ${name}() {
  return (
    ${m.wrapStart} className="py-24 md:py-32" id="contact">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <h2 className="font-heading text-[clamp(1.8rem,3vw,3rem)] font-bold tracking-tight text-foreground">
              Lass uns reden
            </h2>
            <p className="mt-4 text-muted text-lg leading-relaxed">
              Wir freuen uns von dir zu h&ouml;ren. Schreib uns eine Nachricht und wir melden uns innerhalb von 24 Stunden.
            </p>
            <div className="mt-8 space-y-4 text-sm text-muted">
              <div>\u2709\uFE0F hello@${(brief.name || "brand").toLowerCase().replace(/\s/g, "")}.de</div>
              <div>\uD83D\uDCDE +49 123 456 789</div>
              <div>\uD83D\uDCCD Berlin, Deutschland</div>
            </div>
          </div>
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Name" className="w-full px-4 py-3 rounded-brand bg-surface border border-foreground/10 text-foreground placeholder:text-muted/50 focus:border-primary outline-none transition-colors" />
              <input type="email" placeholder="E-Mail" className="w-full px-4 py-3 rounded-brand bg-surface border border-foreground/10 text-foreground placeholder:text-muted/50 focus:border-primary outline-none transition-colors" />
            </div>
            <input type="text" placeholder="Betreff" className="w-full px-4 py-3 rounded-brand bg-surface border border-foreground/10 text-foreground placeholder:text-muted/50 focus:border-primary outline-none transition-colors" />
            <textarea placeholder="Nachricht" rows={5} className="w-full px-4 py-3 rounded-brand bg-surface border border-foreground/10 text-foreground placeholder:text-muted/50 focus:border-primary outline-none transition-colors resize-none" />
            <button type="submit" className="px-8 py-3 bg-primary text-white font-semibold rounded-brand hover:opacity-90 transition-opacity">
              Absenden
            </button>
          </form>
        </div>
      </div>
    ${m.wrapEnd}
  );
}
`;
  }

  if (id.includes("faq")) {
    return `${useClient}

import { useState } from "react";
${motionImport}import { Plus, Minus } from "lucide-react";

const faqs = [
  { q: "Wie starte ich?", a: "Erstelle einfach ein kostenloses Konto und beginne sofort mit deinem ersten Projekt." },
  { q: "Gibt es eine kostenlose Version?", a: "Ja! Unser Free-Plan bietet 5 Projekte und alle Kernfunktionen." },
  { q: "Kann ich jederzeit k\u00FCndigen?", a: "Nat\u00FCrlich. Keine Vertragsbindung, k\u00FCndige jederzeit mit einem Klick." },
  { q: "Bietet ihr Support an?", a: "Pro-Nutzer erhalten Priority Support. Free-Nutzer k\u00F6nnen unsere Community nutzen." },
];

export default function ${name}() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="font-heading text-[clamp(1.8rem,3vw,3rem)] font-bold tracking-tight text-foreground text-center mb-16">
          H&auml;ufige Fragen
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-brand border border-foreground/5 overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full px-6 py-5 flex items-center justify-between text-left">
                <span className="font-medium text-foreground">{faq.q}</span>
                {open === i ? <Minus size={18} className="text-muted shrink-0" /> : <Plus size={18} className="text-muted shrink-0" />}
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-muted text-sm leading-relaxed">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
  }

  // ── Footer ──
  if (id.startsWith("footer")) {
    return `${useClient}${motionImport}
const links = {
  Produkt: ["Features", "Preise", "Docs", "Changelog"],
  Unternehmen: ["\u00DCber uns", "Blog", "Karriere", "Kontakt"],
  Legal: ["Impressum", "Datenschutz", "AGB"],
};

export default function ${name}() {
  return (
    <footer className="border-t border-foreground/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          <div>
            <span className="text-lg font-heading font-bold text-foreground">${brief.name || "Brand"}</span>
            <p className="mt-4 text-sm text-muted leading-relaxed">
              Die Plattform f&uuml;r moderne Teams.
            </p>
          </div>
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <div className="text-sm font-semibold text-foreground mb-4">{title}</div>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted hover:text-foreground transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-foreground/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted">&copy; {new Date().getFullYear()} ${brief.name || "Brand"}. Alle Rechte vorbehalten.</span>
          <div className="flex gap-6">
            {["Twitter", "GitHub", "LinkedIn"].map((s) => (
              <a key={s} href="#" className="text-xs text-muted hover:text-foreground transition-colors">{s}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
`;
  }

  // ── Fallback — generic section ──
  return `${useClient}${motionImport}
export default function ${name}() {
  return (
    ${m.wrapStart} className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="font-heading text-[clamp(1.8rem,3vw,3rem)] font-bold tracking-tight text-foreground">
          ${section.label}
        </h2>
        ${section.description ? `<p className="mt-4 text-muted text-lg">${section.description}</p>` : ""}
      </div>
    ${m.wrapEnd}
  );
}
`;
}
