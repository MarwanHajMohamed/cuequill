"use client";

// Small button that replays the current page's tour. Any page with a
// mounted <PageTour /> is targetable — the button fires a global
// `cuequill:start-tour` event which every PageTour listens for.
//
// Two variants:
//   - default (a compact pill), for putting inline in a page header
//   - `variant="link"`, for use in Settings
export default function ShowMeAround({
  pageId,
  variant = "pill",
  label = "Show me around",
}: {
  // Which page's tour to launch. Omit to launch whichever tour is
  // mounted on the current page.
  pageId?: string;
  variant?: "pill" | "link";
  label?: string;
}) {
  const start = () => {
    window.dispatchEvent(
      new CustomEvent("cuequill:start-tour", { detail: pageId }),
    );
  };

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={start}
        className="text-teal-300 hover:text-teal-200 text-[13px] font-medium underline decoration-teal-500/40 underline-offset-2 cursor-pointer"
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08] transition text-[12px] font-medium cursor-pointer"
    >
      <i className="fa-regular fa-circle-question text-[11px]" />
      {label}
    </button>
  );
}
