/**
 * manage-session-credentials
 *
 * Single secure entrypoint for admins and assigned instructors to read and
 * write Zoom credentials for a session.
 *
 * The underlying `ssra_session_credentials` table is locked down with
 * REVOKE + RLS deny-all so even admins/instructors cannot bypass this
 * function via PostgREST.
 *
 * Body:
 *   { action: "get",    sessionId }
 *   { action: "upsert", sessionId, zoom_link, zoom_password?, notify? }
 *   { action: "delete", sessionId }
 */
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
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const userClient  = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user }, error: ue } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (ue || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { action, sessionId } = body as { action?: string; sessionId?: string };
    if (!action || !sessionId) return json({ error: "action and sessionId are required" }, 400);

    // Authorize: admin OR instructor of the course
    const { data: isAdmin } = await adminClient.rpc("is_ssra_admin", { _uid: user.id });
    let authorized = !!isAdmin;

    const { data: session } = await adminClient
      .from("ssra_sessions")
      .select("id, course_id, ssra_courses(instructor_id)")
      .eq("id", sessionId)
      .maybeSingle();
    if (!session) return json({ error: "Session not found" }, 404);

    if (!authorized) {
      const course: any = session.ssra_courses;
      if (course?.instructor_id === user.id) {
        authorized = true;
      } else {
        const { data: assign } = await adminClient
          .from("ssra_instructor_assignments" as never)
          .select("id")
          .eq("instructor_id", user.id)
          .eq("course_id", session.course_id)
          .eq("is_active", true)
          .maybeSingle();
        authorized = !!assign;
      }
    }
    if (!authorized) return json({ error: "Forbidden" }, 403);

    if (action === "get") {
      const { data, error } = await adminClient
        .from("ssra_session_credentials")
        .select("zoom_link, zoom_password, updated_at")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      return json(data ?? { zoom_link: "", zoom_password: null, updated_at: null });
    }

    if (action === "upsert") {
      const { zoom_link, zoom_password, notify } = body as { zoom_link?: string; zoom_password?: string | null; notify?: boolean };
      const link = (zoom_link ?? "").trim();
      if (!link) return json({ error: "zoom_link is required" }, 400);
      try {
        const u = new URL(link);
        if (!/^https?:$/.test(u.protocol)) throw new Error("bad");
      } catch {
        return json({ error: "zoom_link must be a valid http(s) URL" }, 400);
      }

      const { error } = await adminClient
        .from("ssra_session_credentials")
        .upsert(
          { session_id: sessionId, zoom_link: link, zoom_password: (zoom_password ?? "") ? zoom_password : null },
          { onConflict: "session_id" },
        );
      if (error) return json({ error: error.message }, 500);

      let notifyResult: unknown = null;
      if (notify) {
        const res = await adminClient.functions.invoke("notify-session-link-updated", {
          body: { sessionId },
          headers: { Authorization: authHeader },
        });
        notifyResult = res.data ?? null;
      }
      return json({ ok: true, notify: notifyResult });
    }

    if (action === "delete") {
      const { error } = await adminClient.from("ssra_session_credentials").delete().eq("session_id", sessionId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("manage-session-credentials error:", msg);
    return json({ error: msg }, 500);
  }
});
