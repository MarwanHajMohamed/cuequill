"use client";

import React, { useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  WIDGETS,
  WIDGET_MAP,
  DEFAULT_LAYOUT,
  ALL_WIDGET_IDS,
  sanitizeLayout,
  type WidgetId,
} from "./widgets";
import { usePersistedField } from "./usePersistedLayout";

const LAYOUT_KEY = "cuequill:dashboard-layout-v1";
const SIZES_KEY = "cuequill:dashboard-widget-sizes-v1";
const ROWS_KEY = "cuequill:dashboard-widget-rows-v1";

// Column span per widget: 1 = half width, 2 = full width. Drop unknown
// ids and clamp to {1,2} so a stale/bad value can't break the grid.
function sanitizeSizes(raw: unknown): Record<WidgetId, 1 | 2> {
  const out = {} as Record<WidgetId, 1 | 2>;
  if (typeof raw !== "object" || raw === null) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (ALL_WIDGET_IDS.has(k as WidgetId) && (v === 1 || v === 2)) {
      out[k as WidgetId] = v;
    }
  }
  return out;
}

export default function DashboardGrid({ userId }: { userId: string }) {
  const [layout, persist] = usePersistedField<WidgetId[]>(
    LAYOUT_KEY,
    "layout",
    DEFAULT_LAYOUT,
    sanitizeLayout,
  );
  const [sizes, persistSizes] = usePersistedField<Record<WidgetId, 1 | 2>>(
    SIZES_KEY,
    "widgetSizes",
    {} as Record<WidgetId, 1 | 2>,
    sanitizeSizes,
  );
  const [rows, persistRows] = usePersistedField<Record<WidgetId, 1 | 2>>(
    ROWS_KEY,
    "widgetRows",
    {} as Record<WidgetId, 1 | 2>,
    sanitizeSizes,
  );

  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const sensors = useSensors(
    // A small activation distance so clicks on widget links still work
    // when not dragging.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const disabledWidgets = WIDGETS.filter((w) => !layout.includes(w.id));

  const setWidgetSize = (id: WidgetId, span: 1 | 2) => {
    if ((sizes[id] ?? 1) === span) return;
    persistSizes({ ...sizes, [id]: span });
  };

  const setWidgetRows = (id: WidgetId, span: 1 | 2) => {
    if ((rows[id] ?? 1) === span) return;
    persistRows({ ...rows, [id]: span });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = layout.indexOf(active.id as WidgetId);
    const to = layout.indexOf(over.id as WidgetId);
    if (from === -1 || to === -1) return;
    persist(arrayMove(layout, from, to));
  };

  const removeWidget = (id: WidgetId) =>
    persist(layout.filter((x) => x !== id));

  const addWidget = (id: WidgetId) => {
    if (!layout.includes(id)) persist([...layout, id]);
    setAddOpen(false);
  };

  const resetLayout = () => {
    persist([...DEFAULT_LAYOUT]);
    persistSizes({} as Record<WidgetId, 1 | 2>);
    persistRows({} as Record<WidgetId, 1 | 2>);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-5 md:px-10">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 mb-4">
        {editing ? (
          <>
            <div className="relative">
              <button
                onClick={() => setAddOpen((o) => !o)}
                disabled={disabledWidgets.length === 0}
                className="inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <i className="fa-solid fa-plus text-[11px]" />
                Add widget
              </button>
              {addOpen && disabledWidgets.length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAddOpen(false)}
                  />
                  <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-56 rounded-xl border border-white/10 bg-[var(--surface-2,#1a1a1a)] backdrop-blur-md shadow-xl p-1.5">
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-white/40">
                      Add a widget
                    </div>
                    {disabledWidgets.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => addWidget(w.id)}
                        className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] text-white/80 hover:bg-white/[0.06] transition cursor-pointer"
                      >
                        <i className="fa-solid fa-plus text-[10px] text-white/40" />
                        {w.title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={resetLayout}
              className="inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] transition cursor-pointer"
            >
              <i className="fa-solid fa-rotate-left text-[11px]" />
              Reset
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setAddOpen(false);
              }}
              className="inline-flex items-center gap-2 text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-teal-500/90 text-white hover:bg-teal-400 transition cursor-pointer"
            >
              <i className="fa-solid fa-check text-[11px]" />
              Done
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] transition cursor-pointer"
          >
            <i className="fa-solid fa-sliders text-[11px]" />
            Customize
          </button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={layout} strategy={rectSortingStrategy}>
          {/* A base row height on lg+ so a 2-row widget is visibly taller;
              short widgets stretch to fill (h-full). Mobile stays a simple
              content-height single column. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:[grid-auto-rows:minmax(200px,auto)]">
            {layout.map((id) => (
              <SortableWidget
                key={id}
                id={id}
                userId={userId}
                editing={editing}
                span={sizes[id] ?? 1}
                rowSpan={rows[id] ?? 1}
                onRemove={removeWidget}
                onResize={setWidgetSize}
                onResizeRow={setWidgetRows}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {layout.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/45 text-sm">
          No widgets on your dashboard.{" "}
          <button
            onClick={() => setEditing(true)}
            className="text-teal-300 hover:text-teal-200 underline-offset-2 hover:underline cursor-pointer"
          >
            Add some
          </button>
          .
        </div>
      )}
    </div>
  );
}

function SortableWidget({
  id,
  userId,
  editing,
  span,
  rowSpan,
  onRemove,
  onResize,
  onResizeRow,
}: {
  id: WidgetId;
  userId: string;
  editing: boolean;
  span: 1 | 2;
  rowSpan: 1 | 2;
  onRemove: (id: WidgetId) => void;
  onResize: (id: WidgetId, span: 1 | 2) => void;
  onResizeRow: (id: WidgetId, span: 1 | 2) => void;
}) {
  const def = WIDGET_MAP[id];
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editing });
  const outerRef = useRef<HTMLDivElement | null>(null);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  // Full-width widgets span both grid columns on lg+; tall widgets span
  // two rows. Mobile is a single content-height column, so both are moot
  // there.
  const spanClass = `${span === 2 ? "lg:col-span-2" : ""} ${
    rowSpan === 2 ? "lg:row-span-2" : ""
  }`;

  // Drag the right-edge handle to resize width, or the bottom-edge handle
  // to resize height. Only two states per axis, so we snap to 1 or 2 based
  // on where the pointer crosses relative to this widget's own size.
  const startResize = (axis: "x" | "y") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = outerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const start = axis === "x" ? e.clientX : e.clientY;
    const cur = axis === "x" ? span : rowSpan;
    const setter = axis === "x" ? onResize : onResizeRow;
    // Size of a single unit ≈ full size / current span.
    const unit = (axis === "x" ? rect.width : rect.height) / cur;
    const move = (ev: PointerEvent) => {
      const d = (axis === "x" ? ev.clientX : ev.clientY) - start;
      if (cur === 1 && d > unit * 0.4) setter(id, 2);
      else if (cur === 2 && d < -unit * 0.4) setter(id, 1);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // View mode: render the widget as-is. `[&:empty]:hidden` collapses a
  // widget that rendered nothing (e.g. Goals for a non-Pro user) so it
  // doesn't leave a gap in the grid.
  if (!editing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`h-full [&:empty]:hidden ${spanClass}`}
      >
        {def.render(userId)}
      </div>
    );
  }

  // Edit mode: wrap each widget in a dashed tile with a drag handle, a
  // remove button, and a right-edge resize handle, so even an empty widget
  // stays identifiable and manageable. Content is non-interactive while
  // editing.
  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        outerRef.current = node;
      }}
      style={style}
      className={`relative h-full rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-2 flex flex-col gap-2 ${spanClass} ${
        isDragging ? "opacity-60 z-10 shadow-2xl" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <button
          {...attributes}
          {...listeners}
          className="flex items-center gap-2 text-white/50 hover:text-white cursor-grab active:cursor-grabbing touch-none"
          aria-label={`Drag ${def.title}`}
        >
          <i className="fa-solid fa-grip-vertical text-[12px]" />
          <span className="text-[12px] font-medium">{def.title}</span>
        </button>
        <div className="flex items-center gap-1">
          {/* Width toggle — accessible alternative to dragging the edge. */}
          <button
            onClick={() => onResize(id, span === 2 ? 1 : 2)}
            className="hidden lg:flex w-6 h-6 items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label={span === 2 ? "Make half width" : "Make full width"}
            title={span === 2 ? "Half width" : "Full width"}
          >
            <i
              className={`fa-solid ${
                span === 2 ? "fa-left-right" : "fa-arrows-left-right-to-line"
              } text-[11px]`}
            />
          </button>
          {/* Height toggle. */}
          <button
            onClick={() => onResizeRow(id, rowSpan === 2 ? 1 : 2)}
            className="hidden lg:flex w-6 h-6 items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label={
              rowSpan === 2 ? "Make one row tall" : "Make two rows tall"
            }
            title={rowSpan === 2 ? "Shorter" : "Taller"}
          >
            <i
              className={`fa-solid ${
                rowSpan === 2 ? "fa-up-down" : "fa-arrows-up-to-line"
              } text-[11px]`}
            />
          </button>
          <button
            onClick={() => onRemove(id)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-white/40 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
            aria-label={`Remove ${def.title}`}
            title="Remove widget"
          >
            <i className="fa-solid fa-xmark text-[13px]" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 pointer-events-none">
        {def.render(userId)}
      </div>

      {/* Right-edge (width) drag-to-resize handle — desktop only. */}
      <div
        onPointerDown={startResize("x")}
        className="hidden lg:flex absolute top-1/2 -translate-y-1/2 right-0 h-16 w-3 items-center justify-center cursor-ew-resize touch-none group"
        title="Drag to resize width"
      >
        <div className="w-1 h-10 rounded-full bg-white/20 group-hover:bg-teal-400/70 transition" />
      </div>

      {/* Bottom-edge (height) drag-to-resize handle — desktop only. */}
      <div
        onPointerDown={startResize("y")}
        className="hidden lg:flex absolute left-1/2 -translate-x-1/2 bottom-0 w-16 h-3 items-center justify-center cursor-ns-resize touch-none group"
        title="Drag to resize height"
      >
        <div className="h-1 w-10 rounded-full bg-white/20 group-hover:bg-teal-400/70 transition" />
      </div>
    </div>
  );
}
