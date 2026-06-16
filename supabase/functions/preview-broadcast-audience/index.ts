// Resolves audience preview for admin Zoom broadcast composer.
// POST { audienceType, audienceFilters, excludePriorRecipients } -> { total, sample[] }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("is_ssra_admin", { _uid: user.id });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const audienceType = String(body.audienceType ?? "all_students");
    const audienceFilters = body.audienceFilters ?? {};
    const excludePrior = !!body.excludePriorRecipients;

    // Use admin's identity so resolve_broadcast_audience passes its admin check.
    const { data, error } = await userClient.rpc("resolve_broadcast_audience" as never, {
      _audience_type: audienceType,
      _filters: audienceFilters,
      _exclude_prior: excludePrior,
    } as never);

    if (error) return json({ error: error.message }, 400);

    const rows = (data ?? []) as Array<{ user_id: string; email: string; full_name: string }>;
    return json({
      total: rows.length,
      sample: rows.slice(0, 10).map((r) => ({ email: r.email, full_name: r.full_name })),
    });
  } catch (e) {
    console.error("preview-broadcast-audience:", e instanceof Error ? e.message : e);
    return json({ error: "Internal server error" }, 500);
  }
});
