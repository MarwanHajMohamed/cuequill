import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import TimezoneSelect, { type ITimezone } from "react-timezone-select";

const Account = () => {
  const { data: session, update } = useSession();
  const [firstname, setFirstname] = useState<string | undefined>(
    session?.user.firstname
  );
  const [surname, setSurname] = useState<string | undefined>(
    session?.user.surname
  );
  const [email, setEmail] = useState<string | undefined>(session?.user.email);

  const [selectedTimezone, setSelectedTimezone] = useState<ITimezone | null>(
    null
  );

  useEffect(() => {
    const tz =
      session?.user?.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone;

    setSelectedTimezone({
      value: tz,
      label: tz,
    });
  }, [session]);

  const handleTimezoneChange = async (tz: ITimezone) => {
    setSelectedTimezone(tz);
    const tzValue = typeof tz === "string" ? tz : tz.value;

    await fetch("/api/user/update-timezone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: tzValue }),
    });

    await update({ timezone: tzValue });
  };

  return (
    <div>
      {/* TOP SECTION */}
      <div className="md:m-8 m-5 flex flex-col gap-5 text-sm md:text-base">
        <div className="flex flex-col gap-1 w-60">
          <div className="text-sm">First Name</div>
          <input
            className="border border-[#262628] p-1 px-2 rounded-md hover:border-white"
            type="text"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1 w-60">
          <div className="text-sm">Surname</div>
          <input
            className="border border-[#262628] p-1 px-2 rounded-md hover:border-white"
            type="text"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1 w-60">
          <div className="text-sm">Email</div>
          <input
            className="border border-[#262628] p-1 px-2 rounded-md hover:border-white"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1 w-60">
          <div className="text-sm">Password</div>
          <input
            className="border border-[#262628] p-1 px-2 rounded-md hover:border-white"
            type="password"
          />
        </div>
      </div>
      <hr className="border-[#262628]" />
      {/* BOTTOM SECTION */}
      <div className="md:m-8 m-5 flex flex-col gap-5 text-sm md:text-base">
        <div className="flex flex-col gap-2 w-60">
          <div className="text-sm">Timezone</div>
          <TimezoneSelect
            value={selectedTimezone as string}
            onChange={handleTimezoneChange}
            styles={{
              control: (base, state) => ({
                ...base,
                backgroundColor: "transparent",
                color: "white",
                borderColor: state.isFocused ? "#3b82f6" : "#262628",
                boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
                "&:hover": {
                  borderColor: "white",
                  cursor: "pointer",
                },
              }),
              singleValue: (base) => ({
                ...base,
                color: "white",
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: "transparent",
                color: "white",
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused ? "#333" : "transparent",
                color: "white",
                cursor: "pointer",
              }),
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Account;
