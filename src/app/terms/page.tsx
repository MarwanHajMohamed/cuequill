import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  LegalSection,
  LegalNote,
  LegalList,
} from "../_marketing/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service · Cuequill",
  description: "The terms that govern your use of Cuequill.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="[DATE]">
      <LegalNote>
        This is a starting template, not legal advice. Replace the bracketed
        placeholders and have it reviewed by a qualified lawyer before you
        rely on it.
      </LegalNote>

      <LegalSection heading="1. Agreement">
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of
          Cuequill, provided by [Company legal name] (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;). By creating an account or using the service you
          agree to these Terms. If you do not agree, do not use Cuequill.
        </p>
      </LegalSection>

      <LegalSection heading="2. Not financial advice">
        <p>
          Cuequill is a journaling and analytics tool for your own record
          keeping. We are not a broker, dealer, or financial adviser. Nothing
          in the service — including any AI-generated observations — is
          financial, investment, tax, or legal advice, a recommendation, or a
          solicitation to buy or sell any security. Trading options and other
          instruments involves substantial risk, including the risk of losing
          more than your initial investment. You are solely responsible for
          your own trading decisions and should seek independent professional
          advice where appropriate.
        </p>
      </LegalSection>

      <LegalSection heading="3. Eligibility &amp; accounts">
        <p>
          You must be at least 18 years old and able to form a binding
          contract. You are responsible for the security of your account and
          for all activity under it. Provide accurate information and keep it
          up to date. Notify us promptly of any unauthorised use.
        </p>
      </LegalSection>

      <LegalSection heading="4. Subscriptions &amp; billing">
        <LegalList
          items={[
            <>
              Paid plans (&ldquo;Pro&rdquo;) are billed in advance on a
              recurring basis (monthly or annually) through Stripe.
            </>,
            <>
              Your subscription renews automatically until cancelled. You can
              cancel at any time from{" "}
              <Link
                href="/settings"
                className="text-teal-300 hover:underline"
              >
                Settings
              </Link>
              ; access continues until the end of the paid period.
            </>,
            <>
              Fees are stated at checkout and may include applicable taxes.
              Except where required by law, payments are non-refundable.
            </>,
            <>
              We may change prices or plan features on reasonable notice;
              changes take effect at your next renewal.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="5. Acceptable use">
        <p>You agree not to:</p>
        <LegalList
          items={[
            <>break the law or infringe others&rsquo; rights using the service;</>,
            <>
              attempt to access, disrupt, or reverse-engineer the service or
              its security;
            </>,
            <>
              scrape, resell, or redistribute the service or its data except as
              expressly permitted;
            </>,
            <>upload malicious code or misuse the AI features to abuse the platform.</>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="6. Your content">
        <p>
          You retain ownership of the data you put into Cuequill. You grant us
          the limited licence needed to host, process, and display it in order
          to provide the service (including transmitting relevant portions to
          our AI provider when you use Quill AI). You are responsible for the
          content you submit and for having the right to submit it.
        </p>
      </LegalSection>

      <LegalSection heading="7. Third-party services">
        <p>
          Cuequill integrates with third parties such as Interactive Brokers,
          Stripe, and Google. Your use of those services is subject to their
          terms, and we are not responsible for them. Market and calendar data
          may be provided by third parties and is offered without warranty.
        </p>
      </LegalSection>

      <LegalSection heading="8. Disclaimers">
        <p>
          The service is provided &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo; without warranties of any kind, to the fullest
          extent permitted by law. We do not warrant that the service will be
          uninterrupted, error-free, or that any data or AI output is accurate
          or complete.
        </p>
      </LegalSection>

      <LegalSection heading="9. Limitation of liability">
        <p>
          To the fullest extent permitted by law, we are not liable for any
          indirect, incidental, or consequential losses, or for any trading
          losses. Our total liability for any claim relating to the service is
          limited to the amount you paid us in the 12 months before the claim.
          Nothing in these Terms excludes liability that cannot be excluded by
          law.
        </p>
      </LegalSection>

      <LegalSection heading="10. Termination">
        <p>
          You may stop using Cuequill and delete your account at any time. We
          may suspend or terminate access if you breach these Terms or to
          protect the service. On termination, your right to use the service
          ends; the sections that by their nature should survive will survive.
        </p>
      </LegalSection>

      <LegalSection heading="11. Governing law">
        <p>
          These Terms are governed by the laws of [England &amp; Wales /
          your jurisdiction], and the courts of that jurisdiction have
          exclusive jurisdiction, except where mandatory local law provides
          otherwise.
        </p>
      </LegalSection>

      <LegalSection heading="12. Changes &amp; contact">
        <p>
          We may update these Terms from time to time; material changes will
          be notified in-app or by email. Questions? Contact{" "}
          <a
            href="mailto:info@cuequill.com"
            className="text-teal-300 hover:underline"
          >
            info@cuequill.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
