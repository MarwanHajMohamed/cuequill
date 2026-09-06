"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  useFriends,
  useUserSearch,
  useFriendAction,
  type FriendAction,
  type FriendStatus,
} from "@/hooks/useFriends";
import { avatarGradient } from "@/lib/avatarColors";
import { avatarFrameRing } from "@/lib/avatarFrames";
import { useScrollLock } from "@/hooks/useScrollLock";

// The friends hub: search for people by name or email and manage requests
// and friendships in one place. Opened from the leaderboard's Friends button.

type Person = {
  id: string;
  name: string;
  email?: string;
  avatarColor: string;
  avatarFrame: string;
};

function Avatar({ p, size = 40 }: { p: Person; size?: number }) {
  return (
    <div
      className={`shrink-0 rounded-full bg-gradient-to-br ${avatarGradient(
        p.avatarColor,
      )} ${avatarFrameRing(
        p.avatarFrame,
      )} border border-white/15 flex items-center justify-center font-semibold text-white`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {p.name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

// The compact action(s) for a person given the caller's relationship.
function RowAction({
  status,
  pending,
  onAction,
}: {
  status: FriendStatus;
  pending: boolean;
  onAction: (action: FriendAction) => void;
}) {
  const base =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

  if (status === "self") return null;

  if (status === "incoming") {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => onAction("accept")}
          className={`${base} bg-teal-500 hover:bg-teal-400 text-[#fff]`}
        >
          <i className="fa-solid fa-check text-[10px]" />
          Accept
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onAction("decline")}
          className={`${base} border border-white/12 bg-white/[0.03] text-white/70 hover:text-white hover:border-white/25`}
        >
          Decline
        </button>
      </div>
    );
  }

  if (status === "friends") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => onAction("remove")}
        title="Remove friend"
        className={`${base} group border border-teal-400/30 bg-teal-500/10 text-teal-200 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200`}
      >
        <i className="fa-solid fa-user-check text-[10px] group-hover:hidden" />
        <i className="fa-solid fa-user-xmark text-[10px] hidden group-hover:inline" />
        <span className="group-hover:hidden">Friends</span>
        <span className="hidden group-hover:inline">Remove</span>
      </button>
    );
  }

  if (status === "outgoing") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => onAction("cancel")}
        title="Cancel request"
        className={`${base} border border-white/12 bg-white/[0.03] text-white/70 hover:text-white hover:border-white/25`}
      >
        <i className="fa-solid fa-clock text-[10px]" />
        Requested
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => onAction("request")}
      className={`${base} bg-teal-500 hover:bg-teal-400 text-[#fff]`}
    >
      <i className="fa-solid fa-user-plus text-[10px]" />
      Add
    </button>
  );
}

function PersonRow({
  p,
  status,
  pending,
  onAction,
}: {
  p: Person;
  status: FriendStatus;
  pending: boolean;
  onAction: (action: FriendAction) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
      <Avatar p={p} size={40} />
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium truncate">{p.name}</div>
        {p.email && (
          <div className="text-[11.5px] text-white/45 truncate">{p.email}</div>
        )}
      </div>
      <div className="shrink-0">
        <RowAction status={status} pending={pending} onAction={onAction} />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-1 pt-1 pb-1.5 text-[11px] font-medium text-white/45">
      {children}
    </div>
  );
}

export default function FriendsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useScrollLock(open);
  const { data: friends } = useFriends(open);
  const friendMut = useFriendAction();

  const [raw, setRaw] = React.useState("");
  const [q, setQ] = React.useState("");

  // Debounce the query so we don't hit the search endpoint on every keystroke.
  React.useEffect(() => {
    const t = setTimeout(() => setQ(raw.trim()), 250);
    return () => clearTimeout(t);
  }, [raw]);

  // Reset the search when the modal closes.
  React.useEffect(() => {
    if (!open) {
      setRaw("");
      setQ("");
    }
  }, [open]);

  const searching = q.length >= 2;
  const { data: results, isFetching } = useUserSearch(searching ? q : "");

  const incoming = friends?.incoming ?? [];
  const outgoing = friends?.outgoing ?? [];
  const list = friends?.friends ?? [];

  const act = (userId: string, action: FriendAction) =>
    friendMut.mutate({ action, userId });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[8vh] bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] max-h-[80vh] flex flex-col rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h2 className="text-[15px] font-semibold flex items-center gap-2">
                <i className="fa-solid fa-user-group text-[13px] text-teal-300" />
                Friends
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 inline-flex items-center justify-center rounded-full text-white/45 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-[14px]" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pb-3">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] text-white/35" />
                <input
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder="Search by name or email"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-9 py-2.5 text-[13px] text-white placeholder:text-white/35 outline-none focus:border-teal-400/40 transition"
                />
                {raw && (
                  <button
                    type="button"
                    onClick={() => setRaw("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark text-[12px]" />
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {searching ? (
                <div className="flex flex-col gap-1.5">
                  {isFetching && !results ? (
                    <div className="py-10 text-center text-[12.5px] text-white/40">
                      Searching…
                    </div>
                  ) : results && results.length > 0 ? (
                    results.map((r) => (
                      <PersonRow
                        key={r.id}
                        p={r}
                        status={r.friendStatus}
                        pending={friendMut.isPending}
                        onAction={(a) => act(r.id, a)}
                      />
                    ))
                  ) : (
                    <div className="py-10 text-center text-[12.5px] text-white/40">
                      No one matches “{q}”.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {incoming.length > 0 && (
                    <div>
                      <SectionLabel>Requests · {incoming.length}</SectionLabel>
                      <div className="flex flex-col gap-1.5">
                        {incoming.map((p) => (
                          <PersonRow
                            key={p.id}
                            p={p}
                            status="incoming"
                            pending={friendMut.isPending}
                            onAction={(a) => act(p.id, a)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <SectionLabel>
                      {list.length > 0 ? `Friends · ${list.length}` : "Friends"}
                    </SectionLabel>
                    {list.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {list.map((p) => (
                          <PersonRow
                            key={p.id}
                            p={p}
                            status="friends"
                            pending={friendMut.isPending}
                            onAction={(a) => act(p.id, a)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-[12.5px] text-white/40">
                        No friends yet. Search above to add some.
                      </div>
                    )}
                  </div>

                  {outgoing.length > 0 && (
                    <div>
                      <SectionLabel>Sent · {outgoing.length}</SectionLabel>
                      <div className="flex flex-col gap-1.5">
                        {outgoing.map((p) => (
                          <PersonRow
                            key={p.id}
                            p={p}
                            status="outgoing"
                            pending={friendMut.isPending}
                            onAction={(a) => act(p.id, a)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
