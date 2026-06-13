/**
 * Auth state setup — runs once before persona projects.
 *
 * Signs each persona in through the Supabase API (signInWithPassword) and
 * writes the session into a Playwright storage-state file as the localStorage
 * entry supabase-js reads on boot (`sb-<project-ref>-auth-token`).
 *
 * Why API instead of driving the login UI:
 *   - Student login is OTP-only (emailed codes) — not automatable without an
 *     SMTP catcher.
 *   - API sign-in tests the same JWT path the app uses, minus the email hop.
 *
 * When credentials are missing (E2E_PASSWORD unset), EMPTY storage states are
 * written so dependent projects can still load; their specs self-skip.
 */
import { test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
const PASSWORD = process.env.E2E_PASSWORD ?? "";
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8080";

const personas = [
  { role: "student",     file: "student.json",     email: process.env.E2E_STUDENT_EMAIL     ?? "e2e-student@ssra-academy.test" },
  { role: "instructor",  file: "instructor.json",  email: process.env.E2E_INSTRUCTOR_EMAIL  ?? "e2e-instructor@ssra-academy.test" },
  { role: "admin",       file: "admin.json",       email: process.env.E2E_ADMIN_EMAIL       ?? "e2e-admin@ssra-academy.test" },
  { role: "super_admin", file: "super-admin.json", email: process.env.E2E_SUPER_ADMIN_EMAIL ?? "e2e-superadmin@ssra-academy.test" },
];

const authDir = path.join(__dirname, ".auth");
fs.mkdirSync(authDir, { recursive: true });

const EMPTY_STATE = { cookies: [], origins: [] };

function storageKey(): string {
  // supabase-js default key: sb-<project-ref>-auth-token
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  return `sb-${ref}-auth-token`;
}

for (const p of personas) {
  setup(`authenticate as ${p.role}`, async () => {
    const out = path.join(authDir, p.file);

    if (!SUPABASE_URL || !ANON_KEY || !PASSWORD) {
      fs.writeFileSync(out, JSON.stringify(EMPTY_STATE));
      setup.skip(true, "E2E_PASSWORD / SUPABASE_URL / ANON_KEY not set — wrote empty auth state");
      return;
    }

    const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data, error } = await client.auth.signInWithPassword({
      email: p.email,
      password: PASSWORD,
    });

    if (error || !data.session) {
      // Degrade gracefully: write an empty state and SKIP (don't throw). A hard
      // throw fails the whole setup project and turns an infra gap (personas not
      // seeded) into a cascade of dependent failures. With an empty state +
      // skip, the persona specs detect the absent session and self-skip cleanly.
      fs.writeFileSync(out, JSON.stringify(EMPTY_STATE));
      setup.skip(
        true,
        `Sign-in failed for ${p.role} (${p.email}): ${error?.message ?? "no session"}. ` +
        `Run "node e2e/seed.mjs" to provision personas — persona specs will skip until then.`,
      );
      return;
    }

    const state = {
      cookies: [],
      origins: [
        {
          origin: new URL(BASE_URL).origin,
          localStorage: [
            { name: storageKey(), value: JSON.stringify(data.session) },
          ],
        },
      ],
    };
    fs.writeFileSync(out, JSON.stringify(state, null, 2));
  });
}
