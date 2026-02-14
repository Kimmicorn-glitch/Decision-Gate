"use client";

import { useMemo, useState } from "react";

import { AuditRecord, DecisionType } from "@/lib/types";

type AuditLogTableProps = {
  records: AuditRecord[];
  isLoading: boolean;
};

const pageSize = 8;

export default function AuditLogTable({ records, isLoading }: AuditLogTableProps) {
  const [decisionFilter, setDecisionFilter] = useState<DecisionType | "ALL">("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const actionTypes = useMemo(
    () => ["ALL", ...Array.from(new Set(records.map((r) => r.action_type)))],
    [records]
  );

  const filtered = useMemo(() => {
    const result = records.filter((item) => {
      const byDecision = decisionFilter === "ALL" || item.decision === decisionFilter;
      const byAction = actionFilter === "ALL" || item.action_type === actionFilter;
      return byDecision && byAction;
    });

    result.sort((a, b) => {
      const left = new Date(a.timestamp).getTime();
      const right = new Date(b.timestamp).getTime();
      return sortAsc ? left - right : right - left;
    });

    return result;
  }, [records, decisionFilter, actionFilter, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-sm font-semibold uppercase tracking-[0.24em] text-muted">
          Audit Log
        </h2>
        <select
          value={decisionFilter}
          onChange={(e) => {
            setDecisionFilter(e.target.value as DecisionType | "ALL");
            setPage(1);
          }}
          className="border border-line bg-slate-950/70 px-2 py-1 text-xs uppercase tracking-[0.08em]"
        >
          <option value="ALL">All Decisions</option>
          <option value="APPROVE">Approve</option>
          <option value="REVISE">Revise</option>
          <option value="BLOCK">Block</option>
        </select>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="border border-line bg-slate-950/70 px-2 py-1 text-xs uppercase tracking-[0.08em]"
        >
          {actionTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSortAsc((prev) => !prev)}
          className="border border-line px-2 py-1 text-xs uppercase tracking-[0.08em] text-muted"
        >
          {sortAsc ? "Oldest" : "Newest"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
              <th className="py-2">Audit ID</th>
              <th className="py-2">Timestamp</th>
              <th className="py-2">Decision</th>
              <th className="py-2">Action Type</th>
              <th className="py-2">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="py-3 text-muted" colSpan={5}>
                  Loading audit records...
                </td>
              </tr>
            )}
            {!isLoading && paged.length === 0 && (
              <tr>
                <td className="py-3 text-muted" colSpan={5}>
                  No audit records.
                </td>
              </tr>
            )}
            {!isLoading &&
              paged.map((row) => (
                <tr key={row.audit_id} className="border-b border-slate-800/70 text-text">
                  <td className="py-3 pr-2 font-mono text-xs">{row.audit_id}</td>
                  <td className="py-3 pr-2">{new Date(row.timestamp).toLocaleString()}</td>
                  <td className="py-3 pr-2">{row.decision}</td>
                  <td className="py-3 pr-2">{row.action_type}</td>
                  <td className="py-3 pr-2">{Math.round(row.confidence_score * 100)}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="border border-line px-2 py-1 text-xs text-muted disabled:opacity-40"
        >
          Prev
        </button>
        <span className="text-xs text-muted">
          Page {safePage} / {pageCount}
        </span>
        <button
          type="button"
          disabled={safePage >= pageCount}
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          className="border border-line px-2 py-1 text-xs text-muted disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </section>
  );
}
