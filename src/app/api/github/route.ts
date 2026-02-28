import { NextRequest } from "next/server";

const GH_API = "https://api.github.com";

function gh(token: string, path: string, opts?: RequestInit) {
  return fetch(`${GH_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts?.headers ?? {}),
    },
  });
}

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

// ── Recursively fetch all files from a repo tree ──
async function fetchTree(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<{ path: string; content: string }[]> {
  // Get the full tree recursively
  const treeRes = await gh(
    token,
    `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );
  if (!treeRes.ok) throw new Error("Baum konnte nicht geladen werden");
  const treeData = await treeRes.json();

  const files: { path: string; content: string }[] = [];

  // Filter for blobs (files) only, skip large files and binary
  const blobs = (treeData.tree as { path: string; type: string; size?: number }[])
    .filter(
      (item) =>
        item.type === "blob" &&
        (item.size ?? 0) < 500_000 && // skip files > 500KB
        !item.path.includes("node_modules") &&
        !item.path.includes(".next/") &&
        !item.path.startsWith(".git/") &&
        !item.path.endsWith(".lock") &&
        !item.path.endsWith(".png") &&
        !item.path.endsWith(".jpg") &&
        !item.path.endsWith(".jpeg") &&
        !item.path.endsWith(".gif") &&
        !item.path.endsWith(".ico") &&
        !item.path.endsWith(".woff") &&
        !item.path.endsWith(".woff2") &&
        !item.path.endsWith(".ttf") &&
        !item.path.endsWith(".eot")
    );

  // Fetch file contents in parallel (batched to avoid rate limits)
  const BATCH_SIZE = 10;
  for (let i = 0; i < blobs.length; i += BATCH_SIZE) {
    const batch = blobs.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (blob) => {
        try {
          const res = await gh(
            token,
            `/repos/${owner}/${repo}/contents/${encodeURIComponent(blob.path)}?ref=${branch}`,
            { headers: { Accept: "application/vnd.github.raw+json" } }
          );
          if (!res.ok) return null;
          const content = await res.text();
          return { path: blob.path, content };
        } catch {
          return null;
        }
      })
    );
    files.push(...results.filter((r): r is NonNullable<typeof r> => r !== null));
  }

  return files;
}

// ── Create or update a repo with files using the Git Data API ──
async function pushFiles(
  token: string,
  owner: string,
  repo: string,
  files: { path: string; content: string }[],
  message: string,
  branch: string
): Promise<void> {
  // 1. Get the latest commit SHA
  const refRes = await gh(token, `/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  if (!refRes.ok) throw new Error("Branch nicht gefunden");
  const refData = await refRes.json();
  const latestCommitSha = refData.object.sha;

  // 2. Get the base tree SHA
  const commitRes = await gh(token, `/repos/${owner}/${repo}/git/commits/${latestCommitSha}`);
  if (!commitRes.ok) throw new Error("Commit nicht gefunden");
  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree.sha;

  // 3. Create blobs for each file
  const treeItems = await Promise.all(
    files.map(async (file) => {
      const blobRes = await gh(token, `/repos/${owner}/${repo}/git/blobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
      });
      if (!blobRes.ok) throw new Error(`Blob fuer ${file.path} fehlgeschlagen`);
      const blobData = await blobRes.json();
      return {
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blobData.sha as string,
      };
    })
  );

  // 4. Create a new tree
  const treeRes = await gh(token, `/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
  });
  if (!treeRes.ok) throw new Error("Baum-Erstellung fehlgeschlagen");
  const treeData = await treeRes.json();

  // 5. Create a commit
  const newCommitRes = await gh(token, `/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [latestCommitSha],
    }),
  });
  if (!newCommitRes.ok) throw new Error("Commit fehlgeschlagen");
  const newCommitData = await newCommitRes.json();

  // 6. Update the branch reference
  const updateRefRes = await gh(
    token,
    `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha: newCommitData.sha }),
    }
  );
  if (!updateRefRes.ok) throw new Error("Branch-Update fehlgeschlagen");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, token } = body;

    if (!token || typeof token !== "string") {
      return err("GitHub Token fehlt");
    }

    // ── user ──
    if (action === "user") {
      const res = await gh(token, "/user");
      if (!res.ok) return err("Ungueltiger Token", 401);
      const data = await res.json();
      return ok({
        login: data.login,
        avatar_url: data.avatar_url,
        html_url: data.html_url,
      });
    }

    // ── list-repos ──
    if (action === "list-repos") {
      const res = await gh(
        token,
        "/user/repos?sort=updated&per_page=30&affiliation=owner"
      );
      if (!res.ok) return err("Repos konnten nicht geladen werden");
      const data = await res.json();
      return ok(
        (data as Record<string, unknown>[]).map((r) => ({
          name: r.name,
          full_name: r.full_name,
          description: r.description,
          html_url: r.html_url,
          private: r.private,
          updated_at: r.updated_at,
          default_branch: r.default_branch,
        }))
      );
    }

    // ── load-repo ──
    if (action === "load-repo") {
      const { owner, repo, branch } = body;
      if (!owner || !repo) return err("owner und repo benoetigt");

      // Get default branch if not specified
      let targetBranch = branch;
      if (!targetBranch) {
        const repoRes = await gh(token, `/repos/${owner}/${repo}`);
        if (!repoRes.ok) return err("Repo nicht gefunden", 404);
        const repoData = await repoRes.json();
        targetBranch = repoData.default_branch;
      }

      const files = await fetchTree(token, owner, repo, targetBranch);
      return ok(files);
    }

    // ── save-repo ──
    if (action === "save-repo") {
      const { repo, files, message, isPrivate } = body;
      if (!repo || !files || !Array.isArray(files)) {
        return err("repo und files benoetigt");
      }

      // Get authenticated user
      const userRes = await gh(token, "/user");
      if (!userRes.ok) return err("Token ungueltig", 401);
      const userData = await userRes.json();
      const owner = userData.login;

      // Check if repo exists
      const existsRes = await gh(token, `/repos/${owner}/${repo}`);
      let created = false;
      let defaultBranch = "main";

      if (existsRes.status === 404) {
        // Create new repo
        const createRes = await gh(token, "/user/repos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: repo,
            private: isPrivate ?? false,
            auto_init: true, // creates initial commit with README
            description: "Erstellt mit D³ Studio",
          }),
        });
        if (!createRes.ok) {
          const errData = await createRes.json();
          return err(
            `Repo konnte nicht erstellt werden: ${errData.message || "Unbekannter Fehler"}`
          );
        }
        created = true;
        // Small delay to let GitHub initialize the repo
        await new Promise((r) => setTimeout(r, 1500));
      } else if (existsRes.ok) {
        const existsData = await existsRes.json();
        defaultBranch = existsData.default_branch;
      } else {
        return err("Repo-Check fehlgeschlagen");
      }

      // Push files
      await pushFiles(
        token,
        owner,
        repo,
        files as { path: string; content: string }[],
        message || "Update von D³ Studio",
        defaultBranch
      );

      return ok({
        html_url: `https://github.com/${owner}/${repo}`,
        created,
      });
    }

    return err(`Unbekannte Aktion: ${action}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Interner Fehler";
    return err(message, 500);
  }
}
