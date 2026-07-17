import React from "react";
import { SiteHeader, SiteFooter } from "./Chrome";

// Shared shell + typography for the static legal pages (Privacy, Terms) so
// they match the marketing chrome and read consistently.

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <article className="max-w-[760px] mx-auto px-6 md:px-10 py-16 md:py-20">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-[13px] text-white/40">
            Last updated: {updated}
          </p>
          <div className="mt-8 flex flex-col gap-6">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[17px] md:text-[19px] font-semibold tracking-tight text-white">
        {heading}
      </h2>
      <div className="flex flex-col gap-2.5 text-[14px] leading-relaxed text-white/65">
        {children}
      </div>
    </section>
  );
}

// A muted callout for the "this is a template — get it reviewed" banner.
export function LegalNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-[12.5px] leading-relaxed text-amber-200/90">
      {children}
    </div>
  );
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 flex flex-col gap-1.5 marker:text-white/30">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
