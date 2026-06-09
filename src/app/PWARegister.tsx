"use client";

import { useEffect } from "react";

// Registers the Cuequill service worker once the page is idle.
// Runs only in production builds - dev mode disables SW so changes
// don't get cached and confuse you while iterating.
export default function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // Non-fatal - app still works without offline support.
          console.warn("[Cuequill] SW registration failed:", err);
        });
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
