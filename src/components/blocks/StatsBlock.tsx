"use client";

import { Block } from "@/lib/types";
import {
  getBlockPadding,
  getBodyTextStyle,
  getHeadingTextStyle,
  getSurfaceRadius,
} from "@/lib/block-styles";

interface Props {
  block: Block;
  onTextClick?: (e: React.MouseEvent, key: string) => void;
}

export default function StatsBlock({ block, onTextClick }: Props) {
  const c = block.content;
  const stats = [
    { value: c.stat1_value, label: c.stat1_label },
    { value: c.stat2_value, label: c.stat2_label },
    { value: c.stat3_value, label: c.stat3_label },
    { value: c.stat4_value, label: c.stat4_label },
  ];

  const surfaceRadius = getSurfaceRadius(block.overrides);

  if (block.variant === "B") {
    return (
      <section
        style={{
          backgroundColor: "var(--bs-primary)",
          color: "var(--bs-secondary)",
          fontFamily: "var(--bs-font-body)",
          borderRadius: surfaceRadius,
          ...getBlockPadding(block.overrides, "calc(4rem * var(--bs-spacing-factor))", "4rem"),
        }}
      >
        <div className="grid grid-cols-4 gap-8 max-w-5xl mx-auto">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div
                className="text-5xl font-bold cursor-text"
                onClick={(e) => onTextClick?.(e, `stat${i + 1}_value`)}
                style={{
                  ...getHeadingTextStyle(block.overrides, "3rem"),
                  color: "var(--bs-accent)",
                }}
              >
                {s.value}
              </div>
              <div
                className="mt-2 text-xs uppercase tracking-[0.15em] cursor-text opacity-60"
                onClick={(e) => onTextClick?.(e, `stat${i + 1}_label`)}
                style={getBodyTextStyle(block.overrides, "0.75rem")}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        backgroundColor: "var(--bs-surface)",
        color: "var(--bs-text)",
        fontFamily: "var(--bs-font-body)",
        borderRadius: surfaceRadius,
        ...getBlockPadding(block.overrides, "calc(4rem * var(--bs-spacing-factor))", "4rem"),
      }}
    >
      <div className="grid grid-cols-4 gap-8 max-w-5xl mx-auto">
        {stats.map((s, i) => (
          <div
            key={i}
            className="text-center py-8"
            style={{
              borderRight:
                i < 3
                  ? `1px solid color-mix(in srgb, var(--bs-text) 10%, transparent)`
                  : "none",
            }}
          >
            <div
              className="text-5xl font-bold cursor-text tracking-tight"
              onClick={(e) => onTextClick?.(e, `stat${i + 1}_value`)}
              style={getHeadingTextStyle(block.overrides, "3rem")}
            >
              {s.value}
            </div>
            <div
              className="mt-3 text-xs uppercase tracking-[0.15em] cursor-text"
              onClick={(e) => onTextClick?.(e, `stat${i + 1}_label`)}
              style={getBodyTextStyle(block.overrides, "0.75rem", {
                color: "var(--bs-text-muted)",
              })}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
