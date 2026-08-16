"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, adminErrorMessage } from "@/lib/adminApi";
import { BadgePill, Btn, Card, EmptyState, ErrorState, SectionHeader, Spinner, TextInput, Toggle } from "../ui";

type LiveChallenge = {
  id: number;
  title: string;
  category: string;
  difficulty: string;
  visibility: string;
  basePoints: number;
};

export default function LiveControl() {
  const [challenges, setChallenges] = useState<LiveChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.get(`/admin/challenges?limit=1000`);
      setChallenges(res.data.challenges);
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleCategory = async (cat: string, publish: boolean) => {
    try {
      await adminApi.post(`/admin/challenges/bulk-visibility`, { category: cat, visibility: publish ? "live" : "draft" });
      toast.success(`${publish ? "Published" : "Unpublished"} category: ${cat}`);
      load();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  };

  const q = searchInput.trim().toLowerCase();
  const filtered = q
    ? challenges.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.difficulty.toLowerCase().includes(q)
      )
    : challenges;
  const categories = Array.from(new Set(filtered.map((c) => c.category)));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Live Control"
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
          placeholder="Search challenges by title, category or difficulty…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <Card title="Challenges by Category" subtitle="Publish or unpublish an entire category instantly">
        {loading ? (
          <Spinner label="Loading challenges" />
        ) : error ? (
          <ErrorState message={error} />
        ) : categories.length === 0 ? (
          <EmptyState title="No challenges found" />
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => {
              const inCat = filtered.filter((c) => c.category === cat);
              const published = inCat.length > 0 && inCat.every((c) => c.visibility === "live");
              return (
                <div key={cat} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-white text-sm capitalize">{cat}</span>
                      <BadgePill tone="secondary">{inCat.length}</BadgePill>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold ${published ? "text-success" : "text-muted"}`}>
                        {published ? "LIVE" : "DRAFT"}
                      </span>
                      <Toggle
                        checked={published}
                        onChange={(v) => toggleCategory(cat, v)}
                        label={published ? "Published" : "Unpublished"}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {inCat.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-void-2/40 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-white text-xs truncate">{c.title}</p>
                          <p className="text-[10px] text-muted capitalize">
                            {c.difficulty} · {c.basePoints} pts
                          </p>
                        </div>
                        <BadgePill tone={c.visibility === "live" ? "success" : c.visibility === "hidden" ? "warning" : "neutral"}>
                          {c.visibility}
                        </BadgePill>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
