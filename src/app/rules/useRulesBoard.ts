"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/useToast";

export type Rule = { id: string; title: string; body?: string };
export type Section = { id: string; title: string; rules: Rule[] };

export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function useRulesBoard() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const toast = useToast();

  const [sections, setSections] = useState<Section[] | null>(null);
  const sectionsRef = useRef<Section[]>([]);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/rules?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => {
        const s: Section[] = Array.isArray(d?.sections) ? d.sections : [];
        sectionsRef.current = s;
        setSections(s);
      })
      .catch(() => setSections([]));
  }, [userId]);

  const persist = useCallback(
    async (next: Section[]) => {
      if (!userId) return;
      try {
        const res = await fetch("/api/rules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, sections: next }),
        });
        if (!res.ok) throw new Error("Request failed");
      } catch {
        toast("Failed to save changes");
      }
    },
    [userId, toast]
  );

  const commit = useCallback(
    (producer: (prev: Section[]) => Section[]) => {
      const next = producer(sectionsRef.current);
      sectionsRef.current = next;
      setSections(next);
      persist(next);
    },
    [persist]
  );

  // Section ops
  const addSection = () =>
    commit((prev) => [...prev, { id: uid(), title: "New section", rules: [] }]);

  const renameSection = (id: string, title: string) =>
    commit((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));

  const deleteSection = (id: string) =>
    commit((prev) => prev.filter((s) => s.id !== id));

  const moveSection = (id: string, dir: -1 | 1) =>
    commit((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Rule ops
  const addRule = (sectionId: string, title: string, body: string) =>
    commit((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, rules: [...s.rules, { id: uid(), title, body }] }
          : s
      )
    );

  const editRule = (
    sectionId: string,
    ruleId: string,
    title: string,
    body: string
  ) =>
    commit((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              rules: s.rules.map((r) =>
                r.id === ruleId ? { ...r, title, body } : r
              ),
            }
          : s
      )
    );

  const deleteRule = (sectionId: string, ruleId: string) =>
    commit((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, rules: s.rules.filter((r) => r.id !== ruleId) }
          : s
      )
    );

  const moveRule = (sectionId: string, ruleId: string, dir: -1 | 1) =>
    commit((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const i = s.rules.findIndex((r) => r.id === ruleId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= s.rules.length) return s;
        const rules = [...s.rules];
        [rules[i], rules[j]] = [rules[j], rules[i]];
        return { ...s, rules };
      })
    );

  const moveRuleToSection = (fromId: string, ruleId: string, toId: string) =>
    commit((prev) => {
      if (fromId === toId) return prev;
      const rule = prev
        .find((s) => s.id === fromId)
        ?.rules.find((r) => r.id === ruleId);
      if (!rule) return prev;
      return prev.map((s) => {
        if (s.id === fromId)
          return { ...s, rules: s.rules.filter((r) => r.id !== ruleId) };
        if (s.id === toId) return { ...s, rules: [...s.rules, rule] };
        return s;
      });
    });

  return {
    sections,
    addSection,
    renameSection,
    deleteSection,
    moveSection,
    addRule,
    editRule,
    deleteRule,
    moveRule,
    moveRuleToSection,
  };
}
