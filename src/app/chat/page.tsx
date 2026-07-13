"use client";

import { withAuth } from "@/lib/withAuth";
import ProGate from "@/components/ProGate";
import { AnimatePresence, motion } from "framer-motion";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Trade } from "@/app/types/Trades";
import { useTrades } from "@/hooks/useTrades";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import ViewTradeModal from "@/app/dashboard/components/modals/ViewTradeModal";

import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";
type Msg = { role: "user" | "model"; text: string; pending?: boolean };

// Supplied by the chat Page so that any `trade://<id>` link the Gemini
// reply contains can both (a) look up the trade's data from the
// already-loaded list to render a card, and (b) open the existing
// ViewTradeModal on click. Context (rather than prop drilling) keeps
// the ReactMarkdown components block clean.
type TradeChatCtx = {
  openTrade: (id: string) => void;
  findTrade: (id: string) => Trade | undefined;
};
const TradeChatContext = createContext<TradeChatCtx | null>(null);

// react-markdown sanitizes link URLs by default and drops any scheme
// that isn't in its safe-list (http/https/mailto/tel/etc.). Without
// this transform, `trade://<id>` would be stripped entirely and the
// link would render as plain text — the <a> component override would
// never see the href and the trade cards / click handlers would
// silently break. Allow trade:// through; mirror the safe-list for
// everything else.
function tradeAwareUrlTransform(url: string): string {
  if (url.startsWith("trade://")) return url;
  if (/^(https?|mailto|tel|ftp):/i.test(url)) return url;
  if (url.startsWith("/") || url.startsWith("#")) return url;
  if (!url.includes(":")) return url; // relative
  return "";
}

// Chat history now lives server-side (per user) via /api/chat/history, so
// it syncs across devices and can never leak between accounts on a shared
// browser. These are the old localStorage keys, purged on load to remove
// any lingering client copy from the previous approach.
const LEGACY_LOCAL_KEY = "cuequill:chat:v1";

// Compact starter prompts shown on the empty state. Title + body lets
// each one read as a tappable card rather than a wall of pills.
const SUGGESTIONS: {
  title: string;
  body: string;
  icon: string;
  prompt: string;
}[] = [
  {
    icon: "fa-solid fa-chart-line",
    title: "How am I doing?",
    body: "Performance this month vs the last.",
    prompt: "How am I doing this month?",
  },
  {
    icon: "fa-solid fa-trophy",
    title: "Best strategy",
    body: "Which setup wins most for me?",
    prompt: "Which strategy is performing best for me?",
  },
  {
    icon: "fa-solid fa-pen-to-square",
    title: "Log a trade",
    body: "Add a new trade in plain English.",
    prompt: "Help me log a trade",
  },
  {
    icon: "fa-solid fa-magnifying-glass",
    title: "Review my losses",
    body: "Last 5 losses - what they had in common.",
    prompt:
      "Show me my last 5 losing trades and what they had in common.",
  },
];

// Sentinel emitted by the server when the chat turn modified the user's
// trades. Stripped from display text and used to invalidate the cached
// trades query so the Trades tab refreshes immediately. Must match
// REFRESH_SENTINEL in /api/chat/route.ts exactly.
const REFRESH_SENTINEL = "[[CUEQUILL_REFRESH_TRADES]]";

// Word-drip cadence - how often the ticker appends one queued token to
// the live message bubble. 25ms ≈ 40 tokens/sec; feels like a quick
// natural type rather than a dump.
const TYPE_INTERVAL_MS = 25;

function Page() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // Trade being viewed via a `trade://` link in the Gemini reply.
  const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);

  // Pull the user's full trade list once (React Query caches it across
  // the app) so the trade cards rendered inside chat replies can read
  // their data straight from memory — no N+1 fetches per card.
  const { data: trades } = useTrades(userId, false);

  // Look up a trade by id from the cached list. Returns undefined when
  // the id isn't known (rare — Gemini only sees ids that exist in this
  // same list — but possible for simulated trades or a stale cache).
  const findTrade = useCallback(
    (id: string): Trade | undefined =>
      trades?.find((t) => String(t._id) === id),
    [trades],
  );

  // Open the ViewTradeModal for a given trade id. Prefer the cached
  // copy; fall back to a single /api/trades/<id> GET so a card the
  // cache doesn't have can still be opened.
  const openTrade = useCallback(
    async (id: string) => {
      const cached = trades?.find((t) => String(t._id) === id);
      if (cached) {
        setViewingTrade(cached);
        return;
      }
      try {
        const res = await fetch(`/api/trades/${encodeURIComponent(id)}`);
        if (!res.ok) {
          console.error(`Failed to open trade ${id}: HTTP ${res.status}`);
          return;
        }
        setViewingTrade((await res.json()) as Trade);
      } catch (err) {
        console.error("Failed to open trade", err);
      }
    },
    [trades],
  );

  const tradeChat = useMemo<TradeChatCtx>(
    () => ({ openTrade, findTrade }),
    [openTrade, findTrade],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Live height of the composer (fixed-positioned on mobile). Drives
  // the bottom padding of the messages column so the chat box ends
  // above the composer instead of scrolling behind it. Recalculated
  // whenever the textarea grows from 1 line up to its 6-line max.
  const [composerH, setComposerH] = useState(0);

  // Word-drip plumbing - kept in refs because the producer (network
  // reader) and consumer (interval timer) both live outside React's
  // render cycle.
  const renderQueueRef = useRef<string[]>([]);
  const networkOpenRef = useRef(false);
  const tickerRef = useRef<number | null>(null);

  // Observe the composer's rendered height so the messages column
  // can reserve exactly that much bottom space on mobile. offsetHeight
  // covers content + padding + border in one number, no approximation.
  useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    setComposerH(el.offsetHeight);
    const ro = new ResizeObserver(() => {
      if (formRef.current) setComposerH(formRef.current.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Persistence (server-side, per user) ──────────────────────────────
  // Push the current conversation to the server. Called on turn boundaries
  // (not per streamed token) via the debounced effect below.
  const persist = useCallback(
    async (msgs: Msg[]) => {
      if (!userId) return;
      try {
        await fetch("/api/chat/history", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: msgs
              .filter((m) => !m.pending)
              .map(({ role, text }) => ({ role, text })),
          }),
        });
      } catch {
        /* best-effort */
      }
    },
    [userId],
  );

  // Guards auto-save: only true once we've SUCCESSFULLY loaded the
  // server's history. Prevents a transient GET failure (which leaves
  // messages empty) from overwriting the stored conversation with [].
  const loadedOkRef = useRef(false);

  // Load the signed-in user's conversation whenever their id resolves or
  // changes (account switch swaps in the right one). Also purges any old
  // localStorage copies from the previous client-side approach.
  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.removeItem(LEGACY_LOCAL_KEY);
      localStorage.removeItem(`${LEGACY_LOCAL_KEY}:${userId}`);
    } catch {
      /* ignore */
    }
    let cancelled = false;
    loadedOkRef.current = false;
    setHydrated(false);
    (async () => {
      let loaded: Msg[] = [];
      let ok = false;
      try {
        const res = await fetch("/api/chat/history", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages)) loaded = data.messages as Msg[];
          ok = true;
        }
      } catch {
        /* ignore — start empty, but don't allow overwriting the server */
      }
      if (!cancelled) {
        loadedOkRef.current = ok;
        setMessages(loaded);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Save on turn boundaries: only while NOT streaming (so we don't write
  // per token) and debounced, so a finished turn — once the drip ticker
  // has drained — is persisted exactly once. Skipped until a successful
  // load so we never clobber stored history after a failed fetch.
  useEffect(() => {
    if (!hydrated || !userId || streaming || !loadedOkRef.current) return;
    const id = setTimeout(() => persist(messages), 700);
    return () => clearTimeout(id);
  }, [messages, hydrated, userId, streaming, persist]);

  // Auto-scroll the inner container AND the window every time the
  // displayed text grows.
  useEffect(() => {
    const inner = scrollRef.current;
    if (inner) inner.scrollTop = inner.scrollHeight;
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  // Word-by-word drip ticker.
  const ensureTicker = useCallback(() => {
    if (tickerRef.current !== null) return;
    tickerRef.current = window.setInterval(() => {
      const next = renderQueueRef.current.shift();
      if (next === undefined) {
        if (!networkOpenRef.current && tickerRef.current !== null) {
          window.clearInterval(tickerRef.current);
          tickerRef.current = null;
        }
        return;
      }
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "model") {
          copy[copy.length - 1] = {
            role: "model",
            text: last.text + next,
          };
        }
        return copy;
      });
    }, TYPE_INTERVAL_MS);
  }, []);

  const enqueueChunk = useCallback(
    (chunk: string) => {
      const parts = chunk.match(/\S+\s*|\s+/g) ?? [];
      if (parts.length === 0) return;
      renderQueueRef.current.push(...parts);
      ensureTicker();
    },
    [ensureTicker],
  );

  useEffect(
    () => () => {
      if (tickerRef.current !== null) {
        window.clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
    },
    [],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;
      const next: Msg[] = [
        ...messages,
        { role: "user", text: trimmed },
        { role: "model", text: "", pending: true },
      ];
      setMessages(next);
      setInput("");
      setStreaming(true);
      networkOpenRef.current = true;
      renderQueueRef.current = [];

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: next
              .filter((m) => !m.pending)
              .map(({ role, text }) => ({ role, text })),
          }),
        });
        if (!res.ok || !res.body) {
          const errText = (await res.text()) || `HTTP ${res.status}`;
          networkOpenRef.current = false;
          // 429 bodies are already user-facing (rate/usage limit reached);
          // show them as-is rather than prefixed with "Sorry".
          const display =
            res.status === 429 ? errText : `Sorry - ${errText}`;
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "model", text: display };
            return copy;
          });
          return;
        }
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.pending) {
            copy[copy.length - 1] = { role: "model", text: "" };
          }
          return copy;
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let tail = "";
        let tradesTouched = false;
        const SENTINEL_LEN = REFRESH_SENTINEL.length;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          tail += decoder.decode(value, { stream: true });
          while (tail.includes(REFRESH_SENTINEL)) {
            const i = tail.indexOf(REFRESH_SENTINEL);
            const before = tail.slice(0, i);
            tail = tail.slice(i + SENTINEL_LEN);
            if (before) enqueueChunk(before);
            tradesTouched = true;
          }
          const safe = tail.length - (SENTINEL_LEN - 1);
          if (safe > 0) {
            enqueueChunk(tail.slice(0, safe));
            tail = tail.slice(safe);
          }
        }
        if (tail) {
          if (tail.includes(REFRESH_SENTINEL)) {
            tradesTouched = true;
            tail = tail.split(REFRESH_SENTINEL).join("");
          }
          if (tail) enqueueChunk(tail);
        }
        if (tradesTouched && userId) {
          queryClient.invalidateQueries({ queryKey: ["trades", userId] });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "model",
            text: `Sorry - ${msg}`,
          };
          return copy;
        });
      } finally {
        networkOpenRef.current = false;
        setStreaming(false);
      }
    },
    [messages, streaming, enqueueChunk, queryClient, userId],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clear = () => {
    renderQueueRef.current = [];
    if (tickerRef.current !== null) {
      window.clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    setMessages([]);
    // Persist the cleared state immediately (don't wait for the debounce).
    persist([]);
  };

  const empty = messages.length === 0;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 6 * 22 + 12) + "px";
  }, [input]);

  const Greeting = useMemo(
    () => (
      <div className="flex flex-col items-center gap-8 w-full max-w-xl mx-auto">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/25 text-[11px] tracking-[0.08em] font-medium">
            <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />
            QuillAI
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Ask anything about your trades
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.title}
              onClick={() => send(s.prompt)}
              className="group text-left rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition px-3.5 py-3 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 mb-0.5">
                <i
                  className={`${s.icon} text-[11px] text-teal-300/80 group-hover:text-teal-300 transition`}
                />
                <span className="text-[13px] font-medium text-white">
                  {s.title}
                </span>
              </div>
              <div className="text-[11.5px] text-white/45 leading-snug">
                {s.body}
              </div>
            </button>
          ))}
        </div>
      </div>
    ),
    [send],
  );

  return (
    /* TradeChatContext supplies both findTrade() (used by TradeCard to
       render a styled card from the cached trade data) and openTrade()
       (used to open ViewTradeModal on click) to the Markdown <a>
       override deep inside MarkdownText. */
    <TradeChatContext.Provider value={tradeChat}>
    {/* The outer column is sized to EXACTLY the visible area (viewport
       minus the floating mobile nav, or full viewport on desktop)
       using `h-[…]` rather than `min-h-[…]`. That swap is load-
       bearing: with min-h the container could grow when messages
       overflow, the WHOLE PAGE would scroll, and chat content would
       slide behind both the top navbar and the floating bottom-nav.
       With a fixed h, the flex chain inside (flex-1 + min-h-0 +
       overflow-y-auto on the message list) actually constrains, so
       scroll happens INSIDE the messages container and the chat area
       stays cleanly bounded between the two navbars. */}
    <div className="w-full flex flex-col items-stretch h-[calc(100dvh-88px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-screen md:pb-3">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      {/* The inner column reserves `--composer-pb` of bottom padding on
          mobile so the messages column visually CLOSES above the fixed
          composer instead of extending behind it. Desktop forces it
          back to 0 because the composer is in-flow there. */}
      <div className="w-full max-w-[1100px] mx-auto px-5 md:px-10 mt-12 md:mt-28 flex-1 flex flex-col min-h-0">
        {empty ? (
          <div className="flex-1 flex items-center justify-center pb-6">
            {Greeting}
          </div>
        ) : (
          <div className="flex-1 min-h-0 relative">
            <button
              onClick={clear}
              className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur text-white/60 hover:bg-white/[0.08] hover:text-white transition text-[12px] font-medium cursor-pointer"
              aria-label="Clear conversation"
            >
              <i className="fa-regular fa-trash-can text-[10px]" />
              Clear
            </button>
            <div
              ref={scrollRef}
              className="h-full overflow-y-auto pr-1"
            >
              <div
                className="flex flex-col gap-3 md:gap-4 pt-4 pb-[var(--msg-pb,4rem)] md:pb-4"
                style={
                  { "--msg-pb": `${composerH + 24}px` } as React.CSSProperties
                }
              >
                {messages.map((m, i) => (
                  <Bubble
                    key={i}
                    role={m.role}
                    text={m.text}
                    pending={m.pending}
                  />
                ))}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Bottom edge blend (desktop) - the composer is in-flow here,
                sitting right below the message view, so an absolute band at
                the bottom of the scroll area blends straight into it. On
                mobile the composer is fixed with a reserved gap, so a
                separate fixed band (below) handles the blend instead. */}
            <div
              aria-hidden
              className="hidden md:block pointer-events-none absolute inset-x-0 bottom-0 h-16 z-10"
              style={{
                background:
                  "linear-gradient(to top, rgb(var(--bg-rgb) / 0.85) 0%, rgb(var(--bg-rgb) / 0.4) 45%, rgb(var(--bg-rgb) / 0) 100%)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                maskImage:
                  "linear-gradient(to top, #000 55%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to top, #000 55%, transparent 100%)",
              }}
            />
          </div>
        )}

        {/* Mobile: fixed above the floating bottom-nav so the composer
            never scrolls with the chat. Backdrop-blur + opaque tint so
            messages scrolling underneath don't show through.
            Desktop: original in-flow layout, no special background. */}
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="fixed left-5 right-5 z-30 bottom-[calc(74px+env(safe-area-inset-bottom))] bg-[var(--background)]/85 backdrop-blur-md md:static md:left-auto md:right-auto md:bottom-auto md:mt-3 md:bg-white/[0.04] md:backdrop-blur-0 flex items-end gap-2 rounded-2xl border border-white/10 px-3 py-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask about your trades..."
            className="flex-1 resize-none bg-transparent text-[14px] text-white placeholder:text-white/35 placeholder:text-[12px] focus:outline-none py-1.5 max-h-[160px]"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border transition ${
              !input.trim() || streaming
                ? "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
                : "bg-teal-500/15 text-teal-300 border-teal-500/25 hover:bg-teal-500/25 cursor-pointer"
            }`}
            aria-label="Send"
          >
            {streaming ? (
              <i className="fa-solid fa-circle-notch text-[12px] animate-spin" />
            ) : (
              <i className="fa-solid fa-chevron-up text-[12px]" />
            )}
          </button>
        </form>

        {/* Mobile bottom blend - the composer is fixed on phones and the
            messages now scroll down behind it. This fixed frosted band sits
            behind/below the composer (lower z) and reaches up into the
            messages, so the chat dissolves into and beneath the chat box.
            pointer-events-none so taps fall through to the messages. */}
        {!empty && (
          <div
            aria-hidden
            className="md:hidden pointer-events-none fixed inset-x-0 z-20"
            style={{
              bottom: `calc(58px + env(safe-area-inset-bottom))`,
              height: composerH + 100,
              background:
                "linear-gradient(to top, rgb(var(--bg-rgb) / 0.92) 0%, rgb(var(--bg-rgb) / 0.5) 50%, rgb(var(--bg-rgb) / 0) 100%)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              maskImage: "linear-gradient(to top, #000 65%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to top, #000 65%, transparent 100%)",
            }}
          />
        )}
      </div>
    </div>

    {/* Mounted at the Provider level so it overlays the whole page,
        independent of the chat scroll container. AnimatePresence drives
        the modal's existing motion.div enter/exit animation. */}
    <AnimatePresence>
      {viewingTrade && (
        <ViewTradeModal
          initialTrade={viewingTrade}
          onClose={() => setViewingTrade(null)}
        />
      )}
    </AnimatePresence>
    </TradeChatContext.Provider>
  );
}

function Bubble({
  role,
  text,
  pending,
}: {
  role: "user" | "model";
  text: string;
  pending?: boolean;
}) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[88%] md:max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed break-words ${
          isUser
            ? "bg-teal-500/15 text-white border border-teal-500/25"
            : "bg-white/[0.04] text-white/90 border border-white/10"
        }`}
      >
        {!text && pending ? (
          <TypingDots />
        ) : isUser ? (
          <span className="whitespace-pre-wrap">{text}</span>
        ) : (
          <MarkdownText text={text} />
        )}
      </div>
    </motion.div>
  );
}

const HIGHLIGHT_RE = /(\bCALL\b|\bPUT\b|[+\-−]\$[\d,]+(?:\.\d+)?)/gi;

function highlight(text: string): React.ReactNode {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(HIGHLIGHT_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const v = m[0];
    const up = v.toUpperCase();
    let cls = "";
    if (up === "CALL") cls = "text-green-300 font-semibold";
    else if (up === "PUT") cls = "text-red-300 font-semibold";
    else if (v.startsWith("+"))
      cls = "text-green-300 font-medium tabular-nums";
    else cls = "text-red-300 font-medium tabular-nums";
    out.push(
      <span key={`${idx}-${v}`} className={cls}>
        {v}
      </span>,
    );
    last = idx + v.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length === 0 ? text : out;
}

function walkChildren(children: React.ReactNode): React.ReactNode {
  if (typeof children === "string") return highlight(children);
  if (Array.isArray(children)) {
    return children.map((c, i) =>
      typeof c === "string" ? (
        <React.Fragment key={i}>{highlight(c)}</React.Fragment>
      ) : (
        c
      ),
    );
  }
  return children;
}

// ─── TradeCard ─────────────────────────────────────────────────────────
//
// Replaces a `[trade-card](trade://<id>)` Markdown link with a styled
// card rendered from the user's authoritative trade data. The Gemini
// reply contains only the id; everything visible on the card comes
// from the chat page's useTrades cache so it's always accurate and
// consistent regardless of how Gemini chose to describe the trade.
//
// Clicking anywhere on the card opens the existing ViewTradeModal via
// the TradeChatContext.openTrade callback.

const MONEY_FMT = (n: number) =>
  `${fmtMoneySignedCompact(n)}`;

function fmtDate(d: string | Date | null | undefined): string | null {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : format(parsed, "MMM d, yyyy");
}

function TradeCard({ id }: { id: string }) {
  const ctx = useContext(TradeChatContext);
  const trade = ctx?.findTrade(id);
  const onClick = () => ctx?.openTrade(id);

  // Cache miss: still clickable — openTrade() falls back to a single
  // /api/trades/<id> fetch, so the user can always view the modal.
  if (!trade) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition px-3.5 py-2.5 my-1.5 cursor-pointer"
      >
        <div className="flex items-center gap-2 text-xs text-white/45">
          <i className="fa-solid fa-receipt text-[11px] text-white/30" />
          <span>Trade · tap to view</span>
        </div>
      </button>
    );
  }

  const isCall = trade.option === "CALL";
  const isWin = trade.status === "WIN";
  const isLoss = trade.status === "LOSS";
  const isOpen = trade.status === "OPEN";

  const netPL = tradeNetPL(trade as Trade);
  const entryDate = fmtDate(trade.dateBought);
  const exitDate = fmtDate(trade.dateClosed);

  // Border/background tint follows the trade outcome. Keep it subtle
  // so a column of cards stays scannable — the chip + amount carry
  // the strong color.
  const tone = isWin
    ? "border-green-500/20 bg-green-500/[0.04] hover:bg-green-500/[0.08] hover:border-green-500/30"
    : isLoss
      ? "border-red-500/20 bg-red-500/[0.04] hover:bg-red-500/[0.08] hover:border-red-500/30"
      : "border-orange-500/20 bg-orange-500/[0.04] hover:bg-orange-500/[0.08] hover:border-orange-500/30";

  const amountColor = isOpen
    ? "text-orange-300/90"
    : netPL >= 0
      ? "text-green-400"
      : "text-red-400";

  const optionChip = isCall
    ? "bg-green-500/15 text-green-400"
    : "bg-red-500/15 text-red-400";

  const statusChip = isWin
    ? "bg-green-500/15 text-green-400"
    : isLoss
      ? "bg-red-500/15 text-red-400"
      : "bg-orange-500/15 text-orange-400";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full text-left rounded-xl border transition px-3.5 py-2.5 my-1.5 cursor-pointer ${tone}`}
      aria-label={`View trade ${trade.symbol} ${trade.option}`}
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-bold text-[15px] text-white">
          {trade.symbol}
        </span>
        <span
          className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${optionChip}`}
        >
          {trade.option}
        </span>
        <span
          className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${statusChip}`}
        >
          {trade.status}
        </span>
        <span
          className={`ml-auto text-[13px] font-semibold tabular-nums ${amountColor}`}
        >
          {isOpen ? "Open" : MONEY_FMT(netPL)}
        </span>
      </div>

      <div className="mt-1 text-[11.5px] text-white/55 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="tabular-nums">
          ${trade.strike} × {trade.qty}
        </span>
        {entryDate && (
          <>
            <span className="text-white/20">·</span>
            <span className="tabular-nums">
              {entryDate}
              {!isOpen && exitDate ? ` › ${exitDate}` : ""}
            </span>
          </>
        )}
      </div>

      {trade.strategy && trade.strategy !== "Other" && (
        <div className="mt-0.5 text-[11px] italic text-white/45 truncate">
          {trade.strategy}
        </div>
      )}
    </button>
  );
}

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="space-y-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={tradeAwareUrlTransform}
        components={{
          p: ({ children }) => (
            <p className="leading-relaxed">{walkChildren(children)}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">
              {walkChildren(children)}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic">{walkChildren(children)}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 marker:text-white/40">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 marker:text-white/40">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{walkChildren(children)}</li>
          ),
          h1: ({ children }) => (
            <h3 className="text-[15px] font-semibold mt-1">
              {walkChildren(children)}
            </h3>
          ),
          h2: ({ children }) => (
            <h4 className="text-[14px] font-semibold mt-1">
              {walkChildren(children)}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 className="text-[13px] font-semibold mt-1">
              {walkChildren(children)}
            </h5>
          ),
          a: ({ href, children }) => {
            // `trade://<id>` links are emitted by Gemini for every
            // trade it mentions (see SYSTEM_PROMPT). They aren't real
            // URLs — replace them with a full TradeCard rendered from
            // the user's cached trade data. The link's inner text
            // (always the literal "trade-card") is discarded.
            if (href && href.startsWith("trade://")) {
              const id = href.slice("trade://".length).trim();
              if (id) return <TradeCard id={id} />;
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-300 underline decoration-teal-300/40 hover:decoration-teal-300"
              >
                {walkChildren(children)}
              </a>
            );
          },
          code: ({ className, children, ...rest }) => {
            const isBlock = (className ?? "").includes("language-");
            if (isBlock) {
              return (
                <code
                  className="block bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[12.5px] overflow-x-auto"
                  {...rest}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="bg-white/[0.06] border border-white/10 rounded px-1 py-0.5 text-[12.5px]"
                {...rest}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-white/[0.06] border border-white/10 rounded-lg p-3 overflow-x-auto text-[12.5px]">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-teal-400/40 pl-3 text-white/75 italic">
              {walkChildren(children)}
            </blockquote>
          ),
          hr: () => <hr className="border-white/10 my-3" />,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px] border-collapse">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="text-left px-2 py-1 border-b border-white/15 font-semibold text-white/80">
              {walkChildren(children)}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1 border-b border-white/[0.06]">
              {walkChildren(children)}
            </td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/50"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.18,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

function GatedPage() {
  return (
    <ProGate
      feature="Quill AI"
      description="Ask questions about your own trades in plain English. Spot patterns, compare strategies, log trades by chat."
      className="min-h-screen"
    >
      <Page />
    </ProGate>
  );
}

export default withAuth(GatedPage);
