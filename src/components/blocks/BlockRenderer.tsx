"use client";

import type { ComponentType } from "react";
import type { Block, BlockType } from "@/lib/types";
import { getOverrideCssVariables } from "@/lib/block-styles";
import NavbarBlock from "./NavbarBlock";
import HeroBlock from "./HeroBlock";
import FeaturesBlock from "./FeaturesBlock";
import StatsBlock from "./StatsBlock";
import TestimonialsBlock from "./TestimonialsBlock";
import CTABlock from "./CTABlock";
import FooterBlock from "./FooterBlock";
import CustomBlock from "./CustomBlock";

interface Props {
  block: Block;
  viewportWidth?: number;
  onTextClick?: (e: React.MouseEvent, key: string) => void;
  onImageClick?: (e: React.MouseEvent, key: string) => void;
  onUpdateContent?: (key: string, value: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BLOCK_COMPONENTS: Record<BlockType, ComponentType<any>> = {
  navbar: NavbarBlock,
  hero: HeroBlock,
  features: FeaturesBlock,
  stats: StatsBlock,
  testimonials: TestimonialsBlock,
  cta: CTABlock,
  footer: FooterBlock,
  pricing: CTABlock, // fallback — pricing uses CTA layout
  custom: CustomBlock,
};

export default function BlockRenderer({ block, viewportWidth, onTextClick, onImageClick, onUpdateContent }: Props) {
  const Component = BLOCK_COMPONENTS[block.type];

  if (!Component) {
    return (
      <div className="p-8 text-center text-sm opacity-40">
        Unknown block: {block.type}
      </div>
    );
  }

  return (
    <div style={getOverrideCssVariables(block.overrides)}>
      <Component
        block={block}
        viewportWidth={viewportWidth}
        onTextClick={onTextClick}
        onImageClick={onImageClick}
        onUpdateContent={onUpdateContent}
      />
    </div>
  );
}
