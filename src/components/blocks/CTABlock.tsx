"use client";

import { Block } from "@/lib/types";
import { Image as ImageIcon } from "lucide-react";
import {
  getBlockPadding,
  getButtonStyle,
  getBodyTextStyle,
  getHeadingTextStyle,
  getSurfaceRadius,
} from "@/lib/block-styles";

interface Props {
  block: Block;
  onTextClick?: (e: React.MouseEvent, key: string) => void;
  onImageClick?: (e: React.MouseEvent, key: string) => void;
}

function CTAA({ block, onTextClick }: Props) {
  const { headline, subheadline, cta } = block.content;
  return (
    <section
      className="text-center"
      style={{
        backgroundColor: "var(--bs-primary)",
        color: "var(--bs-secondary)",
        fontFamily: "var(--bs-font-body)",
        ...getBlockPadding(block.overrides, "calc(5rem * var(--bs-spacing-factor))", "4rem"),
      }}
    >
      <h2
        className="text-4xl font-bold cursor-text max-w-2xl mx-auto tracking-tight"
        onClick={(e) => onTextClick?.(e, "headline")}
        style={getHeadingTextStyle(block.overrides, "2.25rem")}
      >
        {headline}
      </h2>
      <p
        className="mt-4 text-base cursor-text opacity-60 max-w-lg mx-auto"
        onClick={(e) => onTextClick?.(e, "subheadline")}
        style={getBodyTextStyle(block.overrides, "1rem")}
      >
        {subheadline}
      </p>
      <button
        className="mt-10 px-8 py-3.5 text-sm font-medium transition-all hover:scale-105"
        onClick={(e) => onTextClick?.(e, "cta")}
        style={getButtonStyle(block.overrides, "0.875rem", "2rem", "0.875rem", {
          backgroundColor: "var(--bs-accent)",
          color: "var(--bs-secondary)",
        })}
      >
        {cta}
      </button>
    </section>
  );
}

function CTAB({ block, onTextClick }: Props) {
  const { headline, subheadline, cta } = block.content;
  return (
    <section
      className="flex items-center justify-between"
      style={{
        backgroundColor: "var(--bs-surface)",
        color: "var(--bs-text)",
        fontFamily: "var(--bs-font-body)",
        ...getBlockPadding(block.overrides, "calc(4rem * var(--bs-spacing-factor))", "4rem"),
      }}
    >
      <div className="max-w-lg">
        <h2
          className="text-3xl font-bold cursor-text tracking-tight"
          onClick={(e) => onTextClick?.(e, "headline")}
          style={getHeadingTextStyle(block.overrides, "1.875rem")}
        >
          {headline}
        </h2>
        <p
          className="mt-3 text-sm cursor-text"
          onClick={(e) => onTextClick?.(e, "subheadline")}
          style={getBodyTextStyle(block.overrides, "0.875rem", {
            color: "var(--bs-text-muted)",
          })}
        >
          {subheadline}
        </p>
      </div>
      <button
        className="px-8 py-3.5 text-sm font-medium shrink-0 transition-all hover:scale-105"
        onClick={(e) => onTextClick?.(e, "cta")}
        style={getButtonStyle(block.overrides, "0.875rem", "2rem", "0.875rem", {
          backgroundColor: "var(--bs-text)",
          color: "var(--bs-bg)",
        })}
      >
        {cta}
      </button>
    </section>
  );
}

function CTAC({ block, onTextClick, onImageClick }: Props) {
  const { headline, subheadline, cta, image } = block.content;
  return (
    <section
      style={{
        backgroundColor: "var(--bs-bg)",
        color: "var(--bs-text)",
        fontFamily: "var(--bs-font-body)",
        ...getBlockPadding(block.overrides, "calc(4rem * var(--bs-spacing-factor))", "4rem"),
      }}
    >
      <div
        className="p-12 text-center"
        style={{
          backgroundColor: "var(--bs-surface)",
          borderRadius: getSurfaceRadius(block.overrides),
          border: `1px solid color-mix(in srgb, var(--bs-text) 8%, transparent)`,
        }}
      >
        {/* Optional image */}
        <div
          className="mx-auto mb-8 rounded-xl overflow-hidden cursor-pointer group relative"
          style={{
            maxWidth: 480,
            minHeight: image ? undefined : 100,
            backgroundColor: "var(--bs-bg)",
            borderRadius: getSurfaceRadius(block.overrides),
          }}
          onClick={(e) => onImageClick?.(e, "image")}
        >
          {image ? (
            <>
              <img src={image} alt="" className="w-full h-auto max-h-[260px] object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg transition-opacity">
                  Bild ändern
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 py-6">
              <ImageIcon size={20} style={{ color: "var(--bs-text-muted)", opacity: 0.3 }} />
              <span className="text-[11px] font-medium opacity-30">Bild hinzufügen</span>
            </div>
          )}
        </div>
        <h2
          className="text-3xl font-bold cursor-text tracking-tight"
          onClick={(e) => onTextClick?.(e, "headline")}
          style={getHeadingTextStyle(block.overrides, "1.875rem")}
        >
          {headline}
        </h2>
        <p
          className="mt-3 text-sm cursor-text max-w-md mx-auto"
          onClick={(e) => onTextClick?.(e, "subheadline")}
          style={getBodyTextStyle(block.overrides, "0.875rem", {
            color: "var(--bs-text-muted)",
          })}
        >
          {subheadline}
        </p>
        <button
          className="mt-8 px-8 py-3.5 text-sm font-medium transition-all hover:scale-105"
          onClick={(e) => onTextClick?.(e, "cta")}
          style={getButtonStyle(block.overrides, "0.875rem", "2rem", "0.875rem", {
            backgroundColor: "var(--bs-accent)",
            color: "var(--bs-secondary)",
          })}
        >
          {cta}
        </button>
      </div>
    </section>
  );
}

export default function CTABlock({ block, onTextClick, onImageClick }: Props) {
  switch (block.variant) {
    case "B":
      return <CTAB block={block} onTextClick={onTextClick} onImageClick={onImageClick} />;
    case "C":
      return <CTAC block={block} onTextClick={onTextClick} onImageClick={onImageClick} />;
    default:
      return <CTAA block={block} onTextClick={onTextClick} onImageClick={onImageClick} />;
  }
}
