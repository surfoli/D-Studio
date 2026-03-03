import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { requireApiUser } from "@/lib/server/api-auth";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET: Load undo history for a user + project + mode
export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.STANDARD);
  if (limited) return limited;
  const auth = await requireApiUser(req);
  if (auth.response) return auth.response;
  const userId = auth.user?.id;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ entries: [] });

  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get("user_id");
  const projectId = searchParams.get("project_id"); // can be "null" or actual UUID
  const mode = searchParams.get("mode");

  if (!userId || !mode) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  if (userIdParam && userIdParam !== userId) {
    return NextResponse.json({ error: "Forbidden user_id" }, { status: 403 });
  }

  let query = sb
    .from("undo_history")
    .select("entries")
    .eq("user_id", userId)
    .eq("mode", mode);

  if (projectId && projectId !== "null") {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("undo-history GET error:", error);
    return NextResponse.json({ entries: [] });
  }

  return NextResponse.json({ entries: data?.entries ?? [] });
}

// POST: Save undo history (upsert — last 100 entries)
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.STANDARD);
  if (limited) return limited;
  const auth = await requireApiUser(req);
  if (auth.response) return auth.response;
  const userId = auth.user?.id;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false });

  try {
    const body = await req.json();
    const { user_id, project_id, mode, entries } = body as {
      user_id?: string;
      project_id: string | null;
      mode: "plan" | "design";
      entries: unknown[];
    };

    if (!userId || !mode || !Array.isArray(entries)) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    if (user_id && user_id !== userId) {
      return NextResponse.json({ error: "Forbidden user_id" }, { status: 403 });
    }

    // Keep only last 100 entries for storage
    const trimmed = entries.slice(-100);

    // Find existing row first (handles NULL project_id correctly)
    let findQuery = sb
      .from("undo_history")
      .select("id")
      .eq("user_id", userId)
      .eq("mode", mode);

    if (project_id) {
      findQuery = findQuery.eq("project_id", project_id);
    } else {
      findQuery = findQuery.is("project_id", null);
    }

    const { data: existing } = await findQuery.maybeSingle();

    if (existing) {
      // Update existing row
      const { error } = await sb
        .from("undo_history")
        .update({ entries: trimmed, updated_at: new Date().toISOString() })
        .eq("id", existing.id);

      if (error) {
        console.error("undo-history UPDATE error:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    } else {
      // Insert new row
      const { error } = await sb
        .from("undo_history")
        .insert({
          user_id: userId,
          project_id: project_id || null,
          mode,
          entries: trimmed,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("undo-history INSERT error:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("undo-history POST error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
