import { NextRequest } from "next/server";
import type { DesignBrief } from "@/lib/design-brief";
import { checkRateLimit } from "@/lib/rate-limit";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

interface ImageBlock {
  data: string;
  mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
}

interface RequestMessage {
  role: "user" | "assistant";
  content: string;
  images?: ImageBlock[];
}

interface RequestBody {
  messages: RequestMessage[];
  currentBrief: DesignBrief;
  model?: string;
  mode: "chat" | "remix"; // "remix" = extract from URL/screenshot, "chat" = conversational design
}

function buildDesignSystemPrompt(brief: DesignBrief, mode: "chat" | "remix"): string {
  const briefJson = JSON.stringify(brief, null, 2);

  if (mode === "remix") {
    return `Du bist der Design-Extraktor von D3 Studio. Der Nutzer gibt dir eine URL oder einen Screenshot.
Deine Aufgabe: Extrahiere das Design-System und gib es als JSON zurueck.

AKTUELLER BRIEF (kann leer sein):
${briefJson}

DEINE AUFGABE:
1. Analysiere die URL/den Screenshot gruendlich
2. Extrahiere: Farbpalette, Typografie, Spacing, Stil, Layout-Sektionen
3. Gib das Ergebnis als UPDATE des Design Briefs zurueck

AUSGABEFORMAT — Du MUSST genau dieses JSON-Format ausgeben, eingerahmt in \`\`\`json ... \`\`\`:

\`\`\`json
{
  "colors": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "surface": "#hex",
    "text": "#hex",
    "textMuted": "#hex"
  },
  "typography": {
    "headingFont": "Font Name",
    "bodyFont": "Font Name",
    "monoFont": "JetBrains Mono",
    "scale": 1.25,
    "baseSize": 16
  },
  "spacing": {
    "system": "compact|balanced|relaxed",
    "baseUnit": 4
  },
  "style": {
    "mood": "beschreibung-des-stils",
    "borderRadius": "sharp|soft|rounded|pill",
    "darkMode": true|false
  },
  "sections": [
    { "patternId": "pattern-id", "label": "Section Name", "description": "Kurze Beschreibung", "animation": "fade-up|fade-in|slide-left|scale-in|stagger|scroll-reveal|none" }
  ],
  "notes": "Zusaetzliche Design-Notizen"
}
\`\`\`

Verfuegbare Pattern-IDs fuer Sektionen:
NAVIGATION: navbar-minimal, navbar-centered, navbar-transparent
HERO: hero-centered, hero-split, hero-fullbleed, hero-video, hero-minimal, hero-editorial, hero-product
FEATURES: features-3col, features-bento, features-bento-advanced, features-alternating, features-list, features-icons-grid
SHOWCASE: showcase-product, showcase-gallery, showcase-comparison, showcase-service-cards, showcase-case-studies
CONTENT: content-text, content-big-text, content-image-text, content-logo-wall, content-marquee, content-team, content-faq, content-blog-grid
DATA: data-stats, data-stats-split, data-progress, data-timeline
SOCIAL-PROOF: testimonials-cards, testimonials-carousel, social-proof-banner, social-proof-marquee
PRICING: pricing-2tier, pricing-3tier
CTA: cta-banner, cta-split, cta-newsletter, cta-fullscreen
INTERACTIVE: interactive-contact, interactive-map
FOOTER: footer-minimal, footer-columns, footer-big

Verfuegbare Animationen:
fade-up, fade-in, slide-left, slide-right, scale-in, stagger, parallax, scroll-reveal, clip-reveal, counter, marquee, none

REGELN:
- Extrahiere ECHTE Farben aus dem Screenshot/der URL (annaeherungsweise Hex-Werte)
- Erkenne die verwendeten Fonts (oder schlage aehnliche Google Fonts vor)
- Identifiziere alle sichtbaren Sektionen und ordne sie den Pattern-IDs zu
- Schreibe eine kurze Design-Analyse in "notes"
- Antworte auf DEUTSCH
- IMMER das JSON ausgeben, auch wenn du unsicher bist — dann mit besten Schaetzungen

Nach dem JSON-Block kannst du eine kurze Erklaerung auf Deutsch geben.`;
  }

  // Chat mode — conversational design
  return `Du bist der Design-Berater von D3 Studio. Du hilfst dem Nutzer sein Design-System zu entwickeln und zu verfeinern.
Der Nutzer beschreibt was er will, und du aktualisierst den Design Brief.

AKTUELLER DESIGN BRIEF:
${briefJson}

VERFUEGBARE PATTERN-IDs:
NAVIGATION: navbar-minimal, navbar-centered, navbar-transparent
HERO: hero-centered, hero-split, hero-fullbleed, hero-video, hero-minimal, hero-editorial, hero-product
FEATURES: features-3col, features-bento, features-bento-advanced, features-alternating, features-list, features-icons-grid
SHOWCASE: showcase-product, showcase-gallery, showcase-comparison, showcase-service-cards, showcase-case-studies
CONTENT: content-text, content-big-text, content-image-text, content-logo-wall, content-marquee, content-team, content-faq, content-blog-grid
DATA: data-stats, data-stats-split, data-progress, data-timeline
SOCIAL-PROOF: testimonials-cards, testimonials-carousel, social-proof-banner, social-proof-marquee
PRICING: pricing-2tier, pricing-3tier
CTA: cta-banner, cta-split, cta-newsletter, cta-fullscreen
INTERACTIVE: interactive-contact, interactive-map
FOOTER: footer-minimal, footer-columns, footer-big

VERFUEGBARE ANIMATIONEN:
fade-up, fade-in, slide-left, slide-right, scale-in, stagger, parallax, scroll-reveal, clip-reveal, counter, marquee, none

DEIN VERHALTEN:
1. Hoere dem Nutzer zu und verstehe was er aendern will
2. Aktualisiere den Brief entsprechend
3. Erklaere kurz was du geaendert hast und warum

AUSGABEFORMAT:
Wenn du den Brief aenderst, gib das Update als JSON in einem \`\`\`json ... \`\`\` Block aus.
Du musst NUR die Felder angeben die sich aendern (partielles Update):

\`\`\`json
{
  "colors": { "primary": "#neuefarbe" },
  "style": { "mood": "neuer-stil" },
  "sections": [...]
}
\`\`\`

Wenn "sections" angegeben wird, ersetze die GESAMTE sections-Liste (nicht mergen).
Alle anderen Felder werden gemergt (nur die angegebenen Keys werden ueberschrieben).

Wenn der Nutzer nichts am Brief aendern will (z.B. nur eine Frage stellt), gib KEIN JSON aus.

REGELN:
- Antworte IMMER auf Deutsch
- Sei kreativ und opinionated — schlage spezifische Farben, Fonts, Layouts vor
- Erklaere WARUM du bestimmte Design-Entscheidungen triffst (Farb-Theorie, UX-Prinzipien)
- Wenn der Nutzer sagt "wie X" (z.B. "wie Stripe"), orientiere dich am Stil dieser Marke
- Nutze nur die verfuegbaren Pattern-IDs und Animationen
- Halte deine Antworten kurz und praegnant (max 3-4 Absaetze)
- Jede Section braucht: patternId, label, description, animation`;
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY fehlt." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Ungültiger Request-Body." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages, currentBrief, model, mode } = body;

  if (!messages || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "Keine Nachrichten." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const systemPrompt = buildDesignSystemPrompt(currentBrief, mode || "chat");

  // Prepare messages for Anthropic
  const anthropicMessages = messages.map((msg) => {
    if (msg.images && msg.images.length > 0 && msg.role === "user") {
      const contentBlocks: Array<
        | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
        | { type: "text"; text: string }
      > = [];

      for (const img of msg.images) {
        contentBlocks.push({
          type: "image",
          source: { type: "base64", media_type: img.mediaType, data: img.data },
        });
      }

      if (msg.content) {
        contentBlocks.push({ type: "text", text: msg.content });
      }

      return { role: msg.role, content: contentBlocks };
    }

    return { role: msg.role, content: msg.content };
  });

  const selectedModel = model?.trim() || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const anthropicResponse = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify({
      model: selectedModel,
      max_tokens: 8192,
      temperature: 0.6,
      stream: true,
      system: [{
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      }],
      messages: anthropicMessages,
    }),
  });

  if (!anthropicResponse.ok) {
    const errorText = await anthropicResponse.text();
    return new Response(
      JSON.stringify({ error: `API Fehler (${anthropicResponse.status}): ${errorText.slice(0, 300)}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const anthropicBody = anthropicResponse.body;
  if (!anthropicBody) {
    return new Response(
      JSON.stringify({ error: "Kein Stream." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Stream SSE back
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = anthropicBody.getReader();
      try {
        let buffer = "";
        let sentDone = false;

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
              const event = JSON.parse(jsonStr) as {
                type?: string;
                delta?: { type?: string; text?: string };
              };

              if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta" &&
                typeof event.delta.text === "string"
              ) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "delta", text: event.delta.text })}\n\n`)
                );
              }

              if (event.type === "message_stop" && !sentDone) {
                sentDone = true;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
                );
              }
            } catch { /* skip */ }
          }
        }

        if (!sentDone) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stream-Fehler";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`));
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
