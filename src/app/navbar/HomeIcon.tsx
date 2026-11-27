import { NavGlyph } from "./NavGlyph";

// The Home nav glyph. The house base has the window cut out (evenodd) with a
// separate cover path filling it; on the active state the cover lifts up,
// shrinks and fades - revealing the open window - and reverses when inactive.
export default function HomeIcon({
  className,
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <NavGlyph className={className} viewBox="0 0 93 64" height="0.9em">
      {/* House base (window hole punched out) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M72.1792 36.0438C72.1792 33.491 70.251 31.3428 67.7101 31.0968C52.0995 29.5851 41.7139 29.6597 26.1083 31.115C23.5556 31.353 21.6113 33.5059 21.6113 36.0697V57.9516C21.6113 61.2653 24.2976 63.9516 27.6113 63.9516H35.994C37.6509 63.9516 38.994 62.6085 38.994 60.9516V54.5504C38.994 52.8935 40.3372 51.5504 41.994 51.5504H46.8953H51.7965C53.4534 51.5504 54.7965 52.8935 54.7965 54.5504V60.9516C54.7965 62.6085 56.1397 63.9516 57.7965 63.9516H66.1792C69.4929 63.9516 72.1792 61.2653 72.1792 57.9516V36.0438ZM28.9692 47.0009C27.8647 47.0009 26.9692 46.1055 26.9692 45.0009V37.5009C26.9692 36.3963 27.8647 35.5009 28.9692 35.5009H35.494C36.5986 35.5009 37.494 36.3963 37.494 37.5009V45.0009C37.494 46.1055 36.5986 47.0009 35.494 47.0009H28.9692Z"
        fill="currentColor"
      />
      {/* Window cover - animates away on active */}
      <path
        d="M28.9692 35.5009C27.8647 35.5009 26.9692 36.3963 26.9692 37.5009V45.0009C26.9692 46.1055 27.8647 47.0009 28.9692 47.0009H35.494C36.5986 47.0009 37.494 46.1055 37.494 45.0009V37.5009C37.494 36.3963 36.5986 35.5009 35.494 35.5009H28.9692Z"
        fill="currentColor"
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
        d="M40.3783 4.73941C43.9825 1.94905 49.0175 1.94905 52.6217 4.7394L76.6652 23.3537C79.402 25.4725 76.7571 30.3347 73.4155 29.433C54.2028 24.2482 38.4826 24.4558 18.589 29.9144C15.2781 30.8228 12.7507 26.1285 15.4655 24.0267L40.3783 4.73941Z"
        fill="currentColor"
      />
    </NavGlyph>
  );
}
