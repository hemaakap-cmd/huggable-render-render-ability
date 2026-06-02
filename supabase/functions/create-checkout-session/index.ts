import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Require authenticated caller — never trust client-supplied userId
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const { courseId, successUrl, cancelUrl, metadata: clientMeta } = await req.json();

    if (!courseId || !successUrl || !cancelUrl) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Resolve priceId + mode + verification requirement server-side from trusted DB
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: course, error: courseErr } = await supabaseAdmin
      .from("ssra_courses")
      .select("id, title, stripe_price_id, course_type, requires_verification, is_active")
      .eq("id", courseId)
      .maybeSingle();

    if (courseErr || !course || !course.is_active || !course.stripe_price_id) {
      return new Response(JSON.stringify({ error: "Course not available" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Enforce verification gate server-side for restricted courses
    if (course.requires_verification) {
      const { data: verif } = await supabaseAdmin
        .from("ssra_verifications")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .maybeSingle();
      if (!verif) {
        return new Response(JSON.stringify({ error: "Verification required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const mode = course.course_type === "subscription" ? "subscription" : "payment";

    // 4. Safe metadata — only allow UTM-style attribution fields from client
    const safeUtm: Record<string, string> = {};
    if (clientMeta && typeof clientMeta === "object") {
      for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
        const v = clientMeta[k];
        if (typeof v === "string" && v.length <= 200) safeUtm[k] = v;
      }
    }

    const trustedMetadata: Record<string, string> = {
      courseId: course.id,
      courseName: course.title,
      userId: user.id,
      customerEmail: user.email ?? "",
      ...safeUtm,
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: course.stripe_price_id, quantity: 1 }],
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email ?? undefined,
      metadata: trustedMetadata,
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      ...(mode === "subscription" && {
        subscription_data: { metadata: trustedMetadata },
      }),
    });

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("create-checkout-session error:", message);
    return new Response(JSON.stringify({ error: "Checkout failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
