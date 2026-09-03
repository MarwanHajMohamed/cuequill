"use client";

import { LegalDoc, type LegalSection } from "../_marketing/Chrome";

// ─────────────────────────────────────────────────────────────────────
// Company details. Fill these in before launch - the company number and
// registered office address come from the Companies House incorporation.
const COMPANY = {
  name: "Cuequill Ltd",
  number: "[company number]",
  address: "[registered office address]",
  email: "info@cuequill.com",
};

const SECTIONS: LegalSection[] = [
  {
    id: "about",
    heading: "About these terms",
    blocks: [
      {
        type: "p",
        text: `These terms of service ("Terms") are a legal agreement between you and ${COMPANY.name}, a company registered in England and Wales (company number ${COMPANY.number}), registered office ${COMPANY.address} ("Cuequill", "we", "us" or "our"). They govern your use of the Cuequill website and application (the "Service").`,
      },
      {
        type: "p",
        text: "By creating an account or using the Service, you agree to these Terms and to our Privacy Policy. If you do not agree, please do not use the Service.",
      },
    ],
  },
  {
    id: "not-advice",
    heading: "Not financial advice",
    blocks: [
      {
        type: "p",
        text: "Cuequill is a trading journal and analytics tool for your own record keeping. We are not a broker, dealer, investment adviser or financial adviser, and we are not authorised or regulated by the Financial Conduct Authority.",
      },
      {
        type: "p",
        text: "Nothing in the Service - including any statistics, summaries or AI-generated observations from Quill AI - is financial, investment, tax or legal advice, or a recommendation to buy, sell or hold any security. Trading options and other instruments involves substantial risk of loss. You are solely responsible for your own trading decisions, and you should seek independent professional advice where appropriate.",
      },
    ],
  },
  {
    id: "eligibility",
    heading: "Eligibility and your account",
    blocks: [
      {
        type: "p",
        text: "You must be at least 18 years old to use Cuequill. You are responsible for the accuracy of the information you provide, for keeping your login credentials secure, and for all activity that happens under your account. Tell us promptly at " + COMPANY.email + " if you believe your account has been compromised.",
      },
    ],
  },
  {
    id: "plans",
    heading: "Plans, billing and cancellation",
    blocks: [
      {
        type: "p",
        text: "Cuequill offers a free plan and a paid Pro plan. Paid subscriptions are billed in advance on a monthly or annual cycle through our payment processor, Stripe, and renew automatically until you cancel.",
      },
      {
        type: "list",
        items: [
          "You can cancel at any time from your account. A monthly plan runs to the end of the current period; an annual plan stops renewing and Pro continues until the term ends.",
          "Switching to annual applies the discount immediately and prorates what you have already paid; switching back takes effect at your next renewal.",
          "Prices are shown in the app and may change. We will give you notice of a price change before it applies to your renewal.",
          "If Cuequill is not for you, email us within 14 days of a charge and we will refund it.",
        ],
      },
    ],
  },
  {
    id: "your-content",
    heading: "Your content",
    blocks: [
      {
        type: "p",
        text: "Your journal - the trades, strategies, rules, notes and other content you add - belongs to you. You grant us a limited licence to store, process and display that content solely to provide the Service to you, including calculating statistics and, when you use it, generating Quill AI answers.",
      },
      {
        type: "p",
        text: "You are responsible for the content you add and for having the right to add it. You can export or delete your content, and closing your account removes it as described in our Privacy Policy.",
      },
    ],
  },
  {
    id: "broker",
    heading: "Broker connections",
    blocks: [
      {
        type: "p",
        text: "If you connect Interactive Brokers, you authorise Cuequill to use the credentials you provide to import your trade data on your behalf. You are responsible for complying with your broker's own terms. We are not affiliated with, endorsed by, or responsible for Interactive Brokers or any other third party, and imported data is provided as-is - you should verify it against your official broker statements.",
      },
    ],
  },
  {
    id: "acceptable-use",
    heading: "Acceptable use",
    blocks: [
      {
        type: "p",
        text: "When using Cuequill you agree not to:",
      },
      {
        type: "list",
        items: [
          "Break the law, infringe others' rights, or upload content you do not have the right to use.",
          "Attempt to access other users' accounts or data, or to disrupt, overload or reverse-engineer the Service.",
          "Use the Service to build a competing product, or resell or redistribute it without our permission.",
          "Misuse Quill AI or attempt to circumvent usage limits or safety measures.",
        ],
      },
      {
        type: "p",
        text: "We may suspend or close accounts that breach these Terms or that put the Service or other users at risk.",
      },
    ],
  },
  {
    id: "availability",
    heading: "Availability and changes",
    blocks: [
      {
        type: "p",
        text: "We work to keep Cuequill available and reliable, but the Service is provided on an as-available basis. We may add, change or remove features, and we may carry out maintenance that temporarily affects availability. We will give reasonable notice of significant changes where we can.",
      },
    ],
  },
  {
    id: "ip",
    heading: "Our intellectual property",
    blocks: [
      {
        type: "p",
        text: "Cuequill, including its software, design, branding and content (other than your own content), is owned by us or our licensors and protected by intellectual property laws. These Terms give you a personal, non-exclusive, non-transferable right to use the Service - they do not transfer any ownership to you.",
      },
    ],
  },
  {
    id: "warranties",
    heading: "Disclaimers",
    blocks: [
      {
        type: "p",
        text: "The Service is provided \"as is\" and \"as available\". To the fullest extent permitted by law, we do not warrant that it will be uninterrupted, error-free, or that any analytics, imported data or AI output will be accurate or complete. You rely on the Service at your own risk. Nothing in these Terms excludes any rights you have as a consumer that cannot lawfully be excluded.",
      },
    ],
  },
  {
    id: "liability",
    heading: "Limitation of liability",
    blocks: [
      {
        type: "p",
        text: "To the fullest extent permitted by law, we are not liable for any trading losses, or for any indirect or consequential loss, arising from your use of the Service. Our total liability to you for any claim relating to the Service is limited to the amount you paid us for the Service in the 12 months before the claim.",
      },
      {
        type: "p",
        text: "Nothing in these Terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot be limited under applicable law.",
      },
    ],
  },
  {
    id: "termination",
    heading: "Termination",
    blocks: [
      {
        type: "p",
        text: "You can stop using Cuequill and close your account at any time. We may suspend or terminate your access if you materially breach these Terms or if we stop providing the Service. On termination, your right to use the Service ends; the sections that by their nature should survive - such as content ownership, disclaimers and limitation of liability - continue to apply.",
      },
    ],
  },
  {
    id: "law",
    heading: "Governing law",
    blocks: [
      {
        type: "p",
        text: "These Terms are governed by the laws of England and Wales, and the courts of England and Wales have exclusive jurisdiction, except that if you are a consumer resident elsewhere in the UK you may also bring proceedings in your local courts.",
      },
    ],
  },
  {
    id: "changes",
    heading: "Changes to these terms",
    blocks: [
      {
        type: "p",
        text: "We may update these Terms from time to time. When we make a material change we will update the date at the top and, where appropriate, notify you in the app or by email. Continuing to use Cuequill after a change means you accept the updated Terms.",
      },
    ],
  },
  {
    id: "contact",
    heading: "Contact us",
    blocks: [
      {
        type: "p",
        text: `Questions about these Terms? Email ${COMPANY.email} or write to ${COMPANY.name}, ${COMPANY.address}.`,
      },
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of service"
      tagline="The agreement between you and Cuequill when you use the app."
      effective="25 September 2026"
      updated="3 September 2026"
      intro={[
        "These terms set out what you can expect from Cuequill and what we ask of you in return. Please read them - especially the sections on financial advice and liability.",
      ]}
      sections={SECTIONS}
    />
  );
}
