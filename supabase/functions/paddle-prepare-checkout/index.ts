// Validates a course purchase and creates a pending enrollment row,
// then returns the Paddle external price ID + custom data for the overlay.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUBSCRIPTION_COURSES: Record<string, string> = {
  'medical-german': 'medical_german_monthly',
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

    const { courseId, metadata } = await req.json();
    if (!courseId || typeof courseId !== 'string') {
      return new Response(JSON.stringify({ error: 'courseId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: course, error: courseErr } = await admin
      .from('ssra_courses')
      .select('id, title, price_eur, is_active, capacity, enrolled_count, registration_open, start_date, start_time, duration, instructor_name')
      .eq('id', courseId)
      .maybeSingle();

    if (courseErr || !course || !course.is_active) {
      return new Response(JSON.stringify({ error: 'Course not available' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (course.registration_open === false || (course.enrolled_count ?? 0) >= (course.capacity ?? 50)) {
      return new Response(JSON.stringify({ error: 'Course is full', waitlistAvailable: true }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lookup or create a pending enrollment for this user+course
    const { data: existing } = await admin
      .from('ssra_enrollments')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existing?.status === 'active') {
      return new Response(JSON.stringify({ error: 'Already enrolled', alreadyEnrolled: true }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let enrollmentId = existing?.id;
    if (!enrollmentId) {
      const { data: profile } = await admin
        .from('ssra_profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle();

      const { data: inserted, error: insertErr } = await admin
        .from('ssra_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: 'pending',
          amount_eur: course.price_eur,
          course_title_snapshot: course.title,
          start_date_snapshot: course.start_date,
          start_time_snapshot: course.start_time,
          duration_snapshot: course.duration,
          instructor_snapshot: course.instructor_name,
          student_name_snapshot: profile?.full_name ?? user.user_metadata?.full_name ?? null,
          student_email_snapshot: profile?.email ?? user.email ?? null,
        })
        .select('id')
        .single();
      if (insertErr) {
        console.error('enrollment insert failed', insertErr);
        return new Response(JSON.stringify({ error: 'Could not create enrollment' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      enrollmentId = inserted.id;
    }

    return new Response(JSON.stringify({
      paddlePriceId: coursePriceId(courseId),
      customData: {
        userId: user.id,
        courseId,
        enrollmentId,
        ...(metadata ?? {}),
      },
      customerEmail: user.email ?? undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('paddle-prepare-checkout error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
