import { loadStripe, Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

/**
 * True when a usable Stripe publishable key is configured.
 * A missing token, or any value that isn't a `pk_test_`/`pk_live_` key
 * (e.g. a placeholder like `live_...` written before Stripe go-live
 * finishes provisioning live keys), means checkout cannot run.
 */
export function isPaymentsConfigured(): boolean {
  return !!clientToken && (clientToken.startsWith("pk_test_") || clientToken.startsWith("pk_live_"));
}

function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Stripe payments are not configured for this build. " +
    "Complete Stripe go-live in your Lovable project to enable production checkout.",
  );
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}
