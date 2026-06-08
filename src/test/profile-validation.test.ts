import { describe, it, expect } from "vitest";

// Mirrors the regex used in CompleteProfile.tsx and the DB CHECK on ssra_profiles.
const LATIN_NAME = /^[A-Za-z][A-Za-z \-\.']*$/;
const LATIN_TEXT = /^[A-Za-z][A-Za-z0-9 \-\.,/()']*$/;

describe("Latin-only profile validation", () => {
  it("rejects Arabic full names", () => {
    for (const s of ["محمد", "أحمد علي", "Mohamed محمد"]) {
      expect(LATIN_NAME.test(s)).toBe(false);
    }
  });

  it("rejects Arabic country names", () => {
    expect(LATIN_NAME.test("مصر")).toBe(false);
    expect(LATIN_NAME.test("السعودية")).toBe(false);
  });

  it("accepts Latin full names with common punctuation", () => {
    for (const s of ["Mohamed Ali", "Anna-Marie", "O'Brien", "Jean-Luc Picard"]) {
      expect(LATIN_NAME.test(s)).toBe(true);
    }
  });

  it("accepts Latin country names", () => {
    for (const s of ["Germany", "United Kingdom", "Cote d'Ivoire"]) {
      expect(LATIN_NAME.test(s)).toBe(true);
    }
  });

  it("accepts degree strings with digits and parens", () => {
    for (const s of ["B.Sc. Computer Science (Hons.)", "MSc Engineering, 2020"]) {
      expect(LATIN_TEXT.test(s)).toBe(true);
    }
  });

  it("rejects mixed Arabic in degree", () => {
    expect(LATIN_TEXT.test("بكالوريوس")).toBe(false);
  });
});
