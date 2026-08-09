import { describe, expect, it } from "vitest";
import { createDesignBrief } from "@/lib/design-brief";
import { generatePlanMarkdownFromBrief } from "@/lib/brief-to-plan";

describe("brief to plan", () => {
  it("creates a full professional planning set including business, modules, sync, and features", () => {
    const brief = createDesignBrief("Studio Pro");
    brief.sections = [
      { id: "hero", patternId: "hero-split", label: "Hero", animation: "fade-up" },
      { id: "services", patternId: "showcase-service-cards", label: "Services", animation: "stagger" },
      { id: "contact", patternId: "interactive-contact", label: "Kontakt", animation: "fade-up" },
    ];
    brief.additionalPages = [
      {
        id: "pricing",
        name: "Pricing",
        slug: "pricing",
        sections: [
          { id: "pricing-grid", patternId: "pricing-3tier", label: "Pricing Grid", animation: "fade-up" },
          { id: "faq", patternId: "content-faq", label: "FAQ", animation: "fade-up" },
        ],
      },
    ];

    const files = generatePlanMarkdownFromBrief(brief);
    const fileMap = Object.fromEntries(files.map((file) => [file.path, file.content]));

    expect(Object.keys(fileMap)).toEqual(expect.arrayContaining([
      ".d3/PROJECT.md",
      ".d3/BUSINESS.md",
      ".d3/PAGES.md",
      ".d3/FEATURES.md",
      ".d3/MODULES.md",
      ".d3/SYNC.md",
    ]));

    expect(fileMap[".d3/PAGES.md"]).toContain("### /pricing - Pricing");
    expect(fileMap[".d3/MODULES.md"]).toContain("showcase-service-cards");
    expect(fileMap[".d3/FEATURES.md"]).toContain("pricing");
    expect(fileMap[".d3/SYNC.md"]).toContain("Live-Sync");
  });
});
