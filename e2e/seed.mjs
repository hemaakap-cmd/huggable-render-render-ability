/**
 * E2E persona seeding script.
 *
 * Creates (or refreshes) the four test personas with confirmed emails,
 * a known password, complete profiles (so the profile-completion gate
 * doesn't redirect), and the right roles.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... E2E_PASSWORD=... node e2e/seed.mjs
 *
 * Idempotent — safe to run on every CI build.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.E2E_PASSWORD;

if (!url || !serviceKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}
if (!password || password.length < 12) {
  console.error("E2E_PASSWORD is required (min 12 chars)");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const PERSONAS = [
  { role: "student",     email: process.env.E2E_STUDENT_EMAIL     ?? "e2e-student@ssra-academy.test",     name: "E2E Student" },
  { role: "instructor",  email: process.env.E2E_INSTRUCTOR_EMAIL  ?? "e2e-instructor@ssra-academy.test",  name: "E2E Instructor" },
  { role: "admin",       email: process.env.E2E_ADMIN_EMAIL       ?? "e2e-admin@ssra-academy.test",       name: "E2E Admin" },
  { role: "super_admin", email: process.env.E2E_SUPER_ADMIN_EMAIL ?? "e2e-superadmin@ssra-academy.test",  name: "E2E SuperAdmin" },
];

async function findUserByEmail(email) {
  // listUsers is paginated; test projects are small enough for one page,
  // but loop defensively anyway.
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

for (const p of PERSONAS) {
  let user = await findUserByEmail(p.email);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: p.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: p.name },
    });
    if (error) throw new Error(`createUser(${p.email}): ${error.message}`);
    user = data.user;
    console.log(`created ${p.role}: ${p.email}`);
  } else {
    // Refresh the password so rotated E2E_PASSWORD secrets take effect
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`updateUser(${p.email}): ${error.message}`);
    console.log(`refreshed ${p.role}: ${p.email}`);
  }

  // Complete profile + role (upsert covers projects where the auth trigger
  // hasn't created the profile row yet)
  const { error: profErr } = await admin.from("ssra_profiles").upsert({
    id: user.id,
    email: p.email,
    full_name: p.name,
    role: p.role,
    phone_number: "+490000000000",
    country: "Germany",
    city: "Leverkusen",
    address: "E2E Test Street 1",
    degree: "Test Degree",
    german_level: "B1",
  }, { onConflict: "id" });
  if (profErr) throw new Error(`profile upsert(${p.email}): ${profErr.message}`);
}

console.log("✓ E2E personas seeded");
