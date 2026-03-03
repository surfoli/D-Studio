import { NextRequest } from "next/server";
import { buildVibeCodeSystemPrompt, buildFileContext, type VibeCodeFile, type ChatLanguage, type ChatRoleId, type UserLevelId, type ChatMode } from "@/lib/vibe-code";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// Claude's context window is 200k tokens. Reserve space for output + safety margin.
const MAX_INPUT_TOKENS = 150_000;
const CHARS_PER_TOKEN = 4; // conservative estimate

/** Rough token estimate based on character count */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Estimate tokens for a message (handles string and content-block arrays) */
function estimateMessageTokens(msg: { role: string; content: unknown }): number {
  if (typeof msg.content === "string") return estimateTokens(msg.content);
  if (Array.isArray(msg.content)) {
    let total = 0;
    for (const block of msg.content) {
      if (block && typeof block === "object") {
        if ("text" in block && typeof block.text === "string") total += estimateTokens(block.text);
        // images: ~1600 tokens per image as rough estimate
        if ("type" in block && block.type === "image") total += 1600;
      }
    }
    return total;
  }
  return 0;
}

/**
 * Strip ===FILE: ...===END=== blocks from assistant messages to save tokens.
 * Keeps the explanation text so conversation context is preserved.
 */
function compressAssistantMessage(content: string): string {
  // Remove file content blocks but keep a short placeholder
  return content.replace(
    /===FILE:\s*(.+?)===\n[\s\S]*?===END===/g,
    (_match, path: string) => `[File written: ${path.trim()}]`
  );
}

/**
 * Truncate conversation to fit within token budget.
 * Strategy:
 * 1. Always keep the last message (current user request)
 * 2. Compress old assistant messages (strip file blocks)
 * 3. Drop oldest messages if still over budget
 */
function truncateMessages(
  messages: Array<{ role: string; content: unknown }>,
  systemTokens: number,
): Array<{ role: string; content: unknown }> {
  const budget = MAX_INPUT_TOKENS - systemTokens;
  if (budget <= 0) return messages.slice(-1); // extreme case: just keep last msg

  // Step 1: Compress old assistant messages (all except the last message)
  const compressed = messages.map((msg, i) => {
    if (i < messages.length - 1 && msg.role === "assistant" && typeof msg.content === "string") {
      return { ...msg, content: compressAssistantMessage(msg.content) };
    }
    return msg;
  });

  // Step 2: Check if everything fits
  let totalTokens = compressed.reduce((sum, m) => sum + estimateMessageTokens(m), 0);
  if (totalTokens <= budget) return compressed;

  // Step 3: Drop oldest messages until we fit (always keep last message)
  const result = [...compressed];
  while (result.length > 1 && totalTokens > budget) {
    const removed = result.shift()!;
    totalTokens -= estimateMessageTokens(removed);
    // Ensure conversation starts with a user message (Anthropic requirement)
    while (result.length > 1 && result[0].role === "assistant") {
      const skipped = result.shift()!;
      totalTokens -= estimateMessageTokens(skipped);
    }
  }

  return result;
}

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
  chatMode?: string;
  openFiles?: string[];
  errorFiles?: string[];
  runtimeContext?: {
    terminal?: string;
    previewUrl?: string;
    sandboxStatus?: string;
    designBrief?: string;
    planContext?: string;
    historyContext?: string;
  };
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.STANDARD_AI);
  if (limited) return limited;

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

  const { messages, currentFiles, model, language, roles, userLevel, customLevelPrompt, chatMode, openFiles, errorFiles, runtimeContext } = body;

  if (!messages || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "Keine Nachrichten im Request." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const activeRoles = (roles && roles.length > 0 ? roles : ["developer", "designer"]) as ChatRoleId[];
  const level = (userLevel || "beginner") as UserLevelId;

  const mode = (chatMode === "plan" ? "plan" : "code") as ChatMode;

  let systemPrompt = buildVibeCodeSystemPrompt(
    (language as ChatLanguage) || "de",
    activeRoles,
    level,
    customLevelPrompt,
    mode,
  );

  if (currentFiles && currentFiles.length > 0) {
    systemPrompt += "\n\n" + buildFileContext(currentFiles, openFiles, errorFiles);
  }

  // Inject runtime context so AI is aware of terminal errors, preview status, sandbox state
  if (runtimeContext) {
    let ctx = "\n\nRUNTIME CONTEXT (current state of the user's environment — use this to diagnose issues):";
    if (runtimeContext.sandboxStatus) {
      ctx += `\n- Sandbox Status: ${runtimeContext.sandboxStatus}`;
    }
    if (runtimeContext.previewUrl && runtimeContext.previewUrl !== "none") {
      ctx += `\n- Preview URL: ${runtimeContext.previewUrl}`;
    } else {
      ctx += "\n- Preview: NOT running";
    }
    if (runtimeContext.terminal) {
      ctx += `\n- Terminal Output (last lines):\n\`\`\`\n${runtimeContext.terminal}\n\`\`\``;
      // Check for common error patterns and add AUTO-FIX instructions
      const term = runtimeContext.terminal.toLowerCase();
      if (term.includes("prisma") || term.includes("database") || term.includes("postgresql") || term.includes("pg_hba")) {
        ctx += `\n\nDATABASE ERROR DETECTED:
The E2B sandbox has NO running database. BEFORE fixing anything, ASK the user which option they prefer:

**Option A — Externe DB verbinden**
"Hast du eine bestehende Datenbank (z.B. Supabase, PlanetScale, Neon)? Wenn ja, gib mir die Connection-URL und ich verbinde sie."

**Option B — Mock-Daten für Preview**
"Soll ich realistische Test-Daten generieren damit die Preview funktioniert? Die echte DB-Anbindung bleibt erhalten."

**Option C — SQLite lokal**
"Soll ich auf SQLite umstellen? Funktioniert ohne externen Server in der Sandbox."

Present these options clearly and wait for the user's choice. Do NOT auto-generate mock data without asking.
If the user says they have data in Supabase, help them connect by setting the DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable in the project.`;
      }
      if (term.includes("module not found") || term.includes("cannot find module")) {
        ctx += `\n\nMISSING MODULE DETECTED:
Identify the missing module from the error. Then:
- If it's a wrong import path: fix it immediately (output the corrected file)
- If it's a missing npm package: tell the user which package is missing and offer to add it to package.json`;
      }
      if (term.includes("/500") || term.includes("500 internal") || term.includes("error 500")) {
        ctx += `\n\nSERVER 500 ERROR DETECTED:
Analyze the error stack trace. Then:
1. Explain what's causing the 500 error (be specific — file name, line, root cause)
2. If it's a simple code bug (syntax, wrong import, missing variable): fix it immediately
3. If it's a missing external service (DB, API, etc.): ask the user how they want to handle it (connect real service vs. mock)`;
      }
      if (term.includes("syntaxerror") || term.includes("unexpected token")) {
        ctx += `\n\nSYNTAX ERROR DETECTED:
Find the file and line from the error, fix the syntax immediately, and output the corrected file using ===FILE: path=== markers.`;
      }
    }
    if (runtimeContext.designBrief) {
      ctx += `\n\n${runtimeContext.designBrief}`;
    }
    if (runtimeContext.planContext) {
      ctx += `\n\nPLAN MODE CONTEXT:\n${runtimeContext.planContext}`;
    }
    if (runtimeContext.historyContext) {
      ctx += `\n\n${runtimeContext.historyContext}`;
    }
    ctx += `\n\nCRITICAL BEHAVIOR:
- When you detect errors, ALWAYS give a specific diagnosis based on the actual error messages in the terminal.
- For simple bugs (syntax, imports, typos): fix them immediately by outputting corrected files.
- For architectural issues (missing DB, missing API, missing env vars): EXPLAIN the problem and ASK the user how they want to solve it. Offer 2-3 clear options.
- Use ===FILE: path=== ... ===END=== markers for every file you fix so changes get applied automatically.
- Be specific: reference actual error messages, actual file names from the terminal output.
- NEVER ask generic questions like "Was funktioniert nicht?" when errors are clearly visible in the terminal.
- ONLY output files that are directly needed to fix the problem. Do NOT output .d3/ documentation files unless the user explicitly asks for them.
- Do NOT create new files that don't already exist unless absolutely necessary for a fix. Focus on modifying existing files only.
- Keep your response SHORT and focused. Fix the actual error, explain briefly, done.`;
    systemPrompt += ctx;
  }

  // Estimate system prompt tokens and truncate conversation to fit within limits
  const systemTokens = estimateTokens(systemPrompt);
  const truncatedMessages = truncateMessages(
    messages.map((msg) => ({ role: msg.role, content: msg.content, images: msg.images })),
    systemTokens,
  ) as RequestMessage[];

  // Prepare messages for Anthropic (support image content blocks)
  const anthropicMessages = truncatedMessages.map((msg) => {
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
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify({
      model: selectedModel,
      max_tokens: 32768,
      temperature: mode === "plan" ? 0.7 : 0.3,
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
