import { useCallback, useRef } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  courseId: string;
  returnUrl?: string;
  donationAmountCents?: number; // when set, routes through create-donation-checkout
  onAlreadyEnrolled?: () => void;
  onPaymentComplete?: (sessionId: string | null) => void;
}

export function StripeEmbeddedCheckout({ courseId, returnUrl, donationAmountCents, onAlreadyEnrolled, onPaymentComplete }: Props) {
  const sessionIdRef = useRef<string | null>(null);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const isDonation = typeof donationAmountCents === "number" && donationAmountCents > 0;
    const { data, error } = await supabase.functions.invoke(
      isDonation ? "create-donation-checkout" : "create-checkout",
      {
        body: isDonation
          ? { courseId, amountCents: donationAmountCents, environment: getStripeEnvironment(), returnUrl }
          : { courseId, environment: getStripeEnvironment(), returnUrl },
      },
    );
    if (data?.alreadyEnrolled) {
      onAlreadyEnrolled?.();
      throw new Error("Already enrolled");
    }
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || data?.error || "Failed to create checkout session");
    }
    sessionIdRef.current = data.sessionId ?? null;
    if (data.sessionId) sessionStorage.setItem("ssra:lastCheckoutSessionId", data.sessionId);
    return data.clientSecret;
  }, [courseId, donationAmountCents, onAlreadyEnrolled, returnUrl]);

  const handleComplete = useCallback(() => {
    onPaymentComplete?.(sessionIdRef.current ?? sessionStorage.getItem("ssra:lastCheckoutSessionId"));
  }, [onPaymentComplete]);

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret, onComplete: handleComplete }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
