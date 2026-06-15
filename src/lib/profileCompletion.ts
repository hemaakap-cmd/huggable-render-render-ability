/**
 * Single source of truth for what counts as a "complete" student profile.
 * A student must have ALL of these filled before they can browse / enroll / checkout.
 */
export const REQUIRED_PROFILE_FIELDS = [
  "full_name",
  "phone_number",
  "country",
  "city",
  "address",
  "degree",
  "german_level",
] as const;

export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

export type ProfileCompletionInput = Partial<Record<RequiredProfileField, string | null | undefined>> & {
  role?: string | null;
};

export function missingProfileFields(profile: ProfileCompletionInput | null | undefined): RequiredProfileField[] {
  if (!profile) return [...REQUIRED_PROFILE_FIELDS];
  return REQUIRED_PROFILE_FIELDS.filter((f) => {
    const v = profile[f];
    return !v || String(v).trim() === "";
  });
}

export function isProfileComplete(profile: ProfileCompletionInput | null | undefined): boolean {
  return missingProfileFields(profile).length === 0;
}

/* ─────────────────────────────────────────────────────────────────────
 * STRICT FIELD VALIDATION
 * Used by registration + profile-completion forms to guarantee that
 * what users enter is actually real, honest data — not "asdf" or "Drghaz".
 * ───────────────────────────────────────────────────────────────────── */

const LATIN_LETTERS_RE = /^[A-Za-z][A-Za-z\s'\-\.]*$/;
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
// Reject obvious gibberish: a single word with 7+ consonants in a row,
// or the whole string being the same character repeated (e.g. "aaaa").
// The consonant check runs per-word so real multi-word inputs like
// "123 Test Street" or transliterated Arabic addresses ("Nasr Street",
// "Shubra Road") are NOT flagged.
const REPEATED_CHAR_RE = /^(.)\1{2,}$/;
const LONG_CONSONANT_RUN_RE = /[bcdfghjklmnpqrstvwxyz]{7,}/i;

function hasGibberishWord(value: string): boolean {
  const compact = value.replace(/\s+/g, "");
  if (REPEATED_CHAR_RE.test(compact)) return true;
  return value.split(/\s+/).some((w) => LONG_CONSONANT_RUN_RE.test(w));
}

/** Returns null if valid, otherwise a user-facing error message. */
export function validateFullName(raw: string): string | null {
  const v = (raw ?? "").trim();
  if (v.length < 4) return "Full name must be at least 4 characters.";
  if (v.length > 100) return "Full name is too long.";
  if (ARABIC_RE.test(v)) return "Please enter your full name in English (Latin) letters only.";
  if (!LATIN_LETTERS_RE.test(v)) return "Name may only contain English letters, spaces, hyphens, and apostrophes.";
  const words = v.split(/\s+/).filter(Boolean);
  if (words.length < 2) return "Please enter your full name (first and last name).";
  if (words.some((w) => w.length < 2)) return "Each part of your name must be at least 2 letters.";
  if (hasGibberishWord(v)) return "Please enter a real name.";
  return null;
}

export function validatePhone(raw: string): string | null {
  const v = (raw ?? "").trim();
  if (!v) return "Phone number is required.";
  // Allow leading +, then digits/spaces/dashes. Must contain 8–15 digits.
  if (!/^\+?[\d\s\-()]+$/.test(v)) return "Phone may only contain digits, spaces, +, -, ().";
  const digits = v.replace(/\D/g, "");
  if (digits.length < 8) return "Phone number is too short.";
  if (digits.length > 15) return "Phone number is too long.";
  if (/^(.)\1+$/.test(digits)) return "Please enter a real phone number.";
  return null;
}

export function validateCity(raw: string): string | null {
  const v = (raw ?? "").trim();
  if (v.length < 2) return "City must be at least 2 characters.";
  if (v.length > 100) return "City is too long.";
  if (ARABIC_RE.test(v)) return "Please enter your city in English letters only.";
  if (!/^[A-Za-z][A-Za-z\s'\-\.]*$/.test(v)) return "City may only contain English letters.";
  if (hasGibberishWord(v)) return "Please enter a real city name.";
  return null;
}

export function validateAddress(raw: string): string | null {
  const v = (raw ?? "").trim();
  if (v.length < 10) return "Address must be at least 10 characters (street, building, etc.).";
  if (v.length > 300) return "Address is too long.";
  if (ARABIC_RE.test(v)) return "Please enter your address in English letters only.";
  // Must contain at least one digit OR more than one word — to avoid "asdf".
  const words = v.split(/\s+/).filter(Boolean);
  if (words.length < 2 && !/\d/.test(v)) return "Please enter a complete address.";
  if (hasGibberishWord(v)) return "Please enter a real address.";
  return null;
}

export function validateCountry(raw: string): string | null {
  return raw && raw.trim() ? null : "Please select your country.";
}
export function validateDegree(raw: string): string | null {
  return raw && raw.trim() ? null : "Please select your degree.";
}
export function validateGermanLevel(raw: string): string | null {
  return raw && raw.trim() ? null : "Please select your German level.";
}
