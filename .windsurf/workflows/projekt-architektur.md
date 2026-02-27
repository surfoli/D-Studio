---
description: D³ Studio Architektur-Ueberblick und wo was zu finden ist
---

# D³ Studio Architektur

## State-Management

- **Projekt-State**: `useProjectHistory()` Hook in `src/lib/hooks/use-project-history.ts`
  - Liefert: `project`, `canUndo`, `canRedo`, `apply`, `replace`, `undo`, `redo`
  - `apply(updater)` → immutable update + History-Eintrag
  - `replace(project)` → kompletten State ersetzen (z.B. nach AI-Generierung)
  - Max 120 History-Steps

- **Mutations**: `src/lib/project-mutations.ts` (import als `pm`)
  - Alle Funktionen sind pure: `(project, ...args) => newProject`
  - Werden in `page.tsx` via `apply((prev) => pm.xxx(prev, ...))` aufgerufen

- **Settings**: `src/lib/settings.ts` → localStorage
- **Projekte**: `src/lib/storage.ts` → localStorage, auto-save debounced 800ms

## Komponenten-Hierarchie

```
page.tsx (orchestriert alles)
├── TopBar (Mode-Switcher: Design | Planung | Vibe-Coding)
├── AIPanel (linke Sidebar, Design-Mode)
├── Canvas (Hauptbereich, Design-Mode)
│   ├── PageFrame[] (je eine Seite)
│   │   └── BlockRenderer → HeroBlock, FeaturesBlock, etc.
│   ├── FloatingToolbar (Inspektor rechts)
│   ├── PageManager (Seiten-Popover)
│   └── Dock (unten: Zoom, Viewport, Undo/Redo, Fix)
├── PlanningMode (lazy-loaded)
├── PreviewMode (lazy-loaded)
└── VibeCodingMode (lazy-loaded, Monaco Editor)
```

## API-Endpunkte (src/app/api/)

| Route | Methode | Funktion |
|-------|---------|----------|
| /api/generate | POST (SSE) | AI Block-Generierung aus Prompt |
| /api/fix | POST | AI Responsive-Fix Vorschlaege |
| /api/plan | POST (SSE) | AI Planungs-Dokument erstellen |
| /api/plan-chat | POST (SSE) | Chat mit AI ueber Planung |
| /api/vibe-code | POST (SSE) | AI Code-Generierung (Next.js) |
| /api/files | GET/POST/DELETE | Supabase File CRUD |
| /api/projects | GET/POST | Projekt-Persistenz |

## Performance-Patterns

- React Compiler aktiv (`reactCompiler: true` in next.config.ts)
- Heavy Modes (Planning/Preview/VibeCoding) sind `React.lazy()` + `Suspense`
- Auto-Save debounced (800ms Timeout)
- Viewport Hook (`use-viewport.ts`) ist zoom-resistant via devicePixelRatio
