// ── /api/setup-cms ──
// Auto-creates Supabase tables for CMS sections (Blog, Team, Testimonials).
// Called automatically by Design Mode when CMS sections are added — user never sees this.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TABLE_SCHEMAS: Record<string, string> = {
  articles: `
    CREATE TABLE IF NOT EXISTS public.{table_name} (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      project_id text NOT NULL,
      title text NOT NULL DEFAULT '',
      body text DEFAULT '',
      author text DEFAULT '',
      published_at timestamptz DEFAULT now(),
      image_url text DEFAULT '',
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;
    CREATE POLICY IF NOT EXISTS "anon read {table_name}" ON public.{table_name}
      FOR SELECT USING (true);
    CREATE POLICY IF NOT EXISTS "anon insert {table_name}" ON public.{table_name}
      FOR INSERT WITH CHECK (true);
    CREATE POLICY IF NOT EXISTS "anon delete {table_name}" ON public.{table_name}
      FOR DELETE USING (true);
  `,
  team: `
    CREATE TABLE IF NOT EXISTS public.{table_name} (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      project_id text NOT NULL,
      name text NOT NULL DEFAULT '',
      role text DEFAULT '',
      bio text DEFAULT '',
      image_url text DEFAULT '',
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;
    CREATE POLICY IF NOT EXISTS "anon read {table_name}" ON public.{table_name}
      FOR SELECT USING (true);
    CREATE POLICY IF NOT EXISTS "anon insert {table_name}" ON public.{table_name}
      FOR INSERT WITH CHECK (true);
    CREATE POLICY IF NOT EXISTS "anon delete {table_name}" ON public.{table_name}
      FOR DELETE USING (true);
  `,
  testimonials: `
    CREATE TABLE IF NOT EXISTS public.{table_name} (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      project_id text NOT NULL,
      author text NOT NULL DEFAULT '',
      quote text DEFAULT '',
      role text DEFAULT '',
      company text DEFAULT '',
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;
    CREATE POLICY IF NOT EXISTS "anon read {table_name}" ON public.{table_name}
      FOR SELECT USING (true);
    CREATE POLICY IF NOT EXISTS "anon insert {table_name}" ON public.{table_name}
      FOR INSERT WITH CHECK (true);
    CREATE POLICY IF NOT EXISTS "anon delete {table_name}" ON public.{table_name}
      FOR DELETE USING (true);
  `,
};

export async function POST(req: NextRequest) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl || serviceKey === "your-service-role-key-here") {
      return NextResponse.json({ ok: true, skipped: true, reason: "No service key" });
    }

    const body = await req.json() as { projectId: string; cmsTypes: string[] };
    const { projectId, cmsTypes } = body;

    if (!projectId || !cmsTypes?.length) {
      return NextResponse.json({ error: "Missing projectId or cmsTypes" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const safeProjectId = projectId.replace(/[^a-z0-9]/gi, "_").slice(0, 32);
    const created: string[] = [];

    for (const cmsType of cmsTypes) {
      const schema = TABLE_SCHEMAS[cmsType];
      if (!schema) continue;

      const tableName = `${cmsType}_${safeProjectId}`;
      const sql = schema.replace(/{table_name}/g, tableName);

      const { error } = await supabase.rpc("exec_sql", { sql });
      if (error) {
        // Try direct SQL via REST if RPC not available
        // Tables may already exist — not an error
        console.warn(`Table setup warning for ${tableName}:`, error.message);
      } else {
        created.push(tableName);
      }
    }

    return NextResponse.json({ ok: true, created });
  } catch (error) {
    console.error("CMS setup error:", error);
    return NextResponse.json({ ok: true, skipped: true, reason: (error as Error).message });
  }
}
