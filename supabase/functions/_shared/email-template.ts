// SSRA Academy branded HTML email building blocks

const PRIMARY   = "#1d4ed8"; // blue-700
const DARK      = "#0f172a"; // slate-900
const GOLD      = "#f59e0b"; // amber-500
const BG        = "#f8fafc"; // slate-50
const BORDER    = "#e2e8f0"; // slate-200
const TEXT      = "#334155"; // slate-700
const SUBTLE    = "#64748b"; // slate-500

export function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SSRA Academy</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;border:1px solid ${BORDER};overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:${DARK};padding:24px 32px;text-align:left;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:${GOLD};border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                  <span style="color:${DARK};font-size:18px;font-weight:bold;">S</span>
                </td>
                <td style="padding-left:10px;vertical-align:middle;">
                  <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.3px;">SSRA Academy</span>
                  <br/>
                  <span style="color:rgba(255,255,255,0.45);font-size:10px;letter-spacing:0.5px;text-transform:uppercase;">Sports Science & Rehabilitation</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:${BG};border-top:1px solid ${BORDER};padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:${SUBTLE};">
              SSRA Academy · ssracourses.com<br/>
              <a href="mailto:info@ssracourses.com" style="color:${SUBTLE};">info@ssracourses.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function emailHeading(text: string): string {
  return `<h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:${DARK};line-height:1.3;">${text}</h1>`;
}

export function emailSubheading(text: string): string {
  return `<h2 style="margin:20px 0 10px;font-size:13px;font-weight:600;color:${SUBTLE};text-transform:uppercase;letter-spacing:0.6px;">${text}</h2>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 14px;font-size:14px;color:${TEXT};line-height:1.65;">${text}</p>`;
}

export function emailDetailTable(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:8px;overflow:hidden;margin:12px 0;">${rows}</table>`;
}

export function emailDetailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 14px;font-size:12px;font-weight:600;color:${SUBTLE};width:130px;background:${BG};border-bottom:1px solid ${BORDER};">${label}</td>
    <td style="padding:10px 14px;font-size:13px;color:${TEXT};border-bottom:1px solid ${BORDER};">${value}</td>
  </tr>`;
}

export function emailNotice(text: string): string {
  return `<div style="background:#eff6ff;border-left:3px solid ${PRIMARY};border-radius:4px;padding:12px 16px;margin:16px 0;">
    <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.5;">${text}</p>
  </div>`;
}

export function emailSignature(): string {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid ${BORDER};padding-top:16px;width:100%;">
    <tr>
      <td>
        <p style="margin:0;font-size:13px;font-weight:600;color:${DARK};">SSRA Academy Team</p>
        <p style="margin:2px 0 0;font-size:12px;color:${SUBTLE};">
          <a href="mailto:info@ssracourses.com" style="color:${PRIMARY};text-decoration:none;">info@ssracourses.com</a>
           · ssracourses.com
        </p>
      </td>
    </tr>
  </table>`;
}
