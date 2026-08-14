"use client";
import { withAuth } from "@/lib/withAuth";
import React, { useState } from "react";
import TradesTab from "./TradesTab";
import Account from "./Account";
import IBKRTab from "./IBKRTab";
import NotificationsTab from "./NotificationsTab";
import PlanTab from "./PlanTab";
import AppearanceTab from "./AppearanceTab";

function Page() {
  const [selectedSetting, setSelectedSetting] = useState<string>("Account");

  const settingsTabs = [
    { title: "Account", icon: "fa-solid fa-user", content: <Account /> },
    {
      title: "Appearance",
      icon: "fa-solid fa-palette",
      content: <AppearanceTab />,
    },
    { title: "Plan", icon: "fa-solid fa-crown", content: <PlanTab /> },
    {
      title: "Trades",
      icon: "fa-solid fa-file-import",
      content: <TradesTab />,
    },
    {
      title: "IBKR auto-sync",
      icon: "fa-solid fa-rotate",
      content: <IBKRTab />,
    },
    {
      title: "Notifications",
      icon: "fa-solid fa-bell",
      content: <NotificationsTab />,
    },
  ];

  return (
    <div className="w-full flex justify-center min-h-screen pb-24">
      {/* Aurora */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      <div className="w-full max-w-[1500px] px-5 md:px-8 pt-24 md:pt-12 flex flex-col">
        <header className="pb-6 border-b border-white/10">
          <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight">
            Settings
          </h1>
        </header>

        <div className="mt-6 flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Nav rail — sticky on desktop, a horizontal scroller on mobile */}
          <nav className="md:w-56 md:shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:sticky md:top-12 md:self-start">
            {settingsTabs.map((tab) => {
              const active = selectedSetting === tab.title;
              return (
                <button
                  key={tab.title}
                  onClick={() => setSelectedSetting(tab.title)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl whitespace-nowrap text-left transition cursor-pointer text-[13px] font-medium ${
                    active
                      ? "bg-teal-500/10 text-white border border-teal-500/25"
                      : "border border-transparent text-white/65 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <i
                    className={`${tab.icon} text-[12px] ${active ? "text-teal-300" : "text-white/45"}`}
                  />
                  <span>{tab.title}</span>
                </button>
              );
            })}
          </nav>

          {/* Desktop divider between the tab rail and the content. Sticky +
              fixed height so it stays in view (spanning the screen minus the
              top/bottom margins) while the content scrolls. */}
          <div
            aria-hidden
            className="hidden md:block w-px shrink-0 self-start sticky top-12 bg-white/10"
            style={{ height: "calc(100dvh - 6rem)" }}
          />

          {/* Content — sits on the page (no card). On mobile a top border
              divides it from the tab rail; on desktop the sticky divider does. */}
          <div className="flex-1 min-w-0 min-h-[520px] border-t md:border-t-0 border-white/10">
            {settingsTabs.map((tab) =>
              selectedSetting === tab.title ? (
                <div key={tab.title}>{tab.content}</div>
              ) : null,
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(Page);
