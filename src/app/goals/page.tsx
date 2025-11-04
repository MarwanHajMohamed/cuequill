"use client";

import React, { useEffect, useState } from "react";
import { Goal } from "../types/Goal";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { handleAddGoal } from "./helpers";
import Goals from "./Goals";
import Statistics from "./Statistics";
import PreviousMonths from "./PreviousMonths";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

function FormInput({ label, name, placeholder, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="block text-sm mb-1">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        {...props}
        className={`w-full p-2 text-white bg-[#1A1A1D] rounded ${
          props.className || ""
        }`}
        autoComplete="off"
      />
    </div>
  );
}

export default function Page() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const today = new Date();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [goal, setGoal] = useState<string>("");

  useEffect(() => {
    const fetchGoals = async () => {
      if (!userId) return;

      const res = await fetch(
        `/api/goals?userId=${userId}&month=${today.getMonth()}&year=${today.getFullYear()}`
      );
      if (!res.ok) throw new Error("Failed to fetch goals");

      const data = await res.json();
      setGoals(data);
    };

    fetchGoals();
  }, [userId]);

  if (!userId) return "No user found";

  return (
    <>
      <div className="flex flex-col mt-30 items-center mx-10">
        <div className="flex justify-between w-full max-w-[1500px]">
          <Goals
            goals={goals}
            setGoals={setGoals}
            setIsModalOpen={setIsModalOpen}
          />
          <Statistics goals={goals} />
        </div>
        <div className="mt-10 w-full max-w-[1500px]">
          <PreviousMonths userId={userId} />
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-51">
          <div className="flex flex-col gap-4 bg-[#0F0F17] items-start p-6 rounded-xl w-120 text-white">
            <div>{format(today.toISOString(), "MMM yyyy")}</div>
            <FormInput
              name="goal"
              placeholder="Goal"
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
            <div className="flex gap-3 justify-end w-full">
              <button
                className="px-4 py-2 bg-[#16151C] transition duration-200 ease-in-out rounded hover:bg-gray-700 cursor-pointer"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 cursor-pointer"
                onClick={() =>
                  handleAddGoal(goal, userId, setGoal, setGoals, setIsModalOpen)
                }
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
