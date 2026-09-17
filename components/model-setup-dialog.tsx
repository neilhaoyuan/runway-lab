"use client";

import { Download, FileSpreadsheet, FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { downloadFinancialWorkbook, parseFinancialWorkbook } from "@/lib/financial-workbook";
import { assumptionsFromHistory } from "@/lib/forecasting/opening";
import { overridesFor, useFinancialModel } from "./financial-model-provider";

export function ModelSetupDialog() {
  const model = useFinancialModel();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  if (!model.setupRequired) return null;

  async function upload(file: File) {
    setWorking(true);
    setMessage("Checking statements…");
    try {
      const report = await parseFinancialWorkbook(await file.arrayBuffer());
      const errors = report.issues.filter((issue) => issue.severity === "error");
      if (errors.length) {
        model.setPendingImport({ report, history: report.history });
        model.setResolvedImportIssues(new Set());
        model.continueSetupWithImport();
        router.push("/model");
        return;
      }
      const opened = assumptionsFromHistory(model.assumptions, report.history);
      model.setHistory(report.history);
      model.setAssumptions(opened);
      model.setOverrides(overridesFor(opened));
      model.completeCloudSetup();
      router.push("/model");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read that workbook.");
    } finally {
      setWorking(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function downloadTemplate() {
    try {
      await downloadFinancialWorkbook(model.history);
    } catch {
      setMessage("Could not create the workbook template.");
    }
  }

  return <div className="fixed inset-0 z-[75] grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
    <div className="w-full max-w-xl overflow-hidden rounded-md border border-line bg-panel shadow-2xl">
      <div className="border-b border-line p-6"><span className="mb-4 grid h-10 w-10 place-items-center rounded-md border border-line bg-ink"><FileSpreadsheet size={18} className="text-acid" /></span><h2 className="text-xl font-medium tracking-[-.025em]">Set up your financial model</h2><p className="mt-2 max-w-lg text-sm leading-6 text-zinc-500">Import at least 12 months of financial statements using the workbook structure below, or explore the workspace with sample data.</p></div>
      <div className="p-6">
        <div className="grid gap-2 border-b border-line pb-5 text-xs text-zinc-400 sm:grid-cols-2"><div><p className="font-medium text-zinc-300">Required sheets</p><p className="mt-1 leading-5">Income Statement<br />Balance Sheet</p></div><div><p className="font-medium text-zinc-300">Workbook periods</p><p className="mt-1 leading-5">12 matching monthly columns<br />Cash Flow is optional</p></div></div>
        <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><button disabled={working} onClick={() => fileRef.current?.click()} className="button-primary h-11 text-sm"><FileUp size={15} /> {working ? "Checking…" : "Upload completed template"}</button><button onClick={() => model.completeCloudSetup()} className="button-ghost h-11 text-sm">Use sample data</button></div>
        <button onClick={downloadTemplate} className="mt-3 flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-200"><Download size={13} /> Download XLSX template</button>
        {message && <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-zinc-400">{message}</p>}
      </div>
    </div>
  </div>;
}
