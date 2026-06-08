import { describe, it, expect } from "vitest";
import crypto from "node:crypto";

// Pure-function reimplementation of Paddle's documented signature scheme,
// used to assert that helper-signed events would verify in the webhook.
function signPaddle(body: string, secret: string, ts = Math.floor(Date.now() / 1000).toString()) {
  const h1 = crypto.createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return { header: `ts=${ts};h1=${h1}`, ts, h1 };
}

function verifyPaddle(body: string, header: string, secret: string, toleranceSeconds = 5 * 60) {
  const parts = Object.fromEntries(header.split(";").map((p) => p.split("=")));
  if (!parts.ts || !parts.h1) return false;
  const ageOk = Math.abs(Date.now() / 1000 - Number(parts.ts)) <= toleranceSeconds;
  if (!ageOk) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${parts.ts}:${body}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.h1));
}

describe("Paddle webhook signature", () => {
  const body = JSON.stringify({ event_id: "evt_x", data: { id: "txn_1" } });
  const secret = "whsec_test_abc123";

  it("verifies a freshly signed payload", () => {
    const { header } = signPaddle(body, secret);
    expect(verifyPaddle(body, header, secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const { header } = signPaddle(body, secret);
    expect(verifyPaddle(body + " ", header, secret)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    const { header } = signPaddle(body, secret);
    expect(verifyPaddle(body, header, "whsec_wrong")).toBe(false);
  });

  it("rejects a stale timestamp", () => {
    const staleTs = String(Math.floor(Date.now() / 1000) - 60 * 60);
    const { header } = signPaddle(body, secret, staleTs);
    expect(verifyPaddle(body, header, secret)).toBe(false);
  });
});
