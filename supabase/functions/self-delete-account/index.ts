// Self-service account deletion for authenticated students.
// Cancels active enrollments, then deletes the auth user (cascades to profile).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const confirm = String(body?.confirm ?? "").trim().toUpperCase();
    if (confirm !== "DELETE") {
      return json({ error: "Confirmation text required (type DELETE)" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Block admins/instructors from deleting via this endpoint
    const { data: profile } = await admin
      .from("ssra_profiles").select("role, email").eq("id", user.id).maybeSingle();
    const role = (profile as any)?.role;
    if (role && role !== "student") {
      return json({
        error: "Privileged accounts cannot be self-deleted. Contact support.",
      }, 403);
    }

    // Cancel any active/pending enrollments to free seats
    await admin.from("ssra_enrollments")
      .update({ status: "cancelled" })
      .eq("user_id", user.id)
      .in("status", ["active", "pending"]);

    // Delete the auth user (cascades to ssra_profiles via FK)
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return json({ error: delErr.message }, 500);

    await admin.from("ssra_audit_log").insert({
      actor_id: user.id,
      actor_email: (profile as any)?.email ?? user.email,
      actor_role: role ?? "student",
      action: "self_account_deleted",
      resource_type: "auth_user",
      resource_id: user.id,
      details: {},
    });

    return json({ ok: true });
  } catch (e) {
    console.error("self-delete-account error:", e);
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});
