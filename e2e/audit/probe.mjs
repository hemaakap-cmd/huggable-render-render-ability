// Authenticated probe runner. Sends arbitrary REST/RPC/storage requests AS a
// given persona (using its captured access token) against the LIVE project, so
// every result reflects real RLS as that real user.
//   node e2e/audit/probe.mjs <role> <METHOD> <path> [jsonBody]
// path is relative to /  e.g.  rest/v1/ssra_enrollments?select=*
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS = join(__dirname, ".tokens.json");
const SUPABASE_URL = "https://vffcarzhfxlqzfwrhzau.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZmNhcnpoZnhscXpmd3JoemF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDQyMTMsImV4cCI6MjA5NTQ4MDIxM30.JbMv8kyPerQ9NaobibnsmGzveSZ_b98-P2Jm0yygREU";

const [, , role, method = "GET", path, body] = process.argv;
const tokens = existsSync(TOKENS) ? JSON.parse(readFileSync(TOKENS, "utf8")) : {};
const tok = role === "anon" ? ANON : tokens[role]?.access_token;
if (!tok) { console.error(`no token for role '${role}' (run otp.mjs verify ${role} <code>)`); process.exit(1); }

const headers = { apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json" };
if (method !== "GET") headers["Prefer"] = "return=representation";
const res = await fetch(`${SUPABASE_URL}/${path}`, {
  method, headers, body: body && method !== "GET" ? body : undefined,
});
const text = await res.text();
console.log(`[${role}] ${method} /${path}  -> HTTP ${res.status}`);
console.log(text.length > 4000 ? text.slice(0, 4000) + `\n...(${text.length} bytes)` : text);
