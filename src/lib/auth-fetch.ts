"use client";

import { supabase } from "@/lib/supabase";

function isSameOriginRequest(input: RequestInfo | URL): boolean {
  if (typeof input === "string") {
    if (input.startsWith("/")) return true;
    if (typeof window === "undefined") return false;
    try {
      return new URL(input, window.location.origin).origin === window.location.origin;
    } catch {
      return false;
    }
  }

  if (input instanceof URL) {
    if (typeof window === "undefined") return false;
    return input.origin === window.location.origin;
  }

  if (typeof window === "undefined") return false;
  try {
    return new URL(input.url, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

function hasAuthorizationHeader(headers?: HeadersInit): boolean {
  if (!headers) return false;
  const normalized = new Headers(headers);
  return normalized.has("authorization");
}

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (!isSameOriginRequest(input) || hasAuthorizationHeader(init?.headers) || !supabase) {
    return fetch(input, init);
  }

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return fetch(input, init);

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  } catch {
    return fetch(input, init);
  }
}
