import type { CSSProperties } from "react";
import type { BlockOverrides } from "./types";

type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>;

const DEFAULT_SCALE = 100;

function getScale(value: number | undefined, minPercent = 60, maxPercent = 160) {
  const normalized = (value ?? DEFAULT_SCALE) / 100;
  return Math.min(maxPercent / 100, Math.max(minPercent / 100, normalized));
}

function calcWithOffset(baseExpression: string, offset: number) {
  return `calc(${baseExpression} + ${offset}px)`;
}

export function getOverrideCssVariables(overrides?: BlockOverrides): StyleWithVars {
  const styles: StyleWithVars = {};

  if (!overrides) {
    return styles;
  }

  if (overrides.primaryColor) {
    styles["--bs-primary"] = overrides.primaryColor;
  }

  if (overrides.accentColor) {
    styles["--bs-accent"] = overrides.accentColor;
  }

  if (overrides.backgroundColor) {
    styles["--bs-bg"] = overrides.backgroundColor;
    styles["--bs-surface"] = overrides.backgroundColor;
  }

  if (overrides.textColor) {
    styles["--bs-text"] = overrides.textColor;
    styles["--bs-text-muted"] = `color-mix(in srgb, ${overrides.textColor} 62%, transparent)`;
  }

  if (overrides.secondaryColor) {
    styles["--bs-secondary"] = overrides.secondaryColor;
  }

  if (typeof overrides.fontWeight === "number") {
    styles["--bs-font-weight"] = overrides.fontWeight;
  }

  if (typeof overrides.letterSpacing === "number") {
    styles["--bs-letter-spacing"] = `${overrides.letterSpacing / 100}em`;
  }

  if (typeof overrides.lineHeight === "number") {
    styles["--bs-line-height"] = overrides.lineHeight / 100;
  }

  if (overrides.textAlign) {
    styles["--bs-text-align"] = overrides.textAlign;
  }

  if (typeof overrides.opacity === "number") {
    styles["opacity"] = overrides.opacity / 100;
  }

  if (overrides.customFontHeading) {
    styles["--bs-font-heading"] = overrides.customFontHeading;
  }

  if (overrides.customFontBody) {
    styles["--bs-font-body"] = overrides.customFontBody;
  }

  if (typeof overrides.radius === "number") {
    const radius = `${overrides.radius}px`;
    styles["--bs-radius"] = radius;
    styles["--bs-surface-radius"] = radius;
    styles["--bs-button-radius"] = radius;
  }

  if (typeof overrides.surfaceRadius === "number") {
    styles["--bs-surface-radius"] = `${overrides.surfaceRadius}px`;
  }

  if (typeof overrides.buttonRadius === "number") {
    styles["--bs-button-radius"] = `${overrides.buttonRadius}px`;
  }

  if (typeof overrides.buttonScale === "number") {
    styles["--bs-button-scale"] = getScale(overrides.buttonScale, 70, 160);
  }

  return styles;
}

export function getHeadingTextStyle(
  overrides: BlockOverrides | undefined,
  baseSize: string,
  extraStyles?: CSSProperties
): CSSProperties {
  return {
    fontFamily: "var(--bs-font-heading)",
    fontSize: `calc(${baseSize} * ${getScale(overrides?.fontSizeHeading)})`,
    fontWeight: overrides?.fontWeight ? `var(--bs-font-weight, ${overrides.fontWeight})` : "var(--bs-font-weight, inherit)",
    letterSpacing: "var(--bs-letter-spacing, normal)",
    lineHeight: overrides?.lineHeight ? `var(--bs-line-height, 1.2)` : undefined,
    textAlign: overrides?.textAlign ?? ("var(--bs-text-align, inherit)" as "left"),
    ...extraStyles,
  };
}

export function getBodyTextStyle(
  overrides: BlockOverrides | undefined,
  baseSize: string,
  extraStyles?: CSSProperties
): CSSProperties {
  return {
    fontFamily: "var(--bs-font-body)",
    fontSize: `calc(${baseSize} * ${getScale(overrides?.fontSizeBody)})`,
    fontWeight: "var(--bs-font-weight, inherit)",
    letterSpacing: "var(--bs-letter-spacing, normal)",
    lineHeight: overrides?.lineHeight ? `var(--bs-line-height, 1.6)` : undefined,
    textAlign: overrides?.textAlign ?? ("var(--bs-text-align, inherit)" as "left"),
    ...extraStyles,
  };
}

export function getBlockPadding(
  overrides: BlockOverrides | undefined,
  baseYExpression: string,
  baseXExpression: string
): CSSProperties {
  const offsetY = overrides?.paddingY ?? 0;
  const offsetX = overrides?.paddingX ?? 0;

  return {
    paddingTop: calcWithOffset(baseYExpression, offsetY),
    paddingBottom: calcWithOffset(baseYExpression, offsetY),
    paddingLeft: calcWithOffset(baseXExpression, offsetX),
    paddingRight: calcWithOffset(baseXExpression, offsetX),
  };
}

export function getButtonStyle(
  overrides: BlockOverrides | undefined,
  baseSize: string,
  basePaddingX: string,
  basePaddingY: string,
  extraStyles?: CSSProperties
): CSSProperties {
  const bodyScale = getScale(overrides?.fontSizeBody);
  const buttonScale = getScale(overrides?.buttonScale, 70, 160);

  return {
    fontFamily: "var(--bs-font-body)",
    fontSize: `calc(${baseSize} * ${bodyScale} * ${buttonScale})`,
    paddingLeft: `calc(${basePaddingX} * ${buttonScale})`,
    paddingRight: `calc(${basePaddingX} * ${buttonScale})`,
    paddingTop: `calc(${basePaddingY} * ${buttonScale})`,
    paddingBottom: `calc(${basePaddingY} * ${buttonScale})`,
    borderRadius:
      typeof overrides?.buttonRadius === "number"
        ? `${overrides.buttonRadius}px`
        : "var(--bs-button-radius, var(--bs-radius))",
    ...extraStyles,
  };
}

export function getSurfaceRadius(overrides: BlockOverrides | undefined): string {
  if (typeof overrides?.surfaceRadius === "number") {
    return `${overrides.surfaceRadius}px`;
  }

  if (typeof overrides?.radius === "number") {
    return `${overrides.radius}px`;
  }

  return "var(--bs-surface-radius, var(--bs-radius))";
}
