import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET /api/projects/[id] — load a full project with pages, blocks, tokens
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 501 });
  }

  const { id } = await params;

  const { data: project, error: projectError } = await supabase
    .from("bs_projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Projekt nicht gefunden." }, { status: 404 });
  }

  const { data: tokens } = await supabase
    .from("bs_design_tokens")
    .select("*")
    .eq("project_id", id)
    .single();

  const { data: pages } = await supabase
    .from("bs_pages")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  const pageIds = (pages || []).map((p: { id: string }) => p.id);

  const { data: blocks } = pageIds.length > 0
    ? await supabase
        .from("bs_blocks")
        .select("*")
        .in("page_id", pageIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const blocksByPage = new Map<string, typeof blocks>();
  for (const block of blocks || []) {
    const pageBlocks = blocksByPage.get(block.page_id) || [];
    pageBlocks.push(block);
    blocksByPage.set(block.page_id, pageBlocks);
  }

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      type: project.type,
      prompt: project.prompt,
      tokenPresetId: project.token_preset_id,
      tokens: tokens
        ? {
            primaryColor: tokens.primary_color,
            accentColor: tokens.accent_color,
            backgroundColor: tokens.background_color,
            textColor: tokens.text_color,
            fontHeading: tokens.font_heading,
            fontBody: tokens.font_body,
            borderRadius: tokens.border_radius,
            spacing: tokens.spacing,
          }
        : null,
      pages: (pages || []).map((page: { id: string; name: string; slug: string }) => ({
        id: page.id,
        name: page.name,
        slug: page.slug,
        blocks: (blocksByPage.get(page.id) || []).map(
          (block: { id: string; type: string; variant: string; content: Record<string, string>; overrides: Record<string, unknown> | null }) => ({
            id: block.id,
            type: block.type,
            variant: block.variant,
            content: block.content,
            overrides: block.overrides,
          })
        ),
      })),
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    },
  });
}

// DELETE /api/projects/[id] — delete a project
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 501 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from("bs_projects")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
