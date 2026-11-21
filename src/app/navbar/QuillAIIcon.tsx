import React from "react";

// The Quill AI nav glyph. Rendered in place of a Font Awesome icon for the
// chat/Quill AI item. Sizes to the surrounding font-size (height: 1em) so the
// same `text-[Npx]` utility classes that size the other nav icons size this
// too; keep its own two-tone metallic fill rather than tinting with state.
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
        style={{ height: "1em", width: "auto" }}
      >
        <path
          d="M22.0003 0C22.0003 0 36.9313 26.6865 41.6369 46C42.7189 50.4412 43.993 57.5 43.993 57.5C43.993 57.5 44.128 60.26 43.2078 60.26C41.2439 60.26 22.0003 92 22.0003 92C22.0003 92 4.32709 60.26 0.792856 60.26C-0.127371 60.26 0.00712535 57.5 0.00712535 57.5C0.00712535 57.5 1.28155 50.4412 2.36378 46C7.06999 26.6868 22.0003 0 22.0003 0Z"
          fill="#ADADAD"
        />
        <path
          d="M22.2131 0.387227H22.1851L22.0001 92C21.9409 91.8937 4.32261 60.2626 0.793293 60.26C-0.124532 60.2591 0.00623316 57.5114 0.00678282 57.5C0.00678282 57.5 1.28129 50.4412 2.36351 46C7.06109 26.7222 21.9455 0.0976539 22.0001 0C22.0001 0 22.0733 0.133643 22.2131 0.387227ZM22.0636 91.8949C22.0216 91.9641 22.0001 92 22.0001 92L22.0627 91.814C22.063 91.8402 22.0633 91.8672 22.0636 91.8949ZM43.9934 57.5C43.9936 57.5035 44.018 58.0199 43.972 58.6051C43.9271 58.1331 43.8824 57.6542 43.8402 57.2053C43.8462 57.2022 43.8529 57.1994 43.8589 57.1963C43.8829 57.184 43.9059 57.1694 43.9299 57.1568C43.97 57.3753 43.9928 57.4966 43.9934 57.5Z"
          fill="#D9D9D9"
        />
        <circle cx="22.0002" cy="91.5" r="3" fill="#D9D9D9" />
      </svg>
    </span>
  );
}
