import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
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

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  let query = supabase
    .from("project_memory")
    .select("*")
    .order("file_name", { ascending: true });

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ files: data ?? [] });
}

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { project_id, files } = body as {
      project_id: string | null;
      files: Array<{ path: string; content: string }>;
    };

    if (!files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: "files array required" },
        { status: 400 }
      );
    }

    const results: FileRecord[] = [];

    for (const file of files) {
      const normalizedPath = file.path
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/^\.\//, "");

      if (!normalizedPath) continue;

      const existingQuery = project_id
        ? supabase.from("project_memory").select("id, version").eq("file_name", normalizedPath).eq("project_id", project_id)
        : supabase.from("project_memory").select("id, version").eq("file_name", normalizedPath).is("project_id", null);

      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from("project_memory")
          .update({
            content: file.content,
            version: (existing.version ?? 1) + 1,
            updated_at: new Date().toISOString(),
            updated_by: "vibe-coding",
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (updateError) {
          console.error("Update error:", updateError);
          continue;
        }
        if (updated) results.push(updated);
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("project_memory")
          .insert({
            project_id: project_id || null,
            file_name: normalizedPath,
            content: file.content,
            version: 1,
            updated_by: "vibe-coding",
          })
          .select()
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
          continue;
        }
        if (inserted) results.push(inserted);
      }
    }

    return NextResponse.json({
      success: true,
      written: results.length,
      files: results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const fileName = searchParams.get("file_name");

  if (!fileName) {
    return NextResponse.json(
      { error: "file_name required" },
      { status: 400 }
    );
  }

  let query = supabase.from("project_memory").delete().eq("file_name", fileName);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
