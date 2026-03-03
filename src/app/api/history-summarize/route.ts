import { NextRequest } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

interface RequestBody {
  userPrompt: string;
  aiResponse: string;
  filesChanged: { path: string; action: string }[];
  mode: "plan" | "design" | "build";
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.STANDARD_AI);
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

  const { userPrompt, aiResponse, filesChanged, mode } = body;

  const fileList = filesChanged.map(f => `${f.action}: ${f.path}`).join("\n");

  const prompt = `Du bist der History-Dokumentar von D3 Studio. Fasse diese AI-Interaktion als History-Eintrag zusammen.

USER PROMPT:
${userPrompt.slice(0, 500)}

AI RESPONSE (gekürzt):
${aiResponse.slice(0, 2000)}

GEÄNDERTE DATEIEN:
${fileList || "Keine Dateien geändert"}

MODUS: ${mode}

Antworte NUR mit diesem JSON-Format (kein anderer Text):
\`\`\`json
{
  "title": "Kurzer Titel (max 60 Zeichen, deutsch)",
  "summary": "Was wurde gemacht? 1-3 Sätze. Konkret, nicht vage.",
  "beginnerExplanation": "Erkläre einem Anfänger was hier passiert ist und warum. Verwende Alltagssprache, keine Fachbegriffe. 2-4 Sätze.",
  "tags": ["max", "3", "tags"]
}
\`\`\``;

  try {
    // Use Haiku for speed & cost — this is a simple summarization task
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 512,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `Anthropic ${response.status}: ${errText.slice(0, 200)}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json() as {
      content?: Array<{ type: string; text?: string }>;
    };

    const text = data.content?.[0]?.text ?? "";

    // Extract JSON from ```json ... ``` block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) {
      // Try parsing the whole response as JSON
      try {
        const parsed = JSON.parse(text);
        return new Response(JSON.stringify(parsed), {
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        return new Response(
          JSON.stringify({
            title: userPrompt.slice(0, 60),
            summary: aiResponse.slice(0, 150),
            beginnerExplanation: "",
            tags: [mode],
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const parsed = JSON.parse(jsonMatch[1]);
    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // Fallback: create a basic entry without AI
    return new Response(
      JSON.stringify({
        title: userPrompt.slice(0, 60),
        summary: `${filesChanged.length} Dateien geändert im ${mode}-Modus.`,
        beginnerExplanation: "",
        tags: [mode],
        error: (err as Error).message,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}
