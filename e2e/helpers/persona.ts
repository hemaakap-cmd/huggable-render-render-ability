import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, "..", ".auth");

/**
 * Returns true when the persona's Playwright storage-state file actually
 * carries a real Supabase session (a localStorage auth-token with an
 * access_token). Returns false for an empty/missing state.
 *
 * Persona specs gate on THIS rather than on the mere presence of E2E_PASSWORD,
 * so the suite skips cleanly when personas are not seeded (an infra gap) instead
 * of running unauthenticated and reporting dozens of false failures. When the
 * personas ARE seeded the session is present and the specs run for real.
 */
export function personaAuthReady(file: string): boolean {
  try {
    const raw = fs.readFileSync(path.join(AUTH_DIR, file), "utf8");
    const state = JSON.parse(raw) as {
      origins?: Array<{ localStorage?: Array<{ name: string; value: string }> }>;
    };
    for (const origin of state.origins ?? []) {
      for (const entry of origin.localStorage ?? []) {
        if (!entry.name.includes("auth-token")) continue;
        const parsed = JSON.parse(entry.value);
        if (parsed?.access_token || parsed?.currentSession?.access_token) return true;
      }
    }
  } catch {
    /* missing or unparseable → not ready */
  }
  return false;
}
