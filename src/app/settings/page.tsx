"use client";
import { withAuth } from "@/lib/withAuth";
import { useSession } from "next-auth/react";
import React, { useRef, useState } from "react";

type settingsType = { setting: string; content: React.ReactNode };

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: session } = useSession();
  const userId = session?.user?.id;

  const handleUpload = async () => {
    if (!file) {
      setStatus("Please select a file.");
      return;
    }

    const formData: FormData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId!);

    setStatus("Uploading...");

    const res = await fetch("/api/import-trades", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();

    if (res.ok) {
      setStatus(`Imported ${result.inserted} trades`);
    } else {
      setStatus(`Error: ${result.error}`);
    }
  };

  const settingsTabs: settingsType[] = [
    {
      setting: "Trades",
      content: (
        <div className="p-7">
          <div className="underline text-xl">Import your trades</div>
          <div className="pt-5">
            To import your trades from IBKR, you must follow these steps:
          </div>
          <ol className="list-decimal p-3 pl-15">
            <li>Login to your IBKR account.</li>
            <li>Go to &quot;Performance & Reports &gt; Flex Queries&quot;.</li>
            <li>
              From &quot;Activity Flex Query&quot;, create a new flex query
              &#40;+&#41;.
            </li>
            <li>From the sections, select &quot;Trades&quot;.</li>
            <li>
              Select the following:
              <ul className="pl-5">
                <li className="list-disc">
                  Symbol, Strike, Date/Time, Expiry, Put/Call, Quantity,
                  Buy/Sell, TradePrice, Realized P/L
                </li>
              </ul>
            </li>
            <li>
              Give it a name, and press &quot;Continue&quot;, then
              &quot;Create&quot;.
            </li>
            <li>
              From the &quot;Activity Flex Query&quot; box, select
              &quot;Run&quot; on your new flex query.
            </li>
            <li>
              Set &quot;Period&quot; to &quot;Year to Date&quot; and
              &quot;Format&quot; to &quot;CSV&quot;.
            </li>
          </ol>
          <div className="mt-5">
            <div className="flex items-center gap-5">
              {/* Hidden file input */}
              <input
                type="file"
                accept=".csv,text/csv"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setFile(e.target.files[0]);
                  }
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-[#16151B] border border-white/20 rounded-xl transition duration-100 cursor-pointer hover:border-white/100"
              >
                Upload CSV File
              </button>
              <i className="fa-solid fa-arrow-right"></i>
              <button
                className={`p-3 bg-[#182A13] border border-white/20 rounded-xl transition duration-100 
              ${
                file === null
                  ? "text-white/30 cursor-not-allowed"
                  : "text-white/100 cursor-pointer hover:border-white/100"
              }`}
                onClick={handleUpload}
              >
                Transfer
              </button>
            </div>
            <div className="mt-4">
              File uploaded:{" "}
              {file ? (
                <span className="text-green-400">{file.name}</span>
              ) : (
                "None"
              )}
            </div>
          </div>
          <div>{status}</div>
        </div>
      ),
    },
  ];

  return (
    <div className="m-10 mt-[140px] flex flex-col items-center">
      {/* Settings Box */}
      <div className="bg-[#0e0e10] border border-white/10 w-full max-w-[1500px] rounded-sm h-[calc(100vh-200px)] overflow-scroll">
        {/* Header */}
        <div className="flex items-center h-20 gap-3 text-2xl border-b border-white/10">
          <i className="fa-solid fa-gear pl-6"></i>
          <div>Settings</div>
        </div>
        {/* Settings Area */}
        <div className="flex">
          {/* Left: tabs */}
          <div className="border-r border-white/10 text-sm">
            {settingsTabs.map((setting: settingsType, index: number) => {
              return (
                <div
                  className="p-3 px-7 border-b border-white/10 cursor-pointer"
                  key={index}
                >
                  {setting.setting}
                </div>
              );
            })}
          </div>
          {/* Right: content */}
          <div>
            {settingsTabs.map((setting: settingsType, index: number) => {
              return <div key={index}>{setting.content}</div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(Page);
