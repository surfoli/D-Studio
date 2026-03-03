import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const authClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
    : null;

function unauthorized(message = "Nicht angemeldet. Bitte erneut einloggen."): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function extractBearerToken(req: Request): string | null {
  const raw = req.headers.get("authorization");
  if (!raw) return null;
  const [scheme, token] = raw.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
}

export interface ApiUserResult {
  user: User | null;
  response: NextResponse | null;
}

/**
 * Enforces Supabase session auth for API routes when auth is configured.
 * If auth is not configured, returns user=null and allows request.
 */
export async function requireApiUser(req: Request): Promise<ApiUserResult> {
  if (!authClient) {
    return { user: null, response: null };
  }

  const token = extractBearerToken(req);
  if (!token) {
    return { user: null, response: unauthorized() };
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, response: unauthorized("Session ungültig oder abgelaufen.") };
  }

  return { user: data.user, response: null };
}
