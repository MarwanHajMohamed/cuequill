import { ImageResponse } from "next/og";

// 180×180 Apple touch icon. iOS Safari uses this as the home-screen icon
// when the user picks "Add to Home Screen". Rounded corners are added by
// iOS automatically, so the artwork sits flush to the edges.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          width="120"
          height="120"
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
