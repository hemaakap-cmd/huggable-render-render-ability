import { corsHeaders } from "../_shared/cors.ts";

const REPO = "hemaakap-cmd/huggable-render-render-ability";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const requestedBranch = url.searchParams.get("branch");

    const ghToken = Deno.env.get("GITHUB_TOKEN");
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github+json",
      "User-Agent": "ssra-sync-status",
    };
    if (ghToken) headers["Authorization"] = `Bearer ${ghToken}`;

    const repoRes = await fetch(`https://api.github.com/repos/${REPO}`, { headers });
    if (!repoRes.ok) {
      const body = await repoRes.text();
      return new Response(
        JSON.stringify({
          repo: REPO,
          branch: requestedBranch ?? "auto",
          error: `GitHub repo access failed (${repoRes.status})`,
          details: body,
          token_configured: Boolean(ghToken),
          fetched_at: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const repoData = await repoRes.json();
    const targetBranch = requestedBranch || repoData.default_branch || "main";

    const res = await fetch(
      `https://api.github.com/repos/${REPO}/commits/${encodeURIComponent(targetBranch)}`,
      { headers },
    );

    if (!res.ok) {
      const body = await res.text();
      return new Response(
        JSON.stringify({
          repo: REPO,
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
        repo: REPO,
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
  } catch (err) {
    console.error("github-sync-status error:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
