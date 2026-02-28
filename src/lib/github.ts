// ── GitHub integration for D³ Studio Vibe-Coding ──
// Uses a Next.js API route as proxy to avoid CORS issues.

const GITHUB_STORAGE_KEY = "d3_github_token";

// ── Token management ──

export function getGitHubToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GITHUB_STORAGE_KEY);
}

export function setGitHubToken(token: string) {
  localStorage.setItem(GITHUB_STORAGE_KEY, token);
}

export function clearGitHubToken() {
  localStorage.removeItem(GITHUB_STORAGE_KEY);
}

// ── Types ──

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  updated_at: string;
  default_branch: string;
}

export interface GitHubFile {
  path: string;
  content: string;
}

// ── API calls (all go through /api/github) ──

async function ghFetch<T>(
  action: string,
  token: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch("/api/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, token, ...body }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
    throw new Error(err.error || `GitHub API Fehler (${res.status})`);
  }

  return res.json() as Promise<T>;
}

/** Get the authenticated user */
export async function getUser(token: string): Promise<GitHubUser> {
  return ghFetch<GitHubUser>("user", token);
}

/** List user repositories (sorted by last updated) */
export async function listRepos(token: string): Promise<GitHubRepo[]> {
  return ghFetch<GitHubRepo[]>("list-repos", token);
}

/** Load all files from a repository */
export async function loadRepo(
  token: string,
  owner: string,
  repo: string,
  branch?: string
): Promise<GitHubFile[]> {
  return ghFetch<GitHubFile[]>("load-repo", token, { owner, repo, branch });
}

/** Save files to a repository (create or update) */
export async function saveToRepo(
  token: string,
  repo: string,
  files: GitHubFile[],
  message: string,
  isPrivate: boolean = false
): Promise<{ html_url: string; created: boolean }> {
  return ghFetch("save-repo", token, { repo, files, message, isPrivate });
}
