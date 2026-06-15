import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolveOrCreateCustomer } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { courseId, environment, returnUrl } = body as {
      courseId?: string;
      environment?: StripeEnv;
      returnUrl?: string;
    };

    if (!courseId || typeof courseId !== "string") {
      return new Response(JSON.stringify({ error: "courseId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (environment !== "sandbox" && environment !== "live") {
      return new Response(JSON.stringify({ error: "environment must be 'sandbox' or 'live'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate the user
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load the course
    const { data: course, error: courseError } = await supabase
      .from("ssra_courses")
      .select("id, title, price_eur, stripe_price_id, is_subscription, course_type, start_date, start_time, duration, instructor_name")
      .eq("id", courseId)
      .maybeSingle();
    if (courseError || !course) {
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!course.stripe_price_id) {
      return new Response(JSON.stringify({ error: "Course is not configured for checkout" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent duplicate active enrollment
    const { data: existing } = await supabase
      .from("ssra_enrollments")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .in("status", ["active"])
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ alreadyEnrolled: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = createStripeClient(environment);

    // Resolve lookup_key → Stripe price
    const prices = await stripe.prices.list({ lookup_keys: [course.stripe_price_id] });
    if (!prices.data.length) {
      return new Response(JSON.stringify({ error: "Stripe price not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    const customerId = await resolveOrCreateCustomer(stripe, {
      email: user.email ?? undefined,
      userId: user.id,
    });

    let productDescription: string | undefined;
    if (!isRecurring) {
      const productId = typeof stripePrice.product === "string"
        ? stripePrice.product
        : stripePrice.product.id;
      const product = await stripe.products.retrieve(productId);
      productDescription = product.name;
    }

    const finalReturnUrl = returnUrl ??
      `${req.headers.get("origin") ?? ""}/payment-success?session_id={CHECKOUT_SESSION_ID}&courseId=${courseId}`;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: finalReturnUrl,
      customer: customerId,
      ...(!isRecurring && { payment_intent_data: { description: productDescription } }),
      metadata: {
        userId: user.id,
        courseId: courseId,
      },
      ...(isRecurring && {
        subscription_data: {
          metadata: { userId: user.id, courseId: courseId },
        },
      }),
      managed_payments: { enabled: true },
    } as any);

    // Create a pending enrollment row tied to this session so PaymentSuccess can poll
    await supabase.from("ssra_enrollments").upsert({
      user_id: user.id,
      course_id: courseId,
      stripe_checkout_session_id: session.id,
      amount_eur: course.price_eur,
      status: "pending",
      environment,
      course_title_snapshot: course.title,
      start_date_snapshot: course.start_date,
      start_time_snapshot: course.start_time,
      duration_snapshot: course.duration,
      instructor_snapshot: course.instructor_name,
      student_email_snapshot: user.email,
    }, { onConflict: "user_id,course_id", ignoreDuplicates: false });

    // Record payment attempt for monitoring
    try {
      const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                        req.headers.get("cf-connecting-ip") || null;
      const userAgent = req.headers.get("user-agent") || null;
      const country = req.headers.get("cf-ipcountry") || null;
      await supabase.rpc("record_payment_attempt", {
        _user_id: user.id,
        _user_email: user.email ?? null,
        _course_id: courseId,
        _course_title: course.title,
        _enrollment_id: null,
        _amount_eur: course.price_eur,
        _coupon_code: null,
        _stripe_session_id: session.id,
        _ip_address: ipAddress,
        _user_agent: userAgent,
        _country: country,
        _environment: environment,
      });
    } catch (e) {
      console.error("record_payment_attempt failed:", e);
    }

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret, sessionId: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
