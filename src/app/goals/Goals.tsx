"use client";

import React, { useState } from "react";
import { Goal } from "../types/Goal";
import {
  handleDeleteGoal,
  handleSaveEdit,
  handleToggleComplete,
} from "./helpers";

export default function Goals({
  goals,
  setGoals,
  setIsModalOpen,
}: {
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [tempGoalValue, setTempGoalValue] = useState<string>("");

  return (
    <div className="flex flex-col gap-3 items-start w-full">
      <div className="text-xl">Goals this month</div>
      <div className="flex flex-col gap-1 w-full">
        {goals.length === 0 ? (
          <div className="text-sm text-gray-400">
            You haven&apos;t added any goals this month. <br /> Add a new goal
            using the button below.
          </div>
        ) : (
          goals.map((goal) => (
            <div key={goal._id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={goal.complete}
                onChange={() =>
                  handleToggleComplete(goal._id, !goal.complete, setGoals)
                }
                className="w-4 h-4 rounded border border-[#302F34] bg-[#302F34] 
                        cursor-pointer transition-colors duration-200"
              />

              {editingGoalId === goal._id ? (
                <>
                  <input
                    type="text"
                    value={tempGoalValue}
                    style={{
                      width: `${Math.max(tempGoalValue.length + 2, 10)}ch`,
                    }}
                    className="bg-[#1A1A1D] p-2 rounded text-white transition-all duration-150"
                    onChange={(e) => setTempGoalValue(e.target.value)}
                    autoFocus
                  />
                  <button
                    className="text-xs px-3 py-1 bg-green-600 rounded cursor-pointer hover:bg-green-700"
                    onClick={() =>
                      handleSaveEdit(
                        goal._id,
                        tempGoalValue,
                        setTempGoalValue,
                        setGoals,
                        setEditingGoalId
                      )
                    }
                  >
                    Save
                  </button>
                  <button
                    className="text-xs px-3 py-1 bg-gray-700 rounded cursor-pointer hover:bg-gray-800"
                    onClick={() => {
                      setEditingGoalId(null);
                      setTempGoalValue("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="text-xs px-2 py-1 bg-red-700 rounded cursor-pointer hover:bg-red-800"
                    onClick={() => handleDeleteGoal(goal._id, setGoals)}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </>
              ) : (
                <input
                  type="text"
                  value={goal.goal}
                  readOnly
                  style={{
                    width: `${Math.max(goal.goal.length + 2, 10)}ch`,
                  }}
                  className="bg-transparent p-2 border-none outline-none text-white 
                        cursor-text transition-all duration-200 hover:bg-[#1A1A1D]"
                  onClick={() => {
                    setEditingGoalId(goal._id);
                    setTempGoalValue(goal.goal);
                  }}
                />
              )}
            </div>
          ))
        )}
      </div>
      <button
        className="text-xs border border-green-500 bg-green-500/20 p-2 rounded-lg 
                flex gap-2 items-center cursor-pointer
                transition duration-100 hover:bg-green-500/50"
        onClick={() => setIsModalOpen(true)}
      >
        + Add new goal
      </button>
    </div>
  );
}
