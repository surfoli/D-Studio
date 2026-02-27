---
description: Wie Styling in D³ Studio funktioniert (Farben, Fonts, Spacing)
---

# Styling-System

## Ebenen

### 1. Design Tokens (global)
- Definiert in `project.tokens` (Typ `DesignTokens` aus `src/lib/types.ts`)
- Felder: primary, secondary, accent, background, surface, text, textMuted, fontFamily, borderRadius
- Aenderung: `pm.updateThemeTokens(project, { primary: "#ff0000" })`

### 2. Block Overrides (pro Block)
- Definiert in `block.overrides` (Typ `BlockOverrides`)
- Felder: bgColor, textColor, accentColor, primaryColor, secondaryColor, surfaceColor, textMutedColor
- Plus: fontSizeHeading, fontSizeBody, paddingX, paddingY, customFont, letterSpacing, radius, buttonScale, buttonRadius, surfaceRadius
- CSS-Variablen-Generierung: `src/lib/block-styles.ts` → `blockStyleVars(overrides, tokens)`

### 3. Tailwind (Layout)
- Standard Tailwind CSS Klassen fuer Layout, Flexbox, Grid
- Nicht fuer Farben verwenden → immer CSS-Vars nutzen

## Wo was aendern

| Was | Datei |
|-----|-------|
| Globale Farben | `pm.updateThemeTokens()` in page.tsx Handler |
| Block-Farben | `pm.updateBlockOverrides()` in page.tsx Handler |
| CSS-Var Mapping | `src/lib/block-styles.ts` |
| Slider-Ranges | `FloatingToolbar.tsx` → ProSliderRow Komponente |
| Block-spezifisches CSS | Jeweilige Block-Komponente in `src/components/blocks/` |

## Farb-CSS-Variablen

```
--bs-primary, --bs-secondary, --bs-accent
--bs-bg, --bs-surface
--bs-text, --bs-text-muted
```

Jeder Block-Wrapper setzt diese via inline `style` aus `blockStyleVars()`.
