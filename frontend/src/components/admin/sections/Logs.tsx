"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FileText, ListTree, RefreshCw, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, adminErrorMessage } from "@/lib/adminApi";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  Btn,
  Card,
  EmptyState,
  ErrorState,
  Field,
  SectionHeader,
  Spinner,
  TableWrap,
  Td,
  TextInput,
  ConfirmBtn,
  fmtDate,
} from "../ui";

type LogFile = { name: string; size: number; mtime: string };

type ActivityEntry = {
  id: number;
  userId: number | null;
  action: string;
  ipAddress: string | null;
  createdAt: string;
  user: { id: number; username: string } | null;
};

type ActivityPage = {
  logs: ActivityEntry[];
  total: number;
};

export default function LogsSection() {
  const [tab, setTab] = useState<"activity" | "files">("activity");

  // ---- Activity log tab ----
  const [activity, setActivity] = useState<ActivityPage | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [ipFilter, setIpFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedAction = useDebouncedValue(actionFilter, 350);
  const debouncedIp = useDebouncedValue(ipFilter, 350);
  const [actLoading, setActLoading] = useState(true);
  const [actError, setActError] = useState<string | null>(null);

  // ---- Server files tab ----
  const [files, setFiles] = useState<LogFile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ name: string; totalLines: number } | null>(null);
  const [fileLoading, setFileLoading] = useState(true);
  const [fileError, setFileError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadActivity = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedAction) params.set("action", debouncedAction);
      if (debouncedIp) params.set("ip", debouncedIp);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());
      const res = await adminApi.get<ActivityPage>(`/admin/logs/activity?${params}`);
      setActivity(res.data);
      setActError(null);
    } catch (err) {
      setActError(adminErrorMessage(err));
    } finally {
      setActLoading(false);
    }
  }, [debouncedAction, debouncedIp, from, to]);

  // ---- Files tab plumbing (kept from previous implementation) ----
  const loadFiles = useCallback(async () => {
    try {
      const res = await adminApi.get<{ files: LogFile[] }>("/admin/logs");
      setFiles(res.data.files);
      setSelected((prev) => prev ?? res.data.files[0]?.name ?? null);
      setFileError(null);
    } catch (err) {
      setFileError(adminErrorMessage(err));
    } finally {
      setFileLoading(false);
    }
  }, []);

  const loadTail = useCallback(async () => {
    if (!selected) return;
    try {
      const params = new URLSearchParams({ file: selected });
      const res = await adminApi.get<{
        file: string;
        totalLines: number;
        lines: string[];
      }>(`/admin/logs/read?${params}`);
      setContent(res.data.lines.join("\n"));
      setMeta({ name: res.data.file, totalLines: res.data.totalLines });
    } catch (err) {
      setFileError(adminErrorMessage(err));
    }
  }, [selected]);

  useEffect(() => {
    if (tab !== "files") return;
    loadFiles();
  }, [tab, loadFiles]);

  useEffect(() => {
    if (tab !== "files") return;
    loadTail();
  }, [tab, loadTail]);

  // Auto-refresh whichever tab is visible.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (tab === "activity") loadActivity();
      else if (selected) loadTail();
    }, 5000);
    return () => window.clearInterval(id);
  }, [tab, selected, loadActivity, loadTail]);

  const wipeActivity = async () => {
    try {
      const res = await adminApi.delete("/admin/logs/activity");
      toast.success(res.data?.message ?? "Activity log wiped");
      await loadActivity();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  };

  const resetFilters = () => {
    setActionFilter("");
    setIpFilter("");
    setFrom("");
    setTo("");
  };

  const tabCls = (active: boolean) =>
    `inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-body text-xs font-semibold transition-all ${
      active
        ? "bg-primary/15 text-primary border-primary/30"
        : "border-white/10 bg-white/[0.02] text-muted hover:text-white hover:border-white/20"
    }`;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Logs Management"
        description="The activity log records every platform event except flag submissions (those live in the Submission Logs section)."
        actions={
          <>
            <div className="flex items-center gap-2">
              <button className={tabCls(tab === "activity")} onClick={() => setTab("activity")}>
                <ListTree className="w-3.5 h-3.5" /> Activity Log
              </button>
              <button className={tabCls(tab === "files")} onClick={() => setTab("files")}>
                <FileText className="w-3.5 h-3.5" /> Server Files
              </button>
            </div>
            <Btn size="sm" variant="outline" onClick={() => { loadActivity(); loadFiles(); }}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Btn>
          </>
        }
      />

      {tab === "activity" ? (
        <Card
          title="Platform activity"
          subtitle={activity ? `${activity.total} events recorded` : "Loading…"}
          actions={
            <ConfirmBtn onConfirm={wipeActivity} confirmText="WIPE" tone="danger">
              <Trash2 className="w-3.5 h-3.5" /> Wipe activity log
            </ConfirmBtn>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <Field label="Action contains">
              <TextInput value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} placeholder="e.g. register" />
            </Field>
            <Field label="IP address">
              <TextInput value={ipFilter} onChange={(e) => setIpFilter(e.target.value.replace(/[^0-9.:]/g, ""))} placeholder="e.g. 127.0.0.1" />
            </Field>
            <Field label="From">
              <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>

          <div className="flex items-center justify-end mb-3">
            <Btn size="sm" variant="ghost" onClick={resetFilters}>
              Clear filters
            </Btn>
          </div>

          {actLoading ? (
            <Spinner label="Loading activity log" />
          ) : actError ? (
            <ErrorState message={actError} />
          ) : !activity || activity.logs.length === 0 ? (
            <EmptyState
              title="No activity recorded yet"
              description="Registrations, logins, password changes, hint purchases and every administrator action will appear here in real time."
            />
          ) : (
            <>
              <TableWrap headers={["Time", "User", "Action", "IP"]}>
                {activity.logs.map((l) => (
                  <tr key={l.id}>
                    <Td className="whitespace-nowrap font-mono text-[11px] text-muted">{fmtDate(l.createdAt)}</Td>
                    <Td>
                      <span className="font-semibold text-white">{l.user?.username ?? "—"}</span>
                      {l.userId != null && !l.user && <span className="text-muted">#{l.userId}</span>}
                    </Td>
                    <Td className="font-mono text-[11px] text-ink">{l.action}</Td>
                    <Td className="whitespace-nowrap font-mono text-[11px] text-muted">{l.ipAddress ?? "—"}</Td>
                  </tr>
                ))}
              </TableWrap>
            </>
          )}
        </Card>
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <TextInput
              className="pl-9"
              placeholder="Filter log lines…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {fileLoading ? (
            <Spinner label="Scanning log directory" />
          ) : fileError ? (
            <ErrorState message={fileError} />
          ) : files.length === 0 ? (
            <EmptyState title="No log files found" description="Logs are written to LOG_DIR once the server starts handling traffic." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <Card title="Log files" className="lg:col-span-1" bodyClassName="p-2">
                <div className="space-y-1">
                  {files.map((f) => (
                    <button
                      key={f.name}
                      onClick={() => setSelected(f.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition ${
                        selected === f.name
                          ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                          : "border-transparent text-muted hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <p className="truncate font-mono">{f.name}</p>
                      <p className="text-[9px] text-muted mt-0.5">
                        {(f.size / 1024).toFixed(1)} KB · {new Date(f.mtime).toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              </Card>

              <Card
                className="lg:col-span-3"
                title={selected ? meta?.name ?? selected : "Log output"}
                subtitle={meta ? `${meta.totalLines} total lines · latest 500 shown` : undefined}
                bodyClassName="p-0"
              >
                {content === null ? (
                  <Spinner label="Streaming log lines" />
                ) : (
                  <pre className="p-4 font-mono text-[11px] leading-relaxed text-ink overflow-x-auto max-h-[60vh] whitespace-pre-wrap break-all">
                    {(() => {
                      const lines = (content ?? "").split("\n");
                      const visible = search ? lines.filter((l) => l.toLowerCase().includes(search.toLowerCase())) : lines;
                      return visible.length ? visible.join("\n") : "No lines match the current filter.";
                    })()}
                  </pre>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}