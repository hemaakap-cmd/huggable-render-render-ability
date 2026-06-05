import { corsHeaders } from "../_shared/cors.ts";

const REPO = "hemaakap-cmd/huggable-render-render-ability";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const branch = url.searchParams.get("branch") ?? "main";

    const ghToken = Deno.env.get("GITHUB_TOKEN");
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github+json",
      "User-Agent": "ssra-sync-status",
    };
    if (ghToken) headers["Authorization"] = `Bearer ${ghToken}`;

    const res = await fetch(
      `https://api.github.com/repos/${REPO}/commits/${encodeURIComponent(branch)}`,
      { headers },
    );

    if (!res.ok) {
      const body = await res.text();
      return new Response(
        JSON.stringify({ error: `GitHub API ${res.status}`, details: body }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    return new Response(
      JSON.stringify({
        repo: REPO,
        branch,
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
