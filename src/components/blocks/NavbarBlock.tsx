"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Block } from "@/lib/types";
import { getBlockPadding, getBodyTextStyle, getHeadingTextStyle } from "@/lib/block-styles";

interface Props {
  block: Block;
  viewportWidth?: number;
  onTextClick?: (e: React.MouseEvent, key: string) => void;
  onUpdateContent?: (key: string, value: string) => void;
}

const MOBILE_BREAKPOINT = 500;

export default function NavbarBlock({ block, viewportWidth, onTextClick, onUpdateContent }: Props) {
  const { logo, links } = block.content;
  const navLinks = (links || "").split(",").map((l) => l.trim());
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = typeof viewportWidth === "number" && viewportWidth < MOBILE_BREAKPOINT;

  const handleLinkClick = (e: React.MouseEvent, index: number) => {
    if (!onTextClick) return;
    const syntheticKey = `link_${index}`;
    const originalOnTextClick = onTextClick;

    const target = e.currentTarget as HTMLElement;
    const originalText = navLinks[index];

    const handleBlur = () => {
      const newValue = target.textContent ?? originalText;
      const updated = navLinks.map((l, j) => (j === index ? newValue : l)).join(", ");
      onUpdateContent?.("links", updated);
      target.removeEventListener("blur", handleBlur);
    };
    target.addEventListener("blur", handleBlur);

    originalOnTextClick(e, syntheticKey);
  };

  return (
    <nav
      className="flex items-center justify-between"
      style={{
        backgroundColor: "var(--bs-bg)",
        color: "var(--bs-text)",
        fontFamily: "var(--bs-font-body)",
        ...getBlockPadding(block.overrides, "1.25rem", "2rem"),
      }}
    >
      <span
        className="text-xl font-bold cursor-text tracking-tight"
        onClick={(e) => onTextClick?.(e, "logo")}
        style={getHeadingTextStyle(block.overrides, "1.25rem")}
      >
        {logo}
      </span>
      {isMobile ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{
              color: "var(--bs-text)",
              background: menuOpen ? "rgba(0,0,0,0.06)" : "transparent",
            }}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-2 flex flex-col gap-1 py-2 px-3 z-30"
              style={{
                backgroundColor: "var(--bs-bg)",
                borderRadius: 12,
                boxShadow: "0 4px 20px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
                minWidth: 160,
              }}
            >
              {navLinks.map((link, i) => (
                <span
                  key={i}
                  className="cursor-text py-2 px-2 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 transition-all"
                  onClick={(e) => {
                    handleLinkClick(e, i);
                    setMenuOpen(false);
                  }}
                  style={getBodyTextStyle(block.overrides, "0.875rem")}
                >
                  {link}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-8 text-sm">
          {navLinks.map((link, i) => (
            <span
              key={i}
              className="cursor-text opacity-70 hover:opacity-100 transition-opacity"
              onClick={(e) => handleLinkClick(e, i)}
              style={getBodyTextStyle(block.overrides, "0.875rem")}
            >
              {link}
            </span>
          ))}
        </div>
      )}
    </nav>
  );
}
