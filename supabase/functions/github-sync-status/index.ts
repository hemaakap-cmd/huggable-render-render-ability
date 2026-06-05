import { corsHeaders } from "../_shared/cors.ts";

const REPO_CANDIDATES = [
  "hemaakap-cmd/huggable-render-render-ability",
  "hemaakap-cmd/ssra-academy",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const requestedBranch = url.searchParams.get("branch");
    const requestedRepo = url.searchParams.get("repo");

    const ghToken = Deno.env.get("GITHUB_TOKEN");
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github+json",
      "User-Agent": "ssra-sync-status",
    };
    if (ghToken) headers["Authorization"] = `Bearer ${ghToken}`;

    // Identify the token owner so we can fall back to <owner>/<repo>
    let tokenLogin: string | null = null;
    if (ghToken) {
      const meRes = await fetch("https://api.github.com/user", { headers });
      if (meRes.ok) {
        const me = await meRes.json();
        tokenLogin = me?.login ?? null;
      }
    }

    const tried: { repo: string; status: number }[] = [];
    const candidates = requestedRepo
      ? [requestedRepo]
      : Array.from(new Set([
          ...REPO_CANDIDATES,
          ...(tokenLogin ? REPO_CANDIDATES.map((r) => `${tokenLogin}/${r.split("/")[1]}`) : []),
        ]));

    for (const repo of candidates) {
      const repoRes = await fetch(`https://api.github.com/repos/${repo}`, { headers });
      tried.push({ repo, status: repoRes.status });
      if (!repoRes.ok) continue;

      const repoData = await repoRes.json();
      const targetBranch = requestedBranch || repoData.default_branch || "main";

      const res = await fetch(
        `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(targetBranch)}`,
        { headers },
      );

      if (!res.ok) {
        const body = await res.text();
        return new Response(
          JSON.stringify({
            repo,
            branch: targetBranch,
            error: `GitHub commit access failed (${res.status})`,
            details: body,
            default_branch: repoData.default_branch ?? null,
            fetched_at: new Date().toISOString(),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const data = await res.json();
      return new Response(
        JSON.stringify({
          repo,
          branch: targetBranch,
          sha: data.sha,
          short_sha: String(data.sha).slice(0, 7),
          message: data.commit?.message ?? "",
          author: data.commit?.author?.name ?? "",
          author_email: data.commit?.author?.email ?? "",
          committed_at: data.commit?.author?.date ?? null,
          html_url: data.html_url ?? "",
          fetched_at: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        error: "GitHub repo not accessible to the configured token",
        token_configured: Boolean(ghToken),
        token_login: tokenLogin,
        tried,
        hint: "Open Lovable Cloud → Secrets and update GITHUB_TOKEN with a Personal Access Token that has 'repo' (Contents: Read) access to the synced repository.",
        fetched_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("github-sync-status error:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: "Internal error", message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
