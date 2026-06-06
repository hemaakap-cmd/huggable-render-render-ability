import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

declare global {
  interface Window {
    Paddle: any;
  }
}

export function getPaddleEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

let paddleInitialized = false;
let initPromise: Promise<void> | null = null;

export async function initializePaddle(): Promise<void> {
  if (paddleInitialized) return;
  if (initPromise) return initPromise;

  if (!clientToken) {
    throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
  }

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
