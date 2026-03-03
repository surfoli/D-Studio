import { NextRequest } from "next/server";
import { sandboxManager } from "@/lib/sandbox/e2b-manager";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Streaming boot endpoint: write files → install → dev in one SSE stream.
 * If sandbox is already running, performs a hot-update (write files only, reinstall if needed).
 * Avoids browser timeout issues by keeping the connection alive with status updates.
 */
export async function POST(req: NextRequest) {
  // Sandbox boot creates a full VM — very strict limit
  const limited = checkRateLimit(req, RATE_LIMITS.VERY_EXPENSIVE);
  if (limited) return limited;

  const { projectId, files } = await req.json() as {
    projectId: string;
    files: Record<string, string>;
  };

  if (!projectId || !files) {
    return new Response(JSON.stringify({ error: "projectId and files required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // Check if sandbox is already running — hot-update instead of full reboot
        const { running, url: existingUrl } = await sandboxManager.isRunning(projectId);

        if (running && existingUrl) {
          send({ step: "hot_update", message: "Sandbox läuft bereits — aktualisiere Dateien..." });
          const fileCount = Object.keys(files).length;

          try {
            const result = await sandboxManager.hotUpdate(
              projectId,
              files,
              (line) => {
                if (line.trim()) {
                  send({ step: "hot_update_log", message: line.trim() });
                }
              }
            );

            send({
              step: "done",
              message: result.reinstalled
                ? `${fileCount} Dateien aktualisiert, Pakete neu installiert.`
                : `${fileCount} Dateien aktualisiert (Hot Reload).`,
              url: result.url,
            });
            controller.close();
            return;
          } catch (hotErr) {
            // Hot update failed — fall through to full boot
            const msg = hotErr instanceof Error ? hotErr.message : "";
            send({ step: "hot_update_log", message: `Hot-Update fehlgeschlagen (${msg}), starte Sandbox neu...` });
          }
        }

        // Full boot path: create → write → install → dev
        send({ step: "create", message: "Sandbox wird erstellt..." });
        await sandboxManager.getOrCreate(projectId);

        const fileCount = Object.keys(files).length;
        send({ step: "write", message: `${fileCount} Dateien werden geschrieben...` });
        await sandboxManager.writeFiles(projectId, files);
        send({ step: "write_done", message: `${fileCount} Dateien geschrieben.` });

        send({ step: "install", message: "npm install läuft..." });
        const installResult = await sandboxManager.install(
          projectId,
          (line) => {
            if (line.trim()) {
              send({ step: "install_log", message: line.trim() });
            }
          }
        );
        send({
          step: "install_done",
          message: `Dependencies installiert (exit ${installResult.exitCode}).`,
        });

        send({ step: "dev", message: "Dev Server wird gestartet..." });
        const { url } = await sandboxManager.startDevServer(
          projectId,
          (line) => {
            if (line.trim()) {
              send({ step: "dev_log", message: line.trim() });
            }
          }
        );
        send({ step: "done", message: "Dev Server läuft!", url });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unbekannter Fehler";
        send({ step: "error", message });
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
