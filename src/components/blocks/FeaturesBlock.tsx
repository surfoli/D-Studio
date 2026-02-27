"use client";

import { Block } from "@/lib/types";
import { Image as ImageIcon } from "lucide-react";
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

function FeaturesD({ block, onTextClick, onImageClick }: Props) {
  const c = block.content;
  const image = c.image;
  const features = [
    { title: c.feature1_title, desc: c.feature1_desc },
    { title: c.feature2_title, desc: c.feature2_desc },
    { title: c.feature3_title, desc: c.feature3_desc },
  ];

  return (
    <section
      style={{
        backgroundColor: "var(--bs-surface)",
        color: "var(--bs-text)",
        fontFamily: "var(--bs-font-body)",
        ...getBlockPadding(block.overrides, "calc(5rem * var(--bs-spacing-factor))", "4rem"),
      }}
    >
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-start">
        <div>
          <p
            className="text-xs uppercase tracking-[0.3em] mb-4 cursor-text"
            style={getBodyTextStyle(block.overrides, "0.75rem", { color: "var(--bs-accent)" })}
            onClick={(e) => onTextClick?.(e, "subtitle")}
          >
            {c.subtitle}
          </p>
          <h2
            className="text-4xl font-bold cursor-text mb-6 tracking-tight"
            style={getHeadingTextStyle(block.overrides, "2.5rem")}
            onClick={(e) => onTextClick?.(e, "title")}
          >
            {c.title}
          </h2>
          <p
            className="text-sm text-[color:var(--bs-text-muted)] max-w-xl cursor-text"
            onClick={(e) => onTextClick?.(e, "feature1_desc")}
          >
            {c.feature1_desc}
          </p>
          {/* Section image */}
          <div
            className="mt-8 rounded-2xl overflow-hidden cursor-pointer group relative"
            style={{
              backgroundColor: "var(--bs-bg)",
              minHeight: image ? undefined : 140,
              borderRadius: getSurfaceRadius(block.overrides),
            }}
            onClick={(e) => onImageClick?.(e, "image")}
          >
            {image ? (
              <>
                <img src={image} alt="" className="w-full h-auto max-h-[300px] object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg transition-opacity">
                    Bild ändern
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <ImageIcon size={22} style={{ color: "var(--bs-text-muted)", opacity: 0.35 }} />
                <span className="text-xs font-medium opacity-35">Bild hinzufügen</span>
              </div>
            )}
          </div>
        </div>
        <div className="grid gap-6">
          {features.map((f, i) => (
            <div
              key={f.title + i}
              className="rounded-2xl border border-[color:rgb(0_0_0_/_0.06)] p-6 bg-white"
              style={{ borderRadius: getSurfaceRadius(block.overrides) }}
            >
              <span className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--bs-text-muted)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3
                className="text-xl font-semibold mt-3 cursor-text"
                onClick={(e) => onTextClick?.(e, `feature${i + 1}_title`)}
                style={getHeadingTextStyle(block.overrides, "1.3rem")}
              >
                {f.title}
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed cursor-text"
                onClick={(e) => onTextClick?.(e, `feature${i + 1}_desc`)}
                style={getBodyTextStyle(block.overrides, "0.9rem", { color: "var(--bs-text-muted)" })}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesE({ block, onTextClick }: Props) {
  const c = block.content;
  const features = [
    { title: c.feature1_title, desc: c.feature1_desc },
    { title: c.feature2_title, desc: c.feature2_desc },
    { title: c.feature3_title, desc: c.feature3_desc },
  ];

  return (
    <section
      style={{
        backgroundColor: "var(--bs-bg)",
        color: "var(--bs-text)",
        fontFamily: "var(--bs-font-body)",
        ...getBlockPadding(block.overrides, "calc(5rem * var(--bs-spacing-factor))", "4rem"),
      }}
    >
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center">
          <h2
            className="text-4xl font-bold tracking-tight cursor-text"
            onClick={(e) => onTextClick?.(e, "title")}
            style={getHeadingTextStyle(block.overrides, "2.5rem")}
          >
            {c.title}
          </h2>
          <p
            className="mt-3 text-sm cursor-text"
            onClick={(e) => onTextClick?.(e, "subtitle")}
            style={getBodyTextStyle(block.overrides, "0.95rem", { color: "var(--bs-text-muted)" })}
          >
            {c.subtitle}
          </p>
        </div>
        <div className="space-y-6">
          {features.map((f, i) => (
            <div key={f.title + i} className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[color:var(--bs-surface)] flex items-center justify-center font-semibold">
                  {i + 1}
                </div>
                <h3
                  className="text-xl font-semibold cursor-text"
                  onClick={(e) => onTextClick?.(e, `feature${i + 1}_title`)}
                  style={getHeadingTextStyle(block.overrides, "1.3rem")}
                >
                  {f.title}
                </h3>
              </div>
              <p
                className="text-sm text-[color:var(--bs-text-muted)] cursor-text flex-1"
                onClick={(e) => onTextClick?.(e, `feature${i + 1}_desc`)}
                style={getBodyTextStyle(block.overrides, "0.95rem")}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesA({ block, onTextClick }: Props) {
  const c = block.content;
  const features = [
    { title: c.feature1_title, desc: c.feature1_desc },
    { title: c.feature2_title, desc: c.feature2_desc },
    { title: c.feature3_title, desc: c.feature3_desc },
  ];

  return (
    <section
      style={{
        backgroundColor: "var(--bs-bg)",
        color: "var(--bs-text)",
        fontFamily: "var(--bs-font-body)",
        ...getBlockPadding(block.overrides, "calc(5rem * var(--bs-spacing-factor))", "4rem"),
      }}
    >
      <div className="text-center mb-16">
        <h2
          className="text-4xl font-bold cursor-text tracking-tight"
          onClick={(e) => onTextClick?.(e, "title")}
          style={getHeadingTextStyle(block.overrides, "2.25rem")}
        >
          {c.title}
        </h2>
        <p
          className="mt-3 text-sm cursor-text"
          onClick={(e) => onTextClick?.(e, "subtitle")}
          style={getBodyTextStyle(block.overrides, "0.875rem", {
            color: "var(--bs-text-muted)",
          })}
        >
          {c.subtitle}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-12 max-w-5xl mx-auto">
        {features.map((f, i) => (
          <div key={i} className="text-center">
            <div
              className="w-12 h-12 mx-auto mb-5 rounded-full flex items-center justify-center text-lg font-bold"
              style={{
                backgroundColor: "var(--bs-surface)",
                color: "var(--bs-accent)",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <h3
              className="text-lg font-semibold cursor-text"
              onClick={(e) => onTextClick?.(e, `feature${i + 1}_title`)}
              style={getHeadingTextStyle(block.overrides, "1.125rem")}
            >
              {f.title}
            </h3>
            <p
              className="mt-3 text-sm leading-relaxed cursor-text"
              onClick={(e) => onTextClick?.(e, `feature${i + 1}_desc`)}
              style={getBodyTextStyle(block.overrides, "0.875rem", {
                color: "var(--bs-text-muted)",
              })}
            >
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesB({ block, onTextClick }: Props) {
  const c = block.content;
  const features = [
    { title: c.feature1_title, desc: c.feature1_desc },
    { title: c.feature2_title, desc: c.feature2_desc },
    { title: c.feature3_title, desc: c.feature3_desc },
  ];

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
      <div className="space-y-0">
        {features.map((f, i) => (
          <div
            key={i}
            className="flex items-start gap-8 py-8"
            style={{
              borderBottom: `1px solid color-mix(in srgb, var(--bs-text) 10%, transparent)`,
            }}
          >
            <span
              className="text-5xl font-bold opacity-15 shrink-0 w-20"
              style={getHeadingTextStyle(block.overrides, "3rem")}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3
                className="text-xl font-semibold cursor-text"
                onClick={(e) => onTextClick?.(e, `feature${i + 1}_title`)}
                style={getHeadingTextStyle(block.overrides, "1.25rem")}
              >
                {f.title}
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed cursor-text max-w-lg"
                onClick={(e) => onTextClick?.(e, `feature${i + 1}_desc`)}
                style={getBodyTextStyle(block.overrides, "0.875rem", {
                  color: "var(--bs-text-muted)",
                })}
              >
                {f.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesC({ block, onTextClick }: Props) {
  const c = block.content;
  const features = [
    { title: c.feature1_title, desc: c.feature1_desc },
    { title: c.feature2_title, desc: c.feature2_desc },
    { title: c.feature3_title, desc: c.feature3_desc },
  ];

  return (
    <section
      style={{
        backgroundColor: "var(--bs-primary)",
        color: "var(--bs-secondary)",
        fontFamily: "var(--bs-font-body)",
        ...getBlockPadding(block.overrides, "calc(5rem * var(--bs-spacing-factor))", "4rem"),
      }}
    >
      <h2
        className="text-4xl font-bold cursor-text mb-4 tracking-tight"
        onClick={(e) => onTextClick?.(e, "title")}
        style={getHeadingTextStyle(block.overrides, "2.25rem")}
      >
        {c.title}
      </h2>
      <p
        className="text-sm cursor-text mb-14 opacity-60"
        onClick={(e) => onTextClick?.(e, "subtitle")}
        style={getBodyTextStyle(block.overrides, "0.875rem")}
      >
        {c.subtitle}
      </p>
      <div className="grid grid-cols-3 gap-6">
        {features.map((f, i) => (
          <div
            key={i}
            className="p-8"
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: getSurfaceRadius(block.overrides),
            }}
          >
            <h3
              className="text-lg font-semibold cursor-text"
              onClick={(e) => onTextClick?.(e, `feature${i + 1}_title`)}
              style={getHeadingTextStyle(block.overrides, "1.125rem")}
            >
              {f.title}
            </h3>
            <p
              className="mt-3 text-sm leading-relaxed cursor-text opacity-60"
              onClick={(e) => onTextClick?.(e, `feature${i + 1}_desc`)}
              style={getBodyTextStyle(block.overrides, "0.875rem")}
            >
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function FeaturesBlock({ block, onTextClick, onImageClick }: Props) {
  switch (block.variant) {
    case "B":
      return <FeaturesB block={block} onTextClick={onTextClick} onImageClick={onImageClick} />;
    case "C":
      return <FeaturesC block={block} onTextClick={onTextClick} onImageClick={onImageClick} />;
    case "D":
      return <FeaturesD block={block} onTextClick={onTextClick} onImageClick={onImageClick} />;
    case "E":
      return <FeaturesE block={block} onTextClick={onTextClick} onImageClick={onImageClick} />;
    default:
      return <FeaturesA block={block} onTextClick={onTextClick} onImageClick={onImageClick} />;
  }
}
