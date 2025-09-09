import React, { useState } from "react";

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

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-[#0E0E10] p-10 flex flex-col gap-2 rounded-lg w-[500px] max-w-full">
        <div className="text-lg font-semibold flex items-center gap-2">
          <i className="fa-solid fa-book"></i>
          <div>Notes</div>
        </div>
        <div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            cols={30}
            rows={10}
            className="bg-[#1B1A1F] rounded w-full p-4 resize-none inset-shadow-sm"
          ></textarea>
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#16151C] transition duration-200 ease-in-out rounded hover:bg-gray-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
