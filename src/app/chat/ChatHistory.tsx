"use client";

import { useEffect, useRef, useState } from "react";

export type ConversationMeta = {
  id: string;
  title: string;
  updatedAt: string | Date;
};

function relativeTime(d: string | Date): string {
  const then = new Date(d).getTime();
  const secs = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

const PILL =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur text-[12px] font-medium text-white/60 hover:bg-white/[0.08] hover:text-white transition cursor-pointer";

export default function ChatHistory({
  conversations,
  currentId,
  onSelect,
  onNew,
  onDelete,
}: {
  conversations: ConversationMeta[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onNew} className={PILL} title="New chat">
        <i className="fa-solid fa-plus text-[10px]" />
        <span className="hidden sm:inline">New chat</span>
      </button>

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={PILL}
          title="Conversation history"
        >
          <i className="fa-regular fa-clock-rotate-left text-[11px] fa-solid" />
          <span className="hidden sm:inline">History</span>
        </button>

        {open && (
          <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-72 max-w-[80vw] rounded-xl border border-white/10 bg-[var(--surface-2)]/95 backdrop-blur-md p-1.5 shadow-[0_24px_60px_var(--shadow)]">
            <div className="px-2.5 py-2 text-[11px] tracking-[0.08em] text-white/45 font-medium">
              Conversations
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="px-2.5 py-3 text-[12.5px] text-white/40">
                  No conversations yet.
                </div>
              ) : (
                conversations.map((c) => {
                  const active = c.id === currentId;
                  return (
                    <div
                      key={c.id}
                      className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition ${
                        active
                          ? "bg-white/[0.08]"
                          : "hover:bg-white/[0.04]"
                      }`}
                      onClick={() => {
                        onSelect(c.id);
                        setOpen(false);
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] text-white/85">
                          {c.title || "New chat"}
                        </div>
                        <div className="text-[10.5px] text-white/40">
                          {relativeTime(c.updatedAt)}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Delete conversation"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(c.id);
                        }}
                        className="shrink-0 w-6 h-6 rounded-full inline-flex items-center justify-center text-white/30 hover:text-red-300 hover:bg-red-500/10 transition md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      >
                        <i className="fa-regular fa-trash-can text-[11px]" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
