import { Resend } from "resend";

// Shared transactional-email helper. Wraps Resend so routes don't each
// re-read env / re-instantiate the client, and gives every email the same
// branded shell. Resend's SDK resolves with { data, error } and does NOT
// throw on API-level failures, so callers must inspect the returned error.

const FROM = process.env.RESEND_FROM ?? "Cuequill <hello@cuequill.com>";
const REPLY_TO = process.env.RESEND_REPLY_TO;

let _resend: Resend | null = null;
function getResend(): Resend {
  if (_resend) return _resend;
  _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// Whether email is configured at all. Routes can degrade gracefully (or
// log) when it isn't, rather than throwing.
export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!emailConfigured()) {
    return { ok: false, error: "RESEND_API_KEY is not set" };
  }
  const { data, error } = await getResend().emails.send({
    from: FROM,
    to: opts.to,
    ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  if (error) {
    return { ok: false, error: error.message ?? JSON.stringify(error) };
  }
  return { ok: !!data };
}

// Dark, minimal branded shell shared by transactional emails. Inline
// styles only - email clients strip <style> and class-based CSS.
function shell(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0e0e10;">
    <div style="display:none;max-height:0;overflow:hidden;">&nbsp;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0e10;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#161618;border:1px solid rgba(255,255,255,0.08);border-radius:16px;">
            <tr>
              <td style="padding:32px 32px 28px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e8e8ea;">
                <div style="font-size:17px;font-weight:600;letter-spacing:-0.01em;color:#ffffff;margin-bottom:24px;">
                  Cuequill
                </div>
                ${bodyHtml}
              </td>
            </tr>
          </table>
          <div style="max-width:440px;margin-top:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:rgba(255,255,255,0.35);">
            Cuequill is a trading journal and analytics tool. It is not a broker
            or financial adviser, and nothing in the app is financial advice.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const BTN = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:rgba(20,184,166,0.15);border:1px solid rgba(20,184,166,0.4);color:#5eead4;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:999px;">${label}</a>`;

// Password-reset email. The link carries a single-use token; the plain
// paragraph text mirrors the HTML for text-only clients.
export function renderPasswordResetEmail(opts: {
  firstname?: string;
  resetUrl: string;
  expiresMinutes: number;
}): { subject: string; html: string; text: string } {
  const hi = opts.firstname ? `Hi ${opts.firstname},` : "Hi,";
  const subject = "Reset your Cuequill password";
  const html = shell(`
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.75);">${hi}</p>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.75);">
      We received a request to reset the password for your account. Click the
      button below to choose a new one. This link expires in
      ${opts.expiresMinutes} minutes.
    </p>
    <p style="margin:0 0 24px 0;">${BTN(opts.resetUrl, "Reset password")}</p>
    <p style="margin:0 0 8px 0;font-size:12.5px;line-height:1.6;color:rgba(255,255,255,0.45);">
      If the button doesn't work, paste this link into your browser:
    </p>
    <p style="margin:0 0 24px 0;font-size:12.5px;line-height:1.6;word-break:break-all;">
      <a href="${opts.resetUrl}" style="color:#5eead4;">${opts.resetUrl}</a>
    </p>
    <p style="margin:0;font-size:12.5px;line-height:1.6;color:rgba(255,255,255,0.45);">
      If you didn't ask to reset your password, you can safely ignore this
      email - your password won't change.
    </p>
  `);
  const text = `${hi}

We received a request to reset the password for your Cuequill account. Open the link below to choose a new one. This link expires in ${opts.expiresMinutes} minutes.

${opts.resetUrl}

If you didn't ask to reset your password, you can safely ignore this email - your password won't change.`;
  return { subject, html, text };
}

// Launch-day "we're open" email, sent to the waitlist once launch passes.
// `url` is where the button points (the sign-in page).
export function renderLaunchEmail(opts: {
  firstname?: string;
  url: string;
}): { subject: string; html: string; text: string } {
  const hi = opts.firstname ? `Hi ${opts.firstname},` : "Hi,";
  const subject = "Cuequill is open";
  const html = shell(`
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.75);">${hi}</p>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.75);">
      Cuequill is now open. Sign in to the account you reserved - or, if you
      haven't set one up yet, it only takes a minute to create one.
    </p>
    <p style="margin:0 0 24px 0;">${BTN(opts.url, "Open Cuequill")}</p>
    <p style="margin:0 0 8px 0;font-size:12.5px;line-height:1.6;color:rgba(255,255,255,0.45);">
      If the button doesn't work, paste this link into your browser:
    </p>
    <p style="margin:0;font-size:12.5px;line-height:1.6;word-break:break-all;">
      <a href="${opts.url}" style="color:#5eead4;">${opts.url}</a>
    </p>
  `);
  const text = `${hi}

Cuequill is now open. Sign in to the account you reserved - or, if you haven't set one up yet, it only takes a minute to create one.

${opts.url}`;
  return { subject, html, text };
}
