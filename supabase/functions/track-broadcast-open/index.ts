// Tracking pixel for Zoom broadcast email opens.
// GET /functions/v1/track-broadcast-open?t=<unsubscribe_token>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PIXEL = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), c => c.charCodeAt(0));

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const headers = {
    "Content-Type": "image/gif",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
  };

  if (token) {
    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      const { data: rec } = await admin
        .from("ssra_zoom_broadcast_recipients")
        .select("id, broadcast_id, email_opened")
        .eq("unsubscribe_token", token)
        .maybeSingle();
      if (rec && !rec.email_opened) {
        await admin
          .from("ssra_zoom_broadcast_recipients")
          .update({ email_opened: true, opened_at: new Date().toISOString() })
          .eq("id", rec.id);
        await admin.rpc("increment_broadcast_open" as never, { _broadcast_id: rec.broadcast_id } as never).then(
          () => {},
          async () => {
            // Fallback: direct update if RPC missing
            const { data: b } = await admin
              .from("ssra_zoom_broadcasts")
              .select("opened_count")
              .eq("id", rec.broadcast_id)
              .single();
            if (b) {
              await admin
                .from("ssra_zoom_broadcasts")
                .update({ opened_count: (b.opened_count ?? 0) + 1 })
                .eq("id", rec.broadcast_id);
            }
          },
        );
      }
    } catch (e) {
      console.error("track-broadcast-open error:", e instanceof Error ? e.message : e);
    }
  }
  return new Response(PIXEL, { headers });
});
