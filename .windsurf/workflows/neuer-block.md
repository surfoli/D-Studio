---
description: Einen neuen Block-Typ zu D³ Studio hinzufuegen
---

# Neuen Block-Typ erstellen

## 1. Block-Komponente anlegen

Erstelle `src/components/blocks/{Name}Block.tsx` nach dem Muster bestehender Blocks (z.B. HeroBlock.tsx).

- Props: `block: Block`, `tokens: DesignTokens`, `viewportWidth?: number`
- CSS-Variablen aus `block.overrides` via `blockStyleVars()` aus `@/lib/block-styles`
- Tailwind fuer Layout, CSS-Vars fuer Farben/Spacing
- Content-Felder via `block.content.{key}` (z.B. `block.content.heading`, `block.content.body`)
- data-content-key Attribute fuer Inline-Editing

## 2. Block-Typ registrieren

### 2a. Types (`src/lib/types.ts`)
- `BlockType` Union erweitern: `| "neuer-typ"`
- Ggf. neue `BlockVariant` Werte

### 2b. BlockRenderer (`src/components/blocks/BlockRenderer.tsx`)
- Import hinzufuegen
- In `BLOCK_COMPONENTS` Map eintragen: `"neuer-typ": NeuerTypBlock`

### 2c. Section Templates (`src/lib/section-templates.ts`)
- `SectionTemplate` hinzufuegen mit: type, label, description, defaultContent
- `templateToBlock()` erkennt den neuen Typ automatisch ueber die Templates

## 3. AI-Generierung unterstuetzen

### `src/app/api/generate/route.ts`
- Im System-Prompt den neuen Block-Typ und seine Content-Keys dokumentieren

## 4. Export unterstuetzen

### `src/lib/next-export.ts`
- Render-Funktion fuer den neuen Block-Typ in `renderBlock()` hinzufuegen

## 5. Testen
// turbo
```
npx next build
```

Dann dev-Server starten und:
- Block ueber SectionPicker hinzufuegen
- AI-Generierung mit dem neuen Block testen
- Export pruefen
