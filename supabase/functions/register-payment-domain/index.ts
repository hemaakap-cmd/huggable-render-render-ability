import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { domain, environment } = await req.json() as { domain?: string; environment?: StripeEnv };
    if (!domain || (environment !== "sandbox" && environment !== "live")) {
      return new Response(JSON.stringify({ error: "domain + environment ('sandbox'|'live') required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripe = createStripeClient(environment);
    // Try to register; if already exists, list & validate it
    let pmd: any;
    try {
      pmd = await (stripe as any).paymentMethodDomains.create({ domain_name: domain });
    } catch (e: any) {
      const list = await (stripe as any).paymentMethodDomains.list({ domain_name: domain, limit: 1 });
      pmd = list.data?.[0];
      if (!pmd) throw e;
    }
    const validated = await (stripe as any).paymentMethodDomains.validate(pmd.id);
    return new Response(JSON.stringify({ ok: true, domain: validated }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("register-payment-domain error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
