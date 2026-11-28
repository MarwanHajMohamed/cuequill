import { NavGlyph } from "./NavGlyph";

// The Quill AI nav glyph.
export default function QuillAIIcon({
  className,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <NavGlyph className={className} viewBox="0 0 30 64" height="1.3em">
      <path
        d="M14.8995 0C14.8995 0 25.0115 18.0736 28.1984 31.1537C28.9312 34.1615 29.7941 38.9421 29.7941 38.9421C29.7941 38.9421 29.8855 40.8113 29.2623 40.8113C27.9322 40.8113 14.8995 62.3074 14.8995 62.3074C14.8995 62.3074 2.93035 40.8113 0.536795 40.8113C-0.0864269 40.8113 0.00466029 38.9421 0.00466029 38.9421C0.00466029 38.9421 0.867762 34.1615 1.6007 31.1537C4.78798 18.0737 14.8995 0 14.8995 0Z"
        fill="currentColor"
      />
      <ellipse
        cx="14.8994"
        cy="61.9683"
        rx="2.03175"
        ry="2.03176"
        fill="currentColor"
      />
    </NavGlyph>
  );
}
