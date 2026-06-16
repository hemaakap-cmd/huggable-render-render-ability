// Pre-launch fallbacks for course meta when DB row isn't populated yet.
// Keeps the dashboard from ever showing empty/zero placeholders.

export type CourseMeta = {
  id: string;
  title: string;
  startDateISO: string;          // e.g. 2026-07-01
  startTime: string;             // "21:00"
  timezoneLabel: string;         // "CET (Germany)"
  cadence: string;               // "Every Tuesday"
  instructor: string;
  durationLabel: string;         // "41.8 hours"
  totalLessons: number;          // 32
};

export const COURSE_DEFAULTS: Record<string, CourseMeta> = {
  "medical-german": {
    id: "medical-german",
    title: "Medical German",
    startDateISO: "2026-07-01",
    startTime: "21:00",
    timezoneLabel: "CET (Germany)",
    cadence: "Every Tuesday",
    instructor: "Mr Mahmud Hammam",
    durationLabel: "41.8 hours",
    totalLessons: 32,
  },
};

export function resolveCourseMeta(
  courseId: string | null | undefined,
  liveRow?: {
    title?: string | null;
    start_date?: string | null;
    start_time?: string | null;
    duration?: string | null;
    instructor_name?: string | null;
  } | null,
): CourseMeta {
  const fallback = (courseId && COURSE_DEFAULTS[courseId]) || COURSE_DEFAULTS["medical-german"];
  return {
    ...fallback,
    title:           liveRow?.title           || fallback.title,
    startDateISO:    liveRow?.start_date      || fallback.startDateISO,
    startTime:       (liveRow?.start_time?.slice(0, 5)) || fallback.startTime,
    durationLabel:   liveRow?.duration        || fallback.durationLabel,
    instructor:      liveRow?.instructor_name || fallback.instructor,
  };
}

export function nextSessionDate(meta: CourseMeta): Date {
  // Combine startDateISO + startTime into a Date.
  // Stored time is in CET — we present the wall-clock value.
  const [h, m] = meta.startTime.split(":").map((n) => parseInt(n, 10) || 0);
  const d = new Date(meta.startDateISO + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
}

export function formatCourseDate(d: Date): string {
  return d.toLocaleDateString("en-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
