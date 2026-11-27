import { NavGlyph } from "./NavGlyph";

// Calendar nav glyph. A sheet (header + date grid) sits on two rings. On the
// active state the front sheet flips up over the rings, revealing a second
// sheet already behind it, then settles back; the rings stay put as the
// binding.
const HEADER_D =
  "M0 11C0 9.34315 1.34315 8 3 8H61C62.6569 8 64 9.34315 64 11V20C39.0258 15.4169 24.8851 15.0285 0 20V11Z";
const BODY_D =
  "M64 22.9945C39.0522 20.4765 24.9646 20.2386 0 22.9945V59.9946C0 61.6514 1.34315 62.9946 3 62.9946H61C62.6569 62.9946 64 61.6514 64 59.9946V22.9945ZM12 30.9945C10.3431 30.9945 9 32.3377 9 33.9945V35.9945C9 37.6514 10.3431 38.9945 12 38.9945H14C15.6569 38.9945 17 37.6514 17 35.9945V33.9945C17 32.3377 15.6569 30.9945 14 30.9945H12ZM31 38.9945C29.3431 38.9945 28 37.6514 28 35.9945V33.9945C28 32.3377 29.3431 30.9945 31 30.9945H33C34.6569 30.9945 36 32.3377 36 33.9945V35.9945C36 37.6514 34.6569 38.9945 33 38.9945H31ZM50 30.9945C48.3431 30.9945 47 32.3377 47 33.9945V35.9945C47 37.6514 48.3431 38.9945 50 38.9945H52C53.6569 38.9945 55 37.6514 55 35.9945V33.9945C55 32.3377 53.6569 30.9945 52 30.9945H50ZM47 48.9945C47 47.3377 48.3431 45.9945 50 45.9945H52C53.6569 45.9945 55 47.3377 55 48.9945V50.9945C55 52.6514 53.6569 53.9945 52 53.9945H50C48.3431 53.9945 47 52.6514 47 50.9945V48.9945ZM36 48.9945C36 47.3377 34.6569 45.9945 33 45.9945H31C29.3431 45.9945 28 47.3377 28 48.9945V50.9945C28 52.6514 29.3431 53.9945 31 53.9945H33C34.6569 53.9945 36 52.6514 36 50.9945V48.9945ZM9 48.9945C9 47.3377 10.3431 45.9945 12 45.9945H14C15.6569 45.9945 17 47.3377 17 48.9945V50.9945C17 52.6514 15.6569 53.9945 14 53.9945H12C10.3431 53.9945 9 52.6514 9 50.9945V48.9945Z";

function Sheet({ fill }: { fill: string }) {
  return (
    <>
      <path d={HEADER_D} fill={fill} />
      <path fillRule="evenodd" clipRule="evenodd" d={BODY_D} fill={fill} />
    </>
  );
}

export default function CalendarIcon({
  className,
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <NavGlyph className={className} viewBox="0 0 64 63" height="1.1em">
      {/* Page already behind, revealed while the front flips. Same fill as the
          front so the hand-off as the front fades is seamless (no brightness
          pop). */}
      <Sheet fill="currentColor" />
      {/* Front sheet - flips up over the rings on active */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "top",
          animation: active
            ? "cq-cal-flip 820ms cubic-bezier(0.5, 0, 0.5, 1)"
            : "none",
        }}
      >
        <Sheet fill="currentColor" />
      </g>
      {/* Rings / binding - stay put */}
      <path
        d="M10 3C10 1.34315 11.3431 0 13 0H16C17.6569 0 19 1.34315 19 3V8H10V3Z"
        fill="currentColor"
      />
      <path
        d="M44 3C44 1.34315 45.3431 0 47 0H50C51.6569 0 53 1.34315 53 3V8H44V3Z"
        fill="currentColor"
      />
    </NavGlyph>
  );
}
