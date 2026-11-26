import { NavGlyph } from "./NavGlyph";

// Reports nav glyph: a document with a folded corner.
export default function ReportsIcon({
  className,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <NavGlyph className={className} viewBox="0 0 44 53" height="1.15em">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M30 0H5C2.23858 0 0 2.23858 0 5V48C0 50.7614 2.23858 53 5 53H39C41.7614 53 44 50.7614 44 48V12L31.6238 14.8878C30.3173 15.1926 29.0871 14.1501 29.1735 12.8113L30 0Z"
        fill="#D9D9D9"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M44 11L32.1521 12.8228C31.5463 12.916 31 12.4473 31 11.8344V0L44 11Z"
        fill="#D9D9D9"
      />
    </NavGlyph>
  );
}
