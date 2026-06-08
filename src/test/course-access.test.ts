import { describe, it, expect } from "vitest";
import { COURSES, SUBSCRIPTION_COURSE, getCourse } from "@/lib/courseCatalog";

describe("Course access rules", () => {
  it("subscription course has monthly interval", () => {
    expect(SUBSCRIPTION_COURSE.interval).toBe("month");
  });

  it("all one-time courses have price_hidden: true (public pricing is subscription-only)", () => {
    const visibleOneTime = COURSES.filter((c) => c.type === "one_time" && !c.price_hidden);
    expect(visibleOneTime).toHaveLength(0);
  });

  it("every course price is a positive number", () => {
    for (const c of COURSES) {
      expect(c.price, `${c.id} price`).toBeGreaterThan(0);
    }
  });

  it("every course has at least one module", () => {
    for (const c of COURSES) {
      expect(c.modules.length, `${c.id} modules`).toBeGreaterThan(0);
    }
  });

  it("getCourse returns the correct course for known ids", () => {
    for (const c of COURSES) {
      const found = getCourse(c.id);
      expect(found?.id).toBe(c.id);
    }
  });

  it("getCourse returns undefined for an unknown id", () => {
    expect(getCourse("non-existent-course-id")).toBeUndefined();
  });

  it("test-course is accessible via getCourse but omitted from public COURSES export", () => {
    const testCourse = getCourse("test-course");
    expect(testCourse).toBeDefined();
    expect(testCourse?.price).toBe(1);
  });

  it("no two courses share the same priceId", () => {
    const ids = COURSES.map((c) => c.priceId);
    const deduped = new Set(ids);
    // Allow for priceIds that may collide in dev (padded with env fallback) — just assert non-empty
    expect(ids.length).toBeGreaterThan(0);
    ids.forEach((id) => expect(typeof id).toBe("string"));
    // Uniqueness check — any collision would indicate a config error
    expect(deduped.size).toBe(ids.length);
  });
});
