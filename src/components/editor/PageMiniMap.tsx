"use client";

import { LayoutTemplate, Lock, Plus, Sparkles } from "lucide-react";
import type { FeatureToggle, ProjectGraph } from "@/lib/project-graph";

interface PageMiniMapProps {
  graph: ProjectGraph;
  activePageId?: string | null;
  onSelectPage: (pageId: string) => void;
  onToggleFeature?: (featureId: FeatureToggle["id"], nextEnabled: boolean) => void;
  title?: string;
  showFeatures?: boolean;
  compact?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "rgba(148,163,184,0.8)",
  planned: "rgba(59,130,246,0.85)",
  designed: "rgba(236,72,153,0.85)",
  coded: "rgba(34,197,94,0.85)",
  mixed: "rgba(249,115,22,0.9)",
  custom: "rgba(168,85,247,0.9)",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  planned: "Geplant",
  designed: "Design",
  coded: "Code",
  mixed: "Hybrid",
  custom: "Custom",
};

const SOURCE_LABELS: Record<string, string> = {
  brief: "Plan",
  code: "Code",
  mixed: "Hybrid",
};

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function PageMiniMap({
  graph,
  activePageId,
  onSelectPage,
  onToggleFeature,
  title = "Mini-Map",
  showFeatures = false,
  compact = false,
}: PageMiniMapProps) {
  const pages = graph.pages;
  const featureRows = graph.features.filter((feature) => feature.enabled || showFeatures);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: compact ? 10 : 14,
        height: "100%",
        minHeight: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div
            style={{
              fontSize: "0.6rem",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--d3-text-tertiary)",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--d3-text-secondary)", marginTop: 3 }}>
            {formatCount(pages.length, "Seite", "Seiten")}, {formatCount(graph.features.filter((feature) => feature.enabled).length, "Funktion", "Funktionen")}
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 9px",
            borderRadius: 999,
            background: "var(--d3-surface)",
            border: "1px solid var(--d3-glass-border)",
            fontSize: "0.6rem",
            color: "var(--d3-text-tertiary)",
          }}
        >
          <LayoutTemplate size={11} />
          Sitemap
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          overflow: "auto",
          paddingRight: 2,
        }}
      >
        {pages.map((page, index) => {
          const isActive = page.id === activePageId;
          return (
            <button
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              style={{
                display: "grid",
                gridTemplateColumns: compact ? "18px 1fr auto" : "24px 1fr auto",
                alignItems: "center",
                gap: compact ? 8 : 10,
                width: "100%",
                padding: compact ? "9px 10px" : "11px 12px",
                borderRadius: 14,
                border: isActive ? "1px solid rgba(99,102,241,0.35)" : "1px solid var(--d3-glass-border)",
                background: isActive
                  ? "linear-gradient(180deg, rgba(99,102,241,0.12), rgba(99,102,241,0.05))"
                  : "linear-gradient(180deg, var(--d3-surface), rgba(255,255,255,0.45))",
                cursor: "pointer",
                textAlign: "left",
                boxShadow: isActive ? "0 12px 28px rgba(99,102,241,0.08)" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    width: compact ? 10 : 12,
                    height: compact ? 10 : 12,
                    borderRadius: "50%",
                    background: STATUS_COLORS[page.status] ?? STATUS_COLORS.draft,
                    boxShadow: `0 0 0 4px ${STATUS_COLORS[page.status] ?? STATUS_COLORS.draft}1f`,
                  }}
                />
                {index < pages.length - 1 && (
                  <div
                    style={{
                      width: 1,
                      flex: 1,
                      minHeight: compact ? 14 : 18,
                      background: "linear-gradient(to bottom, var(--d3-border-medium), transparent)",
                    }}
                  />
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: compact ? "0.72rem" : "0.78rem",
                      fontWeight: 700,
                      color: "var(--d3-text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {page.name}
                  </span>
                  {page.lockedBlocks.length > 0 && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 6px",
                        borderRadius: 999,
                        background: "rgba(168,85,247,0.12)",
                        color: "#8b5cf6",
                        fontSize: "0.55rem",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      <Lock size={9} />
                      Code
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    color: "var(--d3-text-tertiary)",
                  }}
                >
                  <span style={{ fontSize: "0.62rem", fontFamily: "monospace" }}>{page.route}</span>
                  <span style={{ fontSize: "0.62rem" }}>
                    {page.sections.length} Sektionen
                  </span>
                  <span style={{ fontSize: "0.62rem", textTransform: "capitalize" }}>{page.character}</span>
                </div>
              </div>

              <div
                style={{
                  justifySelf: "end",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 5,
                }}
              >
                <span
                  style={{
                    fontSize: "0.55rem",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: isActive ? "#4f46e5" : "var(--d3-text-tertiary)",
                  }}
                >
                  {STATUS_LABELS[page.status] ?? page.status}
                </span>
                <span style={{ fontSize: "0.55rem", color: "var(--d3-text-tertiary)" }}>
                  {SOURCE_LABELS[page.source] ?? page.source}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {showFeatures && featureRows.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: "auto",
            paddingTop: 4,
          }}
        >
          <div
            style={{
              fontSize: "0.6rem",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--d3-text-tertiary)",
            }}
          >
            Funktionen
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {featureRows.map((feature) => (
              <button
                key={feature.id}
                onClick={() => onToggleFeature?.(feature.id, !feature.enabled)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: feature.enabled
                    ? "1px solid rgba(34,197,94,0.28)"
                    : "1px dashed var(--d3-glass-border)",
                  background: feature.enabled ? "rgba(34,197,94,0.08)" : "transparent",
                  color: feature.enabled ? "#15803d" : "var(--d3-text-secondary)",
                  cursor: onToggleFeature ? "pointer" : "default",
                  fontSize: "0.62rem",
                  fontWeight: 700,
                }}
              >
                {feature.enabled ? <Sparkles size={10} /> : <Plus size={10} />}
                {feature.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
