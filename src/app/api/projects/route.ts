import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET /api/projects — list all saved projects (lightweight)
export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 501 });
  }

  const { data, error } = await supabase
    .from("bs_projects")
    .select("id, name, type, prompt, token_preset_id, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: data });
}

// POST /api/projects — save a full project snapshot
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 501 });
  }

  try {
    const body = await req.json();
    const { project } = body;

    if (!project?.name || !project?.pages) {
      return NextResponse.json({ error: "Ungültiges Projekt." }, { status: 400 });
    }

    // 1. Insert project
    const { data: projectRow, error: projectError } = await supabase
      .from("bs_projects")
      .insert({
        name: project.name,
        type: project.type || "custom",
        prompt: project.prompt || null,
        token_preset_id: project.tokenPresetId || "clean-light",
      })
      .select("id")
      .single();

    if (projectError || !projectRow) {
      return NextResponse.json({ error: projectError?.message || "Projekt konnte nicht gespeichert werden." }, { status: 500 });
    }

    const projectId = projectRow.id;

    // 2. Insert design tokens
    if (project.tokens) {
      const t = project.tokens;
      await supabase.from("bs_design_tokens").insert({
        project_id: projectId,
        primary_color: t.primaryColor || "#111111",
        accent_color: t.accentColor || "#3b82f6",
        background_color: t.backgroundColor || "#ffffff",
        text_color: t.textColor || "#111111",
        font_heading: t.fontHeading || "Inter",
        font_body: t.fontBody || "Inter",
        border_radius: t.borderRadius ?? 12,
        spacing: t.spacing || "relaxed",
      });
    }

    // 3. Insert pages and blocks
    for (let pageIndex = 0; pageIndex < project.pages.length; pageIndex++) {
      const page = project.pages[pageIndex];

      const { data: pageRow, error: pageError } = await supabase
        .from("bs_pages")
        .insert({
          project_id: projectId,
          name: page.name || `Page ${pageIndex + 1}`,
          slug: page.slug || "/",
          sort_order: pageIndex,
        })
        .select("id")
        .single();

      if (pageError || !pageRow) continue;

      const blocks = (page.blocks || []).map(
        (block: { type: string; variant: string; content: Record<string, string>; overrides?: Record<string, unknown> }, blockIndex: number) => ({
          page_id: pageRow.id,
          type: block.type,
          variant: block.variant || "A",
          content: block.content || {},
          overrides: block.overrides || null,
          sort_order: blockIndex,
        })
      );

      if (blocks.length > 0) {
        await supabase.from("bs_blocks").insert(blocks);
      }
    }

    return NextResponse.json({ id: projectId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
