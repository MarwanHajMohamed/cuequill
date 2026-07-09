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
 * current scroll offset with position:fixed, and when the LAST lock releases
 * we restore every style we touched plus scroll the window back.
 *
 * Reference counting is essential: modals stack and overlap (e.g. the day
 * list modal is still animating out under AnimatePresence while the trade
 * modal mounts on top). A naive per-instance save/restore lets the second
 * modal capture the ALREADY-LOCKED styles as its "previous" and then restore
 * them on close — leaving the whole page stuck unscrollable. By saving the
 * original page state only on the 0→1 transition and restoring only on 1→0,
 * any amount of overlap is safe.
 */

let lockCount = 0;
let saved:
  | {
      htmlOverflow: string;
      bodyOverflow: string;
      bodyPosition: string;
      bodyTop: string;
      bodyWidth: string;
      scrollY: number;
    }
  | null = null;

function applyLock() {
  const html = document.documentElement;
  const body = document.body;
  const scrollY = window.scrollY;
  saved = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyWidth: body.style.width,
    scrollY,
  };
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.width = "100%";
}

function releaseLock() {
  if (!saved) return;
  const html = document.documentElement;
  const body = document.body;
  html.style.overflow = saved.htmlOverflow;
  body.style.overflow = saved.bodyOverflow;
  body.style.position = saved.bodyPosition;
  body.style.top = saved.bodyTop;
  body.style.width = saved.bodyWidth;
  const y = saved.scrollY;
  saved = null;
  window.scrollTo(0, y);
}

export function useScrollLock() {
  useEffect(() => {
    lockCount += 1;
    if (lockCount === 1) applyLock();

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) releaseLock();
    };
  }, []);
}
