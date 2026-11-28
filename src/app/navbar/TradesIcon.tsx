import { NavGlyph } from "./NavGlyph";

// Trades nav glyph: axes + four bars.
export default function TradesIcon({
  className,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <NavGlyph className={className} viewBox="0 0 64 64" height="1.1em">
      {/* Y axis */}
      <path
        d="M0 3C0 1.34315 1.34315 0 3 0H7C8.65685 0 10 1.34315 10 3V64H3C1.34315 64 0 62.6569 0 61V3Z"
        fill="currentColor"
      />
      {/* X axis */}
      <path
        d="M3 64C1.34315 64 0 62.6569 0 61L0 54H61C62.6569 54 64 55.3431 64 57V61C64 62.6569 62.6569 64 61 64H3Z"
        fill="currentColor"
      />
      <rect x="13" y="30" width="10" height="21" rx="2" fill="currentColor" />
      <rect x="25" y="21" width="10" height="30" rx="2" fill="currentColor" />
      <rect x="37" y="28" width="10" height="23" rx="2" fill="currentColor" />
      <rect x="49" y="11" width="10" height="40" rx="2" fill="currentColor" />
    </NavGlyph>
  );
}
