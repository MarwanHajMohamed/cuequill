"use client";

import { withAuth } from "@/lib/withAuth";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/useToast";

type Rule = { title: string; body?: string; sub?: string[] };
type RuleCategory = "when" | "how";
type CustomRule = {
  _id: string;
  title: string;
  body?: string;
  category: RuleCategory;
};

const timeframes: Rule[] = [
  {
    title: "Market hours",
    body: "Opens 9:30 AM ET, closes 4:00 PM ET. Weekends are closed.",
  },
  {
    title: "Skip the first 30 minutes",
    body: "Never trade between 9:30 and 10:00 - opening candles are too volatile.",
  },
  {
    title: "Premarket signals sells, not buys",
    body: "Use premarket to flag exits, not entries.",
  },
  {
    title: "PUTs at the open",
    body: "Sell PUTs at 9:30 - price typically opens low and rallies.",
  },
  {
    title: "Last call",
    body: "Last entry is 3:59 PM. Anything after fills at the next 9:30 open.",
  },
  {
    title: "SPY / QQQ extended close",
    body: "These trade until 4:14 PM. Closing bell at 4:15 PM.",
  },
];

const rules: Rule[] = [
  { title: "Start small", body: "Don't size into a setup you haven't proven." },
  {
    title: "10% per trade",
    body: "Cap each entry at 10% of portfolio.",
    sub: ["Example: $500 portfolio → $50 per trade."],
  },
  { title: "2–4 trades per week", body: "More than that is noise, not edge." },
  {
    title: "Respect the timeframes",
    body: "If the rule window says no, the answer is no.",
  },
  {
    title: "Only buy fulfilled candles",
    body: "Wait for the candle to close. Never act on a live wick.",
  },
  { title: "Do not exit on a loss", body: "Let the plan run, not your emotions." },
  {
    title: "No Fed days",
    body: "Sit out FOMC and meeting dates - direction is unpredictable.",
  },
];

// ─── A single rule row (used for both defaults and custom rules) ─────────
function RuleItem({
  index,
  ordered,
  title,
  body,
  sub,
  onDelete,
}: {
  index: number;
  ordered: boolean;
  title: string;
  body?: string;
  sub?: string[];
  onDelete?: () => void;
}) {
  return (
    <li className="group flex gap-4">
      <div
        className={`shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center text-[12px] font-semibold tabular-nums ${
          ordered
            ? "bg-teal-500/10 border-teal-500/25 text-teal-300"
            : "bg-white/5 border-white/10 text-white/60"
        }`}
      >
        {ordered ? (
          String(index + 1).padStart(2, "0")
        ) : (
          <i className="fa-solid fa-clock text-[11px]" />
        )}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[14px] md:text-[15px] font-medium text-white">
            {title}
          </div>
          {onDelete && (
            <button
              onClick={onDelete}
              aria-label="Delete rule"
              className="shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition text-white/40 hover:text-red-400 text-xs p-1 cursor-pointer"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
        {body && (
          <div className="text-[13px] md:text-[14px] text-white/55 leading-relaxed mt-0.5">
            {body}
          </div>
        )}
        {sub && (
          <ul className="mt-2 flex flex-col gap-1">
            {sub.map((s) => (
              <li
                key={s}
                className="text-[12.5px] text-white/45 pl-3 border-l border-white/10"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

// ─── Inline "add a rule" row ─────────────────────────────────────────────
function AddRuleRow({
  ordered,
  placeholder,
  onAdd,
}: {
  ordered: boolean;
  placeholder: string;
  onAdd: (title: string, body: string) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    const ok = await onAdd(title.trim(), body.trim());
    if (ok) {
      setTitle("");
      setBody("");
    }
    setSaving(false);
  };

  return (
    <li className="flex gap-4">
      <div
        className={`shrink-0 w-8 h-8 rounded-lg border border-dashed flex items-center justify-center text-white/30 ${
          ordered ? "border-teal-500/25" : "border-white/15"
        }`}
      >
        <i className="fa-solid fa-plus text-[11px]" />
      </div>
      <div className="flex-1 pt-0.5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setTitle("");
              setBody("");
            }
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-[14px] md:text-[15px] font-medium placeholder:text-white/30 text-white focus:outline-none"
        />
        {title.trim() && (
          <div className="flex items-center gap-3 mt-1">
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") {
                  setTitle("");
                  setBody("");
                }
              }}
              placeholder="Optional detail…"
              className="flex-1 bg-transparent text-[13px] md:text-[14px] placeholder:text-white/25 text-white/70 focus:outline-none"
            />
            <button
              onClick={save}
              disabled={saving}
              className="shrink-0 text-xs text-teal-300 hover:text-teal-200 transition cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────
function Section({
  eyebrow,
  title,
  ordered,
  defaults,
  custom,
  canEdit,
  addPlaceholder,
  onAdd,
  onDelete,
}: {
  eyebrow: string;
  title: string;
  ordered: boolean;
  defaults: Rule[];
  custom: CustomRule[];
  canEdit: boolean;
  addPlaceholder: string;
  onAdd: (title: string, body: string) => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-5 md:p-7"
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-teal-400/80 font-medium mb-2">
        {eyebrow}
      </div>
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-5">
        {title}
      </h2>
      <ol className="flex flex-col gap-3 md:gap-4">
        {defaults.map((r, i) => (
          <RuleItem
            key={`default-${r.title}`}
            index={i}
            ordered={ordered}
            title={r.title}
            body={r.body}
            sub={r.sub}
          />
        ))}
        <AnimatePresence initial={false}>
          {custom.map((r, i) => (
            <motion.div
              key={r._id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <RuleItem
                index={defaults.length + i}
                ordered={ordered}
                title={r.title}
                body={r.body}
                onDelete={() => onDelete(r._id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {canEdit && (
          <AddRuleRow
            ordered={ordered}
            placeholder={addPlaceholder}
            onAdd={onAdd}
          />
        )}
      </ol>
    </motion.section>
  );
}

function Page() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const toast = useToast();
  const [custom, setCustom] = useState<CustomRule[]>([]);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/rules?userId=${userId}`)
      .then((r) => r.json())
      .then((data: CustomRule[]) => {
        if (Array.isArray(data)) setCustom(data);
      })
      .catch(() => {});
  }, [userId]);

  const addRule = async (
    category: RuleCategory,
    title: string,
    body: string
  ): Promise<boolean> => {
    if (!userId) return false;
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title,
          body: body || undefined,
          category,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const created: CustomRule = await res.json();
      setCustom((prev) => [...prev, created]);
      return true;
    } catch {
      toast("Failed to add rule");
      return false;
    }
  };

  const deleteRule = async (id: string) => {
    const prev = custom;
    setCustom((c) => c.filter((r) => r._id !== id));
    try {
      const res = await fetch(`/api/rules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Request failed");
    } catch {
      setCustom(prev); // roll back on failure
      toast("Failed to delete rule");
    }
  };

  const whenRules = custom.filter((r) => r.category === "when");
  const howRules = custom.filter((r) => r.category === "how");

  return (
    <div className="w-full flex flex-col items-center min-h-screen pb-16">
      {/* Aurora */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.16) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      {/* HERO */}
      <div className="w-full max-w-[1100px] mt-30 px-5 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-3 text-center items-center"
        >
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/40 font-medium">
            Playbook
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Rules & timeframes
            </span>
          </h1>
          <p className="text-sm md:text-[15px] text-white/55 max-w-xl leading-relaxed">
            The non-negotiables. Read them before you open a position.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Section
            eyebrow="When"
            title="Trading windows"
            ordered={false}
            defaults={timeframes}
            custom={whenRules}
            canEdit={!!userId}
            addPlaceholder="Add a trading window…"
            onAdd={(title, body) => addRule("when", title, body)}
            onDelete={deleteRule}
          />
          <Section
            eyebrow="How"
            title="Position rules"
            ordered
            defaults={rules}
            custom={howRules}
            canEdit={!!userId}
            addPlaceholder="Add a rule…"
            onAdd={(title, body) => addRule("how", title, body)}
            onDelete={deleteRule}
          />
        </div>
      </div>
    </div>
  );
}

export default withAuth(Page);
