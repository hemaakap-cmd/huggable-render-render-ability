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
