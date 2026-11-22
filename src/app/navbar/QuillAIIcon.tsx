import React from "react";

// The Quill AI nav glyph. Rendered in place of a Font Awesome icon for the
// chat/Quill AI item. Sizes to the surrounding font-size (height: 1.3em) so the
// same `text-[Npx]` utility classes that size the other nav icons size this
// too; keeps its own flat fill rather than tinting with state.
export default function QuillAIIcon({ className }: { className?: string }) {
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
        viewBox="0 0 44 95"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: "1.3em", width: "auto" }}
      >
        <path
          d="M22.0001 0C22.0001 0 36.9311 26.6865 41.6366 46C42.7187 50.4412 43.9928 57.5 43.9928 57.5C43.9928 57.5 44.1278 60.26 43.2076 60.26C41.2437 60.26 22.0001 92 22.0001 92C22.0001 92 4.32685 60.26 0.792611 60.26C-0.127615 60.26 0.00688121 57.5 0.00688121 57.5C0.00688121 57.5 1.2813 50.4412 2.36354 46C7.06975 26.6868 22.0001 0 22.0001 0Z"
          fill="#D9D9D9"
        />
        <circle cx="22" cy="91.5" r="3" fill="#D9D9D9" />
      </svg>
    </span>
  );
}
