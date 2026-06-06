import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;

type Role = 'admin' | 'instructor';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1) Verify caller is logged in
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) return json({ error: 'Unauthorized' }, 401);

    // 2) Verify caller is super_admin
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: callerProfile } = await admin
      .from('ssra_profiles').select('role, email').eq('id', caller.id).maybeSingle();
    if (callerProfile?.role !== 'super_admin') {
      return json({ error: 'Forbidden: super_admin only' }, 403);
    }

    // 3) Validate input
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? '').trim().toLowerCase();
    const role  = String(body?.role ?? '') as Role;
    const fullName = String(body?.full_name ?? '').trim() || null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Valid email is required' }, 400);
    }
    if (role !== 'admin' && role !== 'instructor') {
      return json({ error: 'Role must be admin or instructor' }, 400);
    }

    // 4) Find or create the auth user
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let target = existing?.users?.find(u => (u.email ?? '').toLowerCase() === email) ?? null;

    let wasInvited = false;
    if (!target) {
      // New user → send invite email (Supabase will email a confirmation link)
      const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
        data: fullName ? { full_name: fullName, invited_role: role } : { invited_role: role },
        redirectTo: `${new URL(req.url).origin.replace('.supabase.co', '.lovable.app')}/login`,
      });
      if (invErr) {
        // Fallback to generateLink (signup magic link)
        const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { data: { full_name: fullName, invited_role: role } },
        });
        if (linkErr || !link?.user) {
          return json({ error: linkErr?.message ?? invErr.message }, 400);
        }
        target = link.user;
      } else {
        target = invited.user;
      }
      wasInvited = true;
    } else {
      // Existing user → re-send a magic-link sign-in so they can confirm
      await admin.auth.admin.generateLink({ type: 'magiclink', email });
    }

    if (!target) return json({ error: 'Failed to create or find user' }, 500);

    // 5) Upsert ssra_profiles with the chosen role
    const { error: upsertErr } = await admin.from('ssra_profiles').upsert({
      id: target.id,
      email,
      full_name: fullName ?? '',
      role,
    }, { onConflict: 'id' });
    if (upsertErr) return json({ error: upsertErr.message }, 500);

    // 6) Audit log (best-effort)
    await admin.from('ssra_audit_log').insert({
      actor_id: caller.id,
      actor_email: callerProfile?.email ?? caller.email,
      actor_role: 'super_admin',
      action: 'user.invited',
      resource_type: 'ssra_profiles',
      resource_id: target.id,
      details: { email, role, was_invited: wasInvited },
    });

    return json({
      ok: true,
      user_id: target.id,
      email,
      role,
      invited: wasInvited,
      message: wasInvited
        ? 'Invite email sent. The user must open the email to confirm and set a password.'
        : 'User already existed. Role updated and a sign-in link was emailed.',
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
