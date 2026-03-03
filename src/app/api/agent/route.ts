import { NextRequest } from "next/server";
import { sandboxManager } from "@/lib/sandbox/e2b-manager";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  buildAgentSystemPrompt,
  buildAgentFixPrompt,
  buildFileContext,
  parseVibeCodeResponse,
  type VibeCodeFile,
  type ChatLanguage,
} from "@/lib/vibe-code";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MAX_ITERATIONS = 3;

// ── SSE helper ──
function sse(event: Record<string, unknown>): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// ── Call Anthropic and collect full response ──
async function callClaude(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  model: string,
  apiKey: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify({
      model,
      max_tokens: 32768,
      temperature: 0.2,
      stream: true,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const body = res.body;
  if (!body) throw new Error("No stream from Anthropic");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";

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
          accumulated += event.delta.text;
          // Forward streaming text to client
          controller.enqueue(encoder.encode(sse({ type: "delta", text: event.delta.text })));
        }
      } catch {
        // skip malformed
      }
    }
  }

  return accumulated;
}

// ── POST /api/agent ──
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // Agent loop is expensive — stricter limit (5 runs/min)
  if (!rateLimit(ip, { limit: 5, windowMs: 60_000 })) {
    return new Response(
      JSON.stringify({ error: "Zu viele Agent-Anfragen. Bitte warte eine Minute." }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY fehlt." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: {
    projectId: string;
    files: VibeCodeFile[];
    prompt?: string;
    model?: string;
    language?: string;
    maxIterations?: number;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Ungültiger Request Body." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { projectId, files, prompt, model, language, maxIterations } = body;
  if (!projectId) {
    return new Response(
      JSON.stringify({ error: "projectId fehlt." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const selectedModel = model?.trim() || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const lang = (language || "de") as ChatLanguage;
  const iterations = Math.min(maxIterations || MAX_ITERATIONS, 5);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // ── Phase 1: READ PLAN ──
        controller.enqueue(encoder.encode(sse({
          type: "phase", phase: "plan", iteration: 0,
          message: "Lese Projektplan...",
        })));

        const d3Files = files.filter(f => f.path.startsWith(".d3/"));
        const codeFiles = files.filter(f => !f.path.startsWith(".d3/"));

        const fileContext = buildFileContext(files);
        const systemPrompt = buildAgentSystemPrompt(lang);

        // Build initial user message — from prompt (Cascade mode) or .d3/ files
        let buildInstruction = "";
        if (prompt) {
          // Cascade mode: free-form user prompt
          buildInstruction = `USER REQUEST:\n${prompt}\n\n`;
          buildInstruction += "Setze diese Anfrage um. Generiere alle nötigen Dateien mit ===FILE: path=== ... ===END=== Markern.\n";
        } else {
          buildInstruction = "Baue das komplette Projekt basierend auf der Spezifikation.\n\n";
        }
        if (d3Files.length > 0) {
          buildInstruction += "\n=== PROJEKT-SPEZIFIKATION (.d3/ Dateien) ===\n\n";
          for (const f of d3Files) {
            buildInstruction += `--- ${f.path} ---\n${f.content}\n\n`;
          }
        }
        if (codeFiles.length > 0) {
          buildInstruction += "\n=== BESTEHENDE CODE-DATEIEN ===\n\n";
          for (const f of codeFiles) {
            buildInstruction += `--- ${f.path} ---\n${f.content}\n\n`;
          }
          buildInstruction += "\nBerücksichtige bestehende Dateien. Überschreibe oder erweitere sie nach Bedarf.\n";
        }

        const conversationHistory: { role: "user" | "assistant"; content: string }[] = [
          { role: "user", content: buildInstruction },
        ];

        const allProjectFiles: Record<string, string> = {};
        let buildSuccess = false;
        let lastErrors = "";

        for (let iteration = 1; iteration <= iterations; iteration++) {
          // ── Phase 2: BUILD (generate code via Claude) ──
          controller.enqueue(encoder.encode(sse({
            type: "phase", phase: "build", iteration,
            message: iteration === 1
              ? `Generiere Code (Durchlauf ${iteration}/${iterations})...`
              : `Behebe Fehler (Durchlauf ${iteration}/${iterations})...`,
          })));

          const aiResponse = await callClaude(
            systemPrompt + "\n\n" + fileContext,
            conversationHistory,
            selectedModel,
            apiKey,
            controller,
            encoder,
          );

          // Add AI response to conversation history
          conversationHistory.push({ role: "assistant", content: aiResponse });

          // Parse file updates from AI response
          const { files: fileUpdates, explanation } = parseVibeCodeResponse(aiResponse);

          controller.enqueue(encoder.encode(sse({
            type: "files-parsed",
            count: fileUpdates.length,
            explanation: explanation.slice(0, 500),
            files: fileUpdates.map(f => ({ path: f.path, action: f.action })),
          })));

          // Send full file contents for frontend to apply
          for (const fu of fileUpdates) {
            controller.enqueue(encoder.encode(sse({
              type: "file-update",
              path: fu.path,
              content: fu.content,
              action: fu.action,
            })));
            allProjectFiles[fu.path] = fu.content;
          }

          // ── Phase 3: TEST (write to sandbox, install, build) ──
          controller.enqueue(encoder.encode(sse({
            type: "phase", phase: "test", iteration,
            message: "Teste Build im Sandbox...",
          })));

          try {
            // Create/reuse sandbox
            await sandboxManager.getOrCreate(projectId);

            // Write all project files to sandbox
            controller.enqueue(encoder.encode(sse({
              type: "terminal", text: `Schreibe ${Object.keys(allProjectFiles).length} Dateien...\n`,
            })));
            await sandboxManager.writeFiles(projectId, allProjectFiles);

            // npm install
            controller.enqueue(encoder.encode(sse({
              type: "terminal", text: "npm install...\n",
            })));

            // Detect project root (supports subdirectories)
            let projectRoot = "/home/user";
            try {
              const managed = await sandboxManager.getOrCreate(projectId);
              const findResult = await managed.sandbox.commands.run(
                "find /home/user -name 'package.json' -not -path '*/node_modules/*' -maxdepth 3 2>/dev/null",
                { timeoutMs: 5000 }
              );
              const pkgPaths = findResult.stdout.split("\n").map(p => p.trim()).filter(Boolean);
              for (const pkgPath of pkgPaths) {
                try {
                  const content = await managed.sandbox.files.read(pkgPath);
                  if (typeof content === "string") {
                    const pkg = JSON.parse(content);
                    if (pkg.scripts?.dev) {
                      projectRoot = pkgPath.replace(/\/package\.json$/, "");
                      break;
                    }
                  }
                } catch { /* skip */ }
              }
            } catch { /* fallback to /home/user */ }

            controller.enqueue(encoder.encode(sse({
              type: "terminal", text: `Projekt-Root: ${projectRoot}\n`,
            })));

            const installResult = await sandboxManager.exec(
              projectId,
              `cd ${projectRoot} && npm install 2>&1`,
              (line) => controller.enqueue(encoder.encode(sse({ type: "terminal", text: line }))),
              180000,
            );

            if (installResult.exitCode !== 0) {
              lastErrors = installResult.output.slice(-4000);
              controller.enqueue(encoder.encode(sse({
                type: "test-fail", iteration,
                message: `npm install fehlgeschlagen (Exit ${installResult.exitCode})`,
                errors: lastErrors.slice(0, 2000),
              })));

              // Add fix request to conversation
              conversationHistory.push({
                role: "user",
                content: buildAgentFixPrompt(lastErrors, iteration, lang),
              });
              continue;
            }

            // npm run build
            controller.enqueue(encoder.encode(sse({
              type: "terminal", text: "npm run build...\n",
            })));

            const buildResult = await sandboxManager.exec(
              projectId,
              `cd ${projectRoot} && npm run build 2>&1`,
              (line) => controller.enqueue(encoder.encode(sse({ type: "terminal", text: line }))),
              180000,
            );

            if (buildResult.exitCode !== 0) {
              lastErrors = buildResult.output.slice(-4000);
              controller.enqueue(encoder.encode(sse({
                type: "test-fail", iteration,
                message: `Build fehlgeschlagen (Exit ${buildResult.exitCode})`,
                errors: lastErrors.slice(0, 2000),
              })));

              if (iteration < iterations) {
                // Add fix request to conversation
                conversationHistory.push({
                  role: "user",
                  content: buildAgentFixPrompt(lastErrors, iteration, lang),
                });
                continue;
              } else {
                // Max iterations reached — try to start dev anyway
                controller.enqueue(encoder.encode(sse({
                  type: "terminal", text: "Max Durchläufe erreicht. Starte Dev Server trotzdem...\n",
                })));
              }
            } else {
              buildSuccess = true;
              controller.enqueue(encoder.encode(sse({
                type: "test-pass", iteration,
                message: "Build erfolgreich!",
              })));
            }

            // ── Start dev server ──
            controller.enqueue(encoder.encode(sse({
              type: "phase", phase: "dev-server", iteration,
              message: "Starte Dev Server...",
            })));

            try {
              const { url } = await sandboxManager.startDevServer(projectId, (line) => {
                controller.enqueue(encoder.encode(sse({ type: "terminal", text: line })));
              });

              controller.enqueue(encoder.encode(sse({
                type: "done",
                url,
                buildSuccess,
                iterations: iteration,
                fileCount: Object.keys(allProjectFiles).length,
                message: buildSuccess
                  ? `Projekt erfolgreich gebaut! ${Object.keys(allProjectFiles).length} Dateien in ${iteration} Durchlauf/Durchläufen.`
                  : `Dev Server gestartet (mit Build-Warnungen). ${Object.keys(allProjectFiles).length} Dateien.`,
              })));
            } catch (devErr) {
              controller.enqueue(encoder.encode(sse({
                type: "done",
                url: null,
                buildSuccess: false,
                iterations: iteration,
                fileCount: Object.keys(allProjectFiles).length,
                message: `Dev Server konnte nicht gestartet werden: ${(devErr as Error).message}`,
              })));
            }

            break; // Exit the iteration loop
          } catch (sandboxErr) {
            const errMsg = (sandboxErr as Error).message;
            controller.enqueue(encoder.encode(sse({
              type: "terminal", text: `Sandbox Fehler: ${errMsg}\n`,
            })));

            if (iteration >= iterations) {
              controller.enqueue(encoder.encode(sse({
                type: "done",
                url: null,
                buildSuccess: false,
                iterations: iteration,
                fileCount: Object.keys(allProjectFiles).length,
                message: `Agent Loop beendet mit Fehler: ${errMsg}`,
              })));
              break;
            }

            lastErrors = errMsg;
            conversationHistory.push({
              role: "user",
              content: buildAgentFixPrompt(lastErrors, iteration, lang),
            });
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unbekannter Fehler";
        controller.enqueue(encoder.encode(sse({ type: "error", error: message })));
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
