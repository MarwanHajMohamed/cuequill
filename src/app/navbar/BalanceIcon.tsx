import { NavGlyph } from "./NavGlyph";

// Balance nav glyph: a stacked pair of curved platforms.
export default function BalanceIcon({
  className,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <NavGlyph className={className} viewBox="0 0 64 45" height="0.9em">
      <path
        d="M0 0H64V38C38.9992 35.7468 24.9864 35.738 0 38V0Z"
        fill="#D9D9D9"
      />
      <path
        d="M0 41.67C25 39.4914 38.9974 39.3957 64 41.67V44.67C39.0553 42.4438 24.9691 42.2262 0 44.67V41.67Z"
        fill="#D9D9D9"
      />
    </NavGlyph>
  );
}
