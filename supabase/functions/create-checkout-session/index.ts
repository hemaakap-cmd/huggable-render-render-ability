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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const { courseId, successUrl, cancelUrl, metadata: clientMeta, couponCode } = await req.json();

    if (!courseId || !successUrl || !cancelUrl) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Resolve course server-side — never trust client price/mode
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: course, error: courseErr } = await supabaseAdmin
      .from("ssra_courses")
      .select("id, title, stripe_price_id, course_type, is_active, price_eur, capacity, enrolled_count, registration_open")
      .eq("id", courseId)
      .maybeSingle();

    if (courseErr || !course || !course.is_active || !course.stripe_price_id) {
      return new Response(JSON.stringify({ error: "Course not available" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Capacity check — prevent overselling
    const capacity = course.capacity ?? 50;
    const enrolledCount = course.enrolled_count ?? 0;
    const registrationOpen = course.registration_open !== false;

    if (!registrationOpen || enrolledCount >= capacity) {
      return new Response(
        JSON.stringify({
          error: "Course is full",
          capacity,
          enrolled: enrolledCount,
          waitlistAvailable: true,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Duplicate enrollment check — prevent charging for a course already owned
    if (course.course_type === "one_time") {
      const { data: existing } = await supabaseAdmin
        .from("ssra_enrollments")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .eq("status", "active")
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "Already enrolled in this course" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const mode = course.course_type === "subscription" ? "subscription" : "payment";

    // 5. Safe metadata — whitelist UTM fields from client
    const safeUtm: Record<string, string> = {};
    if (clientMeta && typeof clientMeta === "object") {
      for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
        const v = (clientMeta as Record<string, unknown>)[k];
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

    // 6. Coupon validation (optional)
    let stripeCouponId: string | undefined;
    let appliedCouponId: string | undefined;

    if (couponCode && typeof couponCode === "string") {
      const { data: couponRows } = await supabaseAdmin.rpc("validate_coupon", {
        _code: couponCode,
        _course_id: courseId,
        _amount_eur: course.price_eur,
        _user_id: user.id,
      });

      const couponResult = couponRows?.[0];
      if (!couponResult?.is_valid) {
        return new Response(
          JSON.stringify({ error: couponResult?.error_reason ?? "Invalid coupon" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Create a Stripe coupon for this discount
      const discountAmount =
        couponResult.discount_type === "percent"
          ? undefined
          : Math.round(couponResult.final_discount * 100); // cents

      const percentOff =
        couponResult.discount_type === "percent"
          ? Number(couponResult.discount_value)
          : undefined;

      const stripeCoupon = await stripe.coupons.create({
        ...(percentOff !== undefined ? { percent_off: percentOff } : { amount_off: discountAmount, currency: "eur" }),
        duration: "once",
        name: `SSRA-${couponCode.toUpperCase()}`,
        metadata: { ssra_coupon_id: couponResult.coupon_id },
      });

      stripeCouponId = stripeCoupon.id;
      appliedCouponId = couponResult.coupon_id;
      trustedMetadata.couponId = appliedCouponId;
      trustedMetadata.couponCode = couponCode.toUpperCase();
    }

    // 7. Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: course.stripe_price_id, quantity: 1 }],
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email ?? undefined,
      metadata: trustedMetadata,
      billing_address_collection: "auto",
      allow_promotion_codes: !stripeCouponId, // disable if we already applied one
      ...(stripeCouponId && mode === "payment" && {
        discounts: [{ coupon: stripeCouponId }],
      }),
      ...(stripeCouponId && mode === "subscription" && {
        discounts: [{ coupon: stripeCouponId }],
      }),
      ...(mode === "subscription" && {
        subscription_data: { metadata: trustedMetadata },
      }),
    });

    return new Response(
      JSON.stringify({ url: session.url, id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("create-checkout-session error:", message);
    return new Response(JSON.stringify({ error: "Checkout failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
