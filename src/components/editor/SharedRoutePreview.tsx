"use client";

import type { DesignBrief, DesignBriefSection } from "@/lib/design-brief";
import type { GraphPage, ProjectGraph } from "@/lib/project-graph";
import type { ProjectPreviewState } from "@/lib/preview-session";
import WireframePreview from "./WireframePreview";

interface SharedRoutePreviewProps {
  brief: DesignBrief;
  graph: ProjectGraph;
  activePageId?: string | null;
  previewState?: ProjectPreviewState | null;
  height?: number | string;
}

function makePreviewBrief(brief: DesignBrief, page: GraphPage): DesignBrief {
  const sections: DesignBriefSection[] = page.sections
    .filter((section) => section.patternId)
    .map((section) => ({
      id: section.id,
      patternId: section.patternId as string,
      label: section.label,
      description: section.description,
      animation: section.animation ?? "none",
    }));

  if (page.route === "/") {
    return { ...brief, sections };
  }

  return { ...brief, sections };
}

function buildPreviewUrl(baseUrl: string, route: string): string {
  if (!route || route === "/") return baseUrl;
  try {
    const url = new URL(baseUrl);
    url.pathname = route;
    return url.toString();
  } catch {
    return baseUrl;
  }
}

function humanizeToken(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function SharedRoutePreview({
  brief,
  graph,
  activePageId,
  previewState,
  height = "100%",
}: SharedRoutePreviewProps) {
  const activePage =
    graph.pages.find((page) => page.id === activePageId) ??
    graph.pages.find((page) => page.route === "/") ??
    graph.pages[0];

  if (!activePage) {
    return (
      <div
        style={{
          height,
          borderRadius: 18,
          border: "1px solid var(--d3-glass-border)",
          background: "var(--d3-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--d3-text-tertiary)",
          fontSize: "0.8rem",
        }}
      >
        Noch keine Seite vorhanden.
      </div>
    );
  }

  const showLivePreview = Boolean(previewState?.url && previewState.status !== "error");
  const previewUrl = previewState?.url ? buildPreviewUrl(previewState.url, activePage.route) : null;
  const previewBrief = makePreviewBrief(brief, activePage);
  const hasVisualSections = activePage.sections.length > 0;
  const previewModeLabel = showLivePreview
    ? "Live-Vorschau"
    : previewState?.status && ["booting", "installing", "starting", "running"].includes(previewState.status)
      ? "Preview startet"
      : hasVisualSections
        ? "Wireframe"
        : "Layout fehlt";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height,
        minHeight: 0,
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid var(--d3-glass-border)",
        background: "var(--d3-surface)",
        boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
      }}
    >
      <div
        style={{
          height: 42,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          borderBottom: "1px solid var(--d3-border-subtle)",
          background: "linear-gradient(180deg, var(--d3-bg), var(--d3-surface))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((color) => (
              <span
                key={color}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: color,
                  display: "inline-block",
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "var(--d3-text)",
            }}
          >
            {activePage.name}
          </span>
          <span
            style={{
              fontSize: "0.6rem",
              color: "var(--d3-text-tertiary)",
              fontFamily: "monospace",
            }}
          >
            {activePage.route}
          </span>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 8px",
            borderRadius: 999,
            background: showLivePreview ? "rgba(34,197,94,0.08)" : "rgba(148,163,184,0.08)",
            color: showLivePreview ? "#15803d" : "var(--d3-text-secondary)",
            fontSize: "0.6rem",
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: showLivePreview ? "#22c55e" : "#94a3b8",
              display: "inline-block",
            }}
          />
          {previewModeLabel}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          background: showLivePreview
            ? brief.colors.background
            : "radial-gradient(circle at top, rgba(99,102,241,0.12), rgba(99,102,241,0.04) 34%, var(--d3-bg) 100%)",
        }}
      >
        {showLivePreview && previewUrl ? (
          <iframe
            title={`${activePage.name} Preview`}
            src={previewUrl}
            style={{
              width: "100%",
              height: "100%",
              minHeight: 520,
              border: "none",
              background: "#fff",
            }}
          />
        ) : hasVisualSections ? (
          <div
            style={{
              minHeight: "100%",
              padding: 22,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                minWidth: 960,
                maxWidth: 1180,
                borderRadius: 26,
                overflow: "hidden",
                background: "#ffffff",
                boxShadow: "0 28px 50px rgba(15,23,42,0.14)",
              }}
            >
              <div style={{ transformOrigin: "top left" }}>
                <WireframePreview brief={previewBrief} />
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              minHeight: 420,
              display: "grid",
              placeItems: "center",
              padding: 28,
            }}
          >
            <div
              style={{
                width: "min(100%, 620px)",
                padding: 24,
                borderRadius: 26,
                border: "1px solid var(--d3-glass-border)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.76))",
                boxShadow: "0 24px 48px rgba(15,23,42,0.12)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  `Route ${activePage.route}`,
                  humanizeToken(activePage.character),
                  activePage.lockedBlocks.length > 0 ? `${activePage.lockedBlocks.length} Code-Bloecke erkannt` : "Noch keine visuellen Sektionen",
                ].map((item) => (
                  <span
                    key={item}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid var(--d3-glass-border)",
                      background: "rgba(255,255,255,0.7)",
                      fontSize: "0.64rem",
                      fontWeight: 700,
                      color: "var(--d3-text-secondary)",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div>
                <div style={{ fontSize: "1.08rem", fontWeight: 800, color: "var(--d3-text)", marginBottom: 8 }}>
                  Diese Seite braucht noch ihren ersten visuellen Aufbau.
                </div>
                <div style={{ fontSize: "0.78rem", lineHeight: 1.7, color: "var(--d3-text-secondary)" }}>
                  Der Code kann hier schon vorhanden sein, aber im Plan gibt es noch kein ruecklesbares Layout. Sobald du in Design oder Plan die ersten Sektionen festlegst, erscheint die Seite hier direkt als klare Vorschau.
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                {[0, 1, 2].map((index) => (
                  <div
                    key={index}
                    style={{
                      padding: 14,
                      borderRadius: 18,
                      border: "1px solid var(--d3-glass-border)",
                      background: "rgba(255,255,255,0.72)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: index === 0 ? "82%" : index === 1 ? "65%" : "74%",
                        height: 10,
                        borderRadius: 999,
                        background: "rgba(99,102,241,0.18)",
                      }}
                    />
                    <div
                      style={{
                        width: "100%",
                        height: 56,
                        borderRadius: 14,
                        background: "linear-gradient(180deg, rgba(148,163,184,0.18), rgba(148,163,184,0.08))",
                      }}
                    />
                    <div
                      style={{
                        width: index === 2 ? "58%" : "72%",
                        height: 8,
                        borderRadius: 999,
                        background: "rgba(148,163,184,0.18)",
                      }}
                    />
                  </div>
                ))}
              </div>

              {activePage.lockedBlocks[0] && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 18,
                    border: "1px solid rgba(168,85,247,0.18)",
                    background: "rgba(168,85,247,0.08)",
                  }}
                >
                  <div style={{ fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 5 }}>
                    Freier Code erkannt
                  </div>
                  <div style={{ fontSize: "0.72rem", lineHeight: 1.6, color: "var(--d3-text-secondary)" }}>
                    {activePage.lockedBlocks[0].reason}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
