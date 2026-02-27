---
description: Wie eine neue Seite im D³ Studio Multi-Page System funktioniert
---

# Neue Seite erstellen (Architektur-Referenz)

## Ablauf im Code

1. User klickt "Seiten" im Dock → `PageManager.tsx` Popover oeffnet sich
2. User waehlt Preset oder tippt Name ein
3. `handleAddPage(name)` in `page.tsx` wird aufgerufen:
   - Erstellt neue Page mit `slugify(name)` als Slug
   - Klont Navbar + Footer vom ersten Page fuer Konsistenz
   - Fuegt Hero + CTA Blocks hinzu
   - Ruft `pm.addNavbarLinkToAllPages()` auf → Link erscheint in allen Navbars
4. Alles fliesst durch `apply()` → History-aware (Undo moeglich)

## Relevante Dateien

- `src/app/page.tsx` → handleAddPage, handleDeletePage, handleRenamePage, handleDuplicatePage
- `src/components/editor/PageManager.tsx` → UI, Presets, slugify()
- `src/lib/project-mutations.ts` → addNavbarLinkToAllPages, removeNavbarLinkFromAllPages, renameNavbarLinkInAllPages
- `src/components/editor/Canvas.tsx` → Dock-Button, Page-Scroll

## Wichtig

- Navbar-Links werden IMMER auf ALLEN Seiten synchron gehalten
- Min. 1 Seite muss existieren (Delete-Schutz)
- slugify() behandelt deutsche Umlaute (ae, oe, ue, ss)
