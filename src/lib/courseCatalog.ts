import { coursePriceId } from "@/lib/paddle";

/* ── Course catalogue with pricing ── */
export type CourseType = "subscription" | "one_time";

export interface Course {
  id: string;
  title: string;
  titleAr: string;
  subtitle: string;
  desc: string;
  price: number;         // EUR
  interval?: "month";
  type: CourseType;
  priceId: string;       // Paddle external price ID
  category: "clinical" | "language" | "career";
  weeks: string;
  level: string;
  requires_verification: boolean;
  modules: string[];
  color: string;
  price_hidden?: boolean; // if true: hide price and show "Coming Soon" on public pages
  paymentLink?: string;
}

export interface CourseRecord {
  id: string;
  title: string | null;
  title_ar: string | null;
  subtitle: string | null;
  description: string | null;
  price_eur: number | string | null;
  course_type: string | null;
  category: string | null;
  requires_verification: boolean | null;
  duration_weeks: string | null;
  level: string | null;
  price_hidden: boolean | null;
  modules: unknown;
  is_subscription?: boolean | null;
}

/**
 * NOTE: The €1 "test-course" exists ONLY in the database (ssra_courses) for
 * admin/QA testing of the checkout flow via the direct URL
 * `/checkout?courseId=test-course`. It is intentionally NOT listed in this
 * public catalogue so it never appears on the homepage, /courses, /pricing,
 * or anywhere else a customer can see it.
 */
const ALL_COURSES: Course[] = [


  /* ── LANGUAGE (subscription) ── */
  {
    id: "medical-german",
    title: "Medizinisches Deutsch",
    titleAr: "الألمانية الطبية",
    subtitle: "German for Sports Scientists — Monthly Subscription",
    desc: "The cornerstone subscription course. Medical vocabulary, clinic conversations, patient communication, and B1 exam prep — all in Arabic-guided modules. New content every month.",
    price: 0,
    interval: "month",
    type: "subscription",
    priceId: coursePriceId("medical-german", true),
    category: "language",
    weeks: "Ongoing",
    level: "A0 → B1",
    requires_verification: false,
    modules: ["Body & movement vocabulary", "Clinic conversations", "Written report templates", "Patient explanation scripts", "B1 exam preparation"],
    color: "from-emerald-600 to-teal-800",
  },

  /* ── CLINICAL (one-time) ── */
  {
    id: "sport-rehab-basics",
    price_hidden: true,
    title: "Grundlagen der Sportrehabilitation",
    titleAr: "أسس التأهيل الرياضي",
    subtitle: "Basics of Sports Rehabilitation",
    desc: "Anatomy, physiology, and therapeutic principles used in German rehabilitation clinics. Includes case studies from real German practice.",
    price: 49,
    type: "one_time",
    priceId: coursePriceId("sport-rehab-basics"),
    category: "clinical",
    weeks: "8 weeks",
    level: "Beginner",
    requires_verification: false,
    modules: ["Anatomical foundations", "Movement pathology", "Rehabilitation planning", "German clinical standards", "Case study practice"],
    color: "from-blue-600 to-blue-800",
  },
  {
    id: "bewegungsanalyse",
    title: "Bewegungsanalyse & Funktionsdiagnostik",
    titleAr: "تحليل الحركة والتشخيص الوظيفي",
    subtitle: "Movement Analysis & Functional Diagnostics",
    desc: "Observational and measurement tools used in German sports therapy — gait analysis, FMS, and documentation in German.",
    price: 59,
    type: "one_time",
    priceId: coursePriceId("bewegungsanalyse"),
    category: "clinical",
    weeks: "6 weeks",
    level: "Intermediate",
    requires_verification: false,
    modules: ["Gait analysis", "FMS protocols", "Video analysis tools", "German report writing", "Client communication"],
    color: "from-indigo-600 to-indigo-800",
    price_hidden: true,
  },
  {
    id: "sporttherapie-praxis",
    title: "Sporttherapie in der deutschen Praxis",
    titleAr: "العلاج الرياضي في الممارسة الألمانية",
    subtitle: "Sports Therapy in German Practice",
    desc: "Patient intake, treatment planning, GKV documentation, and ethical standards — everything you need to practise sports therapy in Germany.",
    price: 79,
    type: "one_time",
    priceId: coursePriceId("sporttherapie-praxis"),
    category: "clinical",
    weeks: "10 weeks",
    level: "Intermediate",
    requires_verification: false,
    modules: ["Patient intake process", "Treatment planning", "GKV documentation", "Professional ethics", "Referral systems"],
    color: "from-violet-600 to-violet-800",
    price_hidden: true,
  },
  {
    id: "anatomie-rehab",
    title: "Anatomie für Sport-Reha",
    titleAr: "التشريح للتأهيل الرياضي",
    subtitle: "Applied Anatomy for Rehabilitation",
    desc: "Functional anatomy focused on the musculoskeletal system, applied directly to rehabilitation decisions. Taught in Arabic with German terminology.",
    price: 39,
    type: "one_time",
    priceId: coursePriceId("anatomie-rehab"),
    category: "clinical",
    weeks: "5 weeks",
    level: "Beginner",
    requires_verification: false,
    modules: ["Skeletal anatomy", "Muscle function", "Joint mechanics", "Common injuries in sport", "German anatomical terms"],
    color: "from-cyan-600 to-cyan-800",
    price_hidden: true,
  },
  {
    id: "therapeutisches-training",
    title: "Therapeutisches Training",
    titleAr: "التدريب العلاجي",
    subtitle: "Therapeutic Exercise & Prescription",
    desc: "Designing and prescribing therapeutic exercise programmes in line with German clinical guidelines and evidence-based practice.",
    price: 55,
    type: "one_time",
    priceId: coursePriceId("therapeutisches-training"),
    category: "clinical",
    weeks: "7 weeks",
    level: "Intermediate",
    requires_verification: false,
    modules: ["Exercise prescription principles", "Progressive overload in rehab", "Group vs. individual therapy", "Documentation & billing", "Real clinic protocols"],
    color: "from-sky-600 to-sky-800",
    price_hidden: true,
  },

  /* ── LANGUAGE / COMMUNICATION ── */
  {
    id: "telefonkommunikation",
    title: "Telefonkommunikation im Gesundheitswesen",
    titleAr: "التواصل الهاتفي في الرعاية الصحية",
    subtitle: "Phone Communication in German Healthcare",
    desc: "Real-scenario simulations — booking appointments, calling health insurance, following up referrals. Designed for those with A2+ German.",
    price: 29,
    type: "one_time",
    priceId: coursePriceId("telefonkommunikation"),
    category: "language",
    weeks: "4 weeks",
    level: "A2+",
    requires_verification: false,
    modules: ["Appointment booking phrases", "Insurance call scripts", "Referral follow-ups", "Complaint handling", "Role-play practice"],
    color: "from-amber-600 to-amber-800",
    price_hidden: true,
  },

  /* ── CAREER ── */
  {
    id: "berufseinstieg",
    title: "Berufseinstieg & Anerkennung in Deutschland",
    titleAr: "الدخول المهني والاعتراف بالمؤهلات في ألمانيا",
    subtitle: "Career Entry & Credential Recognition in Germany",
    desc: "Credential recognition, German CV and cover letter, job platforms for healthcare, visa options, and integration support.",
    price: 49,
    type: "one_time",
    priceId: coursePriceId("berufseinstieg"),
    category: "career",
    weeks: "6 weeks",
    level: "All levels",
    requires_verification: false,
    modules: ["Credential recognition process", "Lebenslauf & Anschreiben", "Healthcare job platforms", "Visa & residence options", "Integration support"],
    color: "from-rose-600 to-rose-800",
    price_hidden: true,
  },
  {
    id: "dosb-vorbereitung",
    title: "DOSB-Lizenz Vorbereitung",
    titleAr: "التحضير للترخيص الألماني DOSB",
    subtitle: "German Sports Federation Licence Prep",
    desc: "A structured preparation course for the DOSB (Deutscher Olympischer Sportbund) licensing examinations, covering all tested domains.",
    price: 69,
    type: "one_time",
    priceId: coursePriceId("dosb-vorbereitung"),
    category: "career",
    weeks: "8 weeks",
    level: "Advanced",
    requires_verification: false,
    modules: ["DOSB exam structure", "Sports science theory", "German sports law", "Practical assessment prep", "Mock exams"],
    color: "from-orange-600 to-orange-800",
    price_hidden: true,
  },
  {
    id: "test-course",
    title: "Test Course (€1/mo)",
    titleAr: "كورس تجريبي",
    subtitle: "Internal QA checkout test — €1/month",
    desc: "Hidden test course used only for QA of the checkout flow.",
    price: 1,
    interval: "month",
    type: "subscription",
    priceId: coursePriceId("test-course", true),
    category: "clinical",
    weeks: "Ongoing",
    level: "QA",
    requires_verification: false,
    modules: ["QA checkout test"],
    color: "from-slate-600 to-slate-800",
  },
];

const TEST_COURSE = ALL_COURSES.find((c) => c.id === "test-course")!;

const COURSE_BY_ID = new Map(ALL_COURSES.map((course) => [course.id, course]));

const CATEGORY_COLORS: Record<Course["category"], string> = {
  clinical: "from-blue-600 to-blue-800",
  language: "from-emerald-600 to-teal-800",
  career: "from-rose-600 to-rose-800",
};

function normalizeCourseType(row: CourseRecord, fallback?: Course): CourseType {
  if (row.course_type === "subscription" || row.is_subscription) return "subscription";
  if (row.course_type === "one_time") return "one_time";
  return fallback?.type ?? "one_time";
}

function normalizeCategory(value: string | null | undefined, fallback?: Course): Course["category"] {
  if (value === "clinical" || value === "language" || value === "career") return value;
  return fallback?.category ?? "clinical";
}

function normalizeModules(value: unknown, fallback?: Course): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.split("\n").map((item) => item.trim()).filter(Boolean);
    }
  }
  return fallback?.modules ?? [];
}

export function courseFromRecord(row: CourseRecord): Course {
  const fallback = COURSE_BY_ID.get(row.id);
  const type = normalizeCourseType(row, fallback);
  const category = normalizeCategory(row.category, fallback);

  return {
    id: row.id,
    title: row.title?.trim() || fallback?.title || "Untitled course",
    titleAr: row.title_ar?.trim() || fallback?.titleAr || "",
    subtitle: row.subtitle?.trim() || fallback?.subtitle || row.title?.trim() || "Course",
    desc: row.description?.trim() || fallback?.desc || row.subtitle?.trim() || "Course details will be announced soon.",
    price: Number(row.price_eur ?? fallback?.price ?? 0),
    interval: type === "subscription" ? "month" : undefined,
    type,
    priceId: coursePriceId(row.id, type === "subscription"),
    category,
    weeks: row.duration_weeks?.trim() || fallback?.weeks || "To be announced",
    level: row.level?.trim() || fallback?.level || "All levels",
    requires_verification: !!row.requires_verification,
    modules: normalizeModules(row.modules, fallback),
    color: fallback?.color ?? CATEGORY_COLORS[category],
    price_hidden: !!row.price_hidden,
    paymentLink: fallback?.paymentLink,
  };
}

/** Public course catalogue — excludes the internal QA "test-course". */
export const COURSES: Course[] = ALL_COURSES.filter((c) => c.id !== "test-course");

export function getCourse(id: string) {
  if (id === "test-course") return TEST_COURSE;
  return ALL_COURSES.find((c) => c.id === id);
}

export const SUBSCRIPTION_COURSE = COURSES.find((c) => c.type === "subscription")!;
