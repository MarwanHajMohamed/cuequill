"use client";

import Link from "next/link";
import { withAuth } from "@/lib/withAuth";
import ProGate from "@/components/ProGate";
import {
  REPORTS,
  SECTION_LABEL,
  type ReportDef,
  type ReportSection,
} from "./registry";

const SECTIONS: ReportSection[] = ["data", "analytics"];

function Row({ r }: { r: ReportDef }) {
  return (
    <Link
      href={`/reports/${r.id}`}
      className="group flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.025] transition-colors"
    >
      <i
        className={`${r.icon} w-5 text-center text-[14px] text-white/40 group-hover:text-white/70 transition-colors`}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium text-white/90">
          {r.title}
        </div>
        <div className="text-[12px] text-white/45 truncate">
          {r.description}
        </div>
      </div>
      <i className="fa-solid fa-chevron-right text-[11px] text-white/25 group-hover:text-white/50 transition-colors" />
    </Link>
  );
}

function Page() {
  return (
    <div className="w-full flex justify-center min-h-screen pb-24">
      <div className="w-full max-w-[760px] px-5 md:px-8 pt-24 md:pt-12 flex flex-col">
        <header className="pb-6 border-b border-white/10">
          <h1 className="text-[24px] font-semibold tracking-tight">Reports</h1>
          <p className="text-[13.5px] text-white/50 mt-1.5 leading-relaxed">
            Review your trade history and performance, then export any report
            as a spreadsheet-ready file.
          </p>
        </header>

        <div className="flex flex-col gap-8 pt-8">
          {SECTIONS.map((section) => (
            <section key={section} className="flex flex-col gap-3">
              <h2 className="text-[12px] font-medium text-white/40 px-1">
                {SECTION_LABEL[section]}
              </h2>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/[0.06] overflow-hidden">
                {REPORTS.filter((r) => r.section === section).map((r) => (
                  <Row key={r.id} r={r} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function GatedPage() {
  return (
    <ProGate
      feature="Reports"
      description="Review your full trade history and performance, tax and strategy summaries, then export them as spreadsheet-ready files. Available on Pro."
      className="min-h-screen"
    >
      <Page />
    </ProGate>
  );
}

export default withAuth(GatedPage);
