/**
 * Migration safety guard (runs in CI before lint).
 *
 * Blocks the recurring read-blocking RLS anti-pattern:
 *
 *     CREATE POLICY ... AS RESTRICTIVE FOR ALL ...
 *
 * In PostgreSQL, FOR ALL includes SELECT and RESTRICTIVE policies AND with
 * every permissive policy. A restrictive FOR ALL policy whose USING clause
 * evaluates false for normal users therefore silently blocks those users
 * from READING their own rows — even when the author only intended to block
 * writes.
 *
 * This exact bug has hit this project TWICE:
 *   - 20260605201013 "Deny direct enrollment writes" (FOR ALL USING(false))
 *     -> dropped in 20260607205412
 *   - 20260612195635 "enrollments_no_client_writes" (FOR ALL USING(is_admin))
 *     -> dropped in 20260612260000 (broke the student dashboard live)
 *
 * Correct pattern: per-command shields — separate FOR INSERT / FOR UPDATE /
 * FOR DELETE policies, leaving SELECT to the permissive policies.
 *
 * Existing neutralized occurrences are allowlisted by filename. Any NEW
 * migration introducing the pattern fails CI.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

// Files known to contain the pattern but already neutralized by a later DROP.
const ALLOWLIST = new Set([
  "20260605201013_b991c143-21fa-49cb-98e7-10b0c8e81cd7.sql", // dropped in 20260607205412
  "20260612195635_3893176d-e063-4aa6-8c01-f3084475a535.sql", // dropped in 20260612260000
]);

// Strip SQL comments so commented-out examples / explanations don't trip the guard.
function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")   // block comments
    .replace(/--[^\n]*/g, " ");           // line comments
}

// Match a CREATE POLICY statement (up to its terminating semicolon) that is
// both AS RESTRICTIVE and FOR ALL.
const CREATE_POLICY_RE = /CREATE\s+POLICY[\s\S]*?;/gi;

let violations = [];

for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
  if (ALLOWLIST.has(file)) continue;
  const sql = stripComments(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  const statements = sql.match(CREATE_POLICY_RE) ?? [];
  for (const stmt of statements) {
    const isRestrictive = /\bAS\s+RESTRICTIVE\b/i.test(stmt);
    const isForAll = /\bFOR\s+ALL\b/i.test(stmt);
    if (isRestrictive && isForAll) {
      const name = (stmt.match(/CREATE\s+POLICY\s+"?([^"\s]+)"?/i) ?? [])[1] ?? "(unnamed)";
      violations.push({ file: basename(file), policy: name });
    }
  }
}

if (violations.length > 0) {
  console.error("\n✗ Migration guard FAILED — read-blocking RLS anti-pattern detected:\n");
  for (const v of violations) {
    console.error(`  ${v.file}: policy "${v.policy}" is AS RESTRICTIVE FOR ALL`);
  }
  console.error(
    "\nA RESTRICTIVE FOR ALL policy blocks SELECT too — it can silently stop\n" +
    "users from reading their own rows. Use per-command shields instead:\n" +
    "  CREATE POLICY ... AS RESTRICTIVE FOR INSERT ...\n" +
    "  CREATE POLICY ... AS RESTRICTIVE FOR UPDATE ...\n" +
    "  CREATE POLICY ... AS RESTRICTIVE FOR DELETE ...\n" +
    "If this occurrence is intentionally neutralized by a later DROP, add the\n" +
    "filename to the ALLOWLIST in scripts/check-migrations.mjs with a reason.\n",
  );
  process.exit(1);
}

console.log("✓ Migration guard passed — no read-blocking RESTRICTIVE FOR ALL policies");
