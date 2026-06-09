import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

declare global {
  interface Window {
    Paddle: any;
  }
}

/**
 * A host is considered "production" if it's NOT a Lovable preview/sandbox host
 * and NOT localhost. All real public domains (custom domain + published
 * *.lovable.app slug) must use a live (`live_`) Paddle token.
 */
export function isProductionHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1" || h.endsWith(".local")) return false;
  // Lovable in-editor previews
  if (h.includes("id-preview--") || h.includes("lovableproject.com")) return false;
  return true;
}

export function getPaddleEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

/**
 * Guard: in production, a test token is a critical misconfiguration —
 * customers would see "TEST MODE" watermarks and no real money would move.
 * Block checkout entirely in that case.
 */
export function assertPaymentsConfigValid(): void {
  if (!clientToken) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
  if (isProductionHost() && clientToken.startsWith("test_")) {
    throw new Error(
      "Payments misconfigured: test (sandbox) token detected on a production host. Refusing to start checkout.",
    );
  }
}

export function isCheckoutAvailable(): boolean {
  try {
    assertPaymentsConfigValid();
    return true;
  } catch {
    return false;
  }
}


let paddleInitialized = false;
let initPromise: Promise<void> | null = null;

export async function initializePaddle(): Promise<void> {
  if (paddleInitialized) return;
  if (initPromise) return initPromise;

  assertPaymentsConfigValid();



  initPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Paddle requires browser"));
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://cdn.paddle.com/paddle/v2/paddle.js"]',
    );
    const onReady = () => {
      try {
        const env = getPaddleEnvironment() === "sandbox" ? "sandbox" : "production";
        window.Paddle.Environment.set(env);
        window.Paddle.Initialize({ token: clientToken });
        paddleInitialized = true;
        resolve();
      } catch (e) {
        reject(e as Error);
      }
    };
    if (existing && (window as any).Paddle) {
      onReady();
      return;
    }
    const script = existing ?? document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = onReady;
    script.onerror = () => reject(new Error("Failed to load Paddle.js"));
    if (!existing) document.head.appendChild(script);
  });
  return initPromise;
}

/** Courses sold as recurring subscriptions instead of one-time purchases. */
const SUBSCRIPTION_COURSES: Record<string, string> = {
  "medical-german": "medical_german_monthly",
  "test-course": "test_course_monthly",
};

export function isSubscriptionCourse(courseId: string): boolean {
  return courseId in SUBSCRIPTION_COURSES;
}

/** Map our course id (e.g. "medical-german") to the Paddle external price id */
export function coursePriceId(courseId: string): string {
  return SUBSCRIPTION_COURSES[courseId] ?? `${courseId.replace(/-/g, "_")}_onetime`;
}

export async function getPaddlePriceId(externalPriceId: string): Promise<string> {
  const environment = getPaddleEnvironment();
  const { data, error } = await supabase.functions.invoke("get-paddle-price", {
    body: { priceId: externalPriceId, environment },
  });
  if (error || !data?.paddleId) {
    throw new Error(`Failed to resolve price: ${externalPriceId}`);
  }
  return data.paddleId as string;
}
