// Tour catalogue - the coach-mark steps for each page the app tours.
//
// Each page has a stable id (used to remember which tours a user has
// seen) and an ordered list of steps. A step either points at an
// element via a CSS selector (usually `[data-tour="…"]` on the target)
// or omits the selector to render as a centred modal.
//
// Adding a new page's tour is: pick an id, mark the target elements
// with `data-tour="…"` in the JSX, list them here.

export type TourStep = {
  // CSS selector for the element to highlight. Omit for a centred
  // modal-style step (welcome / farewell).
  element?: string;
  title: string;
  body: string;
  // Where the popover sits relative to the highlighted element.
  // Driver.js defaults to "auto" if omitted.
  side?: "left" | "right" | "top" | "bottom";
  align?: "start" | "center" | "end";
};

export type Tour = {
  id: string;
  // Human-readable label for the "Show me around" button / settings.
  label: string;
  steps: TourStep[];
};

export const TOURS: Record<string, Tour> = {
  dashboard: {
    id: "dashboard",
    label: "Dashboard",
    steps: [
      {
        title: "Welcome to Cuequill",
        body: "This is your dashboard. It's the daily launchpad — the widgets here surface what changed since yesterday and what you should look at first. Let's walk through it.",
      },
      {
        element: '[data-tour="dash-glance"]',
        title: "At a glance",
        body: "Today, this week, and month-to-date P/L. The tiles here are reorderable — drag or swap them in Settings → Dashboard.",
      },
      {
        element: '[data-tour="dash-quillInsight"]',
        title: "Insight of the day",
        body: "Quill AI reads your recent trades and picks one specific thing worth your attention — a leak, a streak, or a rule you broke. Refreshes once per local day.",
      },
      {
        element: '[data-tour="dash-challenges"]',
        title: "Challenges",
        body: "Small daily and weekly goals. Complete them for XP, which unlocks avatar frames, card skins and titles as you level up.",
      },
      {
        element: '[data-tour="dash-calendar"]',
        title: "The calendar",
        body: "Your month at a glance — each day tinted by P/L. Tap any tile to drill into the trades that made up the number. There's a whole tour of the calendar page when you open it.",
      },
    ],
  },
  trades: {
    id: "trades",
    label: "Trades",
    steps: [
      {
        title: "Your trades",
        body: "Every trade you've logged or imported lives here. This page is where you'll spend the most time — logging, editing, filtering.",
      },
      {
        element: '[data-tour="trades-add"]',
        title: "Add a trade",
        body: "Log a trade by hand. If you're on Pro with IBKR sync configured, fills also stream in here every morning automatically.",
      },
      {
        element: '[data-tour="trades-sync"]',
        title: "Sync from your broker",
        body: "Pull the latest fills on demand — useful if you can't wait for the 6am morning sync. Import from a broker CSV lives in Settings → Import.",
      },
      {
        element: '[data-tour="trades-merge"]',
        title: "Merge trades",
        body: "If IBKR imported ten contracts of the same trade as separate rows, select them and merge into one weighted-average row.",
      },
      {
        element: '[data-tour="trades-filters"]',
        title: "Filters",
        body: "Slice by symbol, strategy, tag, side, return-% window and more. The result feeds every stat in the app for as long as the filter is active.",
      },
    ],
  },
  calendar: {
    id: "calendar",
    label: "Calendar",
    steps: [
      {
        title: "The calendar",
        body: "Cuequill's signature view. Every day tinted by your P/L, so a month of trading is legible in one glance.",
      },
      {
        element: '[data-tour="cal-grid"]',
        title: "The month grid",
        body: "Green days won, red days lost. Click any day to see the trades that made up the number, plus earnings and econ events that day.",
      },
      {
        element: '[data-tour="cal-share"]',
        title: "Share the view",
        body: "One-tap shareable card of the current view — month, week or day. Handy for the group chat.",
      },
      {
        title: "Market alerts",
        body: "When there's an earnings print or FOMC meeting that could move your positions, a red bar pops in at the top of the page so you never wake up short-gamma into a print.",
      },
    ],
  },
  chat: {
    id: "chat",
    label: "Quill AI",
    steps: [
      {
        title: "Quill AI",
        body: "Ask Quill about your own trading. It's read every fill, tag and rule you've logged and answers in seconds.",
      },
      {
        element: '[data-tour="chat-composer"]',
        title: "Ask anything",
        body: "Try 'Which strategy is my strongest?' or 'Show me every trade I broke a rule on'. Quill can tag trades, aggregate stats, and pull the receipts.",
      },
      {
        element: '[data-tour="chat-starters"]',
        title: "Starter prompts",
        body: "Saved prompts you use often. Edit or add your own — they save per-account.",
      },
    ],
  },
  strategies: {
    id: "strategies",
    label: "Strategies",
    steps: [
      {
        title: "Playbook",
        body: "Your setups, in your own words. Each strategy you name here becomes filterable across the app.",
      },
      {
        element: '[data-tour="strat-add"]',
        title: "Add a strategy",
        body: "Name it, describe it, tag the direction (call, put, or both). Attach screenshots so it stays concrete.",
      },
      {
        element: '[data-tour="strat-list"]',
        title: "Your playbook",
        body: "Click any card to open its detail page — description, examples, and the P/L / win-rate for every trade you've tagged with it.",
      },
    ],
  },
  rules: {
    id: "rules",
    label: "Rules",
    steps: [
      {
        title: "Rules board",
        body: "The rules you trade by. Break one, and Quill will flag it in your insights.",
      },
      {
        element: '[data-tour="rules-add"]',
        title: "Add a rule",
        body: "Keep them concrete and testable — 'No trades in the first 15 minutes', 'Stop out at 30% loss'. Vague rules are hard to enforce.",
      },
    ],
  },
  goals: {
    id: "goals",
    label: "Goals",
    steps: [
      {
        title: "Goals",
        body: "Targets for the month, quarter or year. Progress updates automatically from your trade log — no manual tracking.",
      },
      {
        element: '[data-tour="goals-add"]',
        title: "Add a goal",
        body: "Set a P/L target, win-rate floor, or trade count. Deadline optional. Drag to reorder.",
      },
    ],
  },
  affirmations: {
    id: "affirmations",
    label: "Affirmations",
    steps: [
      {
        title: "Affirmations",
        body: "Your morning ritual. Add trader-mindset affirmations you want to read every day before the open.",
      },
      {
        element: '[data-tour="aff-add"]',
        title: "Add an affirmation",
        body: "Type one and hit enter. Tick each one off as you read it — miss a day and the streak resets.",
      },
    ],
  },
  settings: {
    id: "settings",
    label: "Settings",
    steps: [
      {
        title: "Settings",
        body: "Preferences, billing, IBKR sync, exports, and — down at the bottom — a way to replay any of these tours.",
      },
      {
        element: '[data-tour="settings-plan"]',
        title: "Plan",
        body: "See your current plan, switch monthly/annual, cancel, or upgrade to Pro. All the invoices are here too.",
      },
      {
        element: '[data-tour="settings-tour"]',
        title: "Replay the tour",
        body: "Any time you want the coach marks back, hit 'Show me around' here to reset every page's tour.",
      },
    ],
  },
};
