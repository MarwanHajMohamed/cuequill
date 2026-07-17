import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  LegalSection,
  LegalNote,
  LegalList,
} from "../_marketing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · Cuequill",
  description: "How Cuequill collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="[DATE]">
      <LegalNote>
        This is a starting template, not legal advice. Replace the
        bracketed placeholders and have it reviewed by a qualified data-
        protection professional before you rely on it.
      </LegalNote>

      <LegalSection heading="Who we are">
        <p>
          Cuequill (&ldquo;Cuequill&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;) provides a trading journal and analytics
          application. This policy explains what personal data we collect,
          why, and your rights over it. The data controller is [Company
          legal name], [registered address]. For any privacy question,
          contact{" "}
          <a
            href="mailto:info@cuequill.com"
            className="text-teal-300 hover:underline"
          >
            info@cuequill.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Data we collect">
        <LegalList
          items={[
            <>
              <strong>Account details</strong> — your name, email address, and
              password (stored only as a salted hash), or the profile
              information provided by Google or Apple if you sign in with them.
            </>,
            <>
              <strong>Trading journal data</strong> — the trades, notes,
              strategies, rules, goals, and tags you enter or import, including
              any images you attach.
            </>,
            <>
              <strong>Broker import data</strong> — if you connect Interactive
              Brokers, the trade fills returned by your IBKR Flex statement.
            </>,
            <>
              <strong>Payment data</strong> — handled by Stripe. We store only
              your subscription status and identifiers, never your full card
              number.
            </>,
            <>
              <strong>Usage &amp; technical data</strong> — basic logs and
              limited diagnostics needed to run and secure the service.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="How we use your data">
        <p>
          We use your data to provide the journal and its features, generate
          your analytics, process your subscription, send service emails you
          have opted into, prevent abuse, and comply with our legal
          obligations. Our lawful bases are performance of our contract with
          you, your consent (where applicable), and our legitimate interests
          in operating and securing the service.
        </p>
      </LegalSection>

      <LegalSection heading="AI features">
        <p>
          Quill AI is powered by Google&rsquo;s Gemini API. When you use it,
          the relevant portions of your journal (for example your trades and
          the message you send) are transmitted to Google to generate a
          response. We do not use your data to train models, and we ask our
          providers not to. AI output is generated automatically, may be
          inaccurate, and is not financial advice.
        </p>
      </LegalSection>

      <LegalSection heading="Who we share data with (processors)">
        <p>
          We share data only with the service providers needed to run
          Cuequill, under contracts that require them to protect it:
        </p>
        <LegalList
          items={[
            <>MongoDB Atlas — database hosting.</>,
            <>Vercel (or [hosting provider]) — application hosting.</>,
            <>Google (Gemini) — AI features.</>,
            <>Stripe — payments and subscriptions.</>,
            <>Resend — transactional email.</>,
            <>Google and Apple — optional sign-in.</>,
          ]}
        />
        <p>
          We do not sell your personal data. Some providers may process data
          outside the UK/EEA; where they do, appropriate safeguards (such as
          Standard Contractual Clauses) are in place.
        </p>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <p>
          We keep your data for as long as your account is active. When you
          delete your account, your personal data and journal content are
          removed from our systems, subject to any limited records we must
          retain by law (for example, payment records).
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          Depending on your location, you have the right to access, correct,
          export, restrict, or delete your personal data, and to object to
          certain processing. You can exercise the main ones yourself:
        </p>
        <LegalList
          items={[
            <>
              <strong>Export</strong> — download all your data from{" "}
              <Link
                href="/settings"
                className="text-teal-300 hover:underline"
              >
                Settings → Account
              </Link>
              .
            </>,
            <>
              <strong>Deletion</strong> — permanently delete your account and
              data from the same page.
            </>,
          ]}
        />
        <p>
          To exercise any other right, email{" "}
          <a
            href="mailto:info@cuequill.com"
            className="text-teal-300 hover:underline"
          >
            info@cuequill.com
          </a>
          . You also have the right to complain to your local data-protection
          authority (in the UK, the ICO).
        </p>
      </LegalSection>

      <LegalSection heading="Cookies">
        <p>
          We use only the cookies necessary to keep you signed in and to run
          the service. We do not use advertising cookies. [If you add
          analytics or marketing cookies, describe them here and provide a
          consent mechanism.]
        </p>
      </LegalSection>

      <LegalSection heading="Security">
        <p>
          We use industry-standard measures to protect your data, including
          encryption in transit, hashed passwords, and access controls. No
          system is perfectly secure, but we work to keep your data safe.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will
          be notified in-app or by email. Continued use of Cuequill after an
          update means you accept the revised policy.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
