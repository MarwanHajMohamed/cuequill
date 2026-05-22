import { useEffect } from "react";

/**
 * Lock background page scroll while a modal/sheet is mounted.
 *
 * Why it's done this way:
 *   - Desktop Chrome/Firefox/Safari scroll the <html> element by default, not
 *     <body>, so `body { overflow: hidden }` alone has no effect.
 *   - iOS Safari ignores `overflow: hidden` for touch scrolling, but does
 *     respect `position: fixed` on <body>.
 *
 * So we set overflow:hidden on BOTH <html> and <body>, pin <body> at the
 * current scroll offset with position:fixed, and on unmount restore every
 * style we touched plus scroll the window back to where the user was.
 */
export function useScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);
}
