"use client";
import React from "react";

type TradesTabProps = {
  file: File | null;
  status: string;
  setFile: (file: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleUpload: () => void;
};

export default function TradesTab({
  file,
  status,
  setFile,
  fileInputRef,
  handleUpload,
}: TradesTabProps) {
  return (
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
              Symbol, Strike, Date/Time, Expiry, Put/Call, Quantity, Buy/Sell,
              TradePrice, Realized P/L
            </li>
          </ul>
        </li>
        <li>
          Give it a name, and press &quot;Continue&quot;, then
          &quot;Create&quot;.
        </li>
        <li>
          From the &quot;Activity Flex Query&quot; box, select &quot;Run&quot;
          on your new flex query.
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
            onClick={() => fileInputRef?.current?.click()}
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
            disabled={!file}
          >
            Transfer
          </button>
        </div>

        <div className="mt-4">
          File uploaded:{" "}
          {file ? <span className="text-green-400">{file.name}</span> : "None"}
        </div>
      </div>

      <div>{status}</div>
    </div>
  );
}
