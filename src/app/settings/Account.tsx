"use client";

import { useSession, signOut } from "next-auth/react";
import React, { useEffect, useMemo, useState } from "react";
import { GroupBase, InputProps, components } from "react-select";
import TimezoneSelect, { type ITimezone } from "react-timezone-select";
import ProTag from "@/components/ProTag";

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
    <span className="text-[11px] tracking-[0.08em] text-white/45 font-medium">
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

  // Danger zone: data export + account deletion.
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [dangerError, setDangerError] = useState<string | null>(null);

  const handleExport = async () => {
    setDangerError(null);
    setExporting(true);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error("Export failed. Please try again.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cuequill-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDangerError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteText !== "DELETE") return;
    setDangerError(null);
    setDeleting(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Deletion failed. Please try again.");
      }
      // Account is gone — sign out and return to the marketing site.
      await signOut({ callbackUrl: "/" });
    } catch (e) {
      setDangerError(e instanceof Error ? e.message : "Deletion failed.");
      setDeleting(false);
    }
  };

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
        {session?.user?.isPro && (
          <div>
            <ProTag />
          </div>
        )}
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
        <Field
          label="Timezone"
          hint="Trades and the calendar use this for display."
        >
          <TimezoneSelect
            value={selectedTimezone as string}
            onChange={handleTimezoneChange}
            components={{ Input: NoKeyboardInput }}
            // Render the menu in a body-level portal (fixed position) so it
            // isn't clipped by the settings card's height / overflow.
            menuPortalTarget={
              typeof document !== "undefined" ? document.body : undefined
            }
            menuPosition="fixed"
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
              // Sits above everything else once portalled to the body.
              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              menuList: (base) => ({ ...base, padding: 4 }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused
                  ? "rgb(var(--fg-rgb) / 0.06)"
                  : "transparent",
                // Theme-aware: readable in both light and dark. Selected row
                // gets the teal accent.
                color: state.isSelected
                  ? "var(--color-teal-400)"
                  : "rgb(var(--fg-rgb))",
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

      {/* Danger zone: data portability + account erasure. */}
      <section className="mt-4 flex flex-col gap-4 rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-4 md:p-5">
        <div>
          <h3 className="text-[14px] font-semibold text-white">Danger zone</h3>
          <p className="text-[12px] text-white/45 mt-0.5">
            Download everything we hold about you, or permanently delete your
            account.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer disabled:opacity-50"
          >
            <i
              className={`fa-solid ${
                exporting ? "fa-circle-notch animate-spin" : "fa-download"
              } text-[11px]`}
            />
            {exporting ? "Preparing…" : "Export my data"}
          </button>

          {!confirmDelete && (
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(true);
                setDangerError(null);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition text-[13px] font-medium cursor-pointer"
            >
              <i className="fa-solid fa-trash text-[11px]" />
              Delete account
            </button>
          )}
        </div>

        {confirmDelete && (
          <div className="flex flex-col gap-2.5 rounded-xl border border-red-500/25 bg-red-500/[0.05] p-3.5">
            <p className="text-[12.5px] text-white/70 leading-relaxed">
              This permanently deletes your account and{" "}
              <span className="text-white/90 font-medium">
                all your trades, strategies, goals, rules, and chats
              </span>
              . Any active subscription is cancelled. This cannot be undone.
              Type <span className="font-semibold text-red-300">DELETE</span> to
              confirm.
            </p>
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="DELETE"
              className="w-full max-w-[200px] px-3 py-2 rounded-lg bg-white/[0.03] border border-white/15 text-[14px] text-white placeholder:text-white/30 focus:border-red-400/50 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteText !== "DELETE" || deleting}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-red-500/90 text-white hover:bg-red-500 transition text-[13px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <i className="fa-solid fa-circle-notch animate-spin text-[11px]" />
                ) : (
                  <i className="fa-solid fa-trash text-[11px]" />
                )}
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  setDeleteText("");
                  setDangerError(null);
                }}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] transition text-[13px] font-medium cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {dangerError && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-red-300">
            <i className="fa-solid fa-triangle-exclamation text-[10px]" />{" "}
            {dangerError}
          </span>
        )}
      </section>
    </form>
  );
};

export default Account;
