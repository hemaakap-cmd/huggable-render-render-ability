import { describe, it, expect } from "vitest";
import { isProfileComplete, missingProfileFields, REQUIRED_PROFILE_FIELDS } from "@/lib/profileCompletion";

const FULL_PROFILE = {
  full_name: "Ahmed Hassan",
  phone_number: "+201234567890",
  country: "Egypt",
  city: "Cairo",
  address: "123 Test Street",
  degree: "Bachelor of Physical Therapy",
  german_level: "A1",
};

describe("profileCompletion", () => {
  describe("isProfileComplete", () => {
    it("returns true for a fully-filled profile", () => {
      expect(isProfileComplete(FULL_PROFILE)).toBe(true);
    });

    it("returns false for null", () => {
      expect(isProfileComplete(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isProfileComplete(undefined)).toBe(false);
    });

    it("returns false for empty object", () => {
      expect(isProfileComplete({})).toBe(false);
    });

    it("returns false when any single required field is missing", () => {
      for (const field of REQUIRED_PROFILE_FIELDS) {
        const { [field]: _omit, ...rest } = FULL_PROFILE as Record<string, string>;
        expect(isProfileComplete(rest as any), `missing ${field}`).toBe(false);
      }
    });

    it("returns false when a field is only whitespace", () => {
      expect(isProfileComplete({ ...FULL_PROFILE, full_name: "   " })).toBe(false);
      expect(isProfileComplete({ ...FULL_PROFILE, city: "" })).toBe(false);
    });

    it("returns false when a field is null", () => {
      expect(isProfileComplete({ ...FULL_PROFILE, country: null })).toBe(false);
    });
  });

  describe("missingProfileFields", () => {
    it("returns empty array for a complete profile", () => {
      expect(missingProfileFields(FULL_PROFILE)).toHaveLength(0);
    });

    it("returns all 7 fields for null input", () => {
      const missing = missingProfileFields(null);
      expect(missing).toHaveLength(REQUIRED_PROFILE_FIELDS.length);
      for (const f of REQUIRED_PROFILE_FIELDS) {
        expect(missing).toContain(f);
      }
    });

    it("returns the single missing field name", () => {
      const missing = missingProfileFields({ ...FULL_PROFILE, degree: "" });
      expect(missing).toEqual(["degree"]);
    });

    it("lists multiple missing fields", () => {
      const missing = missingProfileFields({ full_name: "Ahmed Hassan" });
      expect(missing.length).toBe(REQUIRED_PROFILE_FIELDS.length - 1);
      expect(missing).not.toContain("full_name");
    });
  });
});
