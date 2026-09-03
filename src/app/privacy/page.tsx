"use client";

import { LegalDoc, type LegalSection } from "../_marketing/Chrome";

// ─────────────────────────────────────────────────────────────────────
// Company details. Fill these in before launch - the company number and
// registered office address come from the Companies House incorporation.
// They are referenced from the text below so there is a single place to
// edit them.
const COMPANY = {
  name: "Cuequill Ltd",
  number: "17435221",
  address: "1 Kelly Road, High Wycombe, England, HP11 1BW",
  email: "info@cuequill.com",
};

const SECTIONS: LegalSection[] = [
  {
    id: "who-we-are",
    heading: "Who we are",
    blocks: [
      {
        type: "p",
        text: `Cuequill is a trading journal and analytics tool operated by ${COMPANY.name}, a company registered in England and Wales (company number ${COMPANY.number}), with its registered office at ${COMPANY.address}. In this policy, "Cuequill", "we", "us" and "our" refer to ${COMPANY.name}.`,
      },
      {
        type: "p",
        text: `${COMPANY.name} is the data controller for the personal data described in this policy. If you have any questions about this policy or how we handle your data, you can reach us at ${COMPANY.email}.`,
      },
    ],
  },
  {
    id: "what-we-collect",
    heading: "Information we collect",
    blocks: [
      {
        type: "p",
        text: "We collect only what we need to run your journal and your account. This falls into a few categories:",
      },
      {
        type: "list",
        items: [
          "Account details: your name, email address and a securely hashed password. If you sign in with Google or Apple, we receive your name and email from that provider instead of a password.",
          "Profile and preferences: your timezone, currency, starting balance, risk-per-trade setting, avatar, and product settings such as your saved Quill AI prompts and leaderboard opt-in.",
          "Trading data you add: trades you log by hand, strategies, rules, goals, affirmations, tags and notes. This is the content of your journal.",
          "Imported broker data: when you connect Interactive Brokers, we import your executed trades (fills), including symbols, quantities, prices, times, commissions and fees. We store your IBKR Flex query ID and access token encrypted at rest so we can fetch this data on your behalf.",
          "Billing data: if you subscribe to Pro, our payment processor handles your card details. We keep a customer and subscription reference so we can manage your plan, but we never see or store your full card number.",
          "Usage and technical data: basic logs, device and browser information, and error reports that help us keep the service reliable and secure.",
        ],
      },
    ],
  },
  {
    id: "how-we-use",
    heading: "How we use your information",
    blocks: [
      {
        type: "p",
        text: "We use your information to provide and improve Cuequill:",
      },
      {
        type: "list",
        items: [
          "To run your account, keep you signed in and secure it.",
          "To store, display and analyse your journal - calculating win rates, P&L, per-strategy and per-symbol stats, and calendar views.",
          "To import and reconcile your Interactive Brokers fills when you enable sync.",
          "To answer your questions through Quill AI when you choose to use it (see the AI section below).",
          "To take payment and manage your subscription if you go Pro.",
          "To send you service messages - for example a password reset, a billing receipt, or a notice about a change to the service.",
          "To diagnose problems, prevent abuse, and keep the service safe.",
        ],
      },
    ],
  },
  {
    id: "legal-bases",
    heading: "Our legal bases",
    blocks: [
      {
        type: "p",
        text: "Under UK data protection law we rely on the following legal bases:",
      },
      {
        type: "list",
        items: [
          "Contract: to provide the service you have signed up for, including storing your journal and processing payment.",
          "Legitimate interests: to keep the service secure, prevent abuse, understand how it is used, and improve it - balanced against your rights.",
          "Consent: where you choose optional features such as connecting a broker or using Quill AI. You can withdraw consent at any time.",
          "Legal obligation: to meet accounting, tax and other legal requirements.",
        ],
      },
    ],
  },
  {
    id: "ai",
    heading: "Quill AI and your data",
    blocks: [
      {
        type: "p",
        text: "Quill AI is an optional feature. When you ask Quill a question, we send the relevant parts of your trading data, together with your question, to our AI provider (Google, via the Gemini API) so it can generate an answer for you.",
      },
      {
        type: "p",
        text: "Your journal is yours. We do not use your trades to train AI models, and we do not sell your data. Our AI provider processes the data only to return the answer to your request and does not use it to train its models on our plan.",
      },
    ],
  },
  {
    id: "sharing",
    heading: "Who we share data with",
    blocks: [
      {
        type: "p",
        text: "We do not sell your personal data. We share it only with the service providers we rely on to run Cuequill, and only as far as needed:",
      },
      {
        type: "list",
        items: [
          "MongoDB - our database provider, which stores your account and journal data.",
          "Vercel - our hosting provider, which serves the application.",
          "Stripe - our payment processor, which handles billing and card details for Pro subscriptions.",
          "Google (Gemini API) - processes your request when you use Quill AI.",
          "Resend - sends transactional emails such as password resets and receipts.",
          "Sentry - collects error reports so we can find and fix problems.",
          "Interactive Brokers - the broker we import your fills from when you enable sync, using credentials you provide.",
        ],
      },
      {
        type: "p",
        text: "Each of these providers acts as our processor under contract and may only use your data to provide their service to us. We may also disclose data if required by law, or to protect our rights, users or the security of the service.",
      },
    ],
  },
  {
    id: "transfers",
    heading: "International transfers",
    blocks: [
      {
        type: "p",
        text: "Some of our providers are based outside the UK, including in the United States. Where your data is transferred outside the UK, we rely on appropriate safeguards - such as the UK's adequacy regulations or the International Data Transfer Agreement / Standard Contractual Clauses - to protect it.",
      },
    ],
  },
  {
    id: "retention",
    heading: "How long we keep it",
    blocks: [
      {
        type: "p",
        text: "We keep your account and journal data for as long as your account is open. Free-plan history is limited to the most recent 90 days of trades in the app, while Pro retains your full history. If you close your account, we delete or anonymise your personal data within a reasonable period, except where we must keep certain records (for example billing records) to meet legal obligations.",
      },
    ],
  },
  {
    id: "your-rights",
    heading: "Your rights",
    blocks: [
      {
        type: "p",
        text: "Under UK data protection law you have the right to access, correct, delete, restrict or object to our use of your personal data, and the right to data portability. You can exercise many of these directly in the app - editing your profile, deleting trades, disconnecting your broker, or closing your account.",
      },
      {
        type: "p",
        text: `To make a request or ask a question, email ${COMPANY.email}. If you are unhappy with how we handle your data, you have the right to complain to the UK's Information Commissioner's Office (ICO) at ico.org.uk.`,
      },
    ],
  },
  {
    id: "security",
    heading: "Security",
    blocks: [
      {
        type: "p",
        text: "We protect your data with measures appropriate to its sensitivity: passwords are hashed, broker credentials are encrypted at rest, and access to production systems is restricted. No system is perfectly secure, but we work to keep your data safe and will notify you and the relevant authority of a breach where the law requires it.",
      },
    ],
  },
  {
    id: "cookies",
    heading: "Cookies",
    blocks: [
      {
        type: "p",
        text: "Cuequill uses only the cookies strictly necessary to run the service - chiefly to keep you signed in. We do not use advertising or third-party tracking cookies. Because these cookies are essential, they do not require consent, but we show a short notice so you know they are in use.",
      },
    ],
  },
  {
    id: "children",
    heading: "Children",
    blocks: [
      {
        type: "p",
        text: "Cuequill is not intended for anyone under 18, and we do not knowingly collect data from children.",
      },
    ],
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    blocks: [
      {
        type: "p",
        text: "We may update this policy from time to time. When we make a material change, we will update the date at the top and, where appropriate, notify you in the app or by email. Continuing to use Cuequill after a change means you accept the updated policy.",
      },
    ],
  },
  {
    id: "contact",
    heading: "Contact us",
    blocks: [
      {
        type: "p",
        text: `Questions about this policy or your data? Email us at ${COMPANY.email} or write to ${COMPANY.name}, ${COMPANY.address}.`,
      },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy policy"
      tagline="How Cuequill collects, uses and protects your personal data - and the choices you have."
      effective="25 September 2026"
      updated="3 September 2026"
      intro={[
        "Your trading journal is personal, and we treat it that way. This policy explains what we collect, why, and what you can do about it. It is written to be read, not just filed away.",
      ]}
      sections={SECTIONS}
    />
  );
}
