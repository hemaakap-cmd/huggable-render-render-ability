/**
 * validate-coupon — Check a coupon code before checkout
 * Returns discount details without consuming the coupon.
 * The coupon is only consumed when payment succeeds (via payments-webhook).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const { code, courseId, amountEur } = await req.json();
    if (!code || !courseId || amountEur === undefined) {
      return json({ error: "code, courseId, and amountEur are required" }, 400);
    }

    const { data: rows, error: rpcErr } = await supabaseAdmin.rpc("validate_coupon", {
      _code:       code,
      _course_id:  courseId,
      _amount_eur: amountEur,
      _user_id:    user.id,
    });

    if (rpcErr) {
      console.error("validate_coupon rpc error:", rpcErr.message);
      return json({ error: "Validation failed" }, 500);
    }

    const result = rows?.[0];
    if (!result) return json({ error: "Coupon not found" }, 404);

    return json({
      valid:            result.is_valid,
      errorReason:      result.error_reason,
      discountType:     result.discount_type,
      discountValue:    result.discount_value,
      finalDiscount:    result.final_discount,
      couponId:         result.coupon_id,
      paddleDiscountId: result.paddle_discount_id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("validate-coupon error:", msg);
    return json({ error: "Internal error" }, 500);
  }
});
