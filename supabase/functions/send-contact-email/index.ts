import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  emailLayout, emailHeading, emailSubheading, emailParagraph,
  emailDetailRow, emailDetailTable, emailNotice, emailSignature,
} from "../_shared/email-template.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactFormRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

function validateInput(data: ContactFormRequest): { valid: boolean; error?: string } {
  if (!data.name || typeof data.name !== "string") return { valid: false, error: "Name is required" };
  if (data.name.trim().length === 0) return { valid: false, error: "Name cannot be empty" };
  if (data.name.length > MAX_NAME_LENGTH) return { valid: false, error: `Name must be less than ${MAX_NAME_LENGTH} characters` };
  if (!data.email || typeof data.email !== "string") return { valid: false, error: "Email is required" };
  if (!EMAIL_REGEX.test(data.email.trim())) return { valid: false, error: "Invalid email format" };
  if (data.email.length > MAX_EMAIL_LENGTH) return { valid: false, error: `Email must be less than ${MAX_EMAIL_LENGTH} characters` };
  if (!data.subject || typeof data.subject !== "string") return { valid: false, error: "Subject is required" };
  if (data.subject.trim().length === 0) return { valid: false, error: "Subject cannot be empty" };
  if (data.subject.length > MAX_SUBJECT_LENGTH) return { valid: false, error: `Subject must be less than ${MAX_SUBJECT_LENGTH} characters` };
  if (!data.message || typeof data.message !== "string") return { valid: false, error: "Message is required" };
  if (data.message.trim().length === 0) return { valid: false, error: "Message cannot be empty" };
  if (data.message.length > MAX_MESSAGE_LENGTH) return { valid: false, error: `Message must be less than ${MAX_MESSAGE_LENGTH} characters` };
  return { valid: true };
}

function sanitizeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function getSafeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("required") || message.includes("empty")) return "Missing required information. Please fill in all fields.";
  if (message.includes("format") || message.includes("invalid")) return "Invalid input format. Please check your data and try again.";
  if (message.includes("less than") || message.includes("too long")) return "Input exceeds maximum length. Please shorten your text.";
  return "Unable to send your message. Please try again later or contact support directly.";
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ContactFormRequest = await req.json();
    const validation = validateInput(data);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const safeName = sanitizeHtml(data.name.trim());
    const safeEmail = sanitizeHtml(data.email.trim());
    const safeSubject = sanitizeHtml(data.subject.trim());
    const safeMessage = sanitizeHtml(data.message.trim());

    const content = `
      ${emailHeading("Neue Kontaktanfrage")}
      ${emailSubheading("Absender")}
      ${emailDetailTable(
        emailDetailRow("Name", safeName) +
        emailDetailRow("E-Mail", `<a href="mailto:${safeEmail}" style="color:#7a4a2a;">${safeEmail}</a>`) +
        emailDetailRow("Betreff", safeSubject)
      )}
      ${emailSubheading("Nachricht")}
      <div style="background:#faf8f5;border-radius:8px;padding:14px 16px;margin:12px 0;">
        <p style="margin:0;font-size:13px;color:#2d2926;line-height:1.65;white-space:pre-wrap;">${safeMessage}</p>
      </div>
    `;

    // 1) Send notification to SSRA team
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "SSRA Academy <noreply@ssracourses.com>",
        to: ["info@ssracourses.com"],
        reply_to: data.email.trim(),
        subject: `Kontaktformular: ${safeSubject}`,
        html: emailLayout(content),
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error("Failed to send email");
    }

    const result = await emailResponse.json();
    console.log("Contact form email sent successfully:", result);

    // 2) Send confirmation email to customer
    const confirmationContent = `
      ${emailHeading("Vielen Dank für Ihre Nachricht!")}
      ${emailParagraph(`Hallo ${safeName},`)}
      ${emailParagraph("wir haben Ihre Nachricht erhalten und werden uns so schnell wie möglich bei Ihnen melden.")}
      ${emailSubheading("Ihre Nachricht")}
      ${emailDetailTable(
        emailDetailRow("Betreff", safeSubject)
      )}
      <div style="background:#faf8f5;border-radius:8px;padding:14px 16px;margin:12px 0;">
        <p style="margin:0;font-size:13px;color:#2d2926;line-height:1.65;white-space:pre-wrap;">${safeMessage}</p>
      </div>
      ${emailParagraph("Falls Sie weitere Fragen haben, können Sie direkt auf diese E-Mail antworten.")}
      ${emailSignature()}
    `;

    try {
      const confirmResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "SSRA Academy <noreply@ssracourses.com>",
          to: [data.email.trim()],
          reply_to: "info@ssracourses.com",
          subject: "Wir haben Ihre Nachricht erhalten – SSRA Academy",
          html: emailLayout(confirmationContent),
        }),
      });

      if (!confirmResponse.ok) {
        const confirmError = await confirmResponse.text();
        console.error("Confirmation email failed (non-blocking):", confirmError);
      } else {
        console.log("Confirmation email sent to:", data.email.trim());
      }
    } catch (confirmErr) {
      console.error("Confirmation email error (non-blocking):", confirmErr);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-contact-email function:", error);
    return new Response(JSON.stringify({ error: getSafeErrorMessage(error) }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
