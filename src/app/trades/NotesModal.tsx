import React, { useEffect, useState } from "react";

type NotesModalProps = {
  onClose: () => void;
  onSave: (newNotes: string, tradeId: string) => void;
  notes: string;
  tradeId?: string;
};

export default function NotesModal({
  onClose,
  onSave,
  notes,
  tradeId,
}: NotesModalProps) {
  const [value, setValue] = useState(notes);

  const handleSave = () => {
    if (tradeId) {
      onSave(value, tradeId);
    }

    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] border border-white/10 rounded-2xl w-full max-w-md shadow-[0_24px_80px_rgba(0,0,0,0.55)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
          <i className="fa-solid fa-book text-white/60 text-[13px]" />
          <div className="text-[15px] font-semibold tracking-tight">Notes</div>
        </div>
        <div className="p-5">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={10}
            className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 focus:border-white/20 focus:outline-none text-[13px] text-white/90 placeholder:text-white/40 resize-none"
            placeholder="Write your notes…"
          />
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition text-[13px] font-medium cursor-pointer"
          >
            <i className="fa-solid fa-check text-[11px]" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
