"use client";

import { CheckCircle2, Download, FileSpreadsheet, FileUp, RotateCcw, XCircle } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { forecast } from "@/lib/forecasting/engine";
import type { Assumptions, ForecastMonth, HistoricalMonth, ModelOverride } from "@/lib/forecasting/types";
import { money, monthLabel, percent } from "@/lib/format";
import { downloadFinancialWorkbook, parseFinancialWorkbook, type FinancialWorkbookResult } from "@/lib/financial-workbook";
import { assumptionsFromHistory } from "@/lib/forecasting/opening";
import { updateHistoricalActual, type HistoricalEditableKey } from "@/lib/forecasting/history-edit";
import { useFinancialModel } from "./financial-model-provider";
import { ReconciliationDialog } from "./reconciliation-dialog";

type InputKey = "revenue" | "payroll" | "cloud" | "marketing" | "software" | "other";
type ForecastDriver = ModelOverride;
type SheetMonth = HistoricalMonth & {
  status: "Actual" | "Forecast";
  revenueGrowth: number;
  totalExpenses: number;
  netCashFlow: number;
  endingCash: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  depreciation: number;
  netIncome: number;
  accountsReceivable: number;
  prepaids: number;
  fixedAssets: number;
  totalAssets: number;
  accountsPayable: number;
  accruedExpenses: number;
  debt: number;
  totalLiabilities: number;
  shareholdersEquity: number;
  liabilitiesAndEquity: number;
  openingCash: number;
  workingCapitalChange: number;
  capitalExpenditures: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netChangeCash: number;
};

type Statement = "income" | "balance" | "cashflow";
type SheetRow = { label: string; key: keyof SheetMonth; type: "money" | "percent"; input?: boolean; total?: boolean; section?: boolean };

const incomeRows: ReadonlyArray<SheetRow> = [
  { label: "Revenue", key: "revenue", type: "money", input: true },
  { label: "Revenue Growth", key: "revenueGrowth", type: "percent", input: true },
  { label: "Cost of Revenue", key: "cloud", type: "money", input: true },
  { label: "Gross Profit", key: "grossProfit", type: "money", total: true },
  { label: "Operating Expenses", key: "operatingExpenses", type: "money", section: true },
  { label: "Payroll", key: "payroll", type: "money", input: true },
  { label: "Marketing", key: "marketing", type: "money", input: true },
  { label: "Software", key: "software", type: "money", input: true },
  { label: "Other OpEx", key: "other", type: "money", input: true },
  { label: "Depreciation", key: "depreciation", type: "money" },
  { label: "Total Operating Expenses", key: "operatingExpenses", type: "money", total: true },
  { label: "Net Income", key: "netIncome", type: "money", total: true },
];

const balanceRows: ReadonlyArray<SheetRow> = [
  { label: "Assets", key: "totalAssets", type: "money", section: true },
  { label: "Cash", key: "endingCash", type: "money" },
  { label: "Accounts Receivable", key: "accountsReceivable", type: "money", input: true },
  { label: "Prepaid Expenses", key: "prepaids", type: "money" },
  { label: "Property & Equipment", key: "fixedAssets", type: "money" },
  { label: "Total Assets", key: "totalAssets", type: "money", total: true },
  { label: "Liabilities", key: "totalLiabilities", type: "money", section: true },
  { label: "Accounts Payable", key: "accountsPayable", type: "money", input: true },
  { label: "Accrued Expenses", key: "accruedExpenses", type: "money" },
  { label: "Debt", key: "debt", type: "money" },
  { label: "Total Liabilities", key: "totalLiabilities", type: "money", total: true },
  { label: "Shareholders' Equity", key: "shareholdersEquity", type: "money" },
  { label: "Liabilities & Equity", key: "liabilitiesAndEquity", type: "money", total: true },
];

const cashFlowRows: ReadonlyArray<SheetRow> = [
  { label: "Operating Activities", key: "operatingCashFlow", type: "money", section: true },
  { label: "Net Income", key: "netIncome", type: "money" },
  { label: "Depreciation", key: "depreciation", type: "money" },
  { label: "Change in Working Capital", key: "workingCapitalChange", type: "money" },
  { label: "Cash from Operations", key: "operatingCashFlow", type: "money", total: true },
  { label: "Capital Expenditures", key: "investingCashFlow", type: "money", input: true },
  { label: "Cash from Financing", key: "financingCashFlow", type: "money", input: true },
  { label: "Net Change in Cash", key: "netChangeCash", type: "money", total: true },
  { label: "Opening Cash", key: "openingCash", type: "money" },
  { label: "Ending Cash", key: "endingCash", type: "money", total: true },
];

const statementRows: Record<Statement, ReadonlyArray<SheetRow>> = { income: incomeRows, balance: balanceRows, cashflow: cashFlowRows };

function createDrivers(assumptions: Assumptions): ForecastDriver[] {
  const result = forecast(assumptions, 12);
  return result.months.map((month) => ({
    month: month.month,
    revenueGrowth: month.revenueGrowth,
    payroll: month.payroll,
    cloud: month.cloud,
    marketing: month.marketing,
    software: month.software,
    other: month.other,
    accountsReceivable: month.accountsReceivable,
    accountsPayable: month.accountsPayable,
    capitalExpenditures: month.capitalExpenditures,
    funding: month.funding,
  }));
}

function actualSheet(history: HistoricalMonth[]): SheetMonth[] {
  return history.map((month, index) => {
    const totalExpenses = month.payroll + month.cloud + month.marketing + month.software + month.other;
    const operatingExpenses = month.payroll + month.marketing + month.software + month.other;
    const netIncome = month.revenue - totalExpenses;
    const openingCash = index ? history[index - 1].cash : month.cash - netIncome;
    const netChangeCash = month.cash - openingCash;
    const accountsReceivable = month.accountsReceivable ?? month.revenue * .5;
    const prepaids = month.prepaids ?? 20_000;
    const fixedAssets = month.fixedAssets ?? 150_000;
    const accountsPayable = month.accountsPayable ?? month.cloud + month.software;
    const accruedExpenses = month.accruedExpenses ?? month.payroll * .25;
    const debt = month.debt ?? 0;
    const totalAssets = month.cash + accountsReceivable + prepaids + fixedAssets;
    const totalLiabilities = accountsPayable + accruedExpenses + debt;
    return {
      ...month,
      status: "Actual",
      revenueGrowth: index ? month.revenue / history[index - 1].revenue - 1 : 0,
      totalExpenses,
      netCashFlow: netIncome,
      endingCash: month.cash,
      cogs: month.cloud,
      grossProfit: month.revenue - month.cloud,
      operatingExpenses,
      depreciation: 0,
      netIncome,
      accountsReceivable,
      prepaids,
      fixedAssets,
      totalAssets,
      accountsPayable,
      accruedExpenses,
      debt,
      totalLiabilities,
      shareholdersEquity: month.shareholdersEquity ?? totalAssets - totalLiabilities,
      liabilitiesAndEquity: totalLiabilities + (month.shareholdersEquity ?? totalAssets - totalLiabilities),
      openingCash,
      workingCapitalChange: netChangeCash - netIncome,
      capitalExpenditures: 0,
      operatingCashFlow: netChangeCash,
      investingCashFlow: 0,
      financingCashFlow: 0,
      netChangeCash,
    };
  });
}

function projectedSheet(history: HistoricalMonth[], drivers: ForecastDriver[], base: Assumptions): SheetMonth[] {
  const last = history[history.length - 1];
  const assumptions = assumptionsFromHistory(base, history);
  let openingCash = last.cash;
  return forecast(assumptions, 12, drivers).months.map((month: ForecastMonth) => {
    const projected: SheetMonth = {
      month: month.month,
      revenue: month.revenue,
      payroll: month.payroll,
      cloud: month.cloud,
      marketing: month.marketing,
      software: month.software,
      other: month.other,
      cash: month.endingCash,
      status: "Forecast",
      revenueGrowth: month.revenueGrowth,
      totalExpenses: month.totalExpenses,
      netCashFlow: month.netCashFlow,
      endingCash: month.endingCash,
      cogs: month.costOfRevenue,
      grossProfit: month.grossProfit,
      operatingExpenses: month.operatingExpenses,
      depreciation: month.depreciation,
      netIncome: month.netIncome,
      accountsReceivable: month.accountsReceivable,
      prepaids: month.prepaids,
      fixedAssets: month.fixedAssets,
      totalAssets: month.totalAssets,
      accountsPayable: month.accountsPayable,
      accruedExpenses: month.accruedExpenses,
      debt: month.debt,
      totalLiabilities: month.totalLiabilities,
      shareholdersEquity: month.shareholdersEquity,
      liabilitiesAndEquity: month.liabilitiesAndEquity,
      openingCash,
      workingCapitalChange: -month.changeInWorkingCapital,
      capitalExpenditures: month.capitalExpenditures,
      operatingCashFlow: month.operatingCashFlow,
      investingCashFlow: month.investingCashFlow,
      financingCashFlow: month.financingCashFlow,
      netChangeCash: month.netCashFlow,
    };
    openingCash = month.endingCash;
    return projected;
  });
}

function CellInput({ value, percentValue, onChange }: { value: number; percentValue?: boolean; onChange: (value: number) => void }) {
  return <input
    type="number"
    value={percentValue ? Number((value * 100).toFixed(2)) : Math.round(value)}
    step={percentValue ? .1 : 100}
    onFocus={(event) => event.currentTarget.select()}
    onChange={(event) => onChange(percentValue ? Number(event.target.value) / 100 : Number(event.target.value))}
    className="h-9 w-full min-w-[88px] border-0 bg-transparent px-3 text-right font-mono text-[11px] text-zinc-200 outline-none selection:bg-acid/20 focus:bg-acid/[.07] focus:ring-1 focus:ring-inset focus:ring-acid/40"
  />;
}

export function ModelWorkspace() {
  const { history, setHistory, assumptions, activeScenarioId, scenarios, setActiveScenarioId, overrides: drivers, setOverrides: setDrivers, pendingImport, setPendingImport, resolvedImportIssues, setResolvedImportIssues, resetModel } = useFinancialModel();
  const [statement, setStatement] = useState<Statement>("income");
  const [message, setMessage] = useState<string | null>(null);
  const [importReport, setImportReport] = useState<FinancialWorkbookResult | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const stagedHistory = pendingImport?.history ?? null;
  const workingHistory = stagedHistory ?? history;
  const actuals = useMemo(() => actualSheet(workingHistory), [workingHistory]);
  const projections = useMemo(() => projectedSheet(workingHistory, drivers, assumptions), [workingHistory, drivers, assumptions]);
  const columns = [...actuals, ...projections];
  const rows = statementRows[statement];

  function editActual(columnIndex: number, key: HistoricalEditableKey, value: number) {
    if (pendingImport) setPendingImport((current) => current ? { ...current, history: updateHistoricalActual(current.history, columnIndex, key, value) } : current);
    else setHistory((current) => updateHistoricalActual(current, columnIndex, key, value));
  }

  function editForecast(columnIndex: number, key: keyof SheetMonth, value: number) {
    const forecastIndex = columnIndex - actuals.length;
    if (key === "revenue") {
      const previousRevenue = forecastIndex === 0 ? workingHistory.at(-1)!.revenue : projections[forecastIndex - 1].revenue;
      setDrivers((current) => current.map((driver, index) => index === forecastIndex ? { ...driver, revenueGrowth: previousRevenue ? value / previousRevenue - 1 : 0 } : driver));
      return;
    }
    const driverKey = key === "investingCashFlow" ? "capitalExpenditures" : key === "financingCashFlow" ? "funding" : key;
    const driverValue = key === "investingCashFlow" ? Math.max(0, -value) : value;
    setDrivers((current) => current.map((driver, index) => index === forecastIndex ? { ...driver, [driverKey]: driverValue } : driver));
  }

  function resetSample() {
    resetModel();
    setMessage(null);
    setImportReport(null);
    setPendingImport(null);
    setReviewOpen(false);
    setResolvedImportIssues(new Set());
  }

  async function importWorkbook(file: File) {
    try {
      setMessage("Checking statements…");
      const report = await parseFinancialWorkbook(await file.arrayBuffer());
      setImportReport(report);
      const errors = report.issues.filter((issue) => issue.severity === "error");
      if (errors.length) {
        setPendingImport({ report, history: report.history });
        setResolvedImportIssues(new Set());
        setReviewOpen(true);
        setMessage(`Import blocked · ${errors.length} reconciliation ${errors.length === 1 ? "error" : "errors"}`);
      } else {
        setPendingImport(null);
        setHistory(report.history);
        setDrivers(createDrivers(assumptionsFromHistory(assumptions, report.history)));
        setMessage(`${report.history.length} months imported`);
      }
    } catch (error) {
      setImportReport(null);
      setPendingImport(null);
      setMessage(error instanceof Error ? error.message : "Could not read that workbook");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function downloadTemplate() {
    try {
      await downloadFinancialWorkbook(workingHistory);
    } catch {
      setMessage("Could not create the workbook template");
    }
  }

  function applyReconciledImport() {
    if (!pendingImport) return;
    setHistory(pendingImport.history);
    setDrivers(createDrivers(assumptionsFromHistory(assumptions, pendingImport.history)));
    setPendingImport(null);
    setReviewOpen(false);
    setMessage(`${pendingImport.history.length} reconciled months imported`);
    setImportReport((current) => current ? { ...current, issues: current.issues.filter((issue) => issue.severity === "warning") } : current);
  }

  function discardImport() {
    setPendingImport(null);
    setImportReport(null);
    setResolvedImportIssues(new Set());
    setReviewOpen(false);
    setMessage(null);
  }

  return <section className="panel overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
      <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md border border-line bg-black/20"><FileSpreadsheet size={16} className="text-zinc-300" /></span><div><p className="text-sm font-medium">Financial statements</p><p className="mt-1 text-xs text-zinc-500">12 actuals / 12 forecast</p></div></div>
      <div className="flex items-center gap-2">
        <label className="mr-1 flex items-center gap-2"><span className="text-xs text-zinc-500">Forecast scenario</span><select className="input !h-9 min-w-[170px] text-xs" value={activeScenarioId} onChange={(event) => setActiveScenarioId(event.target.value)}>{scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}</select></label>
        {message && <span className="mr-2 text-xs text-zinc-400">{message}</span>}
        <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => event.target.files?.[0] && importWorkbook(event.target.files[0])} />
        <button onClick={resetSample} className="button-ghost !h-9 !px-3 text-xs"><RotateCcw size={13} /> Sample data</button>
        <button onClick={() => fileRef.current?.click()} className="button-ghost !h-9 !px-3 text-xs"><FileUp size={13} /> Upload statements</button>
        <button onClick={downloadTemplate} className="button-ghost !h-9 !px-3 text-xs"><Download size={13} /> XLSX template</button>
      </div>
    </div>
    {importReport && <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 ${importReport.issues.some((issue) => issue.severity === "error") ? "bg-red-500/[.045]" : "bg-acid/[.035]"}`}>
      <div className="flex items-start gap-3">{importReport.issues.some((issue) => issue.severity === "error") ? <XCircle size={17} className="mt-0.5 shrink-0 text-red-400" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-acid" />}<div><p className="text-sm font-medium">{importReport.issues.some((issue) => issue.severity === "error") ? "Statements need attention" : "Statements reconciled"}</p><p className="mt-1 text-xs text-zinc-500">{importReport.months[0]} through {importReport.months.at(-1)} · {importReport.issues.length} {importReport.issues.length === 1 ? "finding" : "findings"}</p></div></div>
      {importReport.issues.some((issue) => issue.severity === "error") && <button onClick={() => setReviewOpen(true)} className="button-ghost !h-9 text-xs">Review and reconcile</button>}
    </div>}
    <div className="flex gap-1 border-b border-line bg-ink/40 px-5 pt-3">{(["income", "balance", "cashflow"] as const).map((item) => <button key={item} onClick={() => setStatement(item)} className={`border-b-2 px-4 pb-3 pt-1 text-sm transition ${statement === item ? "border-acid text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-200"}`}>{item === "income" ? "Income Statement" : item === "balance" ? "Balance Sheet" : "Cash Flow"}</button>)}</div>
    <div className="scrollbar overflow-x-auto">
      <table className="min-w-[2580px] border-collapse text-right">
        <thead><tr><th className="sticky left-0 z-20 w-52 border-b border-r border-line bg-panel px-5 py-3 text-left text-[9px] font-normal uppercase tracking-[.13em] text-zinc-600">Account</th>{columns.map((column, index) => <th key={`${column.status}-${column.month}`} className={`w-[98px] border-b border-r border-line px-3 py-2 ${column.status === "Forecast" ? "bg-acid/[.035]" : "bg-panel"}`}><span className="block font-mono text-[10px] font-normal text-zinc-300">{monthLabel(column.month, true)}</span><span className={`mt-1 block text-[8px] font-normal uppercase tracking-wider ${column.status === "Forecast" ? "text-acid" : "text-zinc-600"}`}>{index === actuals.length ? "Forecast" : column.status}</span></th>)}</tr></thead>
        <tbody>{rows.map((row, rowIndex) => <tr key={`${String(row.key)}-${rowIndex}`} className={row.section ? "bg-white/[.035]" : row.total ? "bg-white/[.018]" : ""}>
          <th className={`sticky left-0 z-10 border-b border-r border-line px-5 py-0 text-left text-xs ${row.section ? "bg-ink font-semibold uppercase tracking-wider text-zinc-300" : `bg-panel ${row.total ? "font-semibold text-zinc-100" : "font-normal text-zinc-400"}`}`}><span className="flex h-10 items-center">{row.label}</span></th>
          {columns.map((column, columnIndex) => {
            const value = Number(column[row.key]);
            const actualEditable = column.status === "Actual" && ["revenue", "payroll", "cloud", "marketing", "software", "other", "endingCash", "accountsReceivable", "prepaids", "fixedAssets", "accountsPayable", "accruedExpenses", "debt", "shareholdersEquity"].includes(String(row.key));
            const forecastEditable = !stagedHistory && column.status === "Forecast" && row.input;
            return <td key={`${column.month}-${String(row.key)}-${rowIndex}`} className={`h-10 border-b border-r border-line p-0 ${row.section ? "bg-white/[.025]" : ""} ${forecastEditable ? "bg-acid/[.018]" : ""} ${(row.key === "netCashFlow" || row.key === "netIncome" || row.key === "netChangeCash") && value < 0 ? "text-[#e79a91]" : ""}`}>
              {row.section ? null : actualEditable ? <CellInput value={value} onChange={(next) => editActual(columnIndex, row.key as HistoricalEditableKey, next)} /> : forecastEditable ? <CellInput value={value} percentValue={row.type === "percent"} onChange={(next) => editForecast(columnIndex, row.key, next)} /> : <span className={`block px-3 font-mono text-xs ${row.total ? "text-zinc-100" : "text-zinc-400"}`}>{row.type === "percent" ? (columnIndex === 0 ? "-" : percent(value)) : money(value)}</span>}
            </td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
    <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[9px] text-zinc-700"><span>{stagedHistory ? "Reconciliation mode: edit actual cells, then review and apply the staged statements." : "Click any input cell to edit. Use Tab to move across the sheet."}</span><span>USD</span></div>
    <ReconciliationDialog open={reviewOpen} report={importReport} resolved={resolvedImportIssues} onResolve={(id) => setResolvedImportIssues((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onGoTo={(nextStatement) => { setStatement(nextStatement); setReviewOpen(false); }} onApply={applyReconciledImport} onDiscard={discardImport} onAskAgent={() => { setReviewOpen(false); window.dispatchEvent(new CustomEvent("runway:open-agent", { detail: { command: "Review the staged financial-statement reconciliation findings and propose the specific corrections needed. Ask me for any missing accounting details before changing values, and only resolve a finding after its correction is included." } })); }} onClose={() => setReviewOpen(false)} />
  </section>;
}
