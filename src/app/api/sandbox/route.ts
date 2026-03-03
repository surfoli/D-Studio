import { NextRequest, NextResponse } from "next/server";
import { sandboxManager } from "@/lib/sandbox/e2b-manager";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

interface SandboxRequestBody {
  action: "create" | "exec" | "kill" | "write" | "read" | "install" | "dev";
  projectId: string;
  cmd?: string;
  files?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.STANDARD);
  if (limited) return limited;

  let body: SandboxRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request Body" }, { status: 400 });
  }

  const { action, projectId, cmd, files } = body;

  if (!projectId) {
    return NextResponse.json({ error: "projectId fehlt" }, { status: 400 });
  }

  try {
    switch (action) {
      case "create": {
        await sandboxManager.getOrCreate(projectId);
        const status = sandboxManager.getStatus(projectId);
        return NextResponse.json({ status, message: "Sandbox bereit" });
      }

      case "write": {
        if (!files || Object.keys(files).length === 0) {
          return NextResponse.json({ error: "files fehlen" }, { status: 400 });
        }
        await sandboxManager.writeFiles(projectId, files);
        return NextResponse.json({ success: true, written: Object.keys(files).length });
      }

      case "read": {
        const readFiles = await sandboxManager.readFiles(projectId);
        return NextResponse.json({ files: readFiles });
      }

      case "install": {
        const logs: string[] = [];
        const result = await sandboxManager.install(projectId, (line) => logs.push(line));
        return NextResponse.json({
          exitCode: result.exitCode,
          output: result.output,
          logs,
        });
      }

      case "exec": {
        if (!cmd) {
          return NextResponse.json({ error: "cmd fehlt" }, { status: 400 });
        }
        const logs: string[] = [];
        const result = await sandboxManager.exec(projectId, cmd, (line) => logs.push(line));
        return NextResponse.json({
          exitCode: result.exitCode,
          output: result.output,
          logs,
        });
      }

      case "dev": {
        const { url } = await sandboxManager.startDevServer(projectId);
        return NextResponse.json({ url, status: "running" });
      }

      case "kill": {
        await sandboxManager.kill(projectId);
        return NextResponse.json({ success: true, message: "Sandbox beendet" });
      }

      default:
        return NextResponse.json({ error: `Unbekannte Action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error(`Sandbox Error [${action}]:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.FREQUENT);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId fehlt" }, { status: 400 });
  }

  try {
    const { running, url } = await sandboxManager.isRunning(projectId);
    return NextResponse.json({ running, url, status: sandboxManager.getStatus(projectId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return NextResponse.json({ running: false, url: null, error: message });
  }
}

export async function DELETE(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.STANDARD_AI);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId fehlt" }, { status: 400 });
  }

  try {
    await sandboxManager.kill(projectId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
