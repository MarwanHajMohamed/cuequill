"use client";

import type { ConversationMeta } from "./ChatHistory";

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

// Desktop-only collapsible history rail. Collapses by animating its width
// to 0; the inner column keeps a fixed width so its content doesn't squash
// mid-animation.
export default function ConversationSidebar({
  conversations,
  currentId,
  open,
  onSelect,
  onDelete,
}: {
  conversations: ConversationMeta[];
  currentId: string | null;
  open: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside
      className={`hidden md:flex shrink-0 flex-col min-h-0 overflow-hidden transition-[width,opacity] duration-200 ${
        open ? "w-64 opacity-100 mr-5" : "w-0 opacity-0 mr-0"
      }`}
      aria-hidden={!open}
    >
      <div className="w-64 flex flex-col min-h-0 h-full rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="px-3.5 py-3 text-[11px] tracking-[0.08em] text-white/45 font-medium border-b border-white/[0.06]">
          CONVERSATIONS
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-1.5">
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
                  onClick={() => onSelect(c.id)}
                  className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition ${
                    active ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                  }`}
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
                    className="shrink-0 w-6 h-6 rounded-full inline-flex items-center justify-center text-white/30 hover:text-red-300 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                  >
                    <i className="fa-regular fa-trash-can text-[11px]" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
