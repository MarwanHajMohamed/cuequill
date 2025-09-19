"use client";
import { withAuth } from "@/lib/withAuth";
import { useSession } from "next-auth/react";
import React, { useRef, useState } from "react";
import TradesTab from "./TradesTab";
import { useQueryClient } from "@tanstack/react-query";

function Page() {
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
      setting: "Trades",
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
    <div className="m-10 mt-[140px] flex flex-col items-center">
      <div className="bg-[#0e0e10] border border-white/10 w-full max-w-[1500px] rounded-sm h-[calc(100vh-200px)] overflow-scroll">
        <div className="flex items-center h-20 gap-3 text-2xl border-b border-white/10">
          <i className="fa-solid fa-gear pl-6"></i>
          <div>Settings</div>
        </div>
        <div className="flex">
          {/* Left: tabs */}
          <div className="border-r border-white/10 text-sm">
            {settingsTabs.map((setting, index) => (
              <div
                className="p-3 px-7 border-b border-white/10 cursor-pointer"
                key={index}
              >
                {setting.setting}
              </div>
            ))}
          </div>
          {/* Right: content */}
          <div>
            {settingsTabs.map((setting, index) => (
              <div key={index}>{setting.content}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(Page);
