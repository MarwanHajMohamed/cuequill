import { NavGlyph } from "./NavGlyph";

// Earnings nav glyph: a megaphone with three "shout" lines.
export default function EarningsIcon({
  className,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <NavGlyph className={className} viewBox="0 0 64 66" height="1.1em">
      {/* Handle */}
      <path
        d="M5.2749 21.7598H19.355V63.2801C19.355 64.3846 18.4596 65.2801 17.355 65.2801H7.2749C6.17033 65.2801 5.2749 64.3846 5.2749 63.2801V21.7598Z"
        fill="currentColor"
      />
      {/* Megaphone cone (inner stroke via mask) */}
      <mask id="cq-earnings-cone" fill="white">
        <path d="M0 23.6321C0 22.2448 1.12465 21.1201 2.51198 21.1201C20.0225 21.1201 37.0924 15.6305 51.3204 5.42347L58.8804 0V61L45.5226 52.8329C34.8946 46.3349 23.146 41.8798 10.8816 39.697L2.47433 38.2006C1.04276 37.9459 0 36.7011 0 35.2471V29.4402V23.6321Z" />
      </mask>
      <path
        d="M58.8804 0V61L45.5226 52.8329C34.8946 46.3349 23.146 41.8798 10.8816 39.697L2.47433 38.2006C1.04276 37.9459 0 36.7011 0 35.2471V29.4402V23.6321C0 22.2448 1.12465 21.1201 2.51198 21.1201C20.0225 21.1201 37.0924 15.6305 51.3204 5.42347L58.8804 0Z"
        strokeWidth="20"
        stroke="currentColor"
        mask="url(#cq-earnings-cone)"
      />
      {/* Cone cap */}
      <path
        d="M58 25H60.12C61.7769 25 63.12 26.3431 63.12 28V34.8001C63.12 36.4569 61.7769 37.8001 60.12 37.8001H58V25Z"
        fill="currentColor"
      />
      {/* Shout lines */}
      <rect
        x="49"
        y="23.7236"
        width="6"
        height="7"
        transform="rotate(-35.0348 49 23.7236)"
        fill="currentColor"
      />
      <rect x="50" y="28" width="6" height="7" fill="currentColor" />
      <rect
        x="53.0151"
        y="33"
        width="6"
        height="7"
        transform="rotate(35 53.0151 33)"
        fill="currentColor"
      />
    </NavGlyph>
  );
}
