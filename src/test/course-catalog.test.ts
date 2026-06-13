import { describe, it, expect } from "vitest";
import { COURSES, SUBSCRIPTION_COURSE, getCourse, courseFromRecord } from "@/lib/courseCatalog";

describe("Course catalogue", () => {
  it("exposes the full set of courses", () => {
    expect(COURSES.length).toBeGreaterThanOrEqual(9);
  });

  it("gives every course a unique id", () => {
    const ids = COURSES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("requires every course to carry the fields the UI relies on", () => {
    for (const c of COURSES) {
      expect(c.id, "id").toBeTruthy();
      expect(c.title, `title for ${c.id}`).toBeTruthy();
      expect(c.priceId, `priceId for ${c.id}`).toBeTruthy();
      expect(typeof c.price, `price for ${c.id}`).toBe("number");
      expect(c.price, `price for ${c.id}`).toBeGreaterThan(0);
      expect(["subscription", "one_time"]).toContain(c.type);
      expect(["clinical", "language", "career"]).toContain(c.category);
      expect(Array.isArray(c.modules), `modules for ${c.id}`).toBe(true);
      expect(c.modules.length, `modules for ${c.id}`).toBeGreaterThan(0);
      expect(c.color, `color for ${c.id}`).toBeTruthy();
    }
  });

  it("has Medical German as the primary subscription course", () => {
    const subs = COURSES.filter((c) => c.type === "subscription");
    expect(subs.length).toBeGreaterThanOrEqual(1);
    expect(SUBSCRIPTION_COURSE.id).toBe("medical-german");
    expect(SUBSCRIPTION_COURSE.interval).toBe("month");
  });

  it("verification-required courses must be subscription type", () => {
    for (const c of COURSES) {
      if (c.requires_verification) {
        expect(c.type, `${c.id} requires verification so must be a subscription`).toBe("subscription");
      }
    }
  });

  it("resolves known courses and returns undefined for unknown ids", () => {
    expect(getCourse("medical-german")?.title).toBe("Medizinisches Deutsch");
    expect(getCourse("does-not-exist")).toBeUndefined();
  });

  it("keeps Medical German as the only visible price (others coming soon)", () => {
    // Business rule from the recent feature: hide prices for everything except Medical German
    expect(SUBSCRIPTION_COURSE.price_hidden).toBeFalsy();
    const visibleOneTime = COURSES.filter((c) => c.type === "one_time" && !c.price_hidden);
    // No one-time course should currently be publicly priced
    expect(visibleOneTime).toHaveLength(0);
  });
});

describe("courseFromRecord — DB row → Course mapping", () => {
  it("maps a fully-populated row using the row's own values", () => {
    const c = courseFromRecord({
      id: "custom-x", title: "Custom X", title_ar: "كورس", subtitle: "Sub",
      description: "Desc", price_eur: 42, course_type: "one_time", is_subscription: false,
      category: "clinical", requires_verification: false, duration_weeks: "6 weeks",
      level: "Advanced", price_hidden: false, modules: ["A", "B"],
    } as never);
    expect(c.id).toBe("custom-x");
    expect(c.title).toBe("Custom X");
    expect(c.price).toBe(42);
    expect(c.type).toBe("one_time");
    expect(c.category).toBe("clinical");
    expect(c.modules).toEqual(["A", "B"]);
    expect(c.price_hidden).toBe(false);
  });

  it("falls back to the static catalogue for a known id with empty fields", () => {
    const c = courseFromRecord({ id: "medical-german", price_eur: null, modules: null } as never);
    expect(c.title).toBeTruthy();        // filled from the static fallback
    expect(c.type).toBe("subscription"); // medical-german is a subscription
    expect(c.modules.length).toBeGreaterThan(0);
  });

  it("uses safe defaults for an unknown id with missing fields", () => {
    const c = courseFromRecord({ id: "ghost", price_eur: undefined, modules: undefined } as never);
    expect(c.title).toBeTruthy();
    expect(Array.isArray(c.modules)).toBe(true);
    expect(typeof c.price).toBe("number");
    expect(c.type).toBe("one_time");     // no flag, no fallback → default
    expect(c.category).toBe("clinical"); // default category
  });

  it("parses modules supplied as a JSON string", () => {
    const c = courseFromRecord({ id: "ghost2", modules: JSON.stringify(["m1", "m2"]) } as never);
    expect(c.modules).toEqual(["m1", "m2"]);
  });

  it("parses modules supplied as a newline-delimited string", () => {
    const c = courseFromRecord({ id: "ghost3", modules: "line1\nline2\n" } as never);
    expect(c.modules).toEqual(["line1", "line2"]);
  });

  it("derives subscription type from the is_subscription flag", () => {
    const c = courseFromRecord({ id: "ghost4", is_subscription: true } as never);
    expect(c.type).toBe("subscription");
  });
});
