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
  onImageClick?: (e: React.MouseEvent, key: string) => void;
}

export default function TestimonialsBlock({ block, onTextClick, onImageClick }: Props) {
  const c = block.content;

  if (block.variant === "B") {
    const avatar1 = c.avatar1;
    return (
      <section
        style={{
          backgroundColor: "var(--bs-surface)",
          color: "var(--bs-text)",
          fontFamily: "var(--bs-font-body)",
          ...getBlockPadding(block.overrides, "calc(5rem * var(--bs-spacing-factor))", "4rem"),
        }}
      >
        <h2
          className="text-4xl font-bold cursor-text mb-16 tracking-tight"
          onClick={(e) => onTextClick?.(e, "title")}
          style={getHeadingTextStyle(block.overrides, "2.25rem")}
        >
          {c.title}
        </h2>
        <div className="max-w-3xl">
          <blockquote
            className="text-2xl leading-relaxed cursor-text font-light italic"
            onClick={(e) => onTextClick?.(e, "quote1")}
            style={getHeadingTextStyle(block.overrides, "1.5rem")}
          >
            &ldquo;{c.quote1}&rdquo;
          </blockquote>
          <div className="mt-8 flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-full overflow-hidden cursor-pointer shrink-0"
              style={{ backgroundColor: "var(--bs-accent)", opacity: avatar1 ? 1 : 0.3 }}
              onClick={(e) => { e.stopPropagation(); onImageClick?.(e, "avatar1"); }}
            >
              {avatar1 && <img src={avatar1} alt="" className="w-full h-full object-cover" />}
            </div>
            <div>
              <span
                className="text-sm font-semibold cursor-text block"
                onClick={(e) => onTextClick?.(e, "author1")}
                style={getBodyTextStyle(block.overrides, "0.875rem")}
              >
                {c.author1}
              </span>
              <span
                className="text-xs cursor-text"
                onClick={(e) => onTextClick?.(e, "role1")}
                style={getBodyTextStyle(block.overrides, "0.75rem", {
                  color: "var(--bs-text-muted)",
                })}
              >
                {c.role1}
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        backgroundColor: "var(--bs-bg)",
        color: "var(--bs-text)",
        fontFamily: "var(--bs-font-body)",
        ...getBlockPadding(block.overrides, "calc(5rem * var(--bs-spacing-factor))", "4rem"),
      }}
    >
      <h2
        className="text-4xl font-bold cursor-text text-center mb-16 tracking-tight"
        onClick={(e) => onTextClick?.(e, "title")}
        style={getHeadingTextStyle(block.overrides, "2.25rem")}
      >
        {c.title}
      </h2>
      <div className="grid grid-cols-2 gap-10 max-w-4xl mx-auto">
        {[1, 2].map((i) => {
          const avatar = c[`avatar${i}`];
          return (
            <div
              key={i}
              className="p-8"
              style={{
                backgroundColor: "var(--bs-surface)",
                borderRadius: getSurfaceRadius(block.overrides),
              }}
            >
              <p
                className="text-sm leading-relaxed cursor-text"
                onClick={(e) => onTextClick?.(e, `quote${i}`)}
                style={getBodyTextStyle(block.overrides, "0.875rem")}
              >
                &ldquo;{c[`quote${i}`]}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full overflow-hidden cursor-pointer shrink-0"
                  style={{ backgroundColor: "var(--bs-accent)", opacity: avatar ? 1 : 0.2 }}
                  onClick={(e) => { e.stopPropagation(); onImageClick?.(e, `avatar${i}`); }}
                >
                  {avatar && <img src={avatar} alt="" className="w-full h-full object-cover" />}
                </div>
                <div>
                  <span
                    className="text-xs font-semibold cursor-text block"
                    onClick={(e) => onTextClick?.(e, `author${i}`)}
                    style={getBodyTextStyle(block.overrides, "0.75rem")}
                  >
                    {c[`author${i}`]}
                  </span>
                  <span
                    className="text-xs cursor-text"
                    onClick={(e) => onTextClick?.(e, `role${i}`)}
                    style={getBodyTextStyle(block.overrides, "0.75rem", {
                      color: "var(--bs-text-muted)",
                    })}
                  >
                    {c[`role${i}`]}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
