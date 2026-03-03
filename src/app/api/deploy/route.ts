import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const VERCEL_API = "https://api.vercel.com";

interface DeployRequest {
  projectName: string;
  files: { path: string; content: string }[];
  framework?: string;
  teamId?: string;
}

interface VercelFile {
  file: string;
  data: string;
  encoding: "utf-8" | "base64";
}

/**
 * Deploy files to Vercel using their REST API.
 *
 * Required env: VERCEL_TOKEN
 * Optional env: VERCEL_TEAM_ID
 *
 * POST body: { projectName, files: [{path, content}], framework?, teamId? }
 */
export async function POST(req: NextRequest) {
  // Deploys are expensive — strict limit
  const limited = checkRateLimit(req, { limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const token = process.env.VERCEL_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "VERCEL_TOKEN not set. Add it to .env.local" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as DeployRequest;
    const { projectName, files, framework = "nextjs", teamId } = body;

    if (!projectName || !files || files.length === 0) {
      return NextResponse.json(
        { error: "Missing projectName or files" },
        { status: 400 }
      );
    }

    // Convert files to Vercel format
    const vercelFiles: VercelFile[] = files
      .filter((f) => !f.path.includes("node_modules") && !f.path.startsWith(".next/"))
      .map((f) => ({
        file: f.path,
        data: f.content,
        encoding: "utf-8" as const,
      }));

    // Build query params
    const params = new URLSearchParams();
    if (teamId || process.env.VERCEL_TEAM_ID) {
      params.set("teamId", teamId || process.env.VERCEL_TEAM_ID || "");
    }

    const queryString = params.toString() ? `?${params.toString()}` : "";

    // Create deployment
    const deployRes = await fetch(`${VERCEL_API}/v13/deployments${queryString}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        files: vercelFiles,
        projectSettings: {
          framework,
          buildCommand: framework === "nextjs" ? "next build" : undefined,
          outputDirectory: framework === "nextjs" ? ".next" : undefined,
          installCommand: "npm install",
        },
        target: "production",
      }),
    });

    if (!deployRes.ok) {
      const errBody = await deployRes.text();
      console.error("Vercel deploy error:", errBody);
      return NextResponse.json(
        { error: `Vercel API error: ${deployRes.status}`, details: errBody },
        { status: 502 }
      );
    }

    const deployData = (await deployRes.json()) as {
      id: string;
      url: string;
      readyState: string;
      alias?: string[];
      meta?: Record<string, unknown>;
    };

    return NextResponse.json({
      id: deployData.id,
      url: `https://${deployData.url}`,
      readyState: deployData.readyState,
      aliases: deployData.alias || [],
    });
  } catch (error) {
    console.error("Deploy error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Deploy failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/deploy?id=xxx — Check deployment status
 */
export async function GET(req: NextRequest) {
  try {
    const token = process.env.VERCEL_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "VERCEL_TOKEN not set" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const deployId = searchParams.get("id");

    if (!deployId) {
      return NextResponse.json({ error: "Missing deployment id" }, { status: 400 });
    }

    const params = new URLSearchParams();
    if (process.env.VERCEL_TEAM_ID) {
      params.set("teamId", process.env.VERCEL_TEAM_ID);
    }
    const queryString = params.toString() ? `?${params.toString()}` : "";

    const statusRes = await fetch(
      `${VERCEL_API}/v13/deployments/${deployId}${queryString}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!statusRes.ok) {
      return NextResponse.json(
        { error: `Vercel API error: ${statusRes.status}` },
        { status: 502 }
      );
    }

    const data = (await statusRes.json()) as {
      id: string;
      url: string;
      readyState: string;
      alias?: string[];
    };

    return NextResponse.json({
      id: data.id,
      url: `https://${data.url}`,
      readyState: data.readyState,
      aliases: data.alias || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
