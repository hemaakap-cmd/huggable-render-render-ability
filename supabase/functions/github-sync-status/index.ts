import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_REPOS = [
  "hemaakap-cmd/huggable-render-render-ability",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Require auth + super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isSuper, error: roleErr } = await supabase.rpc("is_ssra_super_admin", {
      _uid: claimsData.claims.sub,
    });
    if (roleErr || !isSuper) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const requestedBranch = url.searchParams.get("branch");
    const requestedRepo = url.searchParams.get("repo");

    const ghToken = Deno.env.get("GITHUB_TOKEN");
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github+json",
      "User-Agent": "ssra-sync-status",
    };
    if (ghToken) headers["Authorization"] = `Bearer ${ghToken}`;

    // Only allow repos from allowlist
    const candidates = requestedRepo
      ? (ALLOWED_REPOS.includes(requestedRepo) ? [requestedRepo] : [])
      : ALLOWED_REPOS;

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ error: "Repository not allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tried: { repo: string; status: number }[] = [];

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
        return new Response(
          JSON.stringify({
            repo,
            branch: targetBranch,
            error: `GitHub commit access failed (${res.status})`,
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
        tried,
        hint: "Update GITHUB_TOKEN secret with a PAT that has Contents: Read access to the synced repository.",
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
