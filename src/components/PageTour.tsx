"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { driver, type Config } from "driver.js";
import "driver.js/dist/driver.css";
import "./page-tour.css";
import { TOURS } from "@/lib/tutorials";

// Mount this once at the top of a page to opt it into the first-run
// coach-mark tour. On mount it fetches the user's `tutorialsSeen`
// list; if the given pageId isn't in it (and the field isn't
// null/legacy), it kicks off driver.js and marks the page seen when
// the tour ends. It also listens for a global `cuequill:start-tour`
// event so a "Show me around" button anywhere in the app can replay
// this page's tour on demand.
//
// The tour definitions live in @/lib/tutorials so pages only pass a
// pageId here.

export default function PageTour({ pageId }: { pageId: string }) {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const tour = TOURS[pageId];
    if (!tour) return;

    let cancelled = false;

    const launch = () => {
      const config: Config = {
        showProgress: tour.steps.length > 1,
        allowClose: true,
        overlayOpacity: 0.6,
        stagePadding: 6,
        stageRadius: 10,
        smoothScroll: true,
        popoverClass: "cq-tour",
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Got it",
        steps: tour.steps.map((s) => ({
          element: s.element,
          popover: {
            title: s.title,
            description: s.body,
            side: s.side,
            align: s.align,
          },
        })),
        onDestroyed: () => {
          // Fires on completion AND on skip/close - either way we
          // treat this page as seen so it doesn't nag next visit.
          fetch("/api/user/tutorial", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pageId, seen: true }),
          }).catch(() => {
            /* best-effort; a failed mark just means the tour runs
               once more next visit. Not worth surfacing an error. */
          });
        },
      };
      driver(config).drive();
    };

    // Auto-start if the user is opted in and hasn't seen this page.
    (async () => {
      try {
        const res = await fetch("/api/user/tutorial");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { seen: string[] | null };
        if (cancelled) return;
        if (data.seen === null) return; // legacy user, opted out by default
        if (data.seen.includes(pageId)) return;
        // Give the page a beat to render its target elements before
        // driver.js tries to spotlight them - otherwise the first
        // step can fall back to a centred popover.
        setTimeout(() => {
          if (!cancelled) launch();
        }, 350);
      } catch {
        /* offline / auth flap - silently skip */
      }
    })();

    // Manual restart via a global event. Fired by any "Show me
    // around" button (see @/components/ShowMeAround). `detail === undefined`
    // means "start whichever tour is on the current page".
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === undefined || detail === pageId) launch();
    };
    window.addEventListener("cuequill:start-tour", onStart);
    return () => {
      cancelled = true;
      window.removeEventListener("cuequill:start-tour", onStart);
    };
  }, [pageId, status]);

  return null;
}
