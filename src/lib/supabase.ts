import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export interface BsProjectRow {
  id: string;
  user_id: string | null;
  name: string;
  type: string;
  prompt: string | null;
  token_preset_id: string;
  created_at: string;
  updated_at: string;
}

export interface BsDesignTokenRow {
  id: string;
  project_id: string;
  primary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_heading: string;
  font_body: string;
  border_radius: number;
  spacing: string;
}

export interface BsPageRow {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface BsBlockRow {
  id: string;
  page_id: string;
  type: string;
  variant: string;
  content: Record<string, string>;
  overrides: Record<string, unknown> | null;
  sort_order: number;
}
