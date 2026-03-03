import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { requireApiUser } from "@/lib/server/api-auth";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Server-side: prefer service role key (bypasses RLS), fall back to anon key
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY !== "your-service-role-key-here"
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

const GET_DEFAULT_LIMIT = 200;
const GET_MAX_LIMIT = 1000;
const WRITE_BATCH_SIZE = 8;
const MAX_FILES_PER_REQUEST = 200;
const MAX_FILE_PATH_LENGTH = 240;
const MAX_FILE_CONTENT_CHARS = 500_000;

export interface FileRecord {
  id: string;
  project_id: string | null;
  file_name: string;
  content: string;
  version: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface InputFile {
  path: string;
  content: string;
}

function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^\.\//, "");
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function parseFiles(payload: unknown): InputFile[] | null {
  if (!Array.isArray(payload)) return null;
  const parsed: InputFile[] = [];
  for (const file of payload) {
    if (
      !file ||
      typeof file !== "object" ||
      typeof (file as { path?: unknown }).path !== "string" ||
      typeof (file as { content?: unknown }).content !== "string"
    ) {
      return null;
    }
    parsed.push({
      path: (file as { path: string }).path,
      content: (file as { content: string }).content,
    });
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, RATE_LIMITS.STANDARD);
  if (limited) return limited;
  const auth = await requireApiUser(request);
  if (auth.response) return auth.response;

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const pathPrefixRaw = searchParams.get("path_prefix");
  const limit = Math.min(
    Math.max(parsePositiveInt(searchParams.get("limit"), GET_DEFAULT_LIMIT), 1),
    GET_MAX_LIMIT
  );
  const offset = parsePositiveInt(searchParams.get("offset"), 0);

  const normalizedPrefix =
    pathPrefixRaw && pathPrefixRaw.trim()
      ? normalizePath(pathPrefixRaw.trim())
      : null;

  if (normalizedPrefix && normalizedPrefix.length > MAX_FILE_PATH_LENGTH) {
    return NextResponse.json(
      { error: `path_prefix zu lang (max ${MAX_FILE_PATH_LENGTH} Zeichen)` },
      { status: 400 }
    );
  }

  let query = supabase
    .from("project_memory")
    .select("id, project_id, file_name, content, version, updated_by, created_at, updated_at")
    .order("file_name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  if (normalizedPrefix) {
    query = query.like("file_name", `${normalizedPrefix}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    files: data ?? [],
    pagination: { limit, offset },
  });
}

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, RATE_LIMITS.STANDARD);
  if (limited) return limited;
  const auth = await requireApiUser(request);
  if (auth.response) return auth.response;

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const actorId = auth.user?.id ?? "vibe-coding";

  try {
    const body = (await request.json()) as {
      project_id?: string | null;
      files?: unknown;
    };
    const projectId = body.project_id ?? null;
    const parsedFiles = parseFiles(body.files);

    if (!parsedFiles) {
      return NextResponse.json(
        { error: "files array required (shape: [{ path, content }])" },
        { status: 400 }
      );
    }

    if (parsedFiles.length === 0) {
      return NextResponse.json({ success: true, written: 0, files: [] });
    }

    if (parsedFiles.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Zu viele Dateien auf einmal (max ${MAX_FILES_PER_REQUEST})` },
        { status: 413 }
      );
    }

    // Deduplicate by path: latest occurrence wins.
    const deduped = new Map<string, string>();
    for (const file of parsedFiles) {
      const normalizedPath = normalizePath(file.path.trim());
      if (!normalizedPath) continue;
      if (normalizedPath.length > MAX_FILE_PATH_LENGTH) {
        return NextResponse.json(
          { error: `Pfad zu lang: ${normalizedPath}` },
          { status: 400 }
        );
      }
      if (file.content.length > MAX_FILE_CONTENT_CHARS) {
        return NextResponse.json(
          {
            error: `Datei zu groß (${normalizedPath}) — max ${MAX_FILE_CONTENT_CHARS} Zeichen`,
          },
          { status: 413 }
        );
      }
      deduped.set(normalizedPath, file.content);
    }

    const normalizedFiles = Array.from(deduped.entries()).map(([path, content]) => ({
      path,
      content,
    }));

    if (normalizedFiles.length === 0) {
      return NextResponse.json({
        success: true,
        written: 0,
        skipped: parsedFiles.length,
        files: [],
      });
    }

    const paths = normalizedFiles.map((f) => f.path);
    let existingQuery = supabase
      .from("project_memory")
      .select("id, file_name, version")
      .in("file_name", paths);

    if (projectId) {
      existingQuery = existingQuery.eq("project_id", projectId);
    } else {
      existingQuery = existingQuery.is("project_id", null);
    }

    const { data: existingRows, error: existingError } = await existingQuery;
    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const existingByPath = new Map(
      (existingRows ?? []).map((row) => [
        row.file_name as string,
        { id: row.id as string, version: (row.version as number | null) ?? 1 },
      ])
    );

    const now = new Date().toISOString();
    const results: FileRecord[] = [];
    const failed: Array<{ path: string; reason: string }> = [];

    for (let i = 0; i < normalizedFiles.length; i += WRITE_BATCH_SIZE) {
      const batch = normalizedFiles.slice(i, i + WRITE_BATCH_SIZE);
      await Promise.all(
        batch.map(async (file) => {
          const existing = existingByPath.get(file.path);

          if (existing) {
            const { data: updated, error: updateError } = await supabase
              .from("project_memory")
              .update({
                content: file.content,
                version: existing.version + 1,
                updated_at: now,
                updated_by: actorId,
              })
              .eq("id", existing.id)
              .select("id, project_id, file_name, content, version, updated_by, created_at, updated_at")
              .single();

            if (updateError) {
              failed.push({ path: file.path, reason: updateError.message });
              return;
            }
            if (updated) results.push(updated as FileRecord);
            return;
          }

          const { data: inserted, error: insertError } = await supabase
            .from("project_memory")
            .insert({
              project_id: projectId,
              file_name: file.path,
              content: file.content,
              version: 1,
              updated_by: actorId,
            })
            .select("id, project_id, file_name, content, version, updated_by, created_at, updated_at")
            .single();

          if (insertError) {
            failed.push({ path: file.path, reason: insertError.message });
            return;
          }
          if (inserted) results.push(inserted as FileRecord);
        })
      );
    }

    return NextResponse.json({
      success: failed.length === 0,
      written: results.length,
      failed,
      files: results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const limited = checkRateLimit(request, RATE_LIMITS.STANDARD);
  if (limited) return limited;
  const auth = await requireApiUser(request);
  if (auth.response) return auth.response;

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const fileNameRaw = searchParams.get("file_name");

  if (!fileNameRaw) {
    return NextResponse.json({ error: "file_name required" }, { status: 400 });
  }

  const fileName = normalizePath(fileNameRaw.trim());
  if (!fileName) {
    return NextResponse.json({ error: "file_name invalid" }, { status: 400 });
  }
  if (fileName.length > MAX_FILE_PATH_LENGTH) {
    return NextResponse.json(
      { error: `file_name zu lang (max ${MAX_FILE_PATH_LENGTH} Zeichen)` },
      { status: 400 }
    );
  }

  let query = supabase.from("project_memory").delete().eq("file_name", fileName);

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  const { data, error } = await query.select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: data?.length ?? 0 });
}
