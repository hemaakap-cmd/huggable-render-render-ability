import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  courseId: string;
  returnUrl?: string;
  donationAmountCents?: number; // when set, routes through create-donation-checkout
  onAlreadyEnrolled?: () => void;
}

export function StripeEmbeddedCheckout({ courseId, returnUrl, donationAmountCents, onAlreadyEnrolled }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
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
    return data.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
