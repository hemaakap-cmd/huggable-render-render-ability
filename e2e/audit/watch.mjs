// Snapshots the payment-critical tables AS admin, so we can diff before/after a
// live Paddle checkout + refund and see the chain react in real time.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS = JSON.parse(readFileSync(join(__dirname, ".tokens.json"), "utf8"));
const URL = "https://vffcarzhfxlqzfwrhzau.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZmNhcnpoZnhscXpmd3JoemF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDQyMTMsImV4cCI6MjA5NTQ4MDIxM30.JbMv8kyPerQ9NaobibnsmGzveSZ_b98-P2Jm0yygREU";
const tok = TOKENS.admin.access_token;
const q = async (path) => {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: { apikey: ANON, Authorization: `Bearer ${tok}` } });
  return r.json();
};
const rev = await q("revenue_events?select=event_type,direction,amount_cents,paddle_transaction_id,occurred_at&order=occurred_at.desc&limit=8");
const enr = await q("ssra_enrollments?select=id,status,amount_eur,course_id,created_at&order=created_at.desc&limit=5");
const wh  = await q("ssra_webhook_events?select=event_type,environment,status,created_at&order=created_at.desc&limit=6");
const sum = await q("rpc/get_revenue_summary"); // will 404 via GET; use POST below
const sumR = await fetch(`${URL}/rest/v1/rpc/get_revenue_summary`, {
  method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
  body: JSON.stringify({ _from: "2020-01-01T00:00:00Z", _to: "2027-01-01T00:00:00Z", _env: "live" }),
}).then((r) => r.json());
console.log(`\n=== SNAPSHOT ${new Date().toISOString()} ===`);
console.log("revenue_summary:", JSON.stringify(sumR));
console.log("revenue_events :", JSON.stringify(rev));
console.log("enrollments    :", JSON.stringify(enr));
console.log("webhook_events :", JSON.stringify(wh));
