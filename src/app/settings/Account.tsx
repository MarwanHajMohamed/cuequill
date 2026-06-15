"use client";

import { useSession } from "next-auth/react";
import React, { useEffect, useMemo, useState } from "react";
import { GroupBase, InputProps, components } from "react-select";
import TimezoneSelect, { type ITimezone } from "react-timezone-select";

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <label className="flex flex-col gap-1.5 w-full max-w-xs">
    <span className="text-[11px] uppercase tracking-[0.15em] text-white/45 font-medium">
      {label}
    </span>
    {children}
    {hint && <span className="text-[11px] text-white/40">{hint}</span>}
  </label>
);

const inputClass =
  "w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[14px] text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none transition";

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const Account = () => {
  const { data: session, update } = useSession();

  // Identity
  const [firstname, setFirstname] = useState<string>("");
  const [surname, setSurname] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // Password (only sent if newPassword is non-empty)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [save, setSave] = useState<SaveState>({ kind: "idle" });

  // Timezone
  const [selectedTimezone, setSelectedTimezone] = useState<ITimezone | null>(
    null,
  );

  // Hydrate from session.
  useEffect(() => {
    if (!session?.user) return;
    setFirstname(session.user.firstname ?? "");
    setSurname(session.user.surname ?? "");
    setEmail(session.user.email ?? "");
    const tz =
      session.user.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    setSelectedTimezone({ value: tz, label: tz });
  }, [session]);

  // Has anything actually changed? Disable Save until something does.
  const identityDirty = useMemo(() => {
    if (!session?.user) return false;
    return (
      firstname !== (session.user.firstname ?? "") ||
      surname !== (session.user.surname ?? "") ||
      email !== (session.user.email ?? "")
    );
  }, [firstname, surname, email, session]);

  const passwordDirty = newPassword.length > 0;
  const dirty = identityDirty || passwordDirty;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty || save.kind === "saving") return;

    // Local validation before hitting the server.
    if (passwordDirty) {
      if (newPassword.length < 8) {
        setSave({
          kind: "error",
          message: "New password must be at least 8 characters.",
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        setSave({
          kind: "error",
          message: "New passwords don't match.",
        });
        return;
      }
      if (!currentPassword) {
        setSave({
          kind: "error",
          message: "Current password required to change password.",
        });
        return;
      }
    }

    setSave({ kind: "saving" });

    const body: Record<string, string> = {};
    if (firstname !== session?.user?.firstname) body.firstname = firstname;
    if (surname !== session?.user?.surname) body.surname = surname;
    if (email !== session?.user?.email) body.email = email;
    if (passwordDirty) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSave({
          kind: "error",
          message: data?.error ?? "Couldn't save changes.",
        });
        return;
      }
      // Propagate the new values into the JWT session so the navbar
      // avatar initial / greeting on the dashboard pick them up
      // without a refresh.
      if (identityDirty) {
        await update({
          firstname: data.firstname,
          surname: data.surname,
          email: data.email,
        });
      }
      // Clear password fields after a successful change.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSave({ kind: "success" });
      window.setTimeout(() => setSave({ kind: "idle" }), 2500);
    } catch {
      setSave({
        kind: "error",
        message: "Network error. Please try again.",
      });
    }
  };

  const handleReset = () => {
    if (!session?.user) return;
    setFirstname(session.user.firstname ?? "");
    setSurname(session.user.surname ?? "");
    setEmail(session.user.email ?? "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSave({ kind: "idle" });
  };

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

  const NoKeyboardInput = (
    props: InputProps<ITimezone, boolean, GroupBase<ITimezone>>,
  ) => <components.Input {...props} readOnly />;

  return (
    <form onSubmit={handleSave} className="p-5 md:p-7 flex flex-col gap-7">
      {/* Identity */}
      <section className="flex flex-col gap-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-teal-400/80 font-medium">
          Identity
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <Field label="First name">
            <input
              className={inputClass}
              type="text"
              autoComplete="given-name"
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
            />
          </Field>
          <Field label="Surname">
            <input
              className={inputClass}
              type="text"
              autoComplete="family-name"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              className={inputClass}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        </div>
      </section>

      <div className="h-px bg-white/10" />

      {/* Password */}
      <section className="flex flex-col gap-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-teal-400/80 font-medium">
          Password
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <Field label="Current password">
            <input
              className={inputClass}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <div className="hidden sm:block" />
          <Field label="New password" hint="At least 8 characters.">
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
        </div>
      </section>

      <div className="h-px bg-white/10" />

      {/* Locale */}
      <section className="flex flex-col gap-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-teal-400/80 font-medium">
          Locale
        </div>
        <Field
          label="Timezone"
          hint="Trades and the calendar use this for display."
        >
          <TimezoneSelect
            value={selectedTimezone as string}
            onChange={handleTimezoneChange}
            components={{ Input: NoKeyboardInput }}
            styles={{
              control: (base, state) => ({
                ...base,
                backgroundColor: "rgb(var(--fg-rgb) / 0.03)",
                borderColor: state.isFocused
                  ? "rgb(var(--fg-rgb) / 0.25)"
                  : "rgb(var(--fg-rgb) / 0.10)",
                borderRadius: 12,
                minHeight: 40,
                boxShadow: "none",
                color: "rgb(var(--fg-rgb))",
                "&:hover": {
                  borderColor: "rgb(var(--fg-rgb) / 0.20)",
                  cursor: "pointer",
                },
              }),
              singleValue: (base) => ({
                ...base,
                color: "rgb(var(--fg-rgb))",
                fontSize: 14,
              }),
              input: (base) => ({ ...base, color: "rgb(var(--fg-rgb))" }),
              menu: (base) => ({
                ...base,
                backgroundColor: "var(--surface-2)",
                border: "1px solid rgb(var(--fg-rgb) / 0.10)",
                borderRadius: 12,
                color: "rgb(var(--fg-rgb))",
                overflow: "hidden",
              }),
              menuList: (base) => ({ ...base, padding: 4 }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused
                  ? "rgb(var(--fg-rgb) / 0.06)"
                  : "transparent",
                color: state.isSelected ? "var(--color-teal-400)" : "white",
                fontSize: 13,
                cursor: "pointer",
                borderRadius: 8,
              }),
            }}
          />
        </Field>
      </section>

      {/* Footer */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={!dirty || save.kind === "saving"}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition text-[13px] font-medium ${
            !dirty || save.kind === "saving"
              ? "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
              : "bg-teal-500/15 text-teal-300 border-teal-500/25 hover:bg-teal-500/25 cursor-pointer"
          }`}
        >
          {save.kind === "saving" ? (
            <i className="fa-solid fa-circle-notch text-[11px] animate-spin" />
          ) : (
            <i className="fa-solid fa-floppy-disk text-[11px]" />
          )}
          {save.kind === "saving" ? "Saving…" : "Save changes"}
        </button>
        {dirty && save.kind !== "saving" && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer"
          >
            Discard
          </button>
        )}
        {save.kind === "success" && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-green-300">
            <i className="fa-solid fa-check text-[10px]" /> Saved
          </span>
        )}
        {save.kind === "error" && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-red-300">
            <i className="fa-solid fa-triangle-exclamation text-[10px]" />{" "}
            {save.message}
          </span>
        )}
      </div>
    </form>
  );
};

export default Account;
