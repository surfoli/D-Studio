import { NextRequest } from "next/server";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function buildPlanSystemPrompt(): string {
  return [
    "Du bist ein erfahrener Web-Stratege und Projektplaner.",
    "Erstelle einen strukturierten Projektplan als Markdown-Dokument.",
    "Der Plan soll folgende Abschnitte enthalten (passe an das Projekt an):",
    "",
    "# [Projektname]",
    "",
    "## Projektziel",
    "Kurze Beschreibung des Projekts und seiner Ziele.",
    "",
    "## Zielgruppe",
    "Wer sind die Nutzer?",
    "",
    "## Seitenstruktur",
    "Welche Seiten und Sektionen werden benötigt.",
    "",
    "## Kernbotschaften",
    "Was soll die Website kommunizieren?",
    "",
    "## Design-Richtung",
    "Stil, Farben, Ton, Typografie-Empfehlungen.",
    "",
    "## Content-Strategie",
    "Welche Inhalte werden benötigt.",
    "",
    "## Technische Anforderungen",
    "Block-Typen, Funktionen, Besonderheiten.",
    "",
    "## Nächste Schritte",
    "Konkrete Handlungsschritte.",
    "",
    "Schreibe den Plan auf Deutsch. Sei konkret und handlungsorientiert.",
    "Nutze Markdown-Formatierung: Überschriften, Aufzählungen, etc.",
    "Antworte NUR mit dem Markdown-Dokument, keine Erklärungen davor oder danach.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY fehlt." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { prompt?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Ungültiger Body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const prompt = (body.prompt ?? "").trim();
  if (prompt.length < 6) {
    return new Response(JSON.stringify({ error: "Prompt zu kurz." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const model = body.model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

  const anthropicResponse = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      temperature: 0.7,
      system: buildPlanSystemPrompt(),
      messages: [
        {
          role: "user",
          content: `Erstelle einen Projektplan für:\n\n${prompt}`,
        },
      ],
    }),
  });

  if (!anthropicResponse.ok) {
    const err = await anthropicResponse.text();
    return new Response(
      JSON.stringify({ error: `Anthropic Fehler: ${err.slice(0, 200)}` }),
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
              if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) {
                fullText += ev.delta.text;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "delta", text: ev.delta.text })}\n\n`)
                );
              }
            } catch { /* skip */ }
          }
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done", content: fullText })}\n\n`)
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Fehler";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: msg })}\n\n`)
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
