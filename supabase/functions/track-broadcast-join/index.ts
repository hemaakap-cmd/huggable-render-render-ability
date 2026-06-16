// Tracks a click-through to Zoom and 302-redirects to the real meeting URL.
// GET /functions/v1/track-broadcast-join?t=<unsubscribe_token>&r=<zoom_link>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  const redirect = url.searchParams.get("r") ?? "";

  let target = "https://ssracourses.com";
  if (redirect) {
    try {
      const u = new URL(redirect);
      if (/^https?:$/.test(u.protocol)) target = u.toString();
    } catch { /* ignore */ }
  }

  if (token) {
    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      const { data: rec } = await admin
        .from("ssra_zoom_broadcast_recipients")
        .select("id, broadcast_id, joined_session")
        .eq("unsubscribe_token", token)
        .maybeSingle();
      if (rec && !rec.joined_session) {
        await admin
          .from("ssra_zoom_broadcast_recipients")
          .update({ joined_session: true, joined_at: new Date().toISOString() })
          .eq("id", rec.id);
        const { data: b } = await admin
          .from("ssra_zoom_broadcasts")
          .select("joined_count")
          .eq("id", rec.broadcast_id)
          .single();
        if (b) {
          await admin
            .from("ssra_zoom_broadcasts")
            .update({ joined_count: (b.joined_count ?? 0) + 1 })
            .eq("id", rec.broadcast_id);
        }
      }
    } catch (e) {
      console.error("track-broadcast-join error:", e instanceof Error ? e.message : e);
    }
  }

  return new Response(null, { status: 302, headers: { Location: target } });
});
