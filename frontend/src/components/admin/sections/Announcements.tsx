"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Pin, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, adminErrorMessage } from "@/lib/adminApi";
import {
  BadgePill,
  Btn,
  Card,
  ConfirmBtn,
  EmptyState,
  ErrorState,
  Field,
  SectionHeader,
  Select,
  Spinner,
  TableWrap,
  Td,
  TextArea,
  TextInput,
  Toggle,
  fmtDate,
} from "../ui";

type AnnouncementRow = {
  id: number;
  title: string;
  content: string;
  contentPreview: string;
  audience: string;
  isPinned: boolean;
  publishedAt: string | null;
  createdAt: string;
};

export default function AnnouncementsSection() {
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.get(`/admin/announcements?limit=1000`);
      setRows(res.data.announcements);
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runOn = async (id: number, fn: () => Promise<unknown>, msg: string) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(msg);
      load();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = async (id: number) => {
    try {
      const res = await adminApi.get<{ announcement: AnnouncementRow }>(`/admin/announcements/${id}`);
      setEditing(res.data.announcement);
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Announcement Management"
        actions={
          <Btn size="sm" variant="outline" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Btn>
        }
      />

      <Card title={editing ? `Edit — ${editing.title}` : "New Announcement"} subtitle={editing ? "Update this announcement" : "Publish to participants"}>
        <AnnouncementForm
          announcement={editing}
          onSaved={load}
          onCancel={editing ? () => setEditing(null) : undefined}
        />
      </Card>

      <Card title="Announcements" subtitle={`${rows.length} total`}>
        {loading ? (
          <Spinner label="Loading announcements" />
        ) : error ? (
          <ErrorState message={error} />
        ) : rows.length === 0 ? (
          <EmptyState title="No announcements yet" />
        ) : (
          <TableWrap headers={["Title", "Audience", "Status", "Created", "Actions"]}>
            {rows.map((a) => (
              <tr key={a.id} className="transition-colors hover:bg-white/[0.02]">
                <Td className="max-w-[260px]">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    {a.isPinned && <Pin className="w-3 h-3 text-warning" />}
                    <span className="truncate">{a.title}</span>
                  </p>
                  <p className="text-[10px] text-muted truncate">{a.contentPreview}</p>
                </Td>
                <Td>
                  <BadgePill tone="secondary">{a.audience}</BadgePill>
                </Td>
                <Td>
                  <BadgePill tone={a.publishedAt ? "success" : "neutral"}>{a.publishedAt ? "published" : "draft"}</BadgePill>
                </Td>
                <Td className="text-muted">{fmtDate(a.createdAt)}</Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    {!a.publishedAt ? (
                      <Btn
                        size="sm"
                        variant="ghost"
                        disabled={busyId === a.id}
                        onClick={() => runOn(a.id, () => adminApi.patch(`/admin/announcements/${a.id}`, { publishedAt: new Date().toISOString() }), "Announcement published")}
                      >
                        Publish
                      </Btn>
                    ) : (
                      <Btn
                        size="sm"
                        variant="ghost"
                        disabled={busyId === a.id}
                        onClick={() => runOn(a.id, () => adminApi.patch(`/admin/announcements/${a.id}`, { publishedAt: null }), "Unpublished")}
                      >
                        Unpublish
                      </Btn>
                    )}
                    <Btn size="sm" variant="ghost" disabled={busyId === a.id} onClick={() => startEdit(a.id)}>
                      Edit
                    </Btn>
                    <ConfirmBtn
                      disabled={busyId === a.id}
                      onConfirm={() => runOn(a.id, () => adminApi.delete(`/admin/announcements/${a.id}`), "Announcement deleted")}
                      confirmText="Delete announcement"
                    >
                      Delete
                    </ConfirmBtn>
                  </div>
                </Td>
              </tr>
            ))}
          </TableWrap>
        )}
      </Card>
    </div>
  );
}

function AnnouncementForm({
  announcement,
  onSaved,
  onCancel,
}: {
  announcement: AnnouncementRow | null;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState("all");
  const [isPinned, setIsPinned] = useState(false);
  const [publishNow, setPublishNow] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!announcement) {
      setTitle("");
      setContent("");
      setAudience("all");
      setIsPinned(false);
      setPublishNow(true);
      return;
    }
    setTitle(announcement.title);
    setContent(announcement.content ?? "");
    setAudience(announcement.audience ?? "all");
    setIsPinned(announcement.isPinned ?? false);
    setPublishNow(Boolean(announcement.publishedAt));
  }, [announcement]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        title,
        content,
        audience,
        isPinned,
        publishAt: publishNow ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };
      if (announcement) {
        await adminApi.patch(`/admin/announcements/${announcement.id}`, payload);
        toast.success("Announcement updated");
      } else {
        await adminApi.post("/admin/announcements", payload);
        toast.success("Announcement created");
      }
      onSaved();
      if (onCancel) onCancel();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Title">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} required />
      </Field>
      <Field label="Body" hint="Markdown supported">
        <TextArea value={content} onChange={(e) => setContent(e.target.value)} required />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Audience">
          <Select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            options={[
              { value: "all", label: "Everyone" },
              { value: "teams", label: "Teams" },
              { value: "individuals", label: "Individuals" },
            ]}
          />
        </Field>
        <div className="flex flex-col gap-3 pt-6">
          <Toggle checked={isPinned} onChange={setIsPinned} label="Pin to top" />
          <Toggle checked={publishNow} onChange={setPublishNow} label="Publish immediately" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Btn type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Btn>
        )}
        <Btn type="submit" size="sm" disabled={busy}>
          {announcement ? "Save changes" : "Create announcement"}
        </Btn>
      </div>
    </form>
  );
}
