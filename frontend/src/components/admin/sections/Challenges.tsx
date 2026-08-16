"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Lightbulb, Search, FileArchive, Upload, FileDown, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, adminErrorMessage } from "@/lib/adminApi";
import { downloadFromApi } from "@/lib/download";
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
  Select,
  Spinner,
  TextArea,
  TextInput,
} from "../ui";

type ChallengeRow = {
  id: number;
  title: string;
  category: string;
  difficulty: string;
  basePoints: number;
  bloodPoints: number;
  isDynamic: boolean;
  visibility: string;
  description: string;
  tags: string[];
  hints: { id: number; content: string; cost: number }[];
  solveCount: number;
  attempts: number;
  createdAt: string;
};

const DIFFICULTIES = ["easy", "medium", "hard", "insane"];
const FLAG_PATTERN = /^CGS\{[\s\S]+\}$/;

function isValidFlag(flag: string): boolean {
  return FLAG_PATTERN.test(flag.trim());
}

export default function ChallengesSection() {
  const [rows, setRows] = useState<ChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ChallengeRow | null>(null);
  const [hintChallenge, setHintChallenge] = useState<ChallengeRow | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [assetChallenge, setAssetChallenge] = useState<ChallengeRow | null>(null);
  const [assetOpen, setAssetOpen] = useState(false);
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
      const url = `/admin/challenges?limit=1000${search ? `&search=${encodeURIComponent(search)}` : ""}`;
      const res = await adminApi.get(url);
      setRows(res.data.challenges);
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  // Live: challenge changes made elsewhere (including danger-zone wipes)
  // refresh this catalog instantly.
  useEffect(() => {
    const off = connectAdminEvents((event) => {
      if (event === "challenges.refresh") load();
    });
    return off;
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

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Challenge Management"
        actions={
          <Btn size="sm" variant="outline" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Btn>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <TextInput
          className="pl-9"
          placeholder="Search title or category…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <Card title={editing ? `Edit — ${editing.title}` : "New Challenge"} subtitle={editing ? "Update this challenge" : "Add a challenge to the platform"}>
        <ChallengeForm challenge={editing} onSaved={load} onCancel={editing ? () => setEditing(null) : undefined} />
      </Card>

      <Card title="Challenges" subtitle={`${rows.length} challenges on the platform`}>
        {loading ? (
          <Spinner label="Loading challenges" />
        ) : error ? (
          <ErrorState message={error} />
        ) : rows.length === 0 ? (
          <EmptyState title="No challenges yet" description="Create your first challenge using the form above." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map((c) => (
              <div
                key={c.id}
                className="group relative glass-panel rounded-2xl border border-white/10 p-4 overflow-hidden transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5"
              >
                <i aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/60 via-violet/50 to-secondary/60 opacity-60" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-white text-sm truncate">{c.title}</p>
                     <p className="text-[10px] text-muted mt-1">
                       #{c.id} · {c.difficulty}
                     </p>
                  </div>
                  <BadgePill tone={c.visibility === "live" ? "success" : c.visibility === "hidden" ? "warning" : "neutral"}>
                    {c.visibility}
                  </BadgePill>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <BadgePill tone="secondary">{c.category}</BadgePill>
                  <span className="font-mono text-xs text-white font-bold">{c.basePoints} pts</span>
                  <span className="font-mono text-[10px] text-primary font-semibold">{c.bloodPoints} BP</span>
                </div>
                <div className="mt-2">
                  <p className="font-mono text-[11px] text-white">
                    {c.solveCount}
                    <span className="text-muted">/{c.attempts}</span> solves
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
                  <Btn size="sm" variant="ghost" disabled={busyId === c.id} onClick={() => setEditing(c)}>
                    Edit
                  </Btn>
                  <Btn size="sm" variant="ghost" disabled={busyId === c.id} onClick={() => { setHintChallenge(c); setHintOpen(true); }}>
                    <Lightbulb className="w-3 h-3" /> Hints
                  </Btn>
                  <Btn size="sm" variant="ghost" disabled={busyId === c.id} onClick={() => { setAssetChallenge(c); setAssetOpen(true); }}>
                    <FileArchive className="w-3 h-3" /> Assets
                  </Btn>
                  <ConfirmBtn
                    disabled={busyId === c.id}
                    onConfirm={() => runOn(c.id, () => adminApi.delete(`/admin/challenges/${c.id}`), "Challenge deleted")}
                    confirmText="Delete challenge"
                  >
                    Delete
                  </ConfirmBtn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <HintsModal open={hintOpen} onClose={() => setHintOpen(false)} challenge={hintChallenge} onSaved={load} />
      <AssetsModal open={assetOpen} onClose={() => setAssetOpen(false)} challenge={assetChallenge} onSaved={load} />
    </div>
  );
}

function ChallengeForm({
  challenge,
  onSaved,
  onCancel,
}: {
  challenge: ChallengeRow | null;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("misc");
  const [difficulty, setDifficulty] = useState("easy");
  const [basePoints, setBasePoints] = useState(100);
  const [bloodPointsInput, setBloodPointsInput] = useState("");
  const [description, setDescription] = useState("");
  const [flag, setFlag] = useState("");
  const [hintsText, setHintsText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!challenge) {
      setTitle("");
      setCategory("misc");
      setDifficulty("easy");
      setBasePoints(100);
      setBloodPointsInput("");
      setDescription("");
      setFlag("");
      setHintsText("");
      setPendingFiles([]);
      return;
    }
    setTitle(challenge.title);
    setCategory(challenge.category);
    setDifficulty(challenge.difficulty);
    setBasePoints(challenge.basePoints);
    setBloodPointsInput(String(challenge.bloodPoints));
    setDescription(challenge.description);
    setFlag("");
    setHintsText("");
    setPendingFiles([]);
  }, [challenge]);

  const uploadNow = async (files: File[], challengeId: number) => {
    setUploading(true);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        await adminApi.post(`/admin/challenges/${challengeId}/attachments`, form, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        });
      }
      toast.success(`${files.length} asset(s) uploaded`);
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const onPickFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    if (challenge) {
      void uploadNow(files, challenge.id);
    } else {
      setPendingFiles((prev) => [...prev, ...files]);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedFlag = flag.trim();
    if (!challenge && !trimmedFlag) {
      toast.error("A flag in the format CGS{...} is required");
      return;
    }
    if (trimmedFlag && !isValidFlag(trimmedFlag)) {
      toast.error("Flag must follow the format CGS{...}");
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        title,
        category,
        difficulty,
        basePoints,
        description,
      };
      const bloodValue = bloodPointsInput.trim() === "" ? null : Number(bloodPointsInput);
      if (bloodValue !== null) payload.bloodPoints = bloodValue;
      if (trimmedFlag) payload.flag = trimmedFlag;
      if (challenge) {
        await adminApi.patch(`/admin/challenges/${challenge.id}`, payload);
        toast.success("Challenge updated");
      } else {
        const res = await adminApi.post("/admin/challenges", payload);
        toast.success("Challenge created");
        const newId = (res.data as { id: number }).id;
        const hintLines = hintsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        for (const line of hintLines) {
          try {
            await adminApi.post(`/admin/challenges/${newId}/hints`, { content: line, cost: 10 });
          } catch {
            /* ignore individual hint failures */
          }
        }
        if (pendingFiles.length > 0) {
          await uploadNow(pendingFiles, newId);
          setPendingFiles([]);
        }
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={128} />
        </Field>
        <Field label="Category">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={["crypto", "web", "forensics", "osint", "reversing", "misc", "pwn"].map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Field label="Difficulty">
          <Select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            options={DIFFICULTIES.map((d) => ({ value: d, label: d }))}
          />
        </Field>
        <Field label="Base points">
          <TextInput type="number" min={1} value={basePoints} onChange={(e) => setBasePoints(Number(e.target.value))} required />
        </Field>
        <Field label="Blood points" hint="Bonus awarded to the first solver. Blank = same as base points.">
          <TextInput
            type="number"
            min={0}
            value={bloodPointsInput}
            onChange={(e) => setBloodPointsInput(e.target.value)}
            placeholder={String(basePoints)}
          />
        </Field>
        <Field label="Flag" hint={challenge ? "Leave blank to keep the current flag" : "Required format: CGS{...}"}>
          <TextInput value={flag} onChange={(e) => setFlag(e.target.value)} required={!challenge} placeholder="CGS{...}" />
        </Field>
      </div>
      <Field label="Description" hint="Markdown supported">
        <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      {!challenge && (
        <Field label="Hints" hint="One hint per line. Created automatically after the challenge is saved.">
          <TextArea value={hintsText} onChange={(e) => setHintsText(e.target.value)} placeholder={"Each hint on a new line…"} />
        </Field>
      )}
      <Field
        label="Assets"
        hint={challenge ? "Upload challenge files — they appear on the challenge page instantly." : "Select files now; they are uploaded right after the challenge is created."}
      >
        <div className="space-y-2">
          <button
            type="button"
            disabled={uploading || busy}
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] px-4 py-4 text-xs text-muted hover:border-secondary/40 hover:text-white transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-secondary" />}
            {uploading ? "Uploading…" : "Click to choose asset files"}
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => { onPickFiles(e.target.files); e.target.value = ""; }}
          />
          {pendingFiles.length > 0 && (
            <div className="space-y-1">
              {pendingFiles.map((f) => (
                <div key={f.name} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-void-2/40 px-3 py-1.5">
                  <span className="flex items-center gap-2 min-w-0">
                    <FileArchive className="w-3.5 h-3.5 text-warning shrink-0" />
                    <span className="text-[11px] text-white truncate">{f.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingFiles((prev) => prev.filter((x) => x !== f))}
                    className="text-[10px] text-muted hover:text-primary"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Field>
      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Btn type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Btn>
        )}
        <Btn type="submit" size="sm" disabled={busy}>
          {challenge ? "Save changes" : "Create challenge"}
        </Btn>
      </div>
    </form>
  );
}

function HintsModal({
  open,
  onClose,
  challenge,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  challenge: ChallengeRow | null;
  onSaved: () => void;
}) {
  const [hintText, setHintText] = useState("");
  const [cost, setCost] = useState(10);
  const [busy, setBusy] = useState(false);

  const addHint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    try {
      await adminApi.post(`/admin/challenges/${challenge.id}/hints`, { content: hintText, cost });
      toast.success("Hint added");
      setHintText("");
      setCost(10);
      onSaved();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteHint = async (hintId: number) => {
    if (!challenge) return;
    try {
      await adminApi.delete(`/admin/challenges/${challenge.id}/hints/${hintId}`);
      toast.success("Hint removed");
      onSaved();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={challenge ? `Hints — ${challenge.title}` : "Hints"} subtitle="Paid hints visible to competitors">
      {challenge && (
        <div className="space-y-4">
          <div className="space-y-2">
            {challenge.hints.length === 0 ? (
              <p className="text-xs text-muted py-2">No hints yet.</p>
            ) : (
              challenge.hints.map((h) => (
                <div key={h.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <div>
                    <p className="text-xs text-white">{h.content}</p>
                    <p className="text-[10px] text-muted mt-0.5">Cost: {h.cost} pts</p>
                  </div>
                  <ConfirmBtn onConfirm={() => deleteHint(h.id)} confirmText="Remove hint">
                    Remove
                  </ConfirmBtn>
                </div>
              ))
            )}
          </div>
          <form onSubmit={addHint} className="border-t border-white/10 pt-4 space-y-3">
            <Field label="New hint text">
              <TextInput value={hintText} onChange={(e) => setHintText(e.target.value)} required placeholder="Hint content…" />
            </Field>
            <div className="flex items-end justify-between gap-3">
              <Field label="Cost (points)">
                <TextInput
                  type="number"
                  min={0}
                  className="w-28"
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                />
              </Field>
              <Btn type="submit" size="sm" disabled={busy}>
                Add hint
              </Btn>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}

type AssetItem = { name: string; filename: string; size: number };

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function AssetsModal({
  open,
  onClose,
  challenge,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  challenge: ChallengeRow | null;
  onSaved: () => void;
}) {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAssets = useCallback(async () => {
    if (!challenge) return;
    setLoading(true);
    try {
      const res = await adminApi.get<{ challenge: { attachments: AssetItem[] } }>(`/admin/challenges/${challenge.id}`);
      setAssets(res.data.challenge.attachments ?? []);
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [challenge]);

  useEffect(() => {
    if (open && challenge) {
      setAssets([]);
      void loadAssets();
    }
  }, [open, challenge, loadAssets]);

  const uploadFiles = async (files: FileList | File[]) => {
    if (!challenge || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        await adminApi.post(`/admin/challenges/${challenge.id}/attachments`, form, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        });
      }
      toast.success(`${files.length} asset(s) uploaded`);
      onSaved();
      await loadAssets();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const removeAsset = async (filename: string) => {
    if (!challenge) return;
    try {
      await adminApi.delete(`/admin/challenges/${challenge.id}/attachments/${encodeURIComponent(filename)}`);
      toast.success("Asset removed");
      onSaved();
      setAssets((prev) => prev.filter((a) => a.filename !== filename));
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  };

  const downloadAsset = async (a: AssetItem) => {
    if (!challenge || downloading !== null) return;
    setDownloading(a.filename);
    try {
      await downloadFromApi(
        adminApi,
        `/admin/challenges/${challenge.id}/attachments/${encodeURIComponent(a.filename)}`,
        a.name
      );
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={challenge ? `Assets — ${challenge.title}` : "Assets"} subtitle="Files competitors can download from the challenge page" wide>
      {challenge && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files); }}
              className={`flex-1 rounded-xl border-2 border-dashed px-5 py-7 text-center transition-colors disabled:opacity-50 ${
                dragOver ? "border-secondary/60 bg-secondary/10" : "border-white/15 bg-white/[0.02] hover:border-secondary/40"
              }`}
            >
              <Upload className="w-5 h-5 mx-auto text-secondary mb-2" />
              <p className="text-xs text-white font-semibold">{busy ? "Uploading…" : "Click to choose or drop files here"}</p>
              <p className="text-[10px] text-muted mt-1">One or more files · each up to 25 MB</p>
              <input
                ref={fileRef}
                type="file"
                multiple
                hidden
                onChange={(e) => { if (e.target.files) void uploadFiles(e.target.files); e.target.value = ""; }}
              />
            </button>
          </div>

          <div className="space-y-2">
            {loading ? (
              <Spinner label="Loading assets" />
            ) : assets.length === 0 ? (
              <p className="text-xs text-muted py-3">No assets yet — upload the challenge files above.</p>
            ) : (
              assets.map((a) => (
                <div key={a.filename} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileArchive className="w-4 h-4 text-warning shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-white truncate">{a.name}</p>
                      <p className="text-[10px] text-muted">{fmtSize(a.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void downloadAsset(a)}
                      disabled={downloading !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-secondary/30 bg-secondary/10 text-secondary text-[10px] font-semibold uppercase tracking-wider hover:bg-secondary/20 disabled:opacity-60 disabled:cursor-wait"
                    >
                      {downloading === a.filename ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <FileDown className="w-3 h-3" />
                      )}
                      Download
                    </button>
                    <ConfirmBtn onConfirm={() => removeAsset(a.filename)} confirmText="Remove asset">
                      <Trash2 className="w-3 h-3" />
                    </ConfirmBtn>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
