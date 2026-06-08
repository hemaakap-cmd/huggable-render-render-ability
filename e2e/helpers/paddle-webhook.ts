import crypto from "node:crypto";

/**
 * Sign and POST a Paddle webhook event to the deployed payments-webhook function.
 * Matches Paddle's `paddle-signature` HMAC scheme:
 *   ts=<unix>;h1=<hex>
 *   hmac payload = `${ts}:${rawBody}` signed with the webhook secret.
 */
export async function postPaddleWebhook(opts: {
  baseUrl: string;        // e.g. https://<ref>.supabase.co
  env: "sandbox" | "live";
  secret: string;
  event: object;
}) {
  const body = JSON.stringify(opts.event);
  const ts = Math.floor(Date.now() / 1000).toString();
  const h1 = crypto.createHmac("sha256", opts.secret).update(`${ts}:${body}`).digest("hex");

  const url = `${opts.baseUrl}/functions/v1/payments-webhook?env=${opts.env}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Paddle-Signature": `ts=${ts};h1=${h1}`,
    },
    body,
  });
  return { status: res.status, text: await res.text() };
}
