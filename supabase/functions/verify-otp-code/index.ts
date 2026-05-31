import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OTP_TYPES = new Set(['signup', 'magiclink'])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, token, type } = await req.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const normalizedToken = String(token || '').replace(/\D/g, '')
    const otpType = OTP_TYPES.has(type) ? type : 'magiclink'

    if (!normalizedEmail || normalizedToken.length !== 6) {
      return new Response(JSON.stringify({ error: 'Invalid verification code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )

    const { data: alias } = await adminClient
      .from('auth_otp_aliases')
      .select('id, original_token')
      .eq('email', normalizedEmail)
      .eq('otp_type', otpType)
      .eq('alias_code', normalizedToken)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const tokenToVerify = alias?.original_token ?? normalizedToken
    const { data, error } = await authClient.auth.verifyOtp({
      email: normalizedEmail,
      token: tokenToVerify,
      type: otpType,
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (alias?.id) {
      await adminClient
        .from('auth_otp_aliases')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', alias.id)
    }

    return new Response(JSON.stringify({ session: data.session, user: data.user }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})