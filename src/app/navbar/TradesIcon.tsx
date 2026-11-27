import { NavGlyph } from "./NavGlyph";

// Trades nav glyph: axes + four bars. On the active state the bars do a
// staggered bounce - alternating grow-up / shrink-down from the baseline -
// then settle back. Each bar is its own rect so it can animate independently.
const BARS: {
  x: number;
  y: number;
  w: number;
  h: number;
  dir: "up" | "down";
  delay: number;
}[] = [
  { x: 13, y: 30, w: 10, h: 21, dir: "up", delay: 0 },
  { x: 25, y: 21, w: 10, h: 30, dir: "down", delay: 90 },
  { x: 37, y: 28, w: 10, h: 23, dir: "up", delay: 180 },
  { x: 49, y: 11, w: 10, h: 40, dir: "down", delay: 270 },
];

export default function TradesIcon({
  className,
  active = false,
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
      {BARS.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          rx="2"
          fill="currentColor"
          style={{
            transformBox: "fill-box",
            transformOrigin: "bottom",
            animation: active
              ? `cq-trade-bar-${b.dir} 640ms cubic-bezier(0.34, 1.4, 0.6, 1) ${b.delay}ms`
              : "none",
          }}
        />
      ))}
    </NavGlyph>
  );
}
