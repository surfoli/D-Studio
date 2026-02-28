import { NextRequest } from "next/server";
import { buildVibeCodeSystemPrompt, buildFileContext, type VibeCodeFile, type ChatLanguage, type ChatRoleId, type UserLevelId } from "@/lib/vibe-code";

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
  currentFiles?: VibeCodeFile[];
  model?: string;
  language?: string;
  roles?: string[];
  userLevel?: string;
  customLevelPrompt?: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY fehlt. Bitte in .env.local setzen." }),
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

  const { messages, currentFiles, model, language, roles, userLevel, customLevelPrompt } = body;

  if (!messages || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "Keine Nachrichten im Request." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const activeRoles = (roles && roles.length > 0 ? roles : ["developer", "designer"]) as ChatRoleId[];
  const level = (userLevel || "beginner") as UserLevelId;

  let systemPrompt = buildVibeCodeSystemPrompt(
    (language as ChatLanguage) || "de",
    activeRoles,
    level,
    customLevelPrompt,
  );

  if (currentFiles && currentFiles.length > 0) {
    systemPrompt += "\n\n" + buildFileContext(currentFiles);
  }

  // Prepare messages for Anthropic (support image content blocks)
  const anthropicMessages = messages.map((msg) => {
    // If message has images, build a content array with image + text blocks
    if (msg.images && msg.images.length > 0 && msg.role === "user") {
      const contentBlocks: Array<
        | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
        | { type: "text"; text: string }
      > = [];

      for (const img of msg.images) {
        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: img.mediaType,
            data: img.data,
          },
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
    },
    body: JSON.stringify({
      model: selectedModel,
      max_tokens: 32768,
      temperature: 0.3,
      stream: true,
      system: systemPrompt,
      messages: anthropicMessages,
    }),
  });

  if (!anthropicResponse.ok) {
    const errorText = await anthropicResponse.text();
    return new Response(
      JSON.stringify({
        error: `Anthropic API Fehler (${anthropicResponse.status}): ${errorText.slice(0, 300)}`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const anthropicBody = anthropicResponse.body;
  if (!anthropicBody) {
    return new Response(
      JSON.stringify({ error: "Kein Stream vom API erhalten." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Stream the response back to the client
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
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "delta", text: event.delta.text })}\n\n`
                  )
                );
              }

              if (event.type === "message_stop" && !sentDone) {
                sentDone = true;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
                );
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }

        // Ensure we send a done event (only if not already sent)
        if (!sentDone) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stream-Fehler";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`)
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
