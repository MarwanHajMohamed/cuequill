import React from "react";

// Shared wrapper for the custom SVG nav glyphs. Centres the SVG in an
// inline-flex span that carries the passed sizing/colour classes, and sizes
// the SVG by height (width auto) so the `text-[Npx]` utility classes on the
// nav items scale it. `overflow: visible` lets a part animate outside its box.
export function NavGlyph({
  className,
  viewBox,
  height,
  children,
}: {
  className?: string;
  viewBox: string;
  height: string;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        // Theme-aware neutral for the glyphs (they fill with currentColor):
        // light grey on the dark UI, dark grey on light. Overrides the text
        // colour from `className` so the icons stay a consistent neutral.
        color: "rgb(var(--fg-rgb) / 0.85)",
      }}
    >
      <svg
        viewBox={viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height, width: "auto", overflow: "visible" }}
      >
        {children}
      </svg>
    </span>
  );
}
