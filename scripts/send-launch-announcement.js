/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * One-off: email the waitlist that Cuequill launches on 25 September.
 *
 * Reads a CSV exported from Tally (or any CSV containing an email column)
 * and sends the launch-announcement email to each address via Resend.
 * Safe to re-run: every address that sends successfully is appended to a
 * local log and skipped next time, so a re-run only picks up the rest.
 *
 * Dry-run by default (parses the CSV, dedupes, validates, writes an HTML
 * preview, and prints what it WOULD send). Add --apply to actually send.
 *
 * Usage:
 *   # 1. Export your waitlist from Tally as CSV (Submissions → Export).
 *   # 2. Dry-run - counts recipients + writes a preview you can open:
 *   node scripts/send-launch-announcement.js path/to/tally-export.csv
 *
 *   # 3. Send one test to yourself first:
 *   node scripts/send-launch-announcement.js --test you@example.com
 *
 *   # 4. Send for real:
 *   node scripts/send-launch-announcement.js path/to/tally-export.csv --apply
 *
 * Flags:
 *   --apply                actually send (otherwise dry-run)
 *   --test <email>         send a single test email to <email> and exit
 *   --file <path>          CSV path (also accepted as the first bare arg)
 *   --column <name>        force the email column header (else auto-detect)
 *   --name-column <name>   force the first-name column header (optional)
 *   --limit <n>            cap the number of sends this run
 *   --rate <ms>            delay between sends in ms (default 600 ≈ 1.6/s)
 *
 * Env (from .env, same loader as the other scripts):
 *   RESEND_API_KEY         required to send
 *   RESEND_FROM            e.g. "Cuequill <hello@cuequill.com>" (default used if unset)
 *   RESEND_REPLY_TO        optional reply-to
 *   NEXT_PUBLIC_APP_URL    homepage the button links to (default https://cuequill.com)
 */

const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");
const { Resend } = require("resend");

// ── Load .env (same minimal loader the other scripts use) ───────────────
(function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
})();

// ── Args ────────────────────────────────────────────────────────────────
function argValue(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const APPLY = process.argv.includes("--apply");
const TEST_TO = argValue("--test");
const FORCE_COLUMN = argValue("--column");
const NAME_COLUMN = argValue("--name-column");
const LIMIT = argValue("--limit") ? Number(argValue("--limit")) : Infinity;
const RATE_MS = argValue("--rate") ? Number(argValue("--rate")) : 600;
// CSV path: --file <path>, or the first bare (non-flag) argument.
const FILE =
  argValue("--file") ||
  process.argv.slice(2).find((a, idx) => {
    if (a.startsWith("--")) return false;
    // Skip a value that belongs to a preceding flag.
    const prev = process.argv.slice(2)[idx - 1];
    return !(prev && prev.startsWith("--"));
  });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://cuequill.com";
const FROM = process.env.RESEND_FROM || "Cuequill <hello@cuequill.com>";
const REPLY_TO = process.env.RESEND_REPLY_TO;
const SENT_LOG = path.join(__dirname, ".launch-announcement-sent.log");
const PREVIEW_HTML = path.join(__dirname, ".launch-announcement-preview.html");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Email content ─────────────────────────────────────────────────────────
// Self-contained render (this script can't import the app's TS email lib).
// Kept visually in step with src/lib/email.ts's dark, inline-styled shell.
function shell(bodyHtml) {
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
            You're receiving this because you joined the Cuequill waitlist.
            Cuequill is a trading journal and analytics tool. It is not a broker
            or financial adviser, and nothing in the app is financial advice.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const BTN = (href, label) =>
  `<a href="${href}" style="display:inline-block;background:rgba(20,184,166,0.15);border:1px solid rgba(20,184,166,0.4);color:#5eead4;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:999px;">${label}</a>`;

function renderAnnouncement(firstname) {
  const hi = firstname ? `Hi ${firstname},` : "Hi,";
  const subject = "Cuequill launches on 25 September";
  const html = shell(`
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.75);">${hi}</p>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.75);">
      The wait is nearly over — <strong style="color:#ffffff;">Cuequill goes
      live on 25 September</strong>. You're on the waitlist, so you'll be among
      the first through the door.
    </p>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.75);">
      Cuequill is the trading journal that actually works for you: log your
      trades, see the stats that matter, and get an edge from Quill AI over
      your own history. On launch day we'll email you a link to sign in and get
      started.
    </p>
    <p style="margin:0 0 24px 0;">${BTN(APP_URL, "See what's coming")}</p>
    <p style="margin:0 0 8px 0;font-size:12.5px;line-height:1.6;color:rgba(255,255,255,0.45);">
      If the button doesn't work, paste this link into your browser:
    </p>
    <p style="margin:0;font-size:12.5px;line-height:1.6;word-break:break-all;">
      <a href="${APP_URL}" style="color:#5eead4;">${APP_URL}</a>
    </p>
  `);
  const text = `${hi}

The wait is nearly over - Cuequill goes live on 25 September. You're on the waitlist, so you'll be among the first through the door.

Cuequill is the trading journal that actually works for you: log your trades, see the stats that matter, and get an edge from Quill AI over your own history. On launch day we'll email you a link to sign in and get started.

See what's coming: ${APP_URL}

You're receiving this because you joined the Cuequill waitlist.`;
  return { subject, html, text };
}

// ── CSV parsing ────────────────────────────────────────────────────────────
function pickColumn(fields, forced) {
  if (forced) return forced;
  // Prefer an exact-ish "email" header, then anything containing "mail".
  const lower = fields.map((f) => (f || "").toLowerCase().trim());
  let idx = lower.findIndex((f) => f === "email" || f === "email address");
  if (idx < 0) idx = lower.findIndex((f) => f.includes("mail"));
  return idx >= 0 ? fields[idx] : null;
}

function parseRecipients(csvText) {
  // First pass: assume a header row.
  const withHeader = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  const fields = withHeader.meta.fields || [];
  const emailCol = pickColumn(fields, FORCE_COLUMN);

  const out = [];
  if (emailCol) {
    for (const row of withHeader.data) {
      const email = String(row[emailCol] || "").trim().toLowerCase();
      if (!EMAIL_RE.test(email)) continue;
      const firstname = NAME_COLUMN
        ? String(row[NAME_COLUMN] || "").trim() || undefined
        : undefined;
      out.push({ email, firstname });
    }
    return out;
  }

  // Fallback: no email-like header — treat it as a headerless list and take
  // any cell that looks like an email address.
  const noHeader = Papa.parse(csvText, { header: false, skipEmptyLines: true });
  for (const row of noHeader.data) {
    for (const cell of row) {
      const email = String(cell || "").trim().toLowerCase();
      if (EMAIL_RE.test(email)) {
        out.push({ email, firstname: undefined });
        break;
      }
    }
  }
  return out;
}

function dedupe(recipients) {
  const seen = new Set();
  const out = [];
  for (const r of recipients) {
    if (seen.has(r.email)) continue;
    seen.add(r.email);
    out.push(r);
  }
  return out;
}

function loadSentSet() {
  if (!fs.existsSync(SENT_LOG)) return new Set();
  return new Set(
    fs
      .readFileSync(SENT_LOG, "utf8")
      .split("\n")
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean),
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  const resendKey = process.env.RESEND_API_KEY;

  // Single test send, then exit.
  if (TEST_TO) {
    if (!resendKey) {
      console.error("RESEND_API_KEY not set - cannot send test.");
      process.exit(1);
    }
    const resend = new Resend(resendKey);
    const { subject, html, text } = renderAnnouncement();
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: TEST_TO,
      ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
      subject,
      html,
      text,
    });
    if (error) {
      console.error(`Test send FAILED: ${error.message || JSON.stringify(error)}`);
      process.exit(1);
    }
    console.log(`Test email sent to ${TEST_TO} (id: ${data && data.id}).`);
    return;
  }

  if (!FILE) {
    console.error(
      "No CSV file given. Pass the Tally export path, e.g.\n" +
        "  node scripts/send-launch-announcement.js waitlist.csv",
    );
    process.exit(1);
  }
  const csvPath = path.isAbsolute(FILE) ? FILE : path.join(process.cwd(), FILE);
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const csvText = fs.readFileSync(csvPath, "utf8");
  const parsed = dedupe(parseRecipients(csvText));
  if (parsed.length === 0) {
    console.error(
      "No valid email addresses found. Check the file, or force the column " +
        "with --column <header name>.",
    );
    process.exit(1);
  }

  const alreadySent = loadSentSet();
  const pending = parsed.filter((r) => !alreadySent.has(r.email));
  const skipped = parsed.length - pending.length;
  const toSend = pending.slice(0, LIMIT);

  const { subject, html, text } = renderAnnouncement();

  console.log("Cuequill launch announcement");
  console.log("────────────────────────────");
  console.log(`CSV:            ${csvPath}`);
  console.log(`From:           ${FROM}`);
  console.log(`Subject:        ${subject}`);
  console.log(`Button links to: ${APP_URL}`);
  console.log(`Unique valid:   ${parsed.length}`);
  console.log(`Already sent:   ${skipped} (skipped via ${path.basename(SENT_LOG)})`);
  console.log(`To send now:    ${toSend.length}${LIMIT !== Infinity ? ` (capped at ${LIMIT})` : ""}`);
  console.log("");

  if (!APPLY) {
    fs.writeFileSync(PREVIEW_HTML, html, "utf8");
    console.log("DRY RUN — nothing sent.");
    console.log(`Preview written to: ${PREVIEW_HTML} (open it in a browser)`);
    console.log("\nPlain-text version:\n");
    console.log(text);
    console.log("\nFirst few recipients:");
    for (const r of toSend.slice(0, 5)) console.log(`  ${r.email}`);
    console.log("\nRun with --apply to send for real (and --test <you> first).");
    return;
  }

  if (!resendKey) {
    console.error("RESEND_API_KEY not set - cannot send.");
    process.exit(1);
  }
  const resend = new Resend(resendKey);

  let sent = 0;
  let failed = 0;
  for (const r of toSend) {
    const body = r.firstname ? renderAnnouncement(r.firstname) : { subject, html, text };
    const { error } = await resend.emails.send({
      from: FROM,
      to: r.email,
      ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
      subject: body.subject,
      html: body.html,
      text: body.text,
    });
    if (error) {
      failed++;
      console.error(`  FAIL ${r.email}: ${error.message || JSON.stringify(error)}`);
    } else {
      sent++;
      fs.appendFileSync(SENT_LOG, `${r.email}\n`);
      if (sent % 25 === 0) console.log(`  ...${sent} sent`);
    }
    await sleep(RATE_MS);
  }

  console.log("");
  console.log(`Done. Sent ${sent}, failed ${failed}.`);
  if (failed > 0) {
    console.log("Failed addresses were NOT logged, so a re-run will retry them.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
