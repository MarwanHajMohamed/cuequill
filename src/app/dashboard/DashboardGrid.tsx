"use client";

import React, { useMemo, useState } from "react";
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
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  WIDGETS,
  WIDGET_MAP,
  DEFAULT_LAYOUT,
  sanitizeLayout,
  type WidgetId,
} from "./widgets";

const LAYOUT_KEY = "cuequill:dashboard-layout-v1";

export default function DashboardGrid({ userId }: { userId: string }) {
  const [stored, setStored] = useLocalStorage<WidgetId[]>(
    LAYOUT_KEY,
    DEFAULT_LAYOUT,
  );
  const layout = useMemo(() => sanitizeLayout(stored), [stored]);

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

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = layout.indexOf(active.id as WidgetId);
    const to = layout.indexOf(over.id as WidgetId);
    if (from === -1 || to === -1) return;
    setStored(arrayMove(layout, from, to));
  };

  const removeWidget = (id: WidgetId) =>
    setStored(layout.filter((x) => x !== id));

  const addWidget = (id: WidgetId) => {
    if (!layout.includes(id)) setStored([...layout, id]);
    setAddOpen(false);
  };

  const resetLayout = () => setStored([...DEFAULT_LAYOUT]);

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {layout.map((id) => (
              <SortableWidget
                key={id}
                id={id}
                userId={userId}
                editing={editing}
                onRemove={removeWidget}
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
  onRemove,
}: {
  id: WidgetId;
  userId: string;
  editing: boolean;
  onRemove: (id: WidgetId) => void;
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

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // View mode: render the widget as-is. `[&:empty]:hidden` collapses a
  // widget that rendered nothing (e.g. Goals for a non-Pro user) so it
  // doesn't leave a gap in the grid.
  if (!editing) {
    return (
      <div ref={setNodeRef} style={style} className="h-full [&:empty]:hidden">
        {def.render(userId)}
      </div>
    );
  }

  // Edit mode: wrap each widget in a dashed tile with a drag handle and a
  // remove button, so even an empty widget stays identifiable and
  // manageable. Content is non-interactive while editing.
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`h-full rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-2 flex flex-col gap-2 ${
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
        <button
          onClick={() => onRemove(id)}
          className="w-6 h-6 flex items-center justify-center rounded-md text-white/40 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
          aria-label={`Remove ${def.title}`}
          title="Remove widget"
        >
          <i className="fa-solid fa-xmark text-[13px]" />
        </button>
      </div>
      <div className="flex-1 min-h-0 pointer-events-none">
        {def.render(userId)}
      </div>
    </div>
  );
}
