import React from "react";

// The Home nav glyph. The house base has the window already cut out
// (evenodd), with a separate "window cover" rect filling it. When the item is
// active, the cover lifts up, shrinks and fades - revealing the open window -
// then stays hidden. Reverses smoothly when it goes inactive.
export default function HomeIcon({
  className,
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 0 76 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: "1em", width: "auto", overflow: "visible" }}
      >
        {/* House base (with window hole punched out) */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M63.21 36.5557C63.21 33.7942 60.9714 31.5557 58.21 31.5557H17.6421C14.8807 31.5557 12.6421 33.7942 12.6421 36.5557V57.9507C12.6421 61.2644 15.3284 63.9507 18.6421 63.9507H27.0248C28.6817 63.9507 30.0248 62.6076 30.0248 60.9507V54.5495C30.0248 52.8926 31.368 51.5495 33.0248 51.5495H37.926H42.8273C44.4841 51.5495 45.8273 52.8926 45.8273 54.5495V60.9507C45.8273 62.6076 47.1704 63.9507 48.8273 63.9507H57.21C60.5237 63.9507 63.21 61.2644 63.21 57.9507V36.5557ZM20 47C18.8954 47 18 46.1046 18 45V37.5C18 36.3954 18.8954 35.5 20 35.5H26.5248C27.6294 35.5 28.5248 36.3954 28.5248 37.5V45C28.5248 46.1046 27.6294 47 26.5248 47H20Z"
          fill="#D9D9D9"
        />
        {/* Window cover - animates away on active */}
        <rect
          x="18"
          y="35"
          width="13"
          height="13"
          fill="#D9D9D9"
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            transition:
              "opacity 220ms ease, transform 300ms cubic-bezier(0.34, 1.4, 0.6, 1)",
            opacity: active ? 0 : 1,
            transform: active ? "translateY(-9px) scale(0.5)" : "none",
          }}
        />
        {/* Roof */}
        <path
          d="M34.0921 3.25774C36.0206 1.43076 39.0411 1.43076 40.9696 3.25774L65.9525 26.9258C69.2338 30.0344 67.0338 35.5556 62.5138 35.5556H12.5479C8.02795 35.5556 5.82792 30.0344 9.1092 26.9258L34.0921 3.25774Z"
          fill="#D9D9D9"
        />
      </svg>
    </span>
  );
}
