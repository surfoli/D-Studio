---
description: Wie die WebContainer Live-Preview im Vibe-Coding-Modus funktioniert
---

# WebContainer Live-Preview

## Ueberblick

Die Live-Preview nutzt StackBlitz WebContainers, um generierten Code direkt im Browser auszufuehren.
Ein unsichtbarer Mini-Computer (Node.js) laeuft im Browser und zeigt die Website in einem iframe.

## Architektur

### Dateien

- `src/lib/webcontainer.ts` — Singleton-Manager: boot, mount, spawn, writeFile, teardown
- `src/components/editor/TerminalOutput.tsx` — Terminal-Anzeige (Protokoll unten)
- `src/components/editor/VibeCodingMode.tsx` — Haupt-UI mit Editor + Preview + Terminal
- `src/lib/vibe-code.ts` — `vibeFilesToFileSystemTree()` Konverter
- `next.config.ts` — COOP/COEP Headers (noetig fuer SharedArrayBuffer)

### Flow

1. User oeffnet Vibe-Coding-Modus
2. Dateien werden aus Supabase geladen ODER KI generiert sie
3. `bootWebContainer()` wird aufgerufen
4. Dateien werden als FileSystemTree gemountet
5. `npm install` laeuft (Terminal zeigt Fortschritt)
6. `npm run dev` startet den Dev-Server
7. `server-ready` Event liefert Preview-URL → iframe zeigt Website
8. Aenderungen (Editor oder KI) → `writeFile()` → Hot-Reload

### WebContainer-Manager API

```typescript
import { bootContainer, mountFiles, writeFile, deleteFile, runInstall, runDevServer, startProject, teardown, onContainerEvent } from "@/lib/webcontainer";

// Alles in einem Schritt:
const url = await startProject(fileSystemTree);

// Oder einzeln:
await bootContainer();
await mountFiles(tree);
await runInstall();
await runDevServer();
// server-ready Event kommt via onContainerEvent()
```

### Terminal-Kommunikation

```typescript
import { terminalLog, terminalClear } from "./TerminalOutput";

terminalLog("Nachricht", "info");    // blau
terminalLog("Ausgabe", "stdout");    // grau
terminalLog("Warnung", "stderr");    // gelb
terminalLog("Fehler!", "error");     // rot
terminalClear();                     // alles loeschen
```

## Wichtige Einschraenkungen

- **Nur 1 WebContainer** gleichzeitig (Singleton)
- **COOP/COEP Headers** muessen gesetzt sein (next.config.ts)
- **Safari** hat eingeschraenkten Support (SharedArrayBuffer)
- **Startup dauert 10-20s** (boot + npm install)
- **~200-400MB RAM** im Browser

## Fehlerbehebung

- Preview leer? → Terminal pruefen (Protokoll aufklappen)
- `SharedArrayBuffer is not defined`? → COOP/COEP Headers pruefen
- npm install schlaegt fehl? → package.json pruefen
- Hot-Reload funktioniert nicht? → Preview manuell neu laden (Refresh-Button)
