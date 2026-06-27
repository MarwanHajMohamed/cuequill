"use client";

import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import type { SchematicElement, SchematicKind } from "@/lib/strategyConstants";

// SVG-based schematic editor. The user clicks a tool in the left
// palette and then drops elements onto the canvas. Elements can be
// dragged to reposition. The right panel shows properties for the
// selected element (color, label, text content, dimensions). Keyboard
// Delete removes the selection.
//
// The shape mirrors the Strategy model exactly so we can ship the
// editor's state back to the server with no transformation.

export type Schematic = {
  width: number;
  height: number;
  elements: SchematicElement[];
};

type Tool = SchematicKind | "select";

// Corner handles for box-shaped elements (candle, zone); endpoint
// handles for line/arrow; "fs" scales the font size of a text node;
// "wu"/"wd" stretch a candle's upper/lower wick.
type ResizeHandle =
  "nw" | "ne" | "sw" | "se" | "p1" | "p2" | "fs" | "wu" | "wd";

// Minimum box dimension and font size while resizing.
const MIN_SIZE = 6;
const MIN_FONT = 8;
const DEFAULT_TEXT_SIZE = 14;
const DEFAULT_WICK = 12;

// Round a dimension to 2 decimal places so resized width/height don't
// carry long floating-point tails.
const round2 = (n: number) => Math.round(n * 100) / 100;

// Axis-aligned bounding box of an element in canvas coordinates.
function elementBBox(el: SchematicElement): {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
} {
  switch (el.kind) {
    case "candle": {
      const w = el.w ?? 18;
      const h = el.h ?? 80;
      const wu = el.wickUp ?? DEFAULT_WICK;
      const wd = el.wickDown ?? DEFAULT_WICK;
      return { x0: el.x, y0: el.y - wu, x1: el.x + w, y1: el.y + h + wd };
    }
    case "zone": {
      const w = el.w ?? 160;
      const h = el.h ?? 60;
      return { x0: el.x, y0: el.y, x1: el.x + w, y1: el.y + h };
    }
    case "line":
    case "arrow": {
      const x2 = el.x2 ?? el.x;
      const y2 = el.y2 ?? el.y;
      return {
        x0: Math.min(el.x, x2),
        y0: Math.min(el.y, y2),
        x1: Math.max(el.x, x2),
        y1: Math.max(el.y, y2),
      };
    }
    case "text": {
      const fs = el.w ?? DEFAULT_TEXT_SIZE;
      const approxW = (el.text || "Text").length * fs * 0.6;
      return { x0: el.x, y0: el.y - fs, x1: el.x + approxW, y1: el.y };
    }
  }
}

// Does an element's bbox overlap the given rectangle?
function bboxIntersects(
  el: SchematicElement,
  rx0: number,
  ry0: number,
  rx1: number,
  ry1: number,
): boolean {
  const b = elementBBox(el);
  return b.x0 <= rx1 && b.x1 >= rx0 && b.y0 <= ry1 && b.y1 >= ry0;
}

// Default spacing (seconds) between elements in the auto sequence.
const DEFAULT_STEP_SEC = 0.45;

// Resolve the playback appearance time (seconds) for each element: its
// explicit `appearAt`, or an auto left-to-right sequence as a fallback.
function appearTimes(elements: SchematicElement[]): Record<string, number> {
  const order = elements
    .map((_, i) => i)
    .sort((a, b) => elementBBox(elements[a]).x0 - elementBBox(elements[b]).x0);
  const rank: Record<string, number> = {};
  order.forEach((idx, pos) => {
    rank[elements[idx].id] = pos;
  });
  const times: Record<string, number> = {};
  for (const el of elements) {
    times[el.id] = el.appearAt ?? rank[el.id] * DEFAULT_STEP_SEC;
  }
  return times;
}

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: "select", label: "Select", icon: "fa-arrow-pointer" },
  { id: "candle", label: "Candle", icon: "fa-chart-simple" },
  { id: "line", label: "Line", icon: "fa-minus" },
  { id: "arrow", label: "Arrow", icon: "fa-arrow-right-long" },
  { id: "zone", label: "Zone", icon: "fa-square" },
  { id: "text", label: "Text", icon: "fa-font" },
];

const DEFAULT_COLORS: Record<SchematicKind, string> = {
  candle: "#22c55e",
  line: "#9ca3af",
  arrow: "#14b8a6",
  zone: "#f59e0b",
  text: "#e5e7eb",
};

function genId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function defaultElement(
  kind: SchematicKind,
  x: number,
  y: number,
): SchematicElement {
  const base = { id: genId(), kind, x, y, color: DEFAULT_COLORS[kind] };
  switch (kind) {
    case "candle":
      return { ...base, w: 18, h: 80, bull: true };
    case "line":
      return { ...base, x2: x + 140, y2: y };
    case "arrow":
      return { ...base, x2: x + 100, y2: y - 40 };
    case "zone":
      return { ...base, w: 160, h: 60 };
    case "text":
      return { ...base, text: "Label" };
  }
}

type Props = {
  value: Schematic;
  onChange: (next: Schematic) => void;
};

export default function SchematicEditor({ value, onChange }: Props) {
  const [tool, setTool] = useState<Tool>("select");
  // Properties panel mode: edit element style/geometry, or edit the
  // per-element animation timing.
  const [animationMode, setAnimationMode] = useState(false);
  // Elapsed seconds while previewing the animation in the editor;
  // null means not previewing (all elements shown).
  const [previewElapsed, setPreviewElapsed] = useState<number | null>(null);
  const previewRaf = useRef<number | null>(null);
  // Multiple elements can be selected at once (shift-click to add,
  // marquee-drag on the background, or Cmd/Ctrl+A for all).
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Live marquee rectangle (canvas coords) while rubber-band selecting.
  const marquee = useRef<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    additive: boolean;
  } | null>(null);
  // Right-click context menu. `clientX/Y` position the popup; `svgX/Y`
  // are canvas coords used to paste where the user clicked; `elementId`
  // is the right-clicked element (null when the background was clicked).
  const [menu, setMenu] = useState<{
    clientX: number;
    clientY: number;
    svgX: number;
    svgY: number;
    elementId: string | null;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<
    | {
        // Move every selected element together. Origins capture each
        // element's start position so the delta applies cleanly.
        mode: "move";
        startX: number;
        startY: number;
        origins: {
          id: string;
          x: number;
          y: number;
          x2?: number;
          y2?: number;
        }[];
      }
    | {
        // Resize a single element via one handle.
        mode: "resize";
        id: string;
        handle: ResizeHandle;
        startX: number;
        startY: number;
        origX: number;
        origY: number;
        origX2?: number;
        origY2?: number;
        origW?: number;
        origH?: number;
        origWickUp?: number;
        origWickDown?: number;
      }
    | null
  >(null);

  const selectedSet = new Set(selectedIds);
  // The single-selected element (when exactly one), used by the
  // properties panel and resize handles.
  const single =
    selectedIds.length === 1
      ? (value.elements.find((e) => e.id === selectedIds[0]) ?? null)
      : null;

  // ── Undo / redo history ─────────────────────────────────────────────
  // `value` is parent-controlled, so we keep our own past/future stacks
  // of whole-schematic snapshots. Refs (not state) hold the stacks so
  // callbacks always see the latest without stale closures; a forced
  // render keeps the button disabled states in sync. A drag is coalesced
  // into one entry: snapshot at mousedown, commit on mouseup.
  const valueRef = useRef(value);
  valueRef.current = value;
  const history = useRef<{ past: Schematic[]; future: Schematic[] }>({
    past: [],
    future: [],
  });
  const dragSnapshot = useRef<Schematic | null>(null);
  // Holds the most recently copied element(s) for paste. Local to this
  // editor instance (no system clipboard), which keeps it simple and
  // avoids permission prompts.
  const clipboard = useRef<SchematicElement[]>([]);
  const [, forceRender] = useReducer((n) => n + 1, 0);

  // Record the current state as an undo point before a discrete change.
  const pushHistory = useCallback(() => {
    history.current.past.push(valueRef.current);
    history.current.future = [];
  }, []);

  const undo = useCallback(() => {
    const { past, future } = history.current;
    if (past.length === 0) return;
    const prev = past.pop()!;
    future.unshift(valueRef.current);
    setSelectedIds([]);
    onChange(prev);
    forceRender();
  }, [onChange]);

  const redo = useCallback(() => {
    const { past, future } = history.current;
    if (future.length === 0) return;
    const next = future.shift()!;
    past.push(valueRef.current);
    setSelectedIds([]);
    onChange(next);
    forceRender();
  }, [onChange]);

  const canUndo = history.current.past.length > 0;
  const canRedo = history.current.future.length > 0;

  // Canvas-relative coords from a pointer event.
  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const inv = ctm.inverse();
    const local = pt.matrixTransform(inv);
    return { x: local.x, y: local.y };
  }, []);

  const updateElement = useCallback(
    (id: string, patch: Partial<SchematicElement>) => {
      onChange({
        ...value,
        elements: value.elements.map((e) =>
          e.id === id ? { ...e, ...patch } : e,
        ),
      });
    },
    [onChange, value],
  );

  const addElements = useCallback(
    (els: SchematicElement[]) => {
      if (els.length === 0) return;
      pushHistory();
      onChange({ ...value, elements: [...value.elements, ...els] });
      setSelectedIds(els.map((e) => e.id));
      forceRender();
    },
    [onChange, value, pushHistory],
  );

  const addElement = useCallback(
    (el: SchematicElement) => addElements([el]),
    [addElements],
  );

  const removeElements = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const drop = new Set(ids);
      pushHistory();
      onChange({
        ...value,
        elements: value.elements.filter((e) => !drop.has(e.id)),
      });
      setSelectedIds([]);
      forceRender();
    },
    [onChange, value, pushHistory],
  );

  // Property-panel edits are discrete: record one undo point each.
  const commitElement = useCallback(
    (id: string, patch: Partial<SchematicElement>) => {
      pushHistory();
      updateElement(id, patch);
      forceRender();
    },
    [pushHistory, updateElement],
  );

  // Apply the same patch to several elements in one undo step.
  const commitMany = useCallback(
    (ids: string[], patch: Partial<SchematicElement>) => {
      if (ids.length === 0) return;
      const set = new Set(ids);
      pushHistory();
      onChange({
        ...value,
        elements: value.elements.map((e) =>
          set.has(e.id) ? { ...e, ...patch } : e,
        ),
      });
      forceRender();
    },
    [onChange, value, pushHistory],
  );

  // Copy the selected element(s) into the local clipboard.
  const copyElement = useCallback(() => {
    const sel = new Set(selectedIds);
    const els = valueRef.current.elements.filter((e) => sel.has(e.id));
    if (els.length === 0) return;
    clipboard.current = els.map((e) => ({ ...e }));
    forceRender();
  }, [selectedIds]);

  // Paste clones of the clipboard element(s), preserving their relative
  // layout. With `at` (canvas coords, e.g. a right-click location) the
  // group's top-left lands there; otherwise it's offset slightly from
  // the originals. Clones get fresh ids and become the new selection.
  const PASTE_OFFSET = 16;
  const pasteElement = useCallback(
    (at?: { x: number; y: number }) => {
      const src = clipboard.current;
      if (src.length === 0) return;
      // Anchor on the group's top-left so multi-paste keeps its shape.
      const minX = Math.min(...src.map((e) => e.x));
      const minY = Math.min(...src.map((e) => e.y));
      const dx = at ? at.x - minX : PASTE_OFFSET;
      const dy = at ? at.y - minY : PASTE_OFFSET;
      const clones = src.map((s) => {
        const clone: SchematicElement = {
          ...s,
          id: genId(),
          x: s.x + dx,
          y: s.y + dy,
        };
        if (s.x2 !== undefined) clone.x2 = s.x2 + dx;
        if (s.y2 !== undefined) clone.y2 = s.y2 + dy;
        return clone;
      });
      addElements(clones);
      // Cascade: the next offset-paste lands clear of this one.
      clipboard.current = clones;
    },
    [addElements],
  );

  // Reorder the selected element(s) in the z-stack. SVG paints in array
  // order, so later = nearer the front. Selected items keep their
  // relative order and won't swap past one another.
  const reorderSelection = (dir: "forward" | "back") => {
    const ids = new Set(selectedIds);
    if (ids.size === 0) return;
    const els = [...valueRef.current.elements];
    let changed = false;
    if (dir === "forward") {
      for (let i = els.length - 2; i >= 0; i--) {
        if (ids.has(els[i].id) && !ids.has(els[i + 1].id)) {
          [els[i], els[i + 1]] = [els[i + 1], els[i]];
          changed = true;
        }
      }
    } else {
      for (let i = 1; i < els.length; i++) {
        if (ids.has(els[i].id) && !ids.has(els[i - 1].id)) {
          [els[i], els[i - 1]] = [els[i - 1], els[i]];
          changed = true;
        }
      }
    }
    if (!changed) return;
    pushHistory();
    onChange({ ...valueRef.current, elements: els });
    forceRender();
  };

  // Open the right-click menu. Right-clicking an element outside the
  // current selection selects just it; right-clicking one already in a
  // multi-selection keeps the whole selection so actions apply to all.
  const openMenu = (e: React.MouseEvent, elementId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (elementId && !selectedIds.includes(elementId)) {
      setSelectedIds([elementId]);
    }
    const { x, y } = toSvg(e.clientX, e.clientY);
    setMenu({
      clientX: e.clientX,
      clientY: e.clientY,
      svgX: x,
      svgY: y,
      elementId,
    });
  };

  // Background mouse-down: with a drawing tool, drop a new element;
  // with the select tool, start a marquee (rubber-band) selection.
  const handleBackgroundDown = (e: React.MouseEvent<SVGRectElement>) => {
    const { x, y } = toSvg(e.clientX, e.clientY);
    if (tool === "select") {
      marquee.current = {
        x0: x,
        y0: y,
        x1: x,
        y1: y,
        additive: e.shiftKey || e.metaKey || e.ctrlKey,
      };
      forceRender();
      return;
    }
    addElement(defaultElement(tool, x, y));
    setTool("select");
  };

  // Begin a move drag on element mouse-down. Shift/Cmd-click toggles the
  // element in the selection (no drag). A plain click on an unselected
  // element selects just it; clicking one already in a multi-selection
  // keeps the whole group so they move together.
  const handleElementDown = (e: React.MouseEvent, el: SchematicElement) => {
    e.stopPropagation();
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    if (additive) {
      setSelectedIds((prev) =>
        prev.includes(el.id)
          ? prev.filter((id) => id !== el.id)
          : [...prev, el.id],
      );
      return;
    }
    const moveIds =
      selectedIds.includes(el.id) && selectedIds.length > 1
        ? selectedIds
        : [el.id];
    if (!(selectedIds.includes(el.id) && selectedIds.length > 1)) {
      setSelectedIds([el.id]);
    }
    dragSnapshot.current = valueRef.current;
    const { x, y } = toSvg(e.clientX, e.clientY);
    const moveSet = new Set(moveIds);
    drag.current = {
      mode: "move",
      startX: x,
      startY: y,
      origins: valueRef.current.elements
        .filter((el2) => moveSet.has(el2.id))
        .map((el2) => ({
          id: el2.id,
          x: el2.x,
          y: el2.y,
          x2: el2.x2,
          y2: el2.y2,
        })),
    };
  };

  // Begin a resize drag on a handle mouse-down.
  const handleHandleDown = (
    e: React.MouseEvent,
    el: SchematicElement,
    handle: ResizeHandle,
  ) => {
    e.stopPropagation();
    setSelectedIds([el.id]);
    dragSnapshot.current = valueRef.current;
    const { x, y } = toSvg(e.clientX, e.clientY);
    drag.current = {
      id: el.id,
      mode: "resize",
      handle,
      startX: x,
      startY: y,
      origX: el.x,
      origY: el.y,
      origX2: el.x2,
      origY2: el.y2,
      origW: el.kind === "text" ? (el.w ?? DEFAULT_TEXT_SIZE) : el.w,
      origH: el.h,
      origWickUp: el.wickUp ?? DEFAULT_WICK,
      origWickDown: el.wickDown ?? DEFAULT_WICK,
    };
  };

  // Document-level move/up so we don't lose the drag if the cursor
  // leaves the element.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Marquee selection in progress: just track the rectangle.
      if (marquee.current) {
        const { x, y } = toSvg(e.clientX, e.clientY);
        marquee.current.x1 = x;
        marquee.current.y1 = y;
        forceRender();
        return;
      }

      const d = drag.current;
      if (!d) return;
      const { x, y } = toSvg(e.clientX, e.clientY);
      const dx = x - d.startX;
      const dy = y - d.startY;

      if (d.mode === "move") {
        // Apply the same delta to every dragged element at once.
        const moves = new Map(d.origins.map((o) => [o.id, o]));
        const els = valueRef.current.elements.map((el) => {
          const o = moves.get(el.id);
          if (!o) return el;
          const next: SchematicElement = { ...el, x: o.x + dx, y: o.y + dy };
          if (o.x2 !== undefined) next.x2 = o.x2 + dx;
          if (o.y2 !== undefined) next.y2 = o.y2 + dy;
          return next;
        });
        onChange({ ...valueRef.current, elements: els });
        return;
      }

      // Resize.
      const h = d.handle;
      if (h === "p1") {
        updateElement(d.id, { x: d.origX + dx, y: d.origY + dy });
      } else if (h === "p2") {
        updateElement(d.id, {
          x2: (d.origX2 ?? d.origX) + dx,
          y2: (d.origY2 ?? d.origY) + dy,
        });
      } else if (h === "fs") {
        // Drag the corner away from the text to grow the font.
        const base = d.origW ?? DEFAULT_TEXT_SIZE;
        const next = Math.max(MIN_FONT, Math.round(base + (dx + dy) / 2));
        updateElement(d.id, { w: next });
      } else if (h === "wu") {
        // Drag the top handle up to lengthen the upper wick.
        const base = d.origWickUp ?? DEFAULT_WICK;
        updateElement(d.id, { wickUp: round2(Math.max(0, base - dy)) });
      } else if (h === "wd") {
        // Drag the bottom handle down to lengthen the lower wick.
        const base = d.origWickDown ?? DEFAULT_WICK;
        updateElement(d.id, { wickDown: round2(Math.max(0, base + dy)) });
      } else if (h) {
        // Box corner (candle / zone): adjust x/y/w/h together so the
        // opposite corner stays anchored.
        const origW = d.origW ?? 0;
        const origH = d.origH ?? 0;
        let nx = d.origX;
        let ny = d.origY;
        let nw = origW;
        let nh = origH;
        if (h.includes("e")) nw = round2(Math.max(MIN_SIZE, origW + dx));
        if (h.includes("w")) {
          nw = round2(Math.max(MIN_SIZE, origW - dx));
          nx = d.origX + (origW - nw);
        }
        if (h.includes("s")) nh = round2(Math.max(MIN_SIZE, origH + dy));
        if (h.includes("n")) {
          nh = round2(Math.max(MIN_SIZE, origH - dy));
          ny = d.origY + (origH - nh);
        }
        updateElement(d.id, { x: nx, y: ny, w: nw, h: nh });
      }
    };
    const onUp = () => {
      // Finalize a marquee selection.
      if (marquee.current) {
        const m = marquee.current;
        marquee.current = null;
        const rx0 = Math.min(m.x0, m.x1);
        const ry0 = Math.min(m.y0, m.y1);
        const rx1 = Math.max(m.x0, m.x1);
        const ry1 = Math.max(m.y0, m.y1);
        // A tiny rectangle is treated as a plain click: clear selection
        // (unless adding) rather than selecting everything.
        if (rx1 - rx0 < 3 && ry1 - ry0 < 3) {
          if (!m.additive) setSelectedIds([]);
        } else {
          const hits = valueRef.current.elements
            .filter((el) => bboxIntersects(el, rx0, ry0, rx1, ry1))
            .map((el) => el.id);
          setSelectedIds((prev) =>
            m.additive ? Array.from(new Set([...prev, ...hits])) : hits,
          );
        }
        forceRender();
        return;
      }

      const wasDragging = drag.current !== null;
      drag.current = null;
      // Commit the pre-drag snapshot as a single undo point, but only if
      // the drag actually changed something (a plain click shouldn't add
      // a no-op history entry).
      const snap = dragSnapshot.current;
      dragSnapshot.current = null;
      if (wasDragging && snap && snap !== valueRef.current) {
        history.current.past.push(snap);
        history.current.future = [];
        forceRender();
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [toSvg, updateElement, onChange]);

  // Keyboard: Delete removes the selection; Cmd/Ctrl+Z undo,
  // Cmd/Ctrl+Shift+Z (or Ctrl+Y) redo; Cmd/Ctrl+C copy, +V paste,
  // +D duplicate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const inField =
        tag === "INPUT" || tag === "TEXTAREA" || !!target?.isContentEditable;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === "z" || e.key === "Z")) {
        if (inField) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && (e.key === "y" || e.key === "Y")) {
        if (inField) return;
        e.preventDefault();
        redo();
        return;
      }
      if (mod && (e.key === "a" || e.key === "A")) {
        // Select all elements.
        if (inField) return;
        e.preventDefault();
        setSelectedIds(valueRef.current.elements.map((el) => el.id));
        return;
      }
      if (mod && (e.key === "c" || e.key === "C")) {
        if (inField || selectedIds.length === 0) return;
        e.preventDefault();
        copyElement();
        return;
      }
      if (mod && (e.key === "v" || e.key === "V")) {
        if (inField || clipboard.current.length === 0) return;
        e.preventDefault();
        pasteElement();
        return;
      }
      if (mod && (e.key === "d" || e.key === "D")) {
        // Duplicate = copy + paste in one stroke.
        if (inField || selectedIds.length === 0) return;
        e.preventDefault();
        copyElement();
        pasteElement();
        return;
      }

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.length > 0
      ) {
        if (inField) return;
        e.preventDefault();
        removeElements(selectedIds);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, removeElements, undo, redo, copyElement, pasteElement]);

  // Preview the animation inside the editor by sweeping elapsed time and
  // hiding elements until their appearance time.
  const playPreview = () => {
    if (previewRaf.current) cancelAnimationFrame(previewRaf.current);
    const times = appearTimes(valueRef.current.elements);
    const maxT = Object.values(times).reduce((m, t) => Math.max(m, t), 0);
    const start = performance.now();
    setPreviewElapsed(0);
    const tick = (now: number) => {
      const e = (now - start) / 1000;
      if (e >= maxT + 0.4) {
        setPreviewElapsed(null);
        previewRaf.current = null;
        return;
      }
      setPreviewElapsed(e);
      previewRaf.current = requestAnimationFrame(tick);
    };
    previewRaf.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => {
      if (previewRaf.current) cancelAnimationFrame(previewRaf.current);
    };
  }, []);

  // Close the context menu on an outside mousedown / scroll / Escape.
  // A mousedown inside the menu is ignored so item clicks still fire.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    const onScroll = () => setMenu(null);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menu]);

  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)_220px] gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      {/* Tool palette */}
      <div className="flex flex-col items-center gap-1.5">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={t.label}
            title={t.label}
            onClick={() => setTool(t.id)}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition cursor-pointer ${
              tool === t.id
                ? "border-teal-500/40 bg-teal-500/15 text-teal-300"
                : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {t.id === "candle" ? (
              <CandleIcon />
            ) : (
              <i className={`fa-solid ${t.icon} text-[12px]`} />
            )}
          </button>
        ))}

        <div className="w-6 h-px bg-white/10 my-1" />

        <HistoryButton
          icon="fa-rotate-left"
          label="Undo"
          disabled={!canUndo}
          onClick={undo}
        />
        <HistoryButton
          icon="fa-rotate-right"
          label="Redo"
          disabled={!canRedo}
          onClick={redo}
        />
      </div>

      {/* Canvas */}
      <div className="relative rounded-xl border border-white/10 bg-[#0c0c11] overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${value.width} ${value.height}`}
          className="w-full h-auto block select-none"
          style={{ cursor: tool === "select" ? "default" : "crosshair" }}
        >
          {/* Grid background */}
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
              />
            </pattern>
            <marker
              id="arrowhead"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
            </marker>
          </defs>
          <rect
            x={0}
            y={0}
            width={value.width}
            height={value.height}
            fill="url(#grid)"
            onMouseDown={handleBackgroundDown}
            onContextMenu={(e) => openMenu(e, null)}
          />

          {previewElapsed !== null
            ? // Preview playback: reveal elements at their appearance time.
              (() => {
                const times = appearTimes(value.elements);
                return value.elements.map((el) =>
                  (times[el.id] ?? 0) <= previewElapsed ? (
                    <g
                      key={el.id}
                      style={{ animation: "schemReveal 320ms ease-out both" }}
                    >
                      <SchematicEl
                        el={el}
                        selected={false}
                        onMouseDown={() => {}}
                      />
                    </g>
                  ) : null,
                );
              })()
            : value.elements.map((el) => (
                <SchematicEl
                  key={el.id}
                  el={el}
                  selected={selectedSet.has(el.id)}
                  // Resize handles only make sense for a single selection.
                  resizable={single?.id === el.id}
                  onMouseDown={(e) => handleElementDown(e, el)}
                  onHandleDown={(e, handle) => handleHandleDown(e, el, handle)}
                  onContextMenu={(e) => openMenu(e, el.id)}
                />
              ))}

          {/* Per-element appearance times while in animation mode. */}
          {animationMode &&
            previewElapsed === null &&
            (() => {
              const times = appearTimes(value.elements);
              return value.elements.map((el) => {
                const b = elementBBox(el);
                const t = times[el.id] ?? 0;
                const on = selectedSet.has(el.id);
                return (
                  <g key={`t-${el.id}`} pointerEvents="none">
                    <rect
                      x={b.x0}
                      y={b.y0 - 18}
                      width={42}
                      height={15}
                      rx={3}
                      fill={on ? "#14b8a6" : "#000000"}
                      fillOpacity={on ? 0.9 : 0.55}
                      stroke="#14b8a6"
                      strokeOpacity={on ? 0.9 : 0.4}
                      strokeWidth={1}
                    />
                    <text
                      x={b.x0 + 21}
                      y={b.y0 - 7}
                      fill="#ffffff"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {t.toFixed(2)}s
                    </text>
                  </g>
                );
              });
            })()}

          {/* Marquee selection rectangle */}
          {marquee.current && (
            <rect
              x={Math.min(marquee.current.x0, marquee.current.x1)}
              y={Math.min(marquee.current.y0, marquee.current.y1)}
              width={Math.abs(marquee.current.x1 - marquee.current.x0)}
              height={Math.abs(marquee.current.y1 - marquee.current.y0)}
              fill="#14b8a6"
              fillOpacity={0.08}
              stroke="#14b8a6"
              strokeOpacity={0.6}
              strokeWidth={1}
              strokeDasharray="4 3"
              pointerEvents="none"
            />
          )}
        </svg>

        {/* Preview the animation right in the editor. */}
        {value.elements.length > 0 && (
          <button
            type="button"
            onClick={playPreview}
            disabled={previewElapsed !== null}
            title="Preview animation"
            className={`absolute top-2 right-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition ${
              previewElapsed !== null
                ? "border-white/10 bg-black/40 text-white/50 cursor-default"
                : "border-white/15 bg-black/50 text-white/80 hover:bg-black/70 hover:text-white cursor-pointer"
            }`}
          >
            <i
              className={`fa-solid ${previewElapsed !== null ? "fa-circle-notch animate-spin" : "fa-play"} text-[9px]`}
            />
            {previewElapsed !== null ? "Playing" : "Preview"}
          </button>
        )}

        <style>{`
          @keyframes schemReveal {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>

      {menu && (
        <ContextMenu
          menuRef={menuRef}
          x={menu.clientX}
          y={menu.clientY}
          isElement={menu.elementId !== null}
          canPaste={clipboard.current.length > 0}
          onCopy={() => {
            copyElement();
            setMenu(null);
          }}
          onDuplicate={() => {
            copyElement();
            pasteElement();
            setMenu(null);
          }}
          onForward={() => {
            reorderSelection("forward");
            setMenu(null);
          }}
          onBack={() => {
            reorderSelection("back");
            setMenu(null);
          }}
          onPaste={() => {
            pasteElement({ x: menu.svgX, y: menu.svgY });
            setMenu(null);
          }}
          onDelete={() => {
            // Delete the whole selection (the right-clicked element is
            // part of it).
            removeElements(
              selectedIds.length > 0
                ? selectedIds
                : menu.elementId
                  ? [menu.elementId]
                  : [],
            );
            setMenu(null);
          }}
        />
      )}

      {/* Properties */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex flex-col gap-3 min-w-0">
        {/* Toggle between style editing and animation-timing editing. */}
        <div className="grid grid-cols-2 rounded-full border border-white/10 bg-white/[0.03] p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => setAnimationMode(false)}
            className={`py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
              !animationMode
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white"
            }`}
          >
            Style
          </button>
          <button
            type="button"
            onClick={() => setAnimationMode(true)}
            className={`py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
              animationMode
                ? "bg-teal-500/20 text-teal-300"
                : "text-white/50 hover:text-white"
            }`}
          >
            Animation
          </button>
        </div>
        <div className="text-[12px] font-medium text-white/55">
          {animationMode ? "Animation" : "Properties"}
        </div>

        {animationMode ? (
          <AnimationPanel
            elements={value.elements}
            selectedIds={selectedIds}
            single={single}
            onSet={(ids, appearAt) => commitMany(ids, { appearAt })}
          />
        ) : selectedIds.length === 0 ? (
          <p className="text-[11.5px] text-white/45 leading-relaxed">
            Select an element to edit it, or pick a tool to add one.
          </p>
        ) : single ? (
          <PropertyPanel
            element={single}
            onChange={(patch) => commitElement(single.id, patch)}
            onDelete={() => removeElements([single.id])}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-[12px] text-white/70">
              {selectedIds.length} elements selected
            </div>
            <p className="text-[11.5px] text-white/45 leading-relaxed">
              Drag any of them to move together. Right-click for copy or delete.
            </p>
            <button
              type="button"
              onClick={() => removeElements(selectedIds)}
              className="mt-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border border-red-500/25 bg-red-500/[0.08] text-red-300 hover:bg-red-500/15 transition text-[12px] font-medium cursor-pointer"
            >
              <i className="fa-solid fa-trash text-[10px]" />
              Delete selected
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Animation-timing editor shown in the properties box. Lets the user set
// the appearance time (seconds) for the selected element(s); "Auto"
// clears the override and falls back to the left-to-right sequence.
function AnimationPanel({
  elements,
  selectedIds,
  single,
  onSet,
}: {
  elements: SchematicElement[];
  selectedIds: string[];
  single: SchematicElement | null;
  onSet: (ids: string[], appearAt: number | undefined) => void;
}) {
  const times = appearTimes(elements);

  if (elements.length === 0) {
    return (
      <p className="text-[11.5px] text-white/45 leading-relaxed">
        Add elements first.
      </p>
    );
  }

  if (selectedIds.length === 0) {
    return (
      <p className="text-[11.5px] text-white/45 leading-relaxed">
        Select an element to set its time.
      </p>
    );
  }

  // The displayed time: the single element's resolved time, or the first
  // selected element's when several are chosen.
  const refId = single ? single.id : selectedIds[0];
  const shownTime = times[refId] ?? 0;
  const isExplicit = single
    ? single.appearAt !== undefined
    : selectedIds.some(
        (id) => elements.find((e) => e.id === id)?.appearAt !== undefined,
      );

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[12px] text-white/70">
        {single
          ? `${single.kind} appears at`
          : `${selectedIds.length} elements appear at`}
      </div>
      <NumField
        label="Seconds"
        value={Number(shownTime.toFixed(2))}
        onChange={(n) => onSet(selectedIds, Math.max(0, n))}
      />
      <button
        type="button"
        onClick={() => onSet(selectedIds, undefined)}
        disabled={!isExplicit}
        className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-medium transition ${
          isExplicit
            ? "border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white cursor-pointer"
            : "border-white/5 bg-white/[0.02] text-white/25 cursor-not-allowed"
        }`}
      >
        <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />
        Auto (sequence)
      </button>
    </div>
  );
}

function SchematicEl({
  el,
  selected,
  resizable = false,
  onMouseDown,
  onHandleDown,
  onContextMenu,
}: {
  el: SchematicElement;
  selected: boolean;
  // Show resize handles (only the single-selected element in the editor).
  resizable?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  // Provided only in the editor; previews omit it so no handles render.
  onHandleDown?: (e: React.MouseEvent, handle: ResizeHandle) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const stroke = selected ? "#14b8a6" : "transparent";
  const sw = selected ? 2 : 0;
  const editable = resizable && !!onHandleDown;

  switch (el.kind) {
    case "candle": {
      const w = el.w ?? 18;
      const h = el.h ?? 80;
      const wickUp = el.wickUp ?? DEFAULT_WICK;
      const wickDown = el.wickDown ?? DEFAULT_WICK;
      const cx = el.x + w / 2;
      const wickTop = el.y - wickUp;
      const wickBottom = el.y + h + wickDown;
      const bull = !!el.bull;
      const body = bull ? "#22c55e" : "#ef4444";
      // Wick is a thin vertical line through the body; body is a
      // filled rect. Both pieces share the drag handler.
      return (
        <g>
          <g
            onMouseDown={onMouseDown}
            onContextMenu={onContextMenu}
            style={{ cursor: "move" }}
          >
            <line
              x1={cx}
              y1={wickTop}
              x2={cx}
              y2={wickBottom}
              stroke={body}
              strokeWidth={1.5}
            />
            <rect
              x={el.x}
              y={el.y}
              width={w}
              height={h}
              fill={body}
              stroke={stroke}
              strokeWidth={sw}
              rx={1.5}
            />
            {el.label && (
              <text
                x={cx}
                y={wickBottom + 16}
                fill="#9ca3af"
                fontSize="11"
                textAnchor="middle"
              >
                {el.label}
              </text>
            )}
          </g>
          {editable && (
            <>
              <BoxHandles
                x={el.x}
                y={el.y}
                w={w}
                h={h}
                onHandleDown={onHandleDown}
              />
              {/* Wick endpoints */}
              <Handle
                cx={cx}
                cy={wickTop}
                cursor="ns-resize"
                onDown={(e) => onHandleDown(e, "wu")}
              />
              <Handle
                cx={cx}
                cy={wickBottom}
                cursor="ns-resize"
                onDown={(e) => onHandleDown(e, "wd")}
              />
            </>
          )}
        </g>
      );
    }
    case "line": {
      const color = el.color ?? "#9ca3af";
      return (
        <g>
          <g
            onMouseDown={onMouseDown}
            onContextMenu={onContextMenu}
            style={{ cursor: "move" }}
          >
            <line
              x1={el.x}
              y1={el.y}
              x2={el.x2 ?? el.x}
              y2={el.y2 ?? el.y}
              stroke={color}
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            {el.label && (
              <text x={el.x + 6} y={el.y - 6} fill={color} fontSize="11">
                {el.label}
              </text>
            )}
          </g>
          {editable && (
            <EndpointHandles
              x1={el.x}
              y1={el.y}
              x2={el.x2 ?? el.x}
              y2={el.y2 ?? el.y}
              onHandleDown={onHandleDown}
            />
          )}
        </g>
      );
    }
    case "arrow": {
      const color = el.color ?? "#14b8a6";
      return (
        <g>
          <g
            onMouseDown={onMouseDown}
            onContextMenu={onContextMenu}
            style={{ cursor: "move", color }}
          >
            <line
              x1={el.x}
              y1={el.y}
              x2={el.x2 ?? el.x}
              y2={el.y2 ?? el.y}
              stroke={color}
              strokeWidth={2.5}
              markerEnd="url(#arrowhead)"
            />
            {el.label && (
              <text
                x={(el.x + (el.x2 ?? el.x)) / 2 + 4}
                y={(el.y + (el.y2 ?? el.y)) / 2 - 6}
                fill={color}
                fontSize="11"
              >
                {el.label}
              </text>
            )}
          </g>
          {editable && (
            <EndpointHandles
              x1={el.x}
              y1={el.y}
              x2={el.x2 ?? el.x}
              y2={el.y2 ?? el.y}
              onHandleDown={onHandleDown}
            />
          )}
        </g>
      );
    }
    case "zone": {
      const color = el.color ?? "#f59e0b";
      const w = el.w ?? 160;
      const h = el.h ?? 60;
      return (
        <g>
          <g
            onMouseDown={onMouseDown}
            onContextMenu={onContextMenu}
            style={{ cursor: "move" }}
          >
            <rect
              x={el.x}
              y={el.y}
              width={w}
              height={h}
              fill={color}
              fillOpacity={0.06}
              stroke={color}
              strokeOpacity={0.7}
              strokeWidth={1.5}
              strokeDasharray="1 4"
              strokeLinecap="round"
              rx={4}
            />
            {selected && (
              <rect
                x={el.x - 2}
                y={el.y - 2}
                width={w + 4}
                height={h + 4}
                fill="none"
                stroke={stroke}
                strokeWidth={sw}
                rx={5}
              />
            )}
            {el.label && (
              <text x={el.x + 8} y={el.y + 16} fill={color} fontSize="11">
                {el.label}
              </text>
            )}
          </g>
          {editable && (
            <BoxHandles
              x={el.x}
              y={el.y}
              w={w}
              h={h}
              onHandleDown={onHandleDown}
            />
          )}
        </g>
      );
    }
    case "text": {
      const fs = el.w ?? DEFAULT_TEXT_SIZE;
      const txt = el.text || "Text";
      const boxW = txt.length * fs * 0.6 + 12;
      const boxH = fs * 1.4 + 6;
      return (
        <g>
          <g
            onMouseDown={onMouseDown}
            onContextMenu={onContextMenu}
            style={{ cursor: "move" }}
          >
            <text
              x={el.x}
              y={el.y}
              fill={el.color ?? "#e5e7eb"}
              fontSize={fs}
              fontWeight={500}
            >
              {txt}
            </text>
            {selected && (
              <rect
                x={el.x - 4}
                y={el.y - fs}
                width={boxW}
                height={boxH}
                fill="none"
                stroke={stroke}
                strokeWidth={sw}
                rx={3}
              />
            )}
          </g>
          {editable && (
            <Handle
              cx={el.x - 4 + boxW}
              cy={el.y - fs + boxH}
              cursor="nwse-resize"
              onDown={(e) => onHandleDown(e, "fs")}
            />
          )}
        </g>
      );
    }
  }
}

// A single square resize handle drawn in canvas coordinates.
function Handle({
  cx,
  cy,
  cursor,
  onDown,
}: {
  cx: number;
  cy: number;
  cursor: string;
  onDown: (e: React.MouseEvent) => void;
}) {
  const s = 9;
  return (
    <rect
      x={cx - s / 2}
      y={cy - s / 2}
      width={s}
      height={s}
      rx={2}
      fill="#0c0c11"
      stroke="#14b8a6"
      strokeWidth={1.5}
      style={{ cursor }}
      onMouseDown={onDown}
    />
  );
}

// Four corner handles for box-shaped elements.
function BoxHandles({
  x,
  y,
  w,
  h,
  onHandleDown,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  onHandleDown: (e: React.MouseEvent, handle: ResizeHandle) => void;
}) {
  const corners: {
    handle: ResizeHandle;
    cx: number;
    cy: number;
    cursor: string;
  }[] = [
    { handle: "nw", cx: x, cy: y, cursor: "nwse-resize" },
    { handle: "ne", cx: x + w, cy: y, cursor: "nesw-resize" },
    { handle: "sw", cx: x, cy: y + h, cursor: "nesw-resize" },
    { handle: "se", cx: x + w, cy: y + h, cursor: "nwse-resize" },
  ];
  return (
    <>
      {corners.map((c) => (
        <Handle
          key={c.handle}
          cx={c.cx}
          cy={c.cy}
          cursor={c.cursor}
          onDown={(e) => onHandleDown(e, c.handle)}
        />
      ))}
    </>
  );
}

// Two endpoint handles for line / arrow elements.
function EndpointHandles({
  x1,
  y1,
  x2,
  y2,
  onHandleDown,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  onHandleDown: (e: React.MouseEvent, handle: ResizeHandle) => void;
}) {
  return (
    <>
      <Handle
        cx={x1}
        cy={y1}
        cursor="move"
        onDown={(e) => onHandleDown(e, "p1")}
      />
      <Handle
        cx={x2}
        cy={y2}
        cursor="move"
        onDown={(e) => onHandleDown(e, "p2")}
      />
    </>
  );
}

function PropertyPanel({
  element,
  onChange,
  onDelete,
}: {
  element: SchematicElement;
  onChange: (patch: Partial<SchematicElement>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10.5px] tracking-[0.08em] uppercase text-teal-300/80">
        {element.kind}
      </div>

      {element.kind === "candle" && (
        <>
          <Toggle
            label="Bull"
            checked={!!element.bull}
            onChange={(b) => onChange({ bull: b })}
          />
          <NumField
            label="Body width"
            value={element.w ?? 18}
            onChange={(n) => onChange({ w: Math.max(MIN_SIZE, n) })}
          />
          <NumField
            label="Body height"
            value={element.h ?? 80}
            onChange={(n) => onChange({ h: Math.max(MIN_SIZE, n) })}
          />
          <NumField
            label="Upper wick"
            value={element.wickUp ?? DEFAULT_WICK}
            onChange={(n) => onChange({ wickUp: Math.max(0, n) })}
          />
          <NumField
            label="Lower wick"
            value={element.wickDown ?? DEFAULT_WICK}
            onChange={(n) => onChange({ wickDown: Math.max(0, n) })}
          />
        </>
      )}

      {element.kind === "zone" && (
        <>
          <NumField
            label="Width"
            value={element.w ?? 160}
            onChange={(n) => onChange({ w: n })}
          />
          <NumField
            label="Height"
            value={element.h ?? 60}
            onChange={(n) => onChange({ h: n })}
          />
        </>
      )}

      {element.kind === "text" && (
        <>
          <TextField
            label="Content"
            value={element.text ?? ""}
            onChange={(t) => onChange({ text: t })}
          />
          <NumField
            label="Size"
            value={element.w ?? DEFAULT_TEXT_SIZE}
            onChange={(n) => onChange({ w: Math.max(MIN_FONT, n) })}
          />
        </>
      )}

      {element.kind !== "text" && (
        <TextField
          label="Label"
          value={element.label ?? ""}
          onChange={(t) => onChange({ label: t })}
        />
      )}

      {element.kind !== "candle" && (
        <ColorField
          label="Color"
          value={element.color ?? "#9ca3af"}
          onChange={(c) => onChange({ color: c })}
        />
      )}

      <button
        type="button"
        onClick={onDelete}
        className="mt-2 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border border-red-500/25 bg-red-500/[0.08] text-red-300 hover:bg-red-500/15 transition text-[12px] font-medium cursor-pointer"
      >
        <i className="fa-solid fa-trash text-[10px]" />
        Delete
      </button>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  // Keep the raw text locally so the field can be cleared and typed into
  // freely. The parent may clamp the committed value (e.g. to a minimum),
  // but we don't force that back into the box mid-edit — otherwise
  // deleting the number or typing a digit below the minimum snaps it.
  const [text, setText] = useState(String(value));
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) setText(String(value));
  }, [value]);

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] tracking-[0.08em] uppercase text-white/45">
        {label}
      </span>
      <input
        type="number"
        value={text}
        onFocus={() => {
          editing.current = true;
        }}
        onChange={(e) => {
          setText(e.target.value);
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        onBlur={() => {
          editing.current = false;
          // Snap the display to the committed (possibly clamped) value.
          setText(String(value));
        }}
        className="w-full px-2 py-1.5 rounded bg-white/[0.04] border border-white/10 text-[12.5px] text-white focus:border-white/30 focus:outline-none"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] tracking-[0.08em] uppercase text-white/45">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded bg-white/[0.04] border border-white/10 text-[12.5px] text-white focus:border-white/30 focus:outline-none"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-[10.5px] tracking-[0.08em] uppercase text-white/45">
        {label}
      </span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-9 h-7 rounded bg-transparent border border-white/10 cursor-pointer"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer">
      <span className="text-[10.5px] tracking-[0.08em] uppercase text-white/45">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition ${
          checked ? "bg-green-500/70" : "bg-white/15"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
    </label>
  );
}

// Custom right-click menu rendered at the cursor (fixed positioning).
// Item set depends on whether an element was clicked.
function ContextMenu({
  menuRef,
  x,
  y,
  isElement,
  canPaste,
  onCopy,
  onDuplicate,
  onForward,
  onBack,
  onPaste,
  onDelete,
}: {
  menuRef: React.RefObject<HTMLDivElement | null>;
  x: number;
  y: number;
  isElement: boolean;
  canPaste: boolean;
  onCopy: () => void;
  onDuplicate: () => void;
  onForward: () => void;
  onBack: () => void;
  onPaste: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      ref={menuRef}
      style={{ position: "fixed", top: y, left: x }}
      // Don't let the browser's native menu show on the popup itself.
      onContextMenu={(e) => e.preventDefault()}
      className="z-50 min-w-[160px] rounded-xl border border-white/10 bg-[var(--surface-2)]/95 backdrop-blur-md shadow-[0_24px_60px_var(--shadow)] p-1.5 flex flex-col"
    >
      {isElement && (
        <>
          <ContextItem icon="fa-copy" label="Copy" onClick={onCopy} />
          <ContextItem
            icon="fa-clone"
            label="Duplicate"
            onClick={onDuplicate}
          />
          <div className="h-px bg-white/10 my-1" />
          <ContextItem
            icon="fa-arrow-up"
            label="Send forward"
            onClick={onForward}
          />
          <ContextItem
            icon="fa-arrow-down"
            label="Send back"
            onClick={onBack}
          />
        </>
      )}
      <ContextItem
        icon="fa-paste"
        label="Paste"
        disabled={!canPaste}
        onClick={onPaste}
      />
      {isElement && (
        <>
          <div className="h-px bg-white/10 my-1" />
          <ContextItem
            icon="fa-trash"
            label="Delete"
            tone="danger"
            onClick={onDelete}
          />
        </>
      )}
    </div>
  );
}

function ContextItem({
  icon,
  label,
  onClick,
  disabled = false,
  tone = "default",
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12.5px] text-left transition ${
        disabled
          ? "text-white/25 cursor-not-allowed"
          : tone === "danger"
            ? "text-red-300 hover:bg-red-500/[0.12] cursor-pointer"
            : "text-white/80 hover:bg-white/[0.07] hover:text-white cursor-pointer"
      }`}
    >
      <i className={`fa-solid ${icon} w-3.5 text-center text-[11px]`} />
      {label}
    </button>
  );
}

function HistoryButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`w-8 h-8 rounded-lg border flex items-center justify-center transition ${
        disabled
          ? "border-white/5 bg-white/[0.02] text-white/25 cursor-not-allowed"
          : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white cursor-pointer"
      }`}
    >
      <i className={`fa-solid ${icon} text-[12px]`} />
    </button>
  );
}

// Custom palette icon: a single candle with upper and lower wicks.
// Uses currentColor so it picks up the active/hover text colour.
function CandleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      aria-hidden
      focusable="false"
    >
      <line
        x1="12"
        y1="2.5"
        x2="12"
        y2="21.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="7.5" y="7" width="9" height="10" rx="1.5" fill="currentColor" />
    </svg>
  );
}

// Read-only renderer for embedding a schematic in lists / previews.
// Reuses the same SVG primitives but skips all interaction.
export function SchematicPreview({
  schematic,
  className = "",
}: {
  schematic: Schematic;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${schematic.width} ${schematic.height}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker
          id="arrowhead"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
      </defs>
      <rect
        x={0}
        y={0}
        width={schematic.width}
        height={schematic.height}
        fill="#0c0c11"
      />
      {schematic.elements.map((el) => (
        <SchematicEl
          key={el.id}
          el={el}
          selected={false}
          onMouseDown={() => {}}
        />
      ))}
    </svg>
  );
}

// Animated, read-only player. A Play button reveals each element at its
// configured appearance time (or the auto left-to-right sequence), each
// fading in, the way the original strategy schematics animated. Until
// played (and once finished) the full schematic is shown as a still.
export function SchematicPlayer({
  schematic,
  className = "",
}: {
  schematic: Schematic;
  className?: string;
}) {
  const { elements, width, height } = schematic;
  // Elapsed playback time in seconds; Infinity (the default) reveals
  // everything so the still shows the whole schematic.
  const [elapsed, setElapsed] = useState(Infinity);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);

  const times = appearTimes(elements);
  const maxTime = elements.reduce((m, el) => Math.max(m, times[el.id] ?? 0), 0);

  // Reset to the full still if the schematic changes while idle.
  useEffect(() => {
    if (!playing) setElapsed(Infinity);
  }, [elements.length, playing]);

  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    const tick = (now: number) => {
      const e = (now - start) / 1000;
      if (e >= maxTime + 0.4) {
        setElapsed(Infinity); // settle on the full still
        setPlaying(false);
        return;
      }
      setElapsed(e);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, maxTime]);

  const play = () => {
    if (elements.length === 0) return;
    setElapsed(0);
    setPlaying(true);
  };

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker
            id="arrowhead"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
          </marker>
        </defs>
        <rect x={0} y={0} width={width} height={height} fill="#0c0c11" />
        {elements.map((el) =>
          (times[el.id] ?? 0) <= elapsed ? (
            <g
              key={el.id}
              style={{ animation: "schemReveal 320ms ease-out both" }}
            >
              <SchematicEl el={el} selected={false} onMouseDown={() => {}} />
            </g>
          ) : null,
        )}
      </svg>

      {elements.length > 0 && (
        <button
          type="button"
          onClick={play}
          disabled={playing}
          className={`absolute top-2 right-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition ${
            playing
              ? "border-white/10 bg-black/40 text-white/50 cursor-default"
              : "border-white/15 bg-black/50 text-white/80 hover:bg-black/70 hover:text-white cursor-pointer"
          }`}
        >
          <i
            className={`fa-solid ${playing ? "fa-circle-notch animate-spin" : "fa-play"} text-[9px]`}
          />
          {playing ? "Playing" : "Play"}
        </button>
      )}

      <style>{`
        @keyframes schemReveal {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
