// Validates a course purchase and creates a pending enrollment row,
// then returns the Paddle external price ID + custom data for the overlay.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUBSCRIPTION_COURSES: Record<string, string> = {
  'medical-german': 'medical_german_monthly',
  'test-course': 'test_course_monthly',
};

function coursePriceId(courseId: string): string {
  return SUBSCRIPTION_COURSES[courseId] ?? `${courseId.replace(/-/g, '_')}_onetime`;
}

function isSubscriptionCourse(courseId: string): boolean {
  return courseId in SUBSCRIPTION_COURSES;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userData.user;

    const { courseId, couponCode, metadata } = await req.json();
    if (!courseId || typeof courseId !== 'string') {
      return new Response(JSON.stringify({ error: 'courseId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const sanitizedCouponCode = couponCode && typeof couponCode === 'string' ? couponCode.trim().toUpperCase() : null;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Quick existence read (the RPC will re-lock and re-validate authoritatively)
    const { data: course } = await admin
      .from('ssra_courses')
      .select('id, is_active')
      .eq('id', courseId)
      .maybeSingle();
    if (!course || !course.is_active) {
      return new Response(JSON.stringify({ error: 'Course not available' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pull profile name/email so the RPC can snapshot them onto the enrollment
    const { data: profile } = await admin
      .from('ssra_profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    // ATOMIC reservation: locks the course row, counts active+recent-pending
    // enrollments against capacity, and creates/refreshes the pending row in
    // one transaction. Eliminates the TOCTOU race where two simultaneous
    // payers could both take the last seat.
    const { data: rpcRows, error: rpcErr } = await admin.rpc('reserve_pending_enrollment', {
      _user_id:       user.id,
      _course_id:     courseId,
      _coupon_code:   sanitizedCouponCode,
      _student_name:  profile?.full_name ?? user.user_metadata?.full_name ?? null,
      _student_email: profile?.email ?? user.email ?? null,
    });
    if (rpcErr) {
      console.error('reserve_pending_enrollment rpc error', rpcErr);
      return new Response(JSON.stringify({ error: 'Could not reserve seat' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const reservation = (rpcRows as Array<{ enrollment_id: string | null; outcome: string; reason: string | null }>)?.[0];
    if (!reservation) {
      return new Response(JSON.stringify({ error: 'Reservation failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (reservation.outcome === 'already_enrolled') {
      return new Response(JSON.stringify({ error: 'Already enrolled', alreadyEnrolled: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (reservation.outcome === 'full') {
      return new Response(JSON.stringify({ error: 'Course is full', waitlistAvailable: true }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (reservation.outcome === 'closed' || reservation.outcome === 'error') {
      return new Response(JSON.stringify({ error: reservation.reason ?? 'Course not available' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const enrollmentId = reservation.enrollment_id!;

    // Resolve Paddle discount id from coupon code (if one was applied).
    // CRITICAL: if a coupon was applied but cannot be mapped to a real Paddle
    // discount, FAIL the checkout instead of silently charging the full price.
    // This is the bug that caused the UI to show a discount while Paddle
    // charged the original amount.
    let paddleDiscountId: string | null = null;
    if (sanitizedCouponCode) {
      const { data: couponRow } = await admin
        .from('ssra_coupons')
        .select('paddle_discount_id, is_active, valid_until, max_uses, uses_count')
        .eq('code', sanitizedCouponCode)
        .maybeSingle();

      if (!couponRow || !couponRow.is_active) {
        return new Response(JSON.stringify({ error: 'Coupon is no longer valid' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (couponRow.valid_until && new Date(couponRow.valid_until as string) < new Date()) {
        return new Response(JSON.stringify({ error: 'Coupon has expired' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (couponRow.max_uses !== null && (couponRow.uses_count ?? 0) >= (couponRow.max_uses as number)) {
        return new Response(JSON.stringify({ error: 'Coupon usage limit reached' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!couponRow.paddle_discount_id || !/^dsc_/.test(couponRow.paddle_discount_id as string)) {
        console.error('Coupon misconfigured: missing paddle_discount_id', {
          code: sanitizedCouponCode, userId: user.id,
        });
        return new Response(JSON.stringify({
          error: 'This coupon is misconfigured. Please contact support — do not retry without removing the coupon.',
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      paddleDiscountId = couponRow.paddle_discount_id as string;
    }

    // Strip reserved keys from client-supplied metadata so callers cannot
    // override userId / courseId / enrollmentId and hijack another user's
    // enrollment activation via the webhook handler.
    const rawMeta = (metadata && typeof metadata === 'object') ? metadata as Record<string, unknown> : {};
    const { userId: _u, courseId: _c, enrollmentId: _e, ...safeMeta } = rawMeta;

    return new Response(JSON.stringify({
      paddlePriceId: coursePriceId(courseId),
      paddleDiscountId,
      customData: {
        ...safeMeta,
        userId: user.id,
        courseId,
        enrollmentId,
      },
      customerEmail: user.email ?? undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('paddle-prepare-checkout error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
