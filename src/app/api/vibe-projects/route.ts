import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { requireApiUser } from "@/lib/server/api-auth";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET /api/vibe-projects — list all vibe-coding projects
export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.STANDARD);
  if (limited) return limited;
  const auth = await requireApiUser(req);
  if (auth.response) return auth.response;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 501 });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, status, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: data ?? [] });
}

// POST /api/vibe-projects — create a new vibe-coding project
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.STANDARD);
  if (limited) return limited;
  const auth = await requireApiUser(req);
  if (auth.response) return auth.response;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 501 });
  }

  try {
    const body = await req.json();
    const { name } = body as { name: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name erforderlich." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: name.trim(),
        description: "Vibe-Coding Projekt",
        status: "building",
      })
      .select("id, name, description, status, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/vibe-projects — rename a project
export async function PATCH(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.STANDARD);
  if (limited) return limited;
  const auth = await requireApiUser(req);
  if (auth.response) return auth.response;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 501 });
  }

  try {
    const body = await req.json();
    const { id, name } = body as { id: string; name: string };

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: "id und name erforderlich." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("projects")
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, name, description, status, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/vibe-projects — delete a project and its files
export async function DELETE(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.STANDARD_AI);
  if (limited) return limited;
  const auth = await requireApiUser(req);
  if (auth.response) return auth.response;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 501 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id erforderlich." }, { status: 400 });
  }

  // Delete project files first
  await supabase.from("project_memory").delete().eq("project_id", id);

  // Delete project
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
