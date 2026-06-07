import { describe, it, expect } from "vitest";
import { COURSES, SUBSCRIPTION_COURSE, getCourse } from "@/lib/courseCatalog";

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

  it("only requires verification on the subscription course", () => {
    for (const c of COURSES) {
      if (c.requires_verification) {
        expect(c.type, `${c.id} requires verification so must be a subscription`).toBe("subscription");
      }
    }
    expect(SUBSCRIPTION_COURSE.requires_verification).toBe(true);
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
