import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  emailLayout, emailHeading, emailSubheading, emailParagraph,
  emailDetailRow, emailDetailTable, emailNotice, emailSignature,
} from "../_shared/email-template.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

interface ApplicationPayload {
  fullName:       string;
  email:          string;
  country:        string;
  degree:         string;
  germanLevel:    string;
  courseId:       string;
  motivation:     string;
}

function sanitize(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

async function sendEmail(to: string[], subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: "SSRA Academy <noreply@ssracourses.com>", to, reply_to: "info@ssracourses.com", subject, html }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const COURSE_NAMES: Record<string, string> = {
  "medical-german":          "Medizinisches Deutsch",
  "sport-rehab-basics":      "Grundlagen der Sportrehabilitation",
  "bewegungsanalyse":        "Bewegungsanalyse & Funktionsdiagnostik",
  "sporttherapie-praxis":    "Sporttherapie in der deutschen Praxis",
  "therapeutisches-training":"Therapeutisches Training",
  "anatomie-rehab":          "Anatomie für Sport-Reha",
  "telefonkommunikation":    "Telefonkommunikation im Gesundheitswesen",
  "berufseinstieg":          "Berufseinstieg & Anerkennung in Deutschland",
  "dosb-vorbereitung":       "DOSB-Lizenz Vorbereitung",
};

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Require an authenticated Supabase session
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const d: ApplicationPayload = await req.json();

    // Prevent abuse: applicant email must match the authenticated account.
    const authEmail = (userData.user.email ?? "").toLowerCase().trim();
    const submittedEmail = (d.email ?? "").toLowerCase().trim();
    if (!submittedEmail || submittedEmail !== authEmail) {
      return new Response(
        JSON.stringify({ error: "Recipient email must match your account email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }


    // 1) Confirmation to applicant
    const studentHtml = emailLayout(`
      ${emailHeading("تم استلام طلبك — Application Received!")}
      ${emailParagraph(`مرحباً ${sanitize(d.fullName)},`)}
      ${emailParagraph("شكراً جزيلاً على تقديمك للأكاديمية SSRA. سنراجع طلبك ونتواصل معك خلال 3–5 أيام عمل.")}
      ${emailParagraph("Thank you for applying to SSRA Academy. We review every application personally and will be in touch within 3–5 business days.")}
      ${emailSubheading("Application Summary")}
      ${emailDetailTable(
        emailDetailRow("Name", sanitize(d.fullName)) +
        emailDetailRow("Email", sanitize(d.email)) +
        emailDetailRow("Country", sanitize(d.country)) +
        emailDetailRow("Degree", sanitize(d.degree)) +
        emailDetailRow("German Level", sanitize(d.germanLevel || "—")) +
        emailDetailRow("Course Interest", COURSE_NAMES[d.courseId] ?? d.courseId ?? "—")
      )}
      ${emailNotice("If you have any questions while you wait, feel free to reply to this email or write us at <a href='mailto:info@ssracourses.com' style='color:#1d4ed8;'>info@ssracourses.com</a>.")}
      ${emailSignature()}
    `);

    await sendEmail([d.email], "Application Received — SSRA Academy", studentHtml);

    // 2) Notification to admin
    const adminHtml = emailLayout(`
      ${emailHeading("New Application Received")}
      ${emailSubheading("Applicant Details")}
      ${emailDetailTable(
        emailDetailRow("Name", sanitize(d.fullName)) +
        emailDetailRow("Email", `<a href="mailto:${sanitize(d.email)}" style="color:#1d4ed8;">${sanitize(d.email)}</a>`) +
        emailDetailRow("Country", sanitize(d.country || "—")) +
        emailDetailRow("Degree", sanitize(d.degree || "—")) +
        emailDetailRow("German Level", sanitize(d.germanLevel || "—")) +
        emailDetailRow("Course Interest", COURSE_NAMES[d.courseId] ?? d.courseId ?? "—")
      )}
      ${emailSubheading("Motivation")}
      <div style="background:#f8fafc;border-radius:8px;padding:14px 16px;margin:12px 0;">
        <p style="margin:0;font-size:13px;color:#334155;line-height:1.65;white-space:pre-wrap;">${sanitize(d.motivation || "—")}</p>
      </div>
      ${emailNotice("Review this application in the <a href='https://ssracourses.com/ssra-admin/verifications' style='color:#1d4ed8;'>Admin Portal → Verifications</a>.")}
    `);

    try {
      await sendEmail(["info@ssracourses.com"], `New Application: ${sanitize(d.fullName)} (${sanitize(d.country || "")})`, adminHtml);
    } catch (adminErr) {
      console.error("Admin notification failed (non-blocking):", adminErr);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: unknown) {
    console.error("send-application-email error:", err);
    return new Response(JSON.stringify({ error: "Failed to send email" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
