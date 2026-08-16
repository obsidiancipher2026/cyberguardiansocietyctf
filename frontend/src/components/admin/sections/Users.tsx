"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Ban,
  CheckCircle2,
  KeyRound,
  Pencil,
  RefreshCw,
  Search,
  ShieldOff,
  Trash2,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, adminErrorMessage } from "@/lib/adminApi";
import { connectAdminEvents } from "@/lib/adminRealtime";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  BadgePill,
  Btn,
  Card,
  ConfirmBtn,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  SectionHeader,
  Spinner,
  TableWrap,
  Td,
  TextInput,
  fmtDate,
} from "../ui";

type UserRow = {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  university: string | null;
  country: string | null;
  role: string;
  isVerified: boolean;
  isApproved: boolean;
  isBanned: boolean;
  banReason: string | null;
  banExpiresAt: string | null;
  twoFAEnabled: boolean;
  team: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  stats: { attempts: number; solves: number; points: number };
};

export default function UsersSection() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [banUser, setBanUser] = useState<UserRow | null>(null);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput);

  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/admin/users?limit=1000${search ? `&search=${encodeURIComponent(search)}` : ""}`;
      const res = await adminApi.get(url);
      setRows(res.data.users);
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  const approveAll = async () => {
    try {
      const res = await adminApi.post(`/admin/users/approve-all`);
      toast.success(res.data.message || "All pending users approved");
      load();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  // Live: registrations, approvals, bans and edits refresh this roster instantly.
  useEffect(() => {
    const off = connectAdminEvents((event) => {
      if (event === "users.refresh") load();
    });
    return off;
  }, [load]);

  const action = async (fn: () => Promise<unknown>, successMsg: string) => {
    try {
      await fn();
      toast.success(successMsg);
      load();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  };

  const runOn = (id: number, fn: () => Promise<unknown>, msg: string) => {
    setBusyId(id);
    action(fn, msg).finally(() => setBusyId(null));
  };

  const pendingCount = rows.filter((u) => !u.isApproved).length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="User Management"
        actions={
          <>
            <ConfirmBtn tone="success" disabled={loading || pendingCount === 0} onConfirm={approveAll} confirmText="Approve all pending users">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve All
            </ConfirmBtn>
            <Btn size="sm" variant="outline" onClick={load}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Btn>
          </>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <TextInput
          className="pl-9"
          placeholder="Search username, email, name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <Card>
        {loading ? (
          <Spinner label="Loading accounts" />
        ) : error ? (
          <ErrorState message={error} />
        ) : rows.length === 0 ? (
          <EmptyState title="No users found" />
        ) : (
          <>
            <TableWrap headers={["User", "Contact", "Status", "Last login", "Actions"]}>
              {rows.map((u) => (
                <tr key={u.id} className={u.isBanned ? "opacity-60" : ""}>
                  <Td>
                    <p className="font-semibold text-white">{u.username}</p>
                  </Td>
                  <Td className="max-w-[180px] truncate">
                    <p className="truncate">{u.email}</p>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <BadgePill tone={u.role === "admin" ? "danger" : "neutral"}>{u.role}</BadgePill>
                      {u.isBanned && <BadgePill tone="danger">banned</BadgePill>}
                    </div>
                  </Td>
                  <Td className="text-muted">{fmtDate(u.lastLoginAt)}</Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      {!u.isApproved && (
                        <>
                          <Btn
                            size="sm"
                            variant="success"
                            disabled={busyId === u.id}
                            onClick={() =>
                              runOn(u.id, () => adminApi.post(`/admin/users/${u.id}/approve`), "User approved — they can now sign in")
                            }
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </Btn>
                          <ConfirmBtn
                            tone="warning"
                            disabled={busyId === u.id}
                            onConfirm={() =>
                              runOn(u.id, () => adminApi.post(`/admin/users/${u.id}/reject`), "Registration rejected and account removed")
                            }
                            confirmText="Reject registration"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </ConfirmBtn>
                        </>
                      )}
                      {u.role !== "admin" && (
                        <Btn
                          size="sm"
                          variant="ghost"
                          disabled={busyId === u.id}
                          onClick={() => setEditUser(u)}
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Btn>
                      )}
                      {u.role === "admin" && (
                        <ConfirmBtn
                          tone="warning"
                          disabled={busyId === u.id}
                          onConfirm={() =>
                            runOn(u.id, () => adminApi.patch(`/admin/users/${u.id}/role`, { role: "user" }), "User demoted to standard role")
                          }
                          confirmText={`Demote ${u.username} to a standard user?`}
                        >
                          <ShieldOff className="w-3.5 h-3.5" /> Demote
                        </ConfirmBtn>
                      )}
                      <Btn
                        size="sm"
                        variant="ghost"
                        disabled={busyId === u.id}
                        onClick={() => setResetUser(u)}
                      >
                        <KeyRound className="w-3.5 h-3.5" /> Reset password
                      </Btn>
                      {u.isBanned ? (
                        <Btn
                          size="sm"
                          variant="ghost"
                          disabled={busyId === u.id}
                          onClick={() =>
                            runOn(u.id, () => adminApi.post(`/admin/users/${u.id}/unban`), "Ban lifted")
                          }
                        >
                          Unban
                        </Btn>
                      ) : (
                        <Btn
                          size="sm"
                          variant="danger"
                          disabled={busyId === u.id}
                          onClick={() => setBanUser(u)}
                        >
                          <Ban className="w-3.5 h-3.5" /> Ban
                        </Btn>
                      )}
                      <ConfirmBtn
                        tone="danger"
                        disabled={busyId === u.id}
                        onConfirm={() =>
                          runOn(u.id, () => adminApi.delete(`/admin/users/${u.id}`), "User deleted")
                        }
                        confirmText="Delete user"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </ConfirmBtn>
                    </div>
                  </Td>
                </tr>
              ))}
            </TableWrap>
          </>
        )}
      </Card>

      <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSaved={() => load()} />
      <BanUserModal user={banUser} onClose={() => setBanUser(null)} onBanned={() => load()} />
      <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} onReset={() => load()} />
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setPassword("");
      setConfirmPassword("");
    }
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (password && password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!password && username === user.username) {
      toast.error("Nothing to change — enter a new username or password");
      return;
    }
    setBusy(true);
    try {
      await adminApi.patch(`/admin/users/${user.id}`, {
        username: username !== user.username ? username : undefined,
        password: password || undefined,
      });
      toast.success("User credentials updated");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={user ? `Edit ${user.username}` : ""}
      subtitle="Change the username and / or set a new password"
    >
      {user && (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Username">
            <TextInput
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
              required
              minLength={3}
              maxLength={20}
              autoFocus
            />
          </Field>
          <Field label="New password" hint="Leave blank to keep the current password">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password">
            <TextInput
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="new-password"
            />
          </Field>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Btn type="button" size="sm" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Btn>
            <Btn type="submit" size="sm" disabled={busy}>
              <Pencil className="w-3.5 h-3.5" /> Save changes
            </Btn>
          </div>
        </form>
      )}
    </Modal>
  );
}

function BanUserModal({
  user,
  onClose,
  onBanned,
}: {
  user: UserRow | null;
  onClose: () => void;
  onBanned: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) setReason("");
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!reason.trim()) {
      toast.error("A ban reason is required");
      return;
    }
    setBusy(true);
    try {
      await adminApi.post(`/admin/users/${user.id}/ban`, { reason: reason.trim() });
      toast.success(`${user.username} banned`);
      onBanned();
      onClose();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!user} onClose={onClose} title={user ? `Ban ${user.username}` : ""} subtitle="The account will be suspended immediately">
      {user && (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Ban reason">
            <TextInput
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. cheating / flag sharing"
              required
              autoFocus
            />
          </Field>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Btn type="button" size="sm" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Btn>
            <Btn type="submit" size="sm" variant="danger" disabled={busy}>
              <Ban className="w-3.5 h-3.5" /> Ban account
            </Btn>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ResetPasswordModal({
  user,
  onClose,
  onReset,
}: {
  user: UserRow | null;
  onClose: () => void;
  onReset: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setPassword("");
      setConfirmPassword("");
    }
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await adminApi.post(`/admin/users/${user.id}/reset-password`, { password });
      toast.success(`New password set for ${user.username} — their sessions were revoked`);
      onReset();
      onClose();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!user} onClose={onClose} title={user ? `Reset ${user.username}'s password` : ""} subtitle="Set a new passphrase — all existing sessions are revoked immediately">
      {user && (
        <form onSubmit={submit} className="space-y-4">
          <Field label="New password" hint="Minimum 8 characters">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="new-password"
              minLength={8}
              required
              autoFocus
            />
          </Field>
          <Field label="Confirm new password">
            <TextInput
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Btn type="button" size="sm" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Btn>
            <Btn type="submit" size="sm" disabled={busy}>
              <KeyRound className="w-3.5 h-3.5" /> Set new password
            </Btn>
          </div>
        </form>
      )}
    </Modal>
  );
}
