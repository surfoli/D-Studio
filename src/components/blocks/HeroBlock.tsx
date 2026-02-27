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

function HeroA({ block, onTextClick, onImageClick }: Props) {
  const { headline, subheadline, cta, image } = block.content;
  return (
    <section
      className="relative flex flex-col items-center justify-center text-center overflow-hidden"
      style={{
        backgroundColor: "var(--bs-bg)",
        color: image ? "#fff" : "var(--bs-text)",
        fontFamily: "var(--bs-font-body)",
        ...getBlockPadding(block.overrides, "calc(6rem * var(--bs-spacing-factor))", "2rem"),
      }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 cursor-pointer group"
        onClick={(e) => onImageClick?.(e, "image")}
      >
        {image ? (
          <>
            <img src={image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg transition-opacity">
                Bild ändern
              </span>
            </div>
          </>
        ) : (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-opacity opacity-30 hover:opacity-60" style={{ background: "rgba(0,0,0,0.06)" }}>
            <ImageIcon size={14} />
            Hintergrundbild
          </div>
        )}
      </div>
      {/* Content */}
      <div className="relative z-10">
        <h1
          className="text-6xl font-bold leading-tight max-w-4xl cursor-text tracking-tight"
          onClick={(e) => onTextClick?.(e, "headline")}
          style={getHeadingTextStyle(block.overrides, "3.75rem")}
        >
          {headline}
        </h1>
        <p
          className="mt-6 text-lg max-w-2xl cursor-text leading-relaxed mx-auto"
          onClick={(e) => onTextClick?.(e, "subheadline")}
          style={getBodyTextStyle(block.overrides, "1.125rem", {
            color: image ? "rgba(255,255,255,0.8)" : "var(--bs-text-muted)",
          })}
        >
          {subheadline}
        </p>
        <button
          className="mt-10 px-8 py-3.5 text-sm font-medium transition-all hover:scale-105"
          onClick={(e) => onTextClick?.(e, "cta")}
          style={getButtonStyle(block.overrides, "0.875rem", "2rem", "0.875rem", {
            backgroundColor: image ? "#fff" : "var(--bs-text)",
            color: image ? "#000" : "var(--bs-bg)",
          })}
        >
          {cta}
        </button>
      </div>
    </section>
  );
}

function HeroB({ block, onTextClick, onImageClick }: Props) {
  const { headline, subheadline, cta, image } = block.content;
  return (
    <section
      className="relative flex flex-col items-start justify-center overflow-hidden"
      style={{
        backgroundColor: "var(--bs-surface)",
        color: image ? "#fff" : "var(--bs-text)",
        fontFamily: "var(--bs-font-body)",
        ...getBlockPadding(block.overrides, "calc(6rem * var(--bs-spacing-factor))", "4rem"),
      }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 cursor-pointer group"
        onClick={(e) => onImageClick?.(e, "image")}
      >
        {image ? (
          <>
            <img src={image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg transition-opacity">
                Bild ändern
              </span>
            </div>
          </>
        ) : (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-opacity opacity-30 hover:opacity-60" style={{ background: "rgba(0,0,0,0.06)" }}>
            <ImageIcon size={14} />
            Hintergrundbild
          </div>
        )}
      </div>
      {/* Content */}
      <div className="relative z-10">
        <span
          className="text-xs font-medium uppercase tracking-[0.2em] mb-6 cursor-text block"
          onClick={(e) => onTextClick?.(e, "cta")}
          style={getBodyTextStyle(block.overrides, "0.75rem", {
            color: image ? "rgba(255,255,255,0.7)" : "var(--bs-accent)",
          })}
        >
          {cta}
        </span>
        <h1
          className="text-7xl font-bold leading-[0.95] max-w-3xl cursor-text tracking-tight"
          onClick={(e) => onTextClick?.(e, "headline")}
          style={getHeadingTextStyle(block.overrides, "4.5rem")}
        >
          {headline}
        </h1>
        <p
          className="mt-8 text-base max-w-xl cursor-text leading-relaxed"
          onClick={(e) => onTextClick?.(e, "subheadline")}
          style={getBodyTextStyle(block.overrides, "1rem", {
            color: image ? "rgba(255,255,255,0.7)" : "var(--bs-text-muted)",
          })}
        >
          {subheadline}
        </p>
        <div
          className="mt-10 w-16 h-[2px]"
          style={{ backgroundColor: image ? "rgba(255,255,255,0.4)" : "var(--bs-accent)" }}
        />
      </div>
    </section>
  );
}

function HeroC({ block, onTextClick, onImageClick }: Props) {
  const { headline, subheadline, cta, image } = block.content;
  return (
    <section
      className="grid grid-cols-2 min-h-[70vh]"
      style={{
        backgroundColor: "var(--bs-bg)",
        color: "var(--bs-text)",
        fontFamily: "var(--bs-font-body)",
      }}
    >
      <div
        className="flex flex-col justify-center"
        style={getBlockPadding(block.overrides, "calc(4rem * var(--bs-spacing-factor))", "4rem")}
      >
        <h1
          className="text-5xl font-bold leading-tight cursor-text tracking-tight"
          onClick={(e) => onTextClick?.(e, "headline")}
          style={getHeadingTextStyle(block.overrides, "3rem")}
        >
          {headline}
        </h1>
        <p
          className="mt-6 text-base max-w-md cursor-text leading-relaxed"
          onClick={(e) => onTextClick?.(e, "subheadline")}
          style={getBodyTextStyle(block.overrides, "1rem", {
            color: "var(--bs-text-muted)",
          })}
        >
          {subheadline}
        </p>
        <button
          className="mt-8 px-8 py-3.5 text-sm font-medium self-start transition-all hover:scale-105"
          onClick={(e) => onTextClick?.(e, "cta")}
          style={getButtonStyle(block.overrides, "0.875rem", "2rem", "0.875rem", {
            backgroundColor: "var(--bs-accent)",
            color: "var(--bs-secondary)",
          })}
        >
          {cta}
        </button>
      </div>
      <div
        className="flex items-center justify-center cursor-pointer group relative overflow-hidden"
        style={{ backgroundColor: "var(--bs-surface)" }}
        onClick={(e) => onImageClick?.(e, "image")}
      >
        {image ? (
          <img
            src={image}
            alt="Hero"
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-center p-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-[var(--bs-accent)]/20"
              style={{ backgroundColor: "var(--bs-accent)", opacity: 0.15 }}
            >
              <ImageIcon size={28} style={{ color: "var(--bs-accent)" }} />
            </div>
            <span className="text-sm font-medium opacity-50 group-hover:opacity-70 transition-opacity">
              Bild hinzufügen
            </span>
          </div>
        )}
        {image && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg transition-opacity">
              Bild ändern
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function HeroD({ block, onTextClick, onImageClick }: Props) {
  const { headline, subheadline, cta, image } = block.content;
  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundColor: "var(--bs-primary)",
        color: "var(--bs-secondary)",
        fontFamily: "var(--bs-font-body)",
        ...getBlockPadding(block.overrides, "calc(5.5rem * var(--bs-spacing-factor))", "4rem"),
      }}
    >
      <div className="grid md:grid-cols-[1fr_360px] gap-16 items-center">
        <div>
          <p
            className="text-xs uppercase tracking-[0.3em] mb-4 cursor-text"
            onClick={(e) => onTextClick?.(e, "cta")}
            style={getBodyTextStyle(block.overrides, "0.75rem")}
          >
            {cta}
          </p>
          <h1
            className="text-5xl md:text-6xl font-bold leading-tight mb-6 cursor-text"
            onClick={(e) => onTextClick?.(e, "headline")}
            style={getHeadingTextStyle(block.overrides, "3.5rem")}
          >
            {headline}
          </h1>
          <p
            className="text-base md:text-lg opacity-80 max-w-2xl cursor-text"
            onClick={(e) => onTextClick?.(e, "subheadline")}
            style={getBodyTextStyle(block.overrides, "1.05rem")}
          >
            {subheadline}
          </p>
        </div>
        <div
          className="h-full min-h-[280px] rounded-2xl border border-white/15 p-2 backdrop-blur cursor-pointer group overflow-hidden"
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: getSurfaceRadius(block.overrides),
          }}
          onClick={(e) => onImageClick?.(e, "image")}
        >
          {image ? (
            <div className="relative w-full h-full">
              <img
                src={image}
                alt="Hero Visual"
                className="w-full h-full object-cover rounded-xl transition-transform group-hover:scale-105"
                style={{ borderRadius: getSurfaceRadius(block.overrides) }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-xl flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg transition-opacity">
                  Bild ändern
                </span>
              </div>
            </div>
          ) : (
            <div
              className="h-full rounded-xl border border-white/10 flex flex-col items-center justify-center text-center gap-3 transition-colors group-hover:bg-white/5"
              style={{ borderRadius: getSurfaceRadius(block.overrides) }}
            >
              <ImageIcon size={28} style={{ color: "rgba(255,255,255,0.5)" }} />
              <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                Bild hinzufügen
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function HeroE({ block, onTextClick, onImageClick }: Props) {
  const { headline, subheadline, cta, image } = block.content;
  return (
    <section
      className="flex flex-col gap-10"
      style={{
        backgroundColor: "var(--bs-surface)",
        color: "var(--bs-text)",
        fontFamily: "var(--bs-font-body)",
        ...getBlockPadding(block.overrides, "calc(4.5rem * var(--bs-spacing-factor))", "3rem"),
      }}
    >
      <div className="flex flex-col gap-6">
        <h1
          className="text-6xl font-semibold leading-tight cursor-text"
          onClick={(e) => onTextClick?.(e, "headline")}
          style={getHeadingTextStyle(block.overrides, "3.75rem")}
        >
          {headline}
        </h1>
        <p
          className="text-lg max-w-3xl cursor-text"
          onClick={(e) => onTextClick?.(e, "subheadline")}
          style={getBodyTextStyle(block.overrides, "1.125rem", { color: "var(--bs-text-muted)" })}
        >
          {subheadline}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          className="px-7 py-3 text-sm font-semibold rounded-full"
          onClick={(e) => onTextClick?.(e, "cta")}
          style={getButtonStyle(block.overrides, "0.9rem", "1.75rem", "0.75rem", {
            backgroundColor: "var(--bs-text)",
            color: "var(--bs-bg)",
          })}
        >
          {cta}
        </button>
        <div className="flex items-center gap-3 text-sm text-[color:var(--bs-text-muted)]">
          <span>⏱️ 14 Tage Trial</span>
          <span>•</span>
          <span>Keine Kreditkarte</span>
        </div>
      </div>
      {/* Banner image */}
      <div
        className="w-full rounded-2xl overflow-hidden cursor-pointer group relative"
        style={{
          backgroundColor: "var(--bs-bg)",
          minHeight: image ? undefined : 180,
          borderRadius: getSurfaceRadius(block.overrides),
        }}
        onClick={(e) => onImageClick?.(e, "image")}
      >
        {image ? (
          <>
            <img src={image} alt="Hero" className="w-full h-auto max-h-[400px] object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg transition-opacity">
                Bild ändern
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <ImageIcon size={24} style={{ color: "var(--bs-text-muted)", opacity: 0.4 }} />
            <span className="text-sm font-medium opacity-40">Bild hinzufügen</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default function HeroBlock({ block, onTextClick, onImageClick }: Props) {
  switch (block.variant) {
    case "B":
      return <HeroB block={block} onTextClick={onTextClick} onImageClick={onImageClick} />;
    case "C":
      return <HeroC block={block} onTextClick={onTextClick} onImageClick={onImageClick} />;
    case "D":
      return <HeroD block={block} onTextClick={onTextClick} onImageClick={onImageClick} />;
    case "E":
      return <HeroE block={block} onTextClick={onTextClick} onImageClick={onImageClick} />;
    default:
      return <HeroA block={block} onTextClick={onTextClick} onImageClick={onImageClick} />;
  }
}
