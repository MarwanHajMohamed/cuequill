"use client";
import { withAuth } from "@/lib/withAuth";
import { useSession } from "next-auth/react";
import React, { useRef, useState } from "react";
import TradesTab from "./TradesTab";
import { useQueryClient } from "@tanstack/react-query";
import Account from "./Account";
import IBKRTab from "./IBKRTab";

function Page() {
  const [selectedSetting, setSelectedSetting] = useState<string>("Account");

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: session } = useSession();
  const userId = session?.user?.id;

  const queryClient = useQueryClient();

  const handleUpload = async () => {
    if (!file) {
      setStatus("Please select a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId!);

    try {
      setStatus("Uploading...");

      const res = await fetch("/api/import-trades", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (res.ok) {
        setStatus(`Success: imported ${result.inserted} trades`);
        queryClient.invalidateQueries({ queryKey: ["trades", userId] });
      } else {
        console.error("Error: ", result.error);
        setStatus(`Error: ${result.error}`);
      }
    } catch (err) {
      console.error("Network error:", err);
      setStatus(
        "Error: Something went wrong. Ensure the headers are the same as the ones stated above.",
      );
    }
  };

  const settingsTabs = [
    { title: "Account", icon: "fa-solid fa-user", content: <Account /> },
    {
      title: "Trades",
      icon: "fa-solid fa-file-import",
      content: (
        <TradesTab
          file={file}
          status={status}
          setFile={setFile}
          fileInputRef={fileInputRef}
          handleUpload={handleUpload}
        />
      ),
    },
    {
      title: "IBKR auto-sync",
      icon: "fa-solid fa-rotate",
      content: <IBKRTab />,
    },
  ];

  return (
    <div className="w-full flex flex-col items-center min-h-screen pb-16">
      {/* Aurora */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      <div className="w-full max-w-[1100px] mt-30 px-5 md:px-10">
        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md overflow-hidden flex flex-col md:flex-row">
          {/* Tabs */}
          <nav className="md:w-56 md:shrink-0 md:border-r border-b md:border-b-0 border-white/10 p-2 flex md:flex-col overflow-x-auto">
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

          {/* Content */}
          <div className="flex-1 min-w-0">
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
