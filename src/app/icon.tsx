import { ImageResponse } from "next/og";

// 192×192 PWA icon. Next.js auto-routes this file to `/icon` and embeds
// the appropriate <link rel="icon"> tags into every page.
//
// Logo sized at ~60% so the icon also reads well as a maskable variant -
// Android's mask crops up to 20% off every edge. Mirrors the 3D quill
// treatment used by the Apple touch icon (lit/shaded vanes + teal spine).

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at 38% 30%, #1c2433 0%, #101218 55%, #0a0a0c 100%)",
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
          <defs>
            <linearGradient id="vaneLit" x1="0" y1="0" x2="1" y2="0.2">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#b9c2cf" />
            </linearGradient>
            <linearGradient id="vaneShade" x1="0" y1="0" x2="1" y2="0.2">
              <stop offset="0%" stopColor="#8b95a6" />
              <stop offset="100%" stopColor="#5d6675" />
            </linearGradient>
            <linearGradient id="spine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>
          </defs>
          {/* lit (left) vane */}
          <path
            d="M31 27.2C25 39.8 18.5 60.7 21.5 62.6C24.5 64.5 31 75.2 31 75.2 Z"
            fill="url(#vaneLit)"
          />
          {/* shaded (right) vane */}
          <path
            d="M31 27.2C37 39.8 43.5 61.2 40.5 62.6C37.5 64 31 75.2 31 75.2 Z"
            fill="url(#vaneShade)"
          />
          {/* central spine in brand teal */}
          <path
            d="M31 30V75"
            stroke="url(#spine)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* nib accent */}
          <circle cx="31" cy="75.2" r="1.3" fill="#2dd4bf" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
