import { loadStripe } from "@stripe/stripe-js";

export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ""
);

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
  priceId: string;       // Stripe Price ID — set in .env or Stripe dashboard
  paymentLink?: string;  // Optional Stripe Payment Link (overrides checkout session flow)
  category: "clinical" | "language" | "career";
  weeks: string;
  level: string;
  requires_verification: boolean;
  modules: string[];
  color: string;
}

export const COURSES: Course[] = [
  /* ── LANGUAGE (subscription) ── */
  {
    id: "medical-german",
    title: "Medizinisches Deutsch",
    titleAr: "الألمانية الطبية",
    subtitle: "German for Sports Scientists — Monthly Subscription",
    desc: "The cornerstone subscription course. Medical vocabulary, clinic conversations, patient communication, and B1 exam prep — all in Arabic-guided modules. New content every month.",
    price: 29,
    interval: "month",
    type: "subscription",
    priceId: import.meta.env.VITE_STRIPE_PRICE_GERMAN_SUB ?? "price_german_sub",
    category: "language",
    weeks: "Ongoing",
    level: "A0 → B1",
    requires_verification: true,
    modules: ["Body & movement vocabulary", "Clinic conversations", "Written report templates", "Patient explanation scripts", "B1 exam preparation"],
    color: "from-emerald-600 to-teal-800",
  },

  /* ── CLINICAL (one-time) ── */
  {
    id: "sport-rehab-basics",
    title: "Grundlagen der Sportrehabilitation",
    titleAr: "أسس التأهيل الرياضي",
    subtitle: "Basics of Sports Rehabilitation",
    desc: "Anatomy, physiology, and therapeutic principles used in German rehabilitation clinics. Includes case studies from real German practice.",
    price: 49,
    type: "one_time",
    priceId: import.meta.env.VITE_STRIPE_PRICE_REHAB ?? "price_rehab",
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
    priceId: import.meta.env.VITE_STRIPE_PRICE_BEWEGUNG ?? "price_bewegung",
    category: "clinical",
    weeks: "6 weeks",
    level: "Intermediate",
    requires_verification: false,
    modules: ["Gait analysis", "FMS protocols", "Video analysis tools", "German report writing", "Client communication"],
    color: "from-indigo-600 to-indigo-800",
  },
  {
    id: "sporttherapie-praxis",
    title: "Sporttherapie in der deutschen Praxis",
    titleAr: "العلاج الرياضي في الممارسة الألمانية",
    subtitle: "Sports Therapy in German Practice",
    desc: "Patient intake, treatment planning, GKV documentation, and ethical standards — everything you need to practise sports therapy in Germany.",
    price: 79,
    type: "one_time",
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRAXIS ?? "price_praxis",
    category: "clinical",
    weeks: "10 weeks",
    level: "Intermediate",
    requires_verification: false,
    modules: ["Patient intake process", "Treatment planning", "GKV documentation", "Professional ethics", "Referral systems"],
    color: "from-violet-600 to-violet-800",
  },
  {
    id: "anatomie-rehab",
    title: "Anatomie für Sport-Reha",
    titleAr: "التشريح للتأهيل الرياضي",
    subtitle: "Applied Anatomy for Rehabilitation",
    desc: "Functional anatomy focused on the musculoskeletal system, applied directly to rehabilitation decisions. Taught in Arabic with German terminology.",
    price: 39,
    type: "one_time",
    priceId: import.meta.env.VITE_STRIPE_PRICE_ANATOMIE ?? "price_anatomie",
    category: "clinical",
    weeks: "5 weeks",
    level: "Beginner",
    requires_verification: false,
    modules: ["Skeletal anatomy", "Muscle function", "Joint mechanics", "Common injuries in sport", "German anatomical terms"],
    color: "from-cyan-600 to-cyan-800",
  },
  {
    id: "therapeutisches-training",
    title: "Therapeutisches Training",
    titleAr: "التدريب العلاجي",
    subtitle: "Therapeutic Exercise & Prescription",
    desc: "Designing and prescribing therapeutic exercise programmes in line with German clinical guidelines and evidence-based practice.",
    price: 55,
    type: "one_time",
    priceId: import.meta.env.VITE_STRIPE_PRICE_TRAINING ?? "price_training",
    category: "clinical",
    weeks: "7 weeks",
    level: "Intermediate",
    requires_verification: false,
    modules: ["Exercise prescription principles", "Progressive overload in rehab", "Group vs. individual therapy", "Documentation & billing", "Real clinic protocols"],
    color: "from-sky-600 to-sky-800",
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
    priceId: import.meta.env.VITE_STRIPE_PRICE_TELEFON ?? "price_telefon",
    category: "language",
    weeks: "4 weeks",
    level: "A2+",
    requires_verification: false,
    modules: ["Appointment booking phrases", "Insurance call scripts", "Referral follow-ups", "Complaint handling", "Role-play practice"],
    color: "from-amber-600 to-amber-800",
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
    priceId: import.meta.env.VITE_STRIPE_PRICE_BERUF ?? "price_beruf",
    category: "career",
    weeks: "6 weeks",
    level: "All levels",
    requires_verification: false,
    modules: ["Credential recognition process", "Lebenslauf & Anschreiben", "Healthcare job platforms", "Visa & residence options", "Integration support"],
    color: "from-rose-600 to-rose-800",
  },
  {
    id: "dosb-vorbereitung",
    title: "DOSB-Lizenz Vorbereitung",
    titleAr: "التحضير للترخيص الألماني DOSB",
    subtitle: "German Sports Federation Licence Prep",
    desc: "A structured preparation course for the DOSB (Deutscher Olympischer Sportbund) licensing examinations, covering all tested domains.",
    price: 69,
    type: "one_time",
    priceId: import.meta.env.VITE_STRIPE_PRICE_DOSB ?? "price_dosb",
    category: "career",
    weeks: "8 weeks",
    level: "Advanced",
    requires_verification: false,
    modules: ["DOSB exam structure", "Sports science theory", "German sports law", "Practical assessment prep", "Mock exams"],
    color: "from-orange-600 to-orange-800",
  },

  /* ── ADVANCED ANATOMY & PHYSIOLOGY ── */
  {
    id: "advanced-anatomy",
    title: "Funktionelle Anatomie für Leistungssport",
    titleAr: "التشريح الوظيفي للرياضة التنافسية",
    subtitle: "Advanced Functional Anatomy for Performance Sport",
    desc: "Deep dive into musculoskeletal and neural anatomy applied to elite sport rehabilitation and performance — taught with the German clinical terminology used in rehab centres and Vereine.",
    price: 59,
    type: "one_time",
    priceId: import.meta.env.VITE_STRIPE_PRICE_ADV_ANATOMY ?? "price_adv_anatomy",
    category: "clinical",
    weeks: "7 weeks",
    level: "Intermediate → Advanced",
    requires_verification: false,
    modules: ["Upper limb functional anatomy", "Lower limb & kinetic chain", "Spine, core & posture", "Neural & fascial systems", "German anatomical nomenclature"],
    color: "from-teal-600 to-teal-800",
  },
  {
    id: "exercise-physiology",
    title: "Sportphysiologie & Leistungsdiagnostik",
    titleAr: "فسيولوجيا الرياضة وتشخيص الأداء",
    subtitle: "Exercise Physiology & Performance Diagnostics",
    desc: "How the body responds and adapts to training — energy systems, cardio-respiratory function, lactate testing, VO2max protocols, and recovery science as practised in German Leistungsdiagnostik labs.",
    price: 65,
    type: "one_time",
    priceId: import.meta.env.VITE_STRIPE_PRICE_PHYSIOLOGY ?? "price_physiology",
    category: "clinical",
    weeks: "8 weeks",
    level: "Intermediate",
    requires_verification: false,
    modules: ["Energy systems & metabolism", "Cardio-respiratory adaptations", "Lactate & VO2max testing", "Strength & endurance physiology", "Recovery & overtraining"],
    color: "from-fuchsia-600 to-fuchsia-800",
  },
];

export function getCourse(id: string) {
  return COURSES.find((c) => c.id === id);
}

export const SUBSCRIPTION_COURSE = COURSES.find((c) => c.type === "subscription")!;
