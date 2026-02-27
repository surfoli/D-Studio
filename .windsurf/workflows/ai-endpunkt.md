---
description: Wie AI-Endpunkte in D³ Studio funktionieren und wie man sie aendert
---

# AI-Endpunkte

## Ueberblick

Alle AI-Endpunkte liegen in `src/app/api/` und nutzen Anthropic Claude.
API-Key: `ANTHROPIC_API_KEY` in `.env.local`
Model: Konfigurierbar via Settings (default in `src/lib/settings.ts` → AI_MODELS)

## Endpunkte

### /api/generate (Block-Generierung)
- **Datei**: `src/app/api/generate/route.ts`
- **Input**: Prompt + Model
- **Output**: SSE Stream → fertiges Project JSON
- **System-Prompt**: Beschreibt Block-Typen, Content-Keys, Token-Struktur
- **Aufgerufen von**: `handleGenerateFromPrompt()` in page.tsx

### /api/fix (Responsive-Fix)
- **Datei**: `src/app/api/fix/route.ts`
- **Input**: Blocks + viewportWidth
- **Output**: JSON mit Override-Anpassungen pro Block
- **Nicht-streaming** (einfacher POST → JSON Response)

### /api/plan (Planungs-Dokument)
- **Datei**: `src/app/api/plan/route.ts`
- **Input**: Prompt + optional vorheriges Dokument
- **Output**: SSE Stream → Markdown-Dokument

### /api/vibe-code (Code-Generierung)
- **Datei**: `src/app/api/vibe-code/route.ts`
- **Input**: Chat-Messages + aktuelle Dateien + Model
- **Output**: SSE Stream → Text mit ===FILE:path=== Bloecken
- **Parser**: `parseVibeCodeResponse()` in `src/lib/vibe-code.ts`

## Neuen Endpunkt erstellen

1. Erstelle `src/app/api/{name}/route.ts`
2. `export async function POST(req: Request)` exportieren
3. Anthropic Client erstellen: `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`
4. Fuer Streaming: SSE-Pattern mit `ReadableStream` + `TextEncoder`
5. System-Prompt klar und spezifisch formulieren
6. Response-Format dokumentieren und parsen

## SSE-Pattern (Streaming)

```typescript
const stream = new ReadableStream({
  async start(controller) {
    const enc = new TextEncoder();
    const send = (data: object) =>
      controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

    // ... Anthropic stream verarbeiten ...
    send({ type: "delta", text: "..." });
    send({ type: "done" });
    controller.close();
  }
});
return new Response(stream, {
  headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" }
});
```
