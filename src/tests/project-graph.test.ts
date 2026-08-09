import { describe, expect, it } from "vitest";
import { createDesignBrief } from "@/lib/design-brief";
import {
  applyFeatureIntentsToGraph,
  createProjectGraphFromBrief,
  findFeatureIntents,
  mergeProjectGraphWithFiles,
} from "@/lib/project-graph";

describe("project graph", () => {
  it("builds pages and detects enabled features from the design brief", () => {
    const brief = createDesignBrief("Studio");
    brief.sections = [
      { id: "hero", patternId: "hero-centered", label: "Hero", animation: "fade-up" },
      { id: "testimonials", patternId: "testimonials-cards", label: "Testimonials", animation: "stagger" },
    ];
    brief.additionalPages = [
      {
        id: "pricing",
        name: "Pricing",
        slug: "pricing",
        sections: [
          { id: "pricing-sec", patternId: "pricing-3tier", label: "Pricing", animation: "fade-up" },
        ],
      },
    ];

    const graph = createProjectGraphFromBrief(brief);

    expect(graph.pages.map((page) => page.route)).toEqual(["/", "/pricing"]);
    expect(graph.features.find((feature) => feature.id === "pricing")?.enabled).toBe(true);
    expect(graph.features.find((feature) => feature.id === "testimonials")?.enabled).toBe(true);
  });

  it("parses natural language feature intents", () => {
    expect(findFeatureIntents("Bitte fuege einen Blog und Login hinzu")).toEqual([
      { action: "add", featureId: "auth", raw: "Bitte fuege einen Blog und Login hinzu" },
      { action: "add", featureId: "blog-cms", raw: "Bitte fuege einen Blog und Login hinzu" },
    ]);

    expect(findFeatureIntents("Entferne bitte Pricing und die FAQ")).toEqual([
      { action: "remove", featureId: "pricing", raw: "Entferne bitte Pricing und die FAQ" },
      { action: "remove", featureId: "faq", raw: "Entferne bitte Pricing und die FAQ" },
    ]);
  });

  it("adds pages and sections when feature intents are applied", () => {
    const brief = createDesignBrief("Feature Test");
    brief.sections = [
      { id: "hero", patternId: "hero-centered", label: "Hero", animation: "fade-up" },
    ];

    const initial = createProjectGraphFromBrief(brief);
    const updated = applyFeatureIntentsToGraph(initial, [
      { action: "add", featureId: "blog-cms", raw: "fuege blog hinzu" },
      { action: "add", featureId: "newsletter", raw: "fuege newsletter hinzu" },
    ]);

    expect(updated.pages.some((page) => page.route === "/blog")).toBe(true);
    expect(updated.pages.find((page) => page.route === "/")?.sections.some((section) => section.patternId === "cta-newsletter")).toBe(true);
  });

  it("supports professional website areas like services and docs", () => {
    const brief = createDesignBrief("Business Site");
    brief.sections = [
      { id: "hero", patternId: "hero-centered", label: "Hero", animation: "fade-up" },
    ];

    const initial = createProjectGraphFromBrief(brief);
    const updated = applyFeatureIntentsToGraph(initial, [
      { action: "add", featureId: "services", raw: "fuege services hinzu" },
      { action: "add", featureId: "docs-center", raw: "fuege docs hinzu" },
    ]);

    expect(updated.pages.some((page) => page.route === "/services")).toBe(true);
    expect(updated.pages.some((page) => page.route === "/docs")).toBe(true);
  });

  it("merges code routes back into the graph and marks custom pages as locked", () => {
    const brief = createDesignBrief("Sync Test");
    brief.sections = [
      { id: "hero", patternId: "hero-centered", label: "Hero", animation: "fade-up" },
    ];

    const base = createProjectGraphFromBrief(brief);
    const merged = mergeProjectGraphWithFiles(base, {
      "src/app/blog/page.tsx": `
import { ContentBlogGrid } from "@/components/sections/ContentBlogGrid";
import { AdminToolbar } from "@/components/layout/AdminToolbar";

export default function BlogPage() {
  return <main><ContentBlogGrid /><AdminToolbar /></main>;
}
`,
    });

    const blogPage = merged.pages.find((page) => page.route === "/blog");
    expect(blogPage).toBeTruthy();
    expect(blogPage?.sections.some((section) => section.patternId === "content-blog-grid")).toBe(true);
    expect(blogPage?.lockedBlocks.length).toBeGreaterThan(0);
    expect(merged.features.find((feature) => feature.id === "blog-cms")?.enabled).toBe(true);
  });

  it("does not bump the graph timestamp when the same files are synced twice", () => {
    const brief = createDesignBrief("Repeat Sync");
    brief.sections = [
      { id: "hero", patternId: "hero-centered", label: "Hero", animation: "fade-up" },
    ];

    const base = createProjectGraphFromBrief(brief);
    const files = {
      "src/app/page.tsx": `
import { HeroCentered } from "@/components/sections/HeroCentered";

export default function HomePage() {
  return <main><HeroCentered /></main>;
}
`,
    };

    const firstMerge = mergeProjectGraphWithFiles(base, files);
    const secondMerge = mergeProjectGraphWithFiles(firstMerge, files);

    expect(secondMerge).toBe(firstMerge);
    expect(secondMerge.updatedAt).toBe(firstMerge.updatedAt);
  });

  it("does not mutate the incoming graph when code is merged into an existing page", () => {
    const brief = createDesignBrief("Immutable Sync");
    brief.sections = [
      { id: "hero", patternId: "hero-centered", label: "Hero", animation: "fade-up" },
    ];

    const base = createProjectGraphFromBrief(brief);
    const merged = mergeProjectGraphWithFiles(base, {
      "src/app/page.tsx": `
import { HeroCentered } from "@/components/sections/HeroCentered";
import { AdminToolbar } from "@/components/layout/AdminToolbar";

export default function HomePage() {
  return <main><AdminToolbar /><HeroCentered /></main>;
}
`,
    });

    const baseHome = base.pages.find((page) => page.route === "/");
    const mergedHome = merged.pages.find((page) => page.route === "/");

    expect(baseHome?.source).toBe("brief");
    expect(baseHome?.lockedBlocks).toEqual([]);
    expect(mergedHome?.source).toBe("mixed");
    expect(mergedHome?.lockedBlocks.length).toBeGreaterThan(0);
  });
});
