"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { SchematicElement, SchematicKind } from "@/lib/models/Strategy";

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

function defaultElement(kind: SchematicKind, x: number, y: number): SchematicElement {
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origX2?: number;
    origY2?: number;
  } | null>(null);

  const selected = value.elements.find((e) => e.id === selectedId) ?? null;

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

  const addElement = useCallback(
    (el: SchematicElement) => {
      onChange({ ...value, elements: [...value.elements, el] });
      setSelectedId(el.id);
    },
    [onChange, value],
  );

  const removeElement = useCallback(
    (id: string) => {
      onChange({
        ...value,
        elements: value.elements.filter((e) => e.id !== id),
      });
      setSelectedId(null);
    },
    [onChange, value],
  );

  // Background click: either drop a new element (when a non-select
  // tool is active) or clear the selection.
  const handleBackgroundDown = (e: React.MouseEvent<SVGRectElement>) => {
    const { x, y } = toSvg(e.clientX, e.clientY);
    if (tool === "select") {
      setSelectedId(null);
      return;
    }
    addElement(defaultElement(tool, x, y));
    setTool("select");
  };

  // Begin drag on element mouse-down.
  const handleElementDown = (e: React.MouseEvent, el: SchematicElement) => {
    e.stopPropagation();
    setSelectedId(el.id);
    const { x, y } = toSvg(e.clientX, e.clientY);
    drag.current = {
      id: el.id,
      startX: x,
      startY: y,
      origX: el.x,
      origY: el.y,
      origX2: el.x2,
      origY2: el.y2,
    };
  };

  // Document-level move/up so we don't lose the drag if the cursor
  // leaves the element.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      const { x, y } = toSvg(e.clientX, e.clientY);
      const dx = x - d.startX;
      const dy = y - d.startY;
      const patch: Partial<SchematicElement> = { x: d.origX + dx, y: d.origY + dy };
      if (d.origX2 !== undefined) patch.x2 = d.origX2 + dx;
      if (d.origY2 !== undefined) patch.y2 = d.origY2 + dy;
      updateElement(d.id, patch);
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [toSvg, updateElement]);

  // Keyboard: Delete / Backspace removes the selected element.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
          return;
        }
        e.preventDefault();
        removeElement(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, removeElement]);

  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)_220px] gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      {/* Tool palette */}
      <div className="flex flex-col gap-1.5">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={t.label}
            title={t.label}
            onClick={() => setTool(t.id)}
            className={`h-11 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
              tool === t.id
                ? "border-teal-500/40 bg-teal-500/15 text-teal-300"
                : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <i className={`fa-solid ${t.icon} text-[12px]`} />
            <span className="text-[9.5px] tracking-[0.08em] uppercase">
              {t.label.slice(0, 4)}
            </span>
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="rounded-xl border border-white/10 bg-[#0c0c11] overflow-hidden">
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
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
          <rect
            x={0}
            y={0}
            width={value.width}
            height={value.height}
            fill="url(#grid)"
            onMouseDown={handleBackgroundDown}
          />

          {value.elements.map((el) => (
            <SchematicEl
              key={el.id}
              el={el}
              selected={el.id === selectedId}
              onMouseDown={(e) => handleElementDown(e, el)}
            />
          ))}
        </svg>
      </div>

      {/* Properties */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex flex-col gap-3 min-w-0">
        <div className="text-[10.5px] tracking-[0.12em] uppercase text-white/45">
          Properties
        </div>
        {!selected ? (
          <p className="text-[11.5px] text-white/45 leading-relaxed">
            Pick a tool, click the canvas to add. Click an element to edit, or
            drag to move. Press Delete to remove it.
          </p>
        ) : (
          <PropertyPanel
            element={selected}
            onChange={(patch) => updateElement(selected.id, patch)}
            onDelete={() => removeElement(selected.id)}
          />
        )}
      </div>
    </div>
  );
}

function SchematicEl({
  el,
  selected,
  onMouseDown,
}: {
  el: SchematicElement;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const stroke = selected ? "#14b8a6" : "transparent";
  const sw = selected ? 2 : 0;

  switch (el.kind) {
    case "candle": {
      const w = el.w ?? 18;
      const h = el.h ?? 80;
      const bull = !!el.bull;
      const body = bull ? "#22c55e" : "#ef4444";
      // Wick is a thin vertical line through the body; body is a
      // filled rect. Both pieces share the drag handler.
      return (
        <g onMouseDown={onMouseDown} style={{ cursor: "move" }}>
          <line
            x1={el.x + w / 2}
            y1={el.y - 12}
            x2={el.x + w / 2}
            y2={el.y + h + 12}
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
              x={el.x + w / 2}
              y={el.y + h + 28}
              fill="#9ca3af"
              fontSize="11"
              textAnchor="middle"
            >
              {el.label}
            </text>
          )}
        </g>
      );
    }
    case "line": {
      const color = el.color ?? "#9ca3af";
      return (
        <g onMouseDown={onMouseDown} style={{ cursor: "move" }}>
          <line
            x1={el.x}
            y1={el.y}
            x2={el.x2 ?? el.x}
            y2={el.y2 ?? el.y}
            stroke={color}
            strokeWidth={2}
            strokeDasharray="6 4"
          />
          {selected && (
            <>
              <circle cx={el.x} cy={el.y} r={4} fill={stroke} />
              <circle cx={el.x2 ?? el.x} cy={el.y2 ?? el.y} r={4} fill={stroke} />
            </>
          )}
          {el.label && (
            <text
              x={el.x + 6}
              y={el.y - 6}
              fill={color}
              fontSize="11"
            >
              {el.label}
            </text>
          )}
        </g>
      );
    }
    case "arrow": {
      const color = el.color ?? "#14b8a6";
      return (
        <g
          onMouseDown={onMouseDown}
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
          {selected && (
            <>
              <circle cx={el.x} cy={el.y} r={4} fill={stroke} />
              <circle cx={el.x2 ?? el.x} cy={el.y2 ?? el.y} r={4} fill={stroke} />
            </>
          )}
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
      );
    }
    case "zone": {
      const color = el.color ?? "#f59e0b";
      const w = el.w ?? 160;
      const h = el.h ?? 60;
      return (
        <g onMouseDown={onMouseDown} style={{ cursor: "move" }}>
          <rect
            x={el.x}
            y={el.y}
            width={w}
            height={h}
            fill={color}
            fillOpacity={0.15}
            stroke={color}
            strokeOpacity={0.6}
            strokeWidth={1.5}
            strokeDasharray="4 4"
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
      );
    }
    case "text":
      return (
        <g onMouseDown={onMouseDown} style={{ cursor: "move" }}>
          <text
            x={el.x}
            y={el.y}
            fill={el.color ?? "#e5e7eb"}
            fontSize="14"
            fontWeight={500}
          >
            {el.text || "Text"}
          </text>
          {selected && (
            <rect
              x={el.x - 4}
              y={el.y - 16}
              width={(el.text || "Text").length * 8 + 12}
              height={22}
              fill="none"
              stroke={stroke}
              strokeWidth={sw}
              rx={3}
            />
          )}
        </g>
      );
  }
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
            label="Width"
            value={element.w ?? 18}
            onChange={(n) => onChange({ w: n })}
          />
          <NumField
            label="Height"
            value={element.h ?? 80}
            onChange={(n) => onChange({ h: n })}
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
        <TextField
          label="Content"
          value={element.text ?? ""}
          onChange={(t) => onChange({ text: t })}
        />
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
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] tracking-[0.08em] uppercase text-white/45">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(n);
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
          id="arrowhead-preview"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
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
        <SchematicEl key={el.id} el={el} selected={false} onMouseDown={() => {}} />
      ))}
    </svg>
  );
}
