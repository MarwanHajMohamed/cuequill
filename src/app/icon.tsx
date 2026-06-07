import { ImageResponse } from "next/og";

// 192×192 PWA icon. Next.js auto-routes this file to `/icon` and embeds
// the appropriate <link rel="icon"> tags into every page.
//
// Logo sized at ~60% so the icon also reads well as a maskable variant —
// Android's mask crops up to 20% off every edge.

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0E0E10",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="116"
          height="116"
          viewBox="16 25 30 52"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M31 27.2C37 39.8 43.5 61.2 40.5 62.6C37.5 64 31 75.2 31 75.2C31 75.2 24.5 64.5 21.5 62.6C18.5 60.7 25 39.8 31 27.2Z"
            fill="#FAFAFA"
          />
          <path
            d="M31 47V75"
            stroke="#0F172A"
            strokeWidth="1.32"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
