"use client";

import { AlertTriangle, Bot, Check, ExternalLink, X, XCircle } from "lucide-react";
import { reconciliationIssueId, type FinancialWorkbookResult } from "@/lib/financial-workbook";

type Statement = "income" | "balance" | "cashflow";

export function ReconciliationDialog({ open, report, resolved, onResolve, onGoTo, onApply, onDiscard, onAskAgent, onClose }: { open: boolean; report: FinancialWorkbookResult | null; resolved: Set<string>; onResolve: (id: string) => void; onGoTo: (statement: Statement) => void; onApply: () => void; onDiscard: () => void; onAskAgent: () => void; onClose: () => void }) {
  if (!open || !report) return null;
  const unresolved = report.issues.filter((issue, index) => issue.severity === "error" && !resolved.has(reconciliationIssueId(issue, index))).length;
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
    <div className="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-md border border-line bg-panel shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between border-b border-line p-5"><div><p className="text-base font-semibold">Reconcile imported statements</p><p className="mt-1 text-xs text-zinc-500">Review the staged workbook, correct its cells, and resolve every blocking finding before applying it.</p></div><button onClick={onClose} aria-label="Close reconciliation"><X size={17} className="text-zinc-500" /></button></div>
      <div className="flex items-center justify-between border-b border-line bg-ink/30 px-5 py-3 text-xs"><span className="text-zinc-400">{report.months[0]} through {report.months.at(-1)}</span><span className={unresolved ? "text-red-400" : "text-acid"}>{unresolved ? `${unresolved} unresolved` : "Ready to apply"}</span></div>
      <div className="scrollbar overflow-y-auto p-5">
        {report.issues.length === 0 ? <div className="flex items-center gap-2 text-sm text-zinc-300"><Check size={16} className="text-acid" /> No reconciliation findings.</div> : <div className="space-y-3">{report.issues.map((issue, index) => {
          const id = reconciliationIssueId(issue, index);
          const isResolved = resolved.has(id);
          return <div key={id} className={`rounded border p-4 ${isResolved ? "border-acid/30 bg-acid/[.035]" : issue.severity === "error" ? "border-red-400/30 bg-red-500/[.035]" : "border-amber-500/25 bg-amber-500/[.025]"}`}>
            <div className="flex items-start gap-3">{issue.severity === "error" ? <XCircle size={16} className={`mt-0.5 shrink-0 ${isResolved ? "text-acid" : "text-red-400"}`} /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{issue.statement ?? "Workbook"}</span>{issue.month && <span className="font-mono text-xs text-zinc-400">{issue.month}</span>}</div><p className={`mt-1 text-sm ${isResolved ? "text-zinc-500 line-through" : "text-zinc-300"}`}>{issue.message}</p><div className="mt-3 flex flex-wrap gap-2">{issue.statement && <button onClick={() => onGoTo(issue.statement!)} className="button-ghost !h-8 !px-3 text-xs">Open statement <ExternalLink size={12} /></button>}{issue.severity === "error" && <button onClick={() => onResolve(id)} className={`!h-8 rounded border px-3 text-xs ${isResolved ? "border-acid/30 text-acid" : "border-line text-zinc-300 hover:border-zinc-500"}`}>{isResolved ? "Resolved" : "Mark resolved"}</button>}</div></div></div>
          </div>;
        })}</div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4"><button onClick={onDiscard} className="text-xs text-zinc-500 hover:text-red-400">Discard import</button><div className="flex flex-wrap gap-2"><button onClick={onAskAgent} className="button-ghost !h-9 text-xs"><Bot size={14} /> Ask Financial Agent</button><button onClick={onClose} className="button-ghost !h-9 text-xs">Continue editing</button><button onClick={onApply} disabled={unresolved > 0} className="button-primary !h-9 text-xs disabled:cursor-not-allowed disabled:opacity-40"><Check size={14} /> Apply statements</button></div></div>
    </div>
  </div>;
}
