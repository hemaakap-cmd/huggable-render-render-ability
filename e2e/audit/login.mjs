// Authenticated audit harness — signs in every persona against the LIVE project
// via the real GoTrue password grant (the same path a real user's browser uses),
// then writes short-lived access tokens to .tokens.json for the probe scripts.
//
// Reads creds from e2e/.env.personas (gitignored). Run: node e2e/audit/login.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

const SUPABASE_URL = "https://vffcarzhfxlqzfwrhzau.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZmNhcnpoZnhscXpmd3JoemF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDQyMTMsImV4cCI6MjA5NTQ4MDIxM30.JbMv8kyPerQ9NaobibnsmGzveSZ_b98-P2Jm0yygREU";

function parseEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

async function signIn(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!r.ok) return { error: j.error_description || j.msg || JSON.stringify(j) };
  return { token: j.access_token, refresh: j.refresh_token, user_id: j.user?.id };
}

const env = parseEnv(join(ROOT, "e2e", ".env.personas"));
const personas = [
  ["student", env.STUDENT_EMAIL, env.STUDENT_PASSWORD],
  ["instructor", env.INSTRUCTOR_EMAIL, env.INSTRUCTOR_PASSWORD],
  ["admin", env.ADMIN_EMAIL, env.ADMIN_PASSWORD],
  ["superadmin", env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD],
];

const tokens = {};
for (const [role, email, password] of personas) {
  if (!email || !password) {
    console.log(`SKIP  ${role.padEnd(11)} (no creds in .env.personas)`);
    continue;
  }
  const res = await signIn(email, password);
  if (res.error) {
    console.log(`FAIL  ${role.padEnd(11)} ${email}  ->  ${res.error}`);
  } else {
    tokens[role] = { ...res, email };
    console.log(`OK    ${role.padEnd(11)} ${email}  ->  user_id=${res.user_id}`);
  }
}
writeFileSync(join(__dirname, ".tokens.json"), JSON.stringify(tokens, null, 2));
console.log(`\nWrote ${Object.keys(tokens).length} token(s) to e2e/audit/.tokens.json`);
