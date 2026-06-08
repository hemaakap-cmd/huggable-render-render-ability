import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.SUPABASE_ANON_KEY!;

export function admin() {
  if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

export function anon() {
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

export const supabaseUrl = url;
