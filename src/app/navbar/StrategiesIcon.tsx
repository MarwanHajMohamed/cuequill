import { NavGlyph } from "./NavGlyph";

// Strategies nav glyph (chess knight on a pedestal). On the active state the
// knight hops off the base - lift + tilt, then a small landing bounce - while
// the two pedestal platforms stay put.
export default function StrategiesIcon({
  className,
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <NavGlyph className={className} viewBox="0 0 52 64" height="1.15em">
      {/* Pedestal - static */}
      <path
        d="M3.75 61.0671C3.75 58.9028 5.14278 56.9762 7.21042 56.3366C21.91 51.7899 31.5729 50.7605 48.2421 56.286C50.2399 56.9482 51.5595 58.8401 51.5595 60.9449V64.0003C32.7904 55.2573 22.2713 55.2647 3.75 64.0003V61.0671Z"
        fill="currentColor"
      />
      <path
        d="M6.56201 52.6341C6.56201 50.4588 7.96981 48.5193 10.0603 47.9178C22.8717 44.2315 31.3647 44.334 44.1633 47.9341C46.2732 48.5276 47.7023 50.4766 47.7023 52.6683V56.6961C31.6662 48.757 22.613 48.8528 6.56201 56.6961V52.6341Z"
        fill="currentColor"
      />
      {/* Knight - hops on active */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "bottom",
          animation: active
            ? "cq-strategy-hop 650ms cubic-bezier(0.34, 1.4, 0.6, 1)"
            : "none",
        }}
      >
        <path
          d="M24.427 23.5693L39.0738 26.5691L38.2965 34.213C38.1205 35.9438 38.3991 37.6906 39.1047 39.2808L39.6968 40.6151C40.7142 42.9077 38.6305 45.3748 36.1657 44.9101C29.0006 43.5593 23.4716 43.7195 15.7536 45.5604C14.2113 45.9283 12.6452 44.9813 12.3114 43.4313C11.7092 40.6348 12.4377 37.7171 14.2839 35.5319L14.5614 35.2034C15.5494 34.034 16.7927 33.107 18.1955 32.4939L18.4265 32.393C21.8018 30.9179 24.0928 27.7067 24.3894 24.0351L24.427 23.5693Z"
          fill="currentColor"
        />
        <path
          d="M13.1949 8.69918L11.4308 1.61888C16.6043 0.666511 17.8418 3.68712 29.4044 8.78835L25.9127 17.385C25.4279 22.849 20.772 26.7161 14.3962 23.7391C13.3372 23.2446 12.0901 22.8455 11.1311 23.5134C8.96355 25.0229 8.95711 28.3774 5.26882 26.8961L0.755186 21.1147L13.1949 8.69918Z"
          fill="currentColor"
        />
        <path
          d="M17.999 21.8552L28.7126 8.57031C40.0402 12.4766 39.589 15.2883 39.0834 26.5691L23.5701 27.8548C25.2884 23.0755 23.355 20.0602 20.9988 18.4268L17.999 21.8552Z"
          fill="currentColor"
        />
      </g>
    </NavGlyph>
  );
}
