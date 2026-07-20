"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  // Optional placeholder shown while the editor is empty.
  placeholder?: string;
  // Extra classes applied to the contentEditable element so callers can
  // tweak min-height / max-height to fit their layout.
  className?: string;
  // Hide the toolbar (e.g. when embedded in a tight panel).
  hideToolbar?: boolean;
};

// Reusable rich-text editor for trade notes. Used by both the modal
// quick-edit and the full trade-detail page.
//
// Notes are stored as raw HTML in the existing string column - the
// editor's `innerHTML` is fed back to the parent through `onChange`,
// and any consumer rendering should mirror the inline CSS rules at the
// bottom of this file so saved notes look the same in read-only views.
//
// Image resize: clicking an embedded <img> selects it and overlays
// four corner drag-handles; dragging any handle resizes the image
// while preserving its aspect ratio. Backspace / Delete on a selected
// image removes it.
export default function RichNotesEditor({
  value,
  onChange,
  placeholder = "Write a note…",
  className = "",
  hideToolbar = false,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(
    null,
  );
  // Forces the handle overlay to re-snap after a layout shift.
  const [overlayTick, setOverlayTick] = useState(0);

  // Apply a document-level rich-text command to the current selection
  // and push the new innerHTML up.
  const exec = (cmd: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(editorRef.current?.innerHTML ?? "");
  };

  // Read an image file as a base64 data URL and insert it inline.
  // Images live inside the notes string itself - good enough for
  // low-volume use; swap to an object-store upload if this grows.
  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      exec("insertImage", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Initialise editor content on mount. We can't bind `value` directly
  // to contentEditable's HTML without losing the caret on every input,
  // so we set initial content once and let the user drive edits.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = value ?? "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the consumer-controlled `value` changes from outside (e.g. a
  // reset on save), re-sync the editor's innerHTML.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) el.innerHTML = value ?? "";
  }, [value]);

  // Click handler picks up an <img> target and shows the resize
  // handles; clicking anywhere else clears the selection.
  const handleEditorMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      setSelectedImage(target as HTMLImageElement);
    } else {
      setSelectedImage(null);
    }
  };

  // Toggle the selection outline class on the underlying <img> so the
  // teal ring shows up for the right node and clears off the others.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.querySelectorAll("img.is-selected").forEach((img) => {
      img.classList.remove("is-selected");
    });
    selectedImage?.classList.add("is-selected");
  }, [selectedImage]);

  // Re-snap the handle overlay whenever layout shifts.
  useEffect(() => {
    if (!selectedImage) return;
    const bump = () => setOverlayTick((t) => t + 1);
    const editor = editorRef.current;
    editor?.addEventListener("scroll", bump);
    window.addEventListener("resize", bump);
    window.addEventListener("scroll", bump, true);
    return () => {
      editor?.removeEventListener("scroll", bump);
      window.removeEventListener("resize", bump);
      window.removeEventListener("scroll", bump, true);
    };
  }, [selectedImage]);

  // Backspace / Delete with an image selected → remove the image.
  useEffect(() => {
    if (!selectedImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        selectedImage.remove();
        setSelectedImage(null);
        onChange(editorRef.current?.innerHTML ?? "");
      } else if (e.key === "Escape") {
        // Deselect on Esc instead of closing the page/modal.
        setSelectedImage(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedImage, onChange]);

  return (
    <div className="flex flex-col min-h-0 h-full">
      {!hideToolbar && (
        <div className="px-2 md:px-3 py-1.5 border-b border-white/[0.06] flex items-center gap-1 flex-wrap rounded-t-xl bg-white/[0.02]">
          <ToolbarButton
            icon="fa-solid fa-bold"
            label="Bold"
            onClick={() => exec("bold")}
          />
          <ToolbarButton
            icon="fa-solid fa-italic"
            label="Italic"
            onClick={() => exec("italic")}
          />
          <ToolbarButton
            icon="fa-solid fa-underline"
            label="Underline"
            onClick={() => exec("underline")}
          />
          <ToolbarSeparator />
          <ToolbarButton
            icon="fa-solid fa-heading"
            label="Heading"
            onClick={() => exec("formatBlock", "<h3>")}
          />
          <ToolbarButton
            icon="fa-solid fa-list-ul"
            label="Bullet list"
            onClick={() => exec("insertUnorderedList")}
          />
          <ToolbarButton
            icon="fa-solid fa-list-ol"
            label="Numbered list"
            onClick={() => exec("insertOrderedList")}
          />
          <ToolbarSeparator />
          <ToolbarButton
            icon="fa-solid fa-image"
            label="Insert image"
            onClick={() => fileInputRef.current?.click()}
          />
          <ToolbarButton
            icon="fa-solid fa-eraser"
            label="Clear formatting"
            onClick={() => exec("removeFormat")}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFile(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          data-placeholder={placeholder}
          onInput={(e) =>
            onChange((e.target as HTMLDivElement).innerHTML)
          }
          onMouseDown={handleEditorMouseDown}
          className={`notes-editor w-full flex-1 min-h-0 overflow-y-auto p-3.5 bg-white/[0.03] border border-white/10 focus:border-white/20 focus:outline-none text-[14px] text-white/90 leading-relaxed transition ${
            hideToolbar ? "rounded-xl" : "rounded-b-xl border-t-0"
          } ${className}`}
        />
        <ResizeOverlay
          key={overlayTick}
          image={selectedImage}
          editor={editorRef.current}
          onChange={() => onChange(editorRef.current?.innerHTML ?? "")}
          onCommit={() => setOverlayTick((t) => t + 1)}
        />
      </div>

      <style>{`
        .notes-editor:empty:before {
          content: attr(data-placeholder);
          color: rgb(var(--fg-rgb) / 0.35);
          pointer-events: none;
        }
        .notes-editor h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0.5em 0 0.25em;
        }
        .notes-editor ul,
        .notes-editor ol {
          padding-left: 1.4em;
          margin: 0.25em 0;
        }
        .notes-editor ul { list-style: disc; }
        .notes-editor ol { list-style: decimal; }
        .notes-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 0.5em 0;
          display: block;
          cursor: pointer;
        }
        .notes-editor img.is-selected {
          outline: 2px solid rgb(20 184 166);
          outline-offset: 2px;
        }
        .notes-editor a {
          color: #5eead4;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      title={label}
      aria-label={label}
      className="w-8 h-8 rounded-md flex items-center justify-center text-white/55 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
    >
      <i className={`${icon} text-[12px]`} />
    </button>
  );
}

function ToolbarSeparator() {
  return <span className="w-px h-5 bg-white/10 mx-1" aria-hidden />;
}

// Floating corner handles overlaid on the selected image; drag any
// corner to resize while preserving aspect ratio.
type ResizeOverlayProps = {
  image: HTMLImageElement | null;
  editor: HTMLDivElement | null;
  onChange: () => void;
  onCommit: () => void;
};

function ResizeOverlay({ image, editor, onChange, onCommit }: ResizeOverlayProps) {
  if (!image || !editor) return null;

  // Position the handles in the editor wrapper's local coordinate
  // space so they follow the image through scrolls and resizes.
  const wrapper = editor.parentElement;
  if (!wrapper) return null;
  const wrapperRect = wrapper.getBoundingClientRect();
  const imgRect = image.getBoundingClientRect();
  const top = imgRect.top - wrapperRect.top;
  const left = imgRect.left - wrapperRect.left;
  const width = imgRect.width;
  const height = imgRect.height;

  const startDrag = (
    corner: "nw" | "ne" | "sw" | "se",
    e: React.PointerEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = image.getBoundingClientRect().width;
    const aspect = image.naturalWidth / image.naturalHeight || 1;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const sign = corner === "ne" || corner === "se" ? 1 : -1;
      const next = Math.max(40, startWidth + sign * dx);
      image.style.width = `${Math.round(next)}px`;
      image.style.height = `${Math.round(next / aspect)}px`;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      onChange();
      onCommit();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const HANDLE = 12;
  const handleStyle = (
    corner: "nw" | "ne" | "sw" | "se",
  ): React.CSSProperties => {
    const cursor =
      corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize";
    const t =
      corner === "nw" || corner === "ne" ? top - HANDLE / 2 : top + height - HANDLE / 2;
    const l =
      corner === "nw" || corner === "sw"
        ? left - HANDLE / 2
        : left + width - HANDLE / 2;
    return {
      position: "absolute",
      top: t,
      left: l,
      width: HANDLE,
      height: HANDLE,
      cursor,
      touchAction: "none",
    };
  };

  return (
    <>
      {(["nw", "ne", "sw", "se"] as const).map((c) => (
        <span
          key={c}
          onPointerDown={(e) => startDrag(c, e)}
          style={handleStyle(c)}
          className="rounded-sm bg-teal-400 border border-white shadow-[0_0_0_2px_rgba(20,184,166,0.25)]"
          aria-label={`Resize image (${c})`}
        />
      ))}
    </>
  );
}
