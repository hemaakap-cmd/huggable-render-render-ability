/**
 * get-material-download
 *
 * Returns a short-lived signed URL for a course material file.
 * - Admins / super_admins / the course instructor can always download.
 * - Other authenticated users (enrolled students, active subscribers) can
 *   only download when `ssra_materials.allow_download = true`.
 *   If `allow_download = false`, they get a signed *preview* URL with
 *   Content-Disposition=inline so the browser shows it but can't save it
 *   via the standard download path.
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

    const { materialId, mode } = await req.json().catch(() => ({}));
    if (!materialId) return json({ error: "materialId is required" }, 400);

    const { data: material, error: me } = await adminClient
      .from("ssra_materials")
      .select("id, course_id, storage_path, file_name, mime_type, allow_download, is_visible")
      .eq("id", materialId)
      .maybeSingle();
    if (me || !material) return json({ error: "Material not found" }, 404);
    if (!material.storage_path) return json({ error: "No file attached" }, 400);

    // Authorize: staff, instructor of the course, enrolled, or active subscriber
    const { data: isAdmin } = await adminClient.rpc("is_ssra_admin", { _uid: user.id });

    const [{ data: course }, { data: enrollment }, { data: subscription }] = await Promise.all([
      adminClient.from("ssra_courses").select("instructor_id").eq("id", material.course_id).maybeSingle(),
      adminClient.from("ssra_enrollments").select("id").eq("user_id", user.id).eq("course_id", material.course_id).eq("status", "active").maybeSingle(),
      adminClient.from("ssra_subscriptions").select("id, status").eq("user_id", user.id).eq("course_id", material.course_id).in("status", ["active", "trialing"]).maybeSingle(),
    ]);

    const isInstructor = course?.instructor_id === user.id;
    const isStaff = !!isAdmin || isInstructor;
    const hasAccess = isStaff || !!enrollment || !!subscription;
    if (!hasAccess || !material.is_visible) return json({ error: "Forbidden" }, 403);

    // Non-staff students can only download when allow_download is on.
    // Otherwise we still return a signed inline-preview URL so they can view it.
    const wantsDownload = mode !== "preview";
    const asAttachment = wantsDownload && (isStaff || material.allow_download);

    const fileName = material.file_name || material.storage_path.split("/").pop() || "file";

    const { data: signed, error: se } = await adminClient.storage
      .from("course-materials")
      .createSignedUrl(material.storage_path, 60 * 10, asAttachment ? { download: fileName } : undefined);

    if (se || !signed?.signedUrl) return json({ error: se?.message || "Sign failed" }, 500);

    return json({
      url: signed.signedUrl,
      mode: asAttachment ? "download" : "preview",
      allow_download: !!material.allow_download || isStaff,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("get-material-download error:", msg);
    return json({ error: "Internal server error" }, 500);
  }
});
