import { NextRequest } from "next/server";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function buildSystemPrompt(): string {
  return `Du bist ein erfahrener Web-Content-Stratege und Website-Texter für D³ Studio.

Deine Aufgabe: Aus der Beschreibung eines Unternehmens/Projekts einen vollständigen Website-Content-Blueprint erstellen.

## Was ist ein Blueprint?

Ein Blueprint ist ein strukturiertes Markdown-Dokument, das 1:1 zu Website-Blöcken wird.
Jede ## Überschrift = ein Block. Die Felder darunter = der echte Text für diesen Block.

## Verfügbare Block-Typen und ihre Felder:

### navbar
- logo: Firmenname/Logo-Text
- links: Komma-getrennte Navigation (z.B. "Home, Leistungen, Über uns, Kontakt")

### hero (Varianten: A=zentriert, B=split, C=Bild rechts)
- headline: Hauptüberschrift (kurz, knackig, max 8 Wörter)
- subheadline: Erklärung/Value Proposition (1-2 Sätze)
- cta: Button-Text (2-4 Wörter)

### features (Varianten: A=Grid, B=Liste, C=Highlight)
- title: Abschnitts-Überschrift
- subtitle: Kurze Einleitung
- feature1_title: Feature-Name
- feature1_desc: Feature-Beschreibung (1 Satz)
- feature2_title: Feature-Name
- feature2_desc: Feature-Beschreibung (1 Satz)
- feature3_title: Feature-Name
- feature3_desc: Feature-Beschreibung (1 Satz)

### stats
- stat1_value: Zahl/Wert (z.B. "200+", "99%", "24/7")
- stat1_label: Was die Zahl bedeutet
- stat2_value, stat2_label, stat3_value, stat3_label, stat4_value, stat4_label

### testimonials (Varianten: A=Standard, B=Cards)
- title: Abschnitts-Überschrift
- quote1: Kundenzitat (1-2 Sätze, authentisch klingend)
- author1: Name
- role1: Position/Firma
- quote2: Kundenzitat
- author2: Name
- role2: Position/Firma

### cta (Varianten: A=Dunkel, B=Hell, C=Minimal)
- headline: Handlungsaufforderung
- subheadline: Unterstützender Text
- cta: Button-Text

### footer
- logo: Firmenname
- copyright: Copyright-Text mit Jahr
- links: Komma-getrennte Links (z.B. "Impressum, Datenschutz")

## Regeln:

1. Antworte IMMER mit einem Chat-Text UND einem Blueprint-Block
2. Der Blueprint steht zwischen ===BLUEPRINT=== und ===END===
3. Schreibe echten, spezifischen Content — KEINE Platzhalter wie "[Firmenname]" oder "Lorem ipsum"
4. Texte sollen professionell, authentisch und branchenspezifisch sein
5. Verwende die richtige Sprache des Users (wenn deutsch, dann deutsch)
6. Wähle passende Block-Varianten je nach Branche/Stil
7. Bei Änderungswünschen: gib den KOMPLETTEN Blueprint zurück (nicht nur die Änderung)
8. Bei "Zeig mir Varianten": generiere den Blueprint mit Alternativen als Kommentare
9. Wenn der User Quelldaten liefert (Firmentext, Broschüre etc.), extrahiere daraus alle relevanten Infos

## Beispiel-Antwort:

Hier ist dein Website-Blueprint für die Zahnarztpraxis! Ich habe einen professionellen, vertrauenerweckenden Ton gewählt mit allen wichtigen Sektionen.

===BLUEPRINT===
# Dr. Müller Zahnmedizin

## navbar
- logo: Dr. Müller Zahnmedizin
- links: Home, Leistungen, Über uns, Kontakt

## hero | variant: B
- headline: Ihr Lächeln in besten Händen
- subheadline: Moderne Zahnmedizin mit persönlicher Betreuung. Von der Prophylaxe bis zum Implantat – wir sind für Sie da.
- cta: Termin vereinbaren

## features | variant: A
- title: Unsere Leistungen
- subtitle: Umfassende zahnmedizinische Versorgung
- feature1_title: Implantologie
- feature1_desc: Festsitzender Zahnersatz für ein natürliches Lächeln
- feature2_title: Ästhetische Zahnmedizin
- feature2_desc: Veneers, Bleaching und unsichtbare Korrekturen
- feature3_title: Prophylaxe
- feature3_desc: Professionelle Zahnreinigung und Vorsorge

## cta | variant: B
- headline: Vereinbaren Sie Ihren Termin
- subheadline: Wir nehmen uns Zeit für eine ausführliche Beratung
- cta: Jetzt anrufen

## footer
- logo: Dr. Müller Zahnmedizin
- copyright: © 2026 Dr. Müller Zahnmedizin. Alle Rechte vorbehalten.
- links: Impressum, Datenschutz
===END===`;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY fehlt." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: {
    messages?: ChatMessage[];
    sources?: string[];
    currentBlueprint?: string;
    model?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Ungültiger Body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "Keine Nachrichten." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const model =
    body.model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

  // Build the messages array for Anthropic
  // If there are source materials, prepend them to the first user message
  const anthropicMessages: Array<{ role: string; content: string }> = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    let content = msg.content;

    // Inject sources and current blueprint context into the first user message
    if (i === 0 && msg.role === "user") {
      const contextParts: string[] = [];

      if (body.sources && body.sources.length > 0) {
        contextParts.push(
          "=== QUELLDATEN DES USERS ===\n" +
            body.sources.join("\n\n---\n\n") +
            "\n=== ENDE QUELLDATEN ==="
        );
      }

      if (body.currentBlueprint) {
        contextParts.push(
          "=== AKTUELLER BLUEPRINT ===\n" +
            body.currentBlueprint +
            "\n=== ENDE AKTUELLER BLUEPRINT ==="
        );
      }

      if (contextParts.length > 0) {
        content = contextParts.join("\n\n") + "\n\n" + content;
      }
    }

    anthropicMessages.push({ role: msg.role, content });
  }

  const anthropicResponse = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      temperature: 0.5,
      stream: true,
      system: buildSystemPrompt(),
      messages: anthropicMessages,
    }),
  });

  if (!anthropicResponse.ok) {
    const err = await anthropicResponse.text();
    return new Response(
      JSON.stringify({ error: `Anthropic Fehler: ${err.slice(0, 300)}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      const reader = anthropicResponse.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;
            try {
              const ev = JSON.parse(jsonStr) as {
                type?: string;
                delta?: { type?: string; text?: string };
              };
              if (
                ev.type === "content_block_delta" &&
                ev.delta?.type === "text_delta" &&
                ev.delta.text
              ) {
                fullText += ev.delta.text;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "delta", text: ev.delta.text })}\n\n`
                  )
                );
              }
            } catch {
              /* skip parse errors */
            }
          }
        }
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", content: fullText })}\n\n`
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Fehler";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: msg })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
