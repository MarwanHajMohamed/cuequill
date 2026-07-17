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
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import TradeModal from "@/app/dashboard/components/modals/TradeModal";
import {
  handleSaveTrade,
  handleDeleteTrade,
} from "@/handlers/tradeHandlers";
import ChatUsage from "./ChatUsage";
import ChatHistory, { type ConversationMeta } from "./ChatHistory";
import ConversationSidebar from "./ConversationSidebar";

import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";
type Msg = {
  role: "user" | "model";
  text: string;
  pending?: boolean;
  // Data-URL screenshots attached to a user turn (not persisted server-side,
  // so they only appear during the live session).
  images?: string[];
};

// Client-side image guardrails, mirroring the server's limits.
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE = /^image\/(png|jpe?g|webp|gif)$/;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

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
  {
    icon: "fa-solid fa-calendar-check",
    title: "Review my week",
    body: "A debrief: wins, leaks, rules, goals.",
    prompt:
      "Review my trading week. Give me a short debrief: my P/L and record for the week, what went well, the biggest mistake or leak in the data, any rules I broke, and where I stand on my goals. End with one thing to focus on next.",
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
  // Screenshots staged in the composer, waiting to be sent with the next
  // message. Data URLs.
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  // Live speech transcript, shown in the voice indicator while dictating.
  const [liveTranscript, setLiveTranscript] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // Trade being viewed via a `trade://` link in the Gemini reply.
  const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);

  // Conversation history: many threads per user. `conversationId` is the
  // active one; convIdRef mirrors it so async savers always target the
  // current thread without stale-closure bugs.
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  // Desktop history sidebar open/collapsed, persisted across visits.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem("cuequill:chatSidebar");
    if (saved !== null) setSidebarOpen(saved === "open");
  }, []);
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((o) => {
      const next = !o;
      try {
        localStorage.setItem("cuequill:chatSidebar", next ? "open" : "closed");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  const convIdRef = useRef<string | null>(null);
  const setConv = useCallback((id: string | null) => {
    convIdRef.current = id;
    setConversationId(id);
  }, []);

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live height of the composer (fixed-positioned on mobile). Drives
  // the bottom padding of the messages column so the chat box ends
  // above the composer instead of scrolling behind it. Recalculated
  // whenever the textarea grows from 1 line up to its 6-line max.
  const [composerH, setComposerH] = useState(0);

  // Scroll-to-bottom affordance: shown only when the user has scrolled up
  // far enough that they're no longer following the latest message.
  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const inner = scrollRef.current;
    if (inner) inner.scrollTo({ top: inner.scrollHeight, behavior });
  }, []);

  const onMessagesScroll = useCallback(() => {
    const inner = scrollRef.current;
    if (!inner) return;
    const distanceFromBottom =
      inner.scrollHeight - inner.scrollTop - inner.clientHeight;
    setShowScrollDown(distanceFromBottom > 240);
  }, []);

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

  // ── Persistence (server-side, per conversation) ──────────────────────
  // Guards auto-save: only true once the active conversation has loaded
  // successfully, so a transient fetch failure (which leaves messages
  // empty) can't overwrite a stored conversation with [].
  const loadedOkRef = useRef(false);

  // Push the current conversation's messages to the server. Reads the id
  // from a ref so it always targets the active thread.
  const persist = useCallback(async (msgs: Msg[]) => {
    const id = convIdRef.current;
    if (!id) return;
    try {
      await fetch(`/api/chat/conversations/${id}`, {
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
  }, []);

  const fetchConversationList = useCallback(async (): Promise<
    ConversationMeta[]
  > => {
    const res = await fetch("/api/chat/conversations", { cache: "no-store" });
    if (!res.ok) throw new Error("list failed");
    const data = await res.json();
    return (data.conversations ?? []) as ConversationMeta[];
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      setConversations(await fetchConversationList());
    } catch {
      /* keep the current list */
    }
  }, [fetchConversationList]);

  const resetTicker = useCallback(() => {
    renderQueueRef.current = [];
    if (tickerRef.current !== null) {
      window.clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  // Initial load: fetch the thread list, open the most recent (or create
  // the first one), and load its messages. Re-runs on account switch.
  useEffect(() => {
    if (!userId) return;
    // Purge any leftover localStorage copies from the old client approach.
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
      try {
        let list = await fetchConversationList();
        let id: string | null = null;
        let msgs: Msg[] = [];
        let ok = false;
        if (list.length > 0) {
          id = list[0].id;
          const mRes = await fetch(`/api/chat/conversations/${id}`, {
            cache: "no-store",
          });
          if (mRes.ok) {
            msgs = ((await mRes.json()).messages ?? []) as Msg[];
            ok = true;
          }
        } else {
          const cRes = await fetch("/api/chat/conversations", {
            method: "POST",
          });
          if (cRes.ok) {
            const c = (await cRes.json()) as ConversationMeta;
            id = c.id;
            list = [c];
            ok = true; // fresh empty thread — safe to persist to
          }
        }
        if (!cancelled && id) {
          setConversations(list);
          setConv(id);
          setMessages(msgs);
          // Only enable auto-save if we actually loaded the thread, so a
          // failed message fetch can't overwrite stored history with [].
          loadedOkRef.current = ok;
        }
      } catch {
        /* leave empty; loadedOk stays false so we don't overwrite */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, fetchConversationList, setConv]);

  // Save on turn boundaries: only while NOT streaming (so we don't write
  // per token), debounced, and only after a successful load.
  useEffect(() => {
    if (!hydrated || !conversationId || streaming || !loadedOkRef.current) {
      return;
    }
    const id = setTimeout(() => persist(messages), 700);
    return () => clearTimeout(id);
  }, [messages, hydrated, conversationId, streaming, persist]);

  // Start a fresh conversation.
  const newChat = useCallback(async () => {
    resetTicker();
    try {
      const res = await fetch("/api/chat/conversations", { method: "POST" });
      if (!res.ok) return;
      const c = (await res.json()) as ConversationMeta;
      loadedOkRef.current = true;
      setConversations((prev) => [c, ...prev]);
      setConv(c.id);
      setMessages([]);
      setInput("");
    } catch {
      /* ignore */
    }
  }, [resetTicker, setConv]);

  // Switch to an existing conversation.
  const switchConversation = useCallback(
    async (id: string) => {
      if (id === convIdRef.current) return;
      resetTicker();
      loadedOkRef.current = false;
      try {
        const res = await fetch(`/api/chat/conversations/${id}`, {
          cache: "no-store",
        });
        const msgs = res.ok ? (((await res.json()).messages ?? []) as Msg[]) : [];
        setConv(id);
        setMessages(msgs);
        loadedOkRef.current = res.ok;
      } catch {
        setConv(id);
        setMessages([]);
      }
    },
    [resetTicker, setConv],
  );

  // Delete a conversation; if it was the active one, fall back to the
  // next most recent (or a fresh chat).
  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
      } catch {
        /* ignore */
      }
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (id === convIdRef.current) {
        if (remaining.length > 0) {
          await switchConversation(remaining[0].id);
        } else {
          await newChat();
        }
      }
    },
    [conversations, switchConversation, newChat],
  );

  // Auto-scroll the inner container AND the window every time the
  // displayed text grows.
  useEffect(() => {
    const inner = scrollRef.current;
    if (!inner) return;
    // Instant, scoped-to-the-container scroll only. The previous version
    // combined this with a smooth scrollIntoView on every streamed token —
    // the two fought each other (and scrollIntoView could nudge the whole
    // page), which read as glitchy jitter while Quill AI typed. Only stick
    // to the bottom when the user is already near it, so scrolling up to
    // read earlier messages isn't yanked back down.
    const distanceFromBottom =
      inner.scrollHeight - inner.scrollTop - inner.clientHeight;
    if (distanceFromBottom < 140) {
      inner.scrollTop = inner.scrollHeight;
    }
  }, [messages]);

  // Jump to the newest message when a conversation first loads (or the user
  // switches threads) so they land at the bottom, not scrolled up in
  // history. Instant, and after paint so scrollHeight is settled.
  useEffect(() => {
    if (!hydrated) return;
    const id = requestAnimationFrame(() => {
      scrollToBottom("auto");
      setShowScrollDown(false);
    });
    return () => cancelAnimationFrame(id);
  }, [hydrated, conversationId, scrollToBottom]);

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
    async (text: string, images: string[] = []) => {
      const trimmed = text.trim();
      if ((!trimmed && images.length === 0) || streaming) return;
      // The thread this turn belongs to. If the user switches conversations
      // mid-stream, we stop feeding tokens so they don't land in the wrong
      // thread.
      const activeConv = convIdRef.current;
      const next: Msg[] = [
        ...messages,
        { role: "user", text: trimmed, images: images.length ? images : undefined },
        { role: "model", text: "", pending: true },
      ];
      setMessages(next);
      setInput("");
      setPendingImages([]);
      setStreaming(true);
      networkOpenRef.current = true;
      renderQueueRef.current = [];

      try {
        const outbound = next.filter((m) => !m.pending);
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Attach images only to the final (current) user message so we
            // don't re-ship earlier screenshots every turn.
            messages: outbound.map((m, i) =>
              i === outbound.length - 1 && images.length
                ? { role: m.role, text: m.text, images }
                : { role: m.role, text: m.text },
            ),
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
          // User switched away from this thread — stop appending here.
          if (convIdRef.current !== activeConv) {
            await reader.cancel().catch(() => {});
            break;
          }
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
        // Refresh the usage meter — this turn consumed a message + tokens.
        queryClient.invalidateQueries({ queryKey: ["chatUsage"] });
        // Refresh the thread list so a new thread's derived title and the
        // most-recent ordering show up.
        refreshConversations();
      }
    },
    [messages, streaming, enqueueChunk, queryClient, userId, refreshConversations],
  );

  // Stage image files (from the picker, paste, or drop) as data URLs,
  // skipping non-images, oversized files, and anything past the cap.
  const stageFiles = useCallback(async (files: FileList | File[]) => {
    const incoming = Array.from(files).filter(
      (f) => ACCEPTED_IMAGE.test(f.type) && f.size <= MAX_IMAGE_BYTES,
    );
    if (incoming.length === 0) return;
    const urls = await Promise.all(incoming.map(fileToDataUrl));
    setPendingImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
  }, []);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) stageFiles(e.target.files);
    e.target.value = ""; // allow re-selecting the same file
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files ?? []);
    if (files.length) {
      e.preventDefault();
      stageFiles(files);
    }
  };

  const submit = () => send(input, pendingImages);

  // Tap-to-talk: dictate into the input, and auto-send the phrase once the
  // user stops speaking — so a position can be closed hands-free
  // ("close my 5 SPY 600 calls at $2.30").
  const speech = useSpeechRecognition({
    onResult: (t) => setLiveTranscript(t),
    onFinal: (t) => {
      setLiveTranscript("");
      send(t, pendingImages);
    },
  });

  // Clear the transcript indicator when dictation stops without a phrase
  // (e.g. the user taps the mic off, or silence with nothing said).
  useEffect(() => {
    if (!speech.listening) setLiveTranscript("");
  }, [speech.listening]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
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
      <div className="flex flex-col md:items-start gap-8 w-full max-w-xl mx-auto">
        <div className="flex flex-col md:items-start text-center gap-2">
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
        <p className="text-[11px] text-white/30 leading-relaxed text-center md:text-left">
          Quill AI can make mistakes and does not give financial advice. It
          analyses your journal for your own review only.
        </p>
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
      {/* Navbar-width shell: a collapsible history sidebar + the chat
          column, spanning the same max width as the top nav. */}
      <div className="w-full max-w-[1500px] mx-auto md:mx-0 px-5 md:px-10 mt-12 md:mt-8 flex-1 flex min-h-0">
        <ConversationSidebar
          conversations={conversations}
          currentId={conversationId}
          open={sidebarOpen}
          onSelect={switchConversation}
          onDelete={deleteConversation}
        />

        {/* Main chat column */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* Toolbar: sidebar toggle + New chat (desktop) / history dropdown
            (mobile) on the left, the usage meter on the right. In normal
            flow so each control's popover anchors under its own button. */}
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSidebar}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label="Toggle conversation sidebar"
              className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white transition cursor-pointer"
            >
              <i
                className={`fa-solid ${
                  sidebarOpen ? "fa-angles-left" : "fa-bars"
                } text-[12px]`}
              />
            </button>
            <button
              type="button"
              onClick={newChat}
              title="New chat"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-[12px] font-medium text-white/60 hover:bg-white/[0.08] hover:text-white transition cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[10px]" />
              New chat
            </button>
            <div className="md:hidden">
              <ChatHistory
                conversations={conversations}
                currentId={conversationId}
                onSelect={switchConversation}
                onNew={newChat}
                onDelete={deleteConversation}
              />
            </div>
          </div>
          <ChatUsage />
        </div>
        {empty ? (
          <div className="flex-1 flex items-center justify-center pb-6">
            {Greeting}
          </div>
        ) : (
          <div className="flex-1 min-h-0 relative">
            <div
              ref={scrollRef}
              onScroll={onMessagesScroll}
              className="chat-scroll h-full overflow-y-auto pr-1"
            >
              <div
                className="flex flex-col gap-3 md:gap-4 pt-4 pb-[var(--msg-pb,4rem)] md:pb-24"
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
                    images={m.images}
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

            {/* Jump-to-latest: appears when scrolled up, sits just above the
                composer. */}
            <AnimatePresence>
              {showScrollDown && (
                <motion.button
                  type="button"
                  onClick={() => scrollToBottom("smooth")}
                  initial={{ opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.9 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  aria-label="Scroll to latest"
                  className="absolute left-1/2 -translate-x-1/2 bottom-3 z-20 w-9 h-9 inline-flex items-center justify-center rounded-full border border-white/15 bg-[var(--background)]/90 backdrop-blur-md text-white/70 hover:text-white hover:bg-white/[0.08] shadow-lg transition cursor-pointer"
                >
                  <i className="fa-solid fa-arrow-down text-[13px]" />
                </motion.button>
              )}
            </AnimatePresence>
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
            submit();
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) e.preventDefault();
          }}
          onDrop={(e) => {
            if (e.dataTransfer.files.length) {
              e.preventDefault();
              stageFiles(e.dataTransfer.files);
            }
          }}
          className="fixed left-5 right-5 z-30 bottom-[calc(74px+env(safe-area-inset-bottom))] bg-[var(--background)]/85 backdrop-blur-md md:static md:left-auto md:right-auto md:bottom-auto md:mt-3 md:bg-white/[0.04] md:backdrop-blur-0 flex flex-col gap-2 rounded-2xl border border-white/10 px-3 py-2"
        >
          {/* Staged screenshot thumbnails, removable before send. */}
          {pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {pendingImages.map((src, i) => (
                <div key={i} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Attachment ${i + 1}`}
                    className="h-14 w-14 object-cover rounded-lg border border-white/15"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPendingImages((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 border border-white/20 text-white/80 hover:text-white flex items-center justify-center cursor-pointer"
                    aria-label="Remove attachment"
                  >
                    <i className="fa-solid fa-xmark text-[10px]" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Live voice transcript indicator. */}
          <AnimatePresence>
            {speech.listening && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-1 pt-1 pb-0.5">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400/60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <span className="text-[13px] leading-snug text-white/85 line-clamp-2">
                    {liveTranscript || (
                      <span className="text-white/40">Listening… speak now</span>
                    )}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              hidden
              onChange={onPickFiles}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pendingImages.length >= MAX_IMAGES || streaming}
              title="Attach a screenshot"
              aria-label="Attach a screenshot"
              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.02] text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="fa-solid fa-paperclip text-[13px]" />
            </button>
            {speech.supported && (
              <button
                type="button"
                onClick={speech.toggle}
                disabled={streaming}
                title={speech.listening ? "Stop listening" : "Speak to Quill"}
                aria-label={
                  speech.listening ? "Stop listening" : "Speak to Quill"
                }
                className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  speech.listening
                    ? "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse"
                    : "bg-white/[0.02] text-white/50 border-white/10 hover:bg-white/[0.06] hover:text-white/80"
                }`}
              >
                <i className="fa-solid fa-microphone text-[13px]" />
              </button>
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              rows={1}
              placeholder="Ask about your trades, or attach a screenshot..."
              className="flex-1 resize-none bg-transparent text-[14px] text-white placeholder:text-white/35 placeholder:text-[12px] focus:outline-none py-1.5 max-h-[160px]"
            />
            <button
              type="submit"
              disabled={(!input.trim() && pendingImages.length === 0) || streaming}
              className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border transition ${
                (!input.trim() && pendingImages.length === 0) || streaming
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
          </div>
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
    </div>

    {/* Mounted at the Provider level so it overlays the whole page,
        independent of the chat scroll container. AnimatePresence drives
        the modal's existing motion.div enter/exit animation. */}
    <AnimatePresence>
      {viewingTrade && userId && (
        <TradeModal
          date={
            viewingTrade.dateBought
              ? new Date(viewingTrade.dateBought)
              : new Date()
          }
          initialTrade={viewingTrade}
          onClose={() => setViewingTrade(null)}
          onSave={(t) =>
            handleSaveTrade(t, userId, () => setViewingTrade(null), queryClient)
          }
          onDelete={() =>
            handleDeleteTrade(
              viewingTrade._id,
              userId,
              () => setViewingTrade(null),
              () => setViewingTrade(null),
              queryClient,
            )
          }
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
  images,
}: {
  role: "user" | "model";
  text: string;
  pending?: boolean;
  images?: string[];
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
        {images && images.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`Attachment ${i + 1}`}
                className="max-h-40 max-w-[200px] rounded-lg border border-white/15 object-cover"
              />
            ))}
          </div>
        )}
        {!text && pending ? (
          <TypingDots />
        ) : isUser ? (
          text && <span className="whitespace-pre-wrap">{text}</span>
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
