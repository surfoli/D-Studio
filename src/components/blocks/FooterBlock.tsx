"use client";

import { Block } from "@/lib/types";
import { getBlockPadding, getBodyTextStyle, getHeadingTextStyle } from "@/lib/block-styles";

interface Props {
  block: Block;
  onTextClick?: (e: React.MouseEvent, key: string) => void;
  onUpdateContent?: (key: string, value: string) => void;
}

export default function FooterBlock({ block, onTextClick, onUpdateContent }: Props) {
  const { logo, copyright, links } = block.content;
  const footerLinks = (links || "").split(",").map((l) => l.trim());

  const handleLinkClick = (e: React.MouseEvent, index: number) => {
    if (!onTextClick) return;
    const target = e.currentTarget as HTMLElement;
    const originalText = footerLinks[index];

    const handleBlur = () => {
      const newValue = target.textContent ?? originalText;
      const updated = footerLinks.map((l, j) => (j === index ? newValue : l)).join(", ");
      onUpdateContent?.("links", updated);
      target.removeEventListener("blur", handleBlur);
    };
    target.addEventListener("blur", handleBlur);

    onTextClick(e, `footerlink_${index}`);
  };

  return (
    <footer
      className="flex items-center justify-between"
      style={{
        backgroundColor: "var(--bs-bg)",
        color: "var(--bs-text-muted)",
        fontFamily: "var(--bs-font-body)",
        borderTop: `1px solid color-mix(in srgb, var(--bs-text) 8%, transparent)`,
        ...getBlockPadding(block.overrides, "1.5rem", "2rem"),
      }}
    >
      <span
        className="text-sm font-semibold cursor-text"
        onClick={(e) => onTextClick?.(e, "logo")}
        style={{
          ...getHeadingTextStyle(block.overrides, "0.875rem"),
          color: "var(--bs-text)",
        }}
      >
        {logo}
      </span>
      <span
        className="text-xs cursor-text"
        onClick={(e) => onTextClick?.(e, "copyright")}
        style={getBodyTextStyle(block.overrides, "0.75rem")}
      >
        {copyright}
      </span>
      <div className="flex gap-6 text-xs">
        {footerLinks.map((link, i) => (
          <span
            key={i}
            className="cursor-text hover:opacity-100 opacity-60 transition-opacity"
            onClick={(e) => handleLinkClick(e, i)}
            style={getBodyTextStyle(block.overrides, "0.75rem")}
          >
            {link}
          </span>
        ))}
      </div>
    </footer>
  );
}
