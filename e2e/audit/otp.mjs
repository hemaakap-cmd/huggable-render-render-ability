// OTP login harness for the LIVE project (personas are OTP-only).
//   node e2e/audit/otp.mjs send   <role>           -> triggers the real OTP email
//   node e2e/audit/otp.mjs verify <role> <code>    -> exchanges 6-digit code for a session
//   node e2e/audit/otp.mjs refresh <role>          -> refreshes an expiring access token
// Tokens persist in e2e/audit/.tokens.json (gitignored).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const TOKENS = join(__dirname, ".tokens.json");

const SUPABASE_URL = "https://vffcarzhfxlqzfwrhzau.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZmNhcnpoZnhscXpmd3JoemF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDQyMTMsImV4cCI6MjA5NTQ4MDIxM30.JbMv8kyPerQ9NaobibnsmGzveSZ_b98-P2Jm0yygREU";

function parseEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
const env = parseEnv(join(ROOT, "e2e", ".env.personas"));
const EMAIL = {
  student: env.STUDENT_EMAIL, instructor: env.INSTRUCTOR_EMAIL,
  admin: env.ADMIN_EMAIL, superadmin: env.SUPERADMIN_EMAIL,
};
const loadTokens = () => (existsSync(TOKENS) ? JSON.parse(readFileSync(TOKENS, "utf8")) : {});
const saveTokens = (t) => writeFileSync(TOKENS, JSON.stringify(t, null, 2));

const [, , cmd, role, code] = process.argv;
const email = EMAIL[role];
if (!cmd || !role || !email) {
  console.error("usage: otp.mjs send|verify|refresh <student|instructor|admin|superadmin> [code]");
  process.exit(1);
}
const norm = email.trim().toLowerCase();

if (cmd === "send") {
  // Mirrors StudentLogin.tsx: signInWithOtp, existing user => create_user:false, magiclink.
  const r = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: norm, create_user: false }),
  });
  const body = await r.text();
  console.log(`send ${role} <${norm}>  HTTP ${r.status}  ${body || "(empty = OK, email dispatched)"}`);
} else if (cmd === "verify") {
  const token6 = String(code || "").replace(/\D/g, "");
  if (token6.length !== 6) { console.error("need a 6-digit code"); process.exit(1); }
  const r = await fetch(`${SUPABASE_URL}/functions/v1/verify-otp-code`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: norm, token: token6, type: "magiclink" }),
  });
  const j = await r.json();
  const session = j.session || j;
  if (!r.ok || !session?.access_token) {
    console.error(`verify ${role} FAILED  HTTP ${r.status}  ${JSON.stringify(j)}`);
    process.exit(1);
  }
  const t = loadTokens();
  t[role] = {
    email: norm,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user_id: session.user?.id,
    obtained_at: new Date().toISOString(),
  };
  saveTokens(t);
  console.log(`verify ${role} OK  user_id=${session.user?.id}  role_claim=${session.user?.role || "n/a"}`);
} else if (cmd === "refresh") {
  const t = loadTokens();
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: t[role]?.refresh_token }),
  });
  const j = await r.json();
  if (!j.access_token) { console.error(`refresh failed ${JSON.stringify(j)}`); process.exit(1); }
  t[role].access_token = j.access_token; t[role].refresh_token = j.refresh_token;
  t[role].obtained_at = new Date().toISOString(); saveTokens(t);
  console.log(`refresh ${role} OK`);
}
