"use client";

import { withAuth } from "@/lib/withAuth";
import { motion } from "framer-motion";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

type Msg = { role: "user" | "model"; text: string; pending?: boolean };

const STORAGE_KEY = "cuequill:chat:v1";

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Word-drip plumbing - kept in refs because the producer (network
  // reader) and consumer (interval timer) both live outside React's
  // render cycle.
  const renderQueueRef = useRef<string[]>([]);
  const networkOpenRef = useRef(false);
  const tickerRef = useRef<number | null>(null);

  // ── Persistence (best-effort, localStorage) ──────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore quota */
    }
  }, [messages, hydrated]);

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
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              role: "model",
              text: `Sorry - ${errText}`,
            };
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
        <div className="flex flex-col items-center text-center gap-1">
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
    /* Mobile clamps the outer column to the viewport minus the floating
       bottom tab bar (88px + iOS home-indicator inset) so the composer
       stays just above the nav pill instead of being pushed off-screen
       by the body padding. Desktop has no bottom nav -> min-h-screen. */
    <div className="w-full flex flex-col items-stretch min-h-[calc(100dvh-88px-env(safe-area-inset-bottom))] md:min-h-screen md:pb-3">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      <div className="w-full max-w-[1100px] mx-auto px-5 md:px-10 mt-24 md:mt-28 flex-1 flex flex-col min-h-0">
        {empty ? (
          <div className="flex-1 flex items-center justify-center pb-6">
            {Greeting}
          </div>
        ) : (
          <div className="flex-1 min-h-0 relative">
            <button
              onClick={clear}
              className="absolute -top-2 right-0 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur text-white/60 hover:bg-white/[0.08] hover:text-white transition text-[12px] font-medium cursor-pointer"
              aria-label="Clear conversation"
            >
              <i className="fa-regular fa-trash-can text-[10px]" />
              Clear
            </button>
            <div
              ref={scrollRef}
              className="h-full overflow-y-auto pr-1"
              style={{ minHeight: "40vh" }}
            >
              <div className="flex flex-col gap-3 md:gap-4 pt-3 pb-4">
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
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-3 flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2"
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
              <i className="fa-solid fa-arrow-up text-[12px]" />
            )}
          </button>
        </form>
      </div>
    </div>
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

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="space-y-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
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
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-300 underline decoration-teal-300/40 hover:decoration-teal-300"
            >
              {walkChildren(children)}
            </a>
          ),
          code: ({ className, children, ...rest }) => {
            const isBlock = (className ?? "").includes("language-");
            if (isBlock) {
              return (
                <code
                  className="block bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[12.5px] overflow-x-auto"
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
            <pre className="bg-black/40 border border-white/10 rounded-lg p-3 overflow-x-auto text-[12.5px]">
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

export default withAuth(Page);
