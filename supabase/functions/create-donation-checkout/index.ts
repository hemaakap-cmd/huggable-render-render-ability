import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolveOrCreateCustomer } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Courses opted into "pay what you want" donation pricing.
// Medical German is sold as a recurring subscription and must not use this path.
const DONATION_COURSE_IDS = new Set<string>();
const MIN_AMOUNT_CENTS = 100; // €1 minimum
const MAX_AMOUNT_CENTS = 1_000_000; // €10,000 sanity cap

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
    const { courseId, amountCents, environment, returnUrl } = body as {
      courseId?: string;
      amountCents?: number;
      environment?: StripeEnv;
      returnUrl?: string;
    };

    if (!courseId || typeof courseId !== "string" || !DONATION_COURSE_IDS.has(courseId)) {
      return new Response(JSON.stringify({ error: "Donation pricing is not enabled for this course" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (environment !== "sandbox" && environment !== "live") {
      return new Response(JSON.stringify({ error: "environment must be 'sandbox' or 'live'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof amountCents !== "number" || !Number.isInteger(amountCents) || amountCents < MIN_AMOUNT_CENTS || amountCents > MAX_AMOUNT_CENTS) {
      return new Response(JSON.stringify({ error: `Amount must be an integer between ${MIN_AMOUNT_CENTS} and ${MAX_AMOUNT_CENTS} cents` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: course, error: courseError } = await supabase
      .from("ssra_courses")
      .select("id, title, start_date, start_time, duration, instructor_name")
      .eq("id", courseId)
      .maybeSingle();
    if (courseError || !course) {
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase
      .from("ssra_enrollments")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .in("status", ["active"])
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ alreadyEnrolled: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = createStripeClient(environment);
    const customerId = await resolveOrCreateCustomer(stripe, {
      email: user.email ?? undefined,
      userId: user.id,
    });

    const finalReturnUrl = returnUrl ??
      `${req.headers.get("origin") ?? ""}/payment-success?session_id={CHECKOUT_SESSION_ID}&courseId=${courseId}`;

    const productName = `${course.title ?? "Course"} — Contribution`;

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: productName,
            description: "Pay-what-you-want contribution. Helps us reach more students.",
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: finalReturnUrl,
      customer: customerId,
      payment_intent_data: { description: productName },
      metadata: {
        userId: user.id,
        courseId: courseId,
        donation: "true",
      },
    } as any);

    await supabase.from("ssra_enrollments").upsert({
      user_id: user.id,
      course_id: courseId,
      stripe_checkout_session_id: session.id,
      amount_eur: amountCents / 100,
      status: "pending",
      environment,
      course_title_snapshot: course.title,
      start_date_snapshot: course.start_date,
      start_time_snapshot: course.start_time,
      duration_snapshot: course.duration,
      instructor_snapshot: course.instructor_name,
      student_email_snapshot: user.email,
    }, { onConflict: "user_id,course_id", ignoreDuplicates: false });

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret, sessionId: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-donation-checkout error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
