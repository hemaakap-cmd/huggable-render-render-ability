// Uploads a local file to a storage bucket AS a persona (real RLS path).
//   node e2e/audit/upload.mjs <role> <bucket> <objectPath> <localFile> [contentType]
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS = join(__dirname, ".tokens.json");
const URL = "https://vffcarzhfxlqzfwrhzau.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZmNhcnpoZnhscXpmd3JoemF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDQyMTMsImV4cCI6MjA5NTQ4MDIxM30.JbMv8kyPerQ9NaobibnsmGzveSZ_b98-P2Jm0yygREU";
const [, , role, bucket, objectPath, localFile, contentType] = process.argv;
const tokens = existsSync(TOKENS) ? JSON.parse(readFileSync(TOKENS, "utf8")) : {};
const tok = role === "anon" ? ANON : tokens[role]?.access_token;
const bytes = readFileSync(localFile);
const r = await fetch(`${URL}/storage/v1/object/${bucket}/${objectPath}`, {
  method: "POST",
  headers: {
    apikey: ANON, Authorization: `Bearer ${tok}`,
    "Content-Type": contentType || "application/octet-stream",
    "x-upsert": "false",
  },
  body: bytes,
});
console.log(`[${role}] upload ${bucket}/${objectPath} (${bytes.length}B ${contentType}) -> HTTP ${r.status} ${await r.text()}`);
