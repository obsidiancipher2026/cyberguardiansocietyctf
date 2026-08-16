"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
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
  SectionHeader,
  Spinner,
  TableWrap,
  Td,
  TextInput,
  fmtDate,
} from "../ui";

type SubmissionRow = {
  id: number;
  username: string;
  challenge: string;
  category: string | null;
  isCorrect: boolean;
  pointsAwarded: number;
  bloodPointsAwarded: number;
  ipAddress: string | null;
  createdAt: string;
};

export default function SubmissionsSection() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const url = `/admin/submissions${params.toString() ? `?${params}` : ""}`;
      const res = await adminApi.get(url);
      setRows(res.data.submissions);
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  // Live: every flag submission on the platform (correct, incorrect or bad
  // format) instantly refreshes this ledger.
  useEffect(() => {
    const off = connectAdminEvents((event) => {
      if (event === "submission") load();
    });
    return off;
  }, [load]);

  const remove = async (id: number) => {
    try {
      await adminApi.delete(`/admin/submissions/${id}`);
      toast.success("Submission removed");
      load();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Submission Logs"
        actions={
          <Btn size="sm" variant="outline" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Btn>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <TextInput
          className="pl-9 w-full sm:w-64 md:w-80 lg:w-96"
          placeholder="Search by IP, user, email or challenge…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <Card>
        {loading ? (
          <Spinner label="Loading submissions" />
        ) : error ? (
          <ErrorState message={error} />
        ) : rows.length === 0 ? (
          <EmptyState title="No submissions yet" />
        ) : (
          <>
            <TableWrap headers={["User", "Challenge", "Result", "Points", "IP Address", "When", "Actions"]}>
              {rows.map((s) => (
                <tr key={s.id}>
                  <Td className="font-semibold text-white">{s.username}</Td>
                  <Td>
                    <p className="truncate max-w-[160px]">{s.challenge}</p>
                    {s.category && <p className="text-[10px] text-muted">{s.category}</p>}
                  </Td>
                  <Td>
                    <BadgePill tone={s.isCorrect ? "success" : "danger"}>{s.isCorrect ? "Correct" : "Wrong"}</BadgePill>
                  </Td>
                  <Td className="font-mono">
                    {s.pointsAwarded}
                    {s.bloodPointsAwarded > 0 && <span className="text-primary font-bold"> +{s.bloodPointsAwarded} BP</span>}
                  </Td>
                  <Td>
                    <span className="font-mono text-[10px] text-muted">{s.ipAddress ?? "—"}</span>
                  </Td>
                  <Td className="text-muted">{fmtDate(s.createdAt)}</Td>
                  <Td>
                    <ConfirmBtn onConfirm={() => remove(s.id)} confirmText="Delete submission">
                      Delete
                    </ConfirmBtn>
                  </Td>
                </tr>
              ))}
            </TableWrap>
          </>
        )}
      </Card>
    </div>
  );
}
