---
description: Systematisches Vorgehen bei Bugs in D³ Studio
---

# Bug fixen

## 1. Reproduzieren

- Dev-Server laeuft? Falls nicht:
// turbo
```
npm run dev
```
- Bug im Browser reproduzieren
- Browser-Konsole pruefen (F12 → Console)

## 2. Ursache eingrenzen

### UI-Bug (visuell)
- Datei: vermutlich in `src/components/editor/` oder `src/components/blocks/`
- CSS/Tailwind Problem? → Elemente im Browser inspizieren
- State-Problem? → `console.log` in den relevanten Handler

### Logik-Bug (Daten)
- Mutations-Problem? → `src/lib/project-mutations.ts` pruefen
- History-Problem? → `src/lib/hooks/use-project-history.ts`
- Handler-Problem? → `src/app/page.tsx` (alle Handler dort)

### AI-Bug (Generierung)
- API-Route pruefen: `src/app/api/{endpoint}/route.ts`
- System-Prompt anschauen
- Response-Format validieren

## 3. Fix implementieren

- Minimaler upstream Fix, keine downstream Workarounds
- Immutability beachten bei Projekt-Mutations
- History-aware: Aenderungen muessen durch `apply()` fliessen

## 4. Verifizieren
// turbo
```
npx next build
```

Dann manuell testen im Browser.
