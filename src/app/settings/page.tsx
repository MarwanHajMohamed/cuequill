"use client";
import { withAuth } from "@/lib/withAuth";
import { useSession } from "next-auth/react";
import React, { useRef, useState } from "react";
import TradesTab from "./TradesTab";
import { useQueryClient } from "@tanstack/react-query";
import Account from "./Account";

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
        "Error: Something went wrong. Ensure the headers are the same as the ones stated above."
      );
    }
  };

  const settingsTabs = [
    {
      title: "Account",
      content: <Account />,
    },
    {
      title: "Trades",
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
  ];

  return (
    <div className="mt-[100px] flex flex-col items-center">
      <div className="bg-[#0e0e10] w-full rounded-sm h-[calc(100vh-105px)] overflow-scroll">
        <div className="flex items-center h-20 gap-3 text-2xl border-b border-white/10">
          <i className="fa-solid fa-gear pl-6"></i>
          <div>Settings</div>
        </div>
        <div className="flex">
          {/* Left: tabs */}
          <div className="border-r border-white/10 text-sm h-[calc(100vh-185px)]">
            {settingsTabs.map((setting, index) => (
              <div
                className={`p-3 px-7 border-b border-white/10 cursor-pointer hover:bg-[#19191B] ${
                  selectedSetting === setting.title && "bg-[#19191B]"
                }`}
                key={index}
                onClick={() => setSelectedSetting(setting.title)}
              >
                {setting.title}
              </div>
            ))}
          </div>
          {/* Right: content */}
          <div className="w-full">
            {settingsTabs.map(
              (setting, index) =>
                selectedSetting === setting.title && (
                  <div key={index}>{setting.content}</div>
                )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(Page);
