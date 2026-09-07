import type { Cell, Worksheet } from "exceljs";
import type { HistoricalMonth } from "./forecasting/types";

export type ReconciliationIssue = {
  severity: "error" | "warning";
  message: string;
  month?: string;
  statement?: "income" | "balance" | "cashflow";
};

export type FinancialWorkbookResult = {
  history: HistoricalMonth[];
  issues: ReconciliationIssue[];
  months: string[];
  sheets: string[];
};

export function reconciliationIssueId(issue: ReconciliationIssue, index: number) {
  return `${issue.severity}|${issue.statement ?? "workbook"}|${issue.month ?? "all"}|${issue.message}|${index}`;
}

type StatementTable = {
  sheet: Worksheet;
  months: string[];
  rows: Map<string, number[]>;
};

const aliases = {
  revenue: ["revenue", "total revenue", "sales", "net sales"],
  cloud: ["cost of revenue", "cost of sales", "cost of goods sold", "cogs", "cloud", "hosting"],
  payroll: ["payroll", "salaries and wages", "wages and salaries", "compensation", "employee compensation"],
  marketing: ["marketing", "advertising", "sales and marketing"],
  software: ["software", "software subscriptions", "saas", "tools and software"],
  other: ["other operating expenses", "other opex", "other expenses"],
  operatingExpenses: ["total operating expenses", "operating expenses"],
  netIncome: ["net income", "net profit", "net earnings", "profit after tax"],
  cash: ["cash", "cash and cash equivalents", "cash & cash equivalents"],
  accountsReceivable: ["accounts receivable", "trade receivables", "receivables"],
  prepaids: ["prepaid expenses", "prepaids"],
  fixedAssets: ["property and equipment", "property plant and equipment", "pp&e", "ppe", "fixed assets"],
  totalAssets: ["total assets"],
  accountsPayable: ["accounts payable", "trade payables", "payables"],
  accruedExpenses: ["accrued expenses", "accrued liabilities"],
  debt: ["debt", "total debt", "borrowings", "loans payable"],
  totalLiabilities: ["total liabilities"],
  equity: ["shareholders equity", "stockholders equity", "total equity", "owners equity"],
  liabilitiesAndEquity: ["total liabilities and equity", "liabilities and equity", "total liabilities & equity"],
  beginningCash: ["beginning cash", "opening cash", "cash at beginning of period"],
  endingCash: ["ending cash", "closing cash", "cash at end of period", "cash and cash equivalents at end of period"],
  netCashChange: ["net change in cash", "net increase in cash", "net decrease in cash"],
} as const;

function normalize(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

function rawCellValue(cell: Cell): unknown {
  const value = cell.value;
  if (value && typeof value === "object" && "result" in value) return value.result;
  if (value && typeof value === "object" && "richText" in value) return value.richText.map((part) => part.text).join("");
  return value;
}

function monthValue(cell: Cell): string | null {
  const value = rawCellValue(cell);
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
  if (typeof value === "number" && value > 20_000 && value < 80_000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  const text = String(value ?? cell.text ?? "").trim();
  const exact = text.match(/^(\d{4})[-/]([01]?\d)$/);
  if (exact && Number(exact[2]) >= 1 && Number(exact[2]) <= 12) return `${exact[1]}-${exact[2].padStart(2, "0")}`;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.valueOf())) return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
  return null;
}

function numeric(cell: Cell): number {
  const raw = rawCellValue(cell);
  if (typeof raw === "number") return raw;
  const text = String(raw ?? cell.text ?? "").trim();
  if (!text || text === "-" || text === "—") return 0;
  const negative = /^\(.*\)$/.test(text);
  const parsed = Number(text.replace(/[()$,%\s,]/g, ""));
  return negative ? -parsed : parsed;
}

function findStatement(workbook: { worksheets: Worksheet[] }, names: string[]): Worksheet | undefined {
  return workbook.worksheets.find((sheet) => names.some((name) => normalize(sheet.name).includes(name)));
}

function readTable(sheet: Worksheet): StatementTable {
  let headerRow = 0;
  let monthColumns: Array<{ column: number; month: string }> = [];
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 15); rowNumber += 1) {
    const candidate: Array<{ column: number; month: string }> = [];
    const row = sheet.getRow(rowNumber);
    for (let column = 2; column <= Math.max(row.cellCount, 2); column += 1) {
      const month = monthValue(row.getCell(column));
      if (month) candidate.push({ column, month });
    }
    if (candidate.length > monthColumns.length) { headerRow = rowNumber; monthColumns = candidate; }
  }
  if (!headerRow || monthColumns.length < 12) throw new Error(`${sheet.name} must contain at least 12 monthly columns.`);

  const rows = new Map<string, number[]>();
  for (let rowNumber = headerRow + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const label = normalize(String(rawCellValue(row.getCell(1)) ?? row.getCell(1).text ?? ""));
    if (!label) continue;
    const values = monthColumns.map(({ column }) => numeric(row.getCell(column)));
    if (!values.every(Number.isFinite)) throw new Error(`${sheet.name}: invalid number on row ${rowNumber}.`);
    if (!rows.has(label)) rows.set(label, values);
  }
  return { sheet, months: monthColumns.map(({ month }) => month), rows };
}

function values(table: StatementTable, names: readonly string[]): number[] | undefined {
  for (const name of names) {
    const found = table.rows.get(normalize(name));
    if (found) return found;
  }
}

function valueAt(table: StatementTable, names: readonly string[], month: string): number | undefined {
  const row = values(table, names);
  const index = table.months.indexOf(month);
  return row && index >= 0 ? row[index] : undefined;
}

function consecutive(months: string[]) {
  return months.every((month, index) => {
    if (!index) return true;
    const previous = new Date(`${months[index - 1]}-01T00:00:00Z`);
    previous.setUTCMonth(previous.getUTCMonth() + 1);
    return month === previous.toISOString().slice(0, 7);
  });
}

function material(difference: number, scale: number) {
  return Math.abs(difference) > Math.max(1, Math.abs(scale) * .001);
}

export async function parseFinancialWorkbook(buffer: ArrayBuffer): Promise<FinancialWorkbookResult> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const incomeSheet = findStatement(workbook, ["income statement", "profit and loss", "p and l", "income"]);
  const balanceSheet = findStatement(workbook, ["balance sheet", "balance"]);
  const cashFlowSheet = findStatement(workbook, ["cash flow", "cashflow"]);
  if (!incomeSheet || !balanceSheet) throw new Error("Workbook requires Income Statement and Balance Sheet tabs.");

  const income = readTable(incomeSheet);
  const balance = readTable(balanceSheet);
  const cashFlow = cashFlowSheet ? readTable(cashFlowSheet) : undefined;
  const commonMonths = [...new Set(income.months.filter((month) => balance.months.includes(month)))].sort().slice(-12);
  if (commonMonths.length < 12) throw new Error("Income Statement and Balance Sheet need at least 12 matching months.");
  if (!consecutive(commonMonths)) throw new Error("The latest 12 statement months must be consecutive.");

  const issues: ReconciliationIssue[] = [];
  const requiredRows: Array<[StatementTable, readonly string[], string, "income" | "balance"]> = [
    [income, aliases.revenue, "Revenue", "income"], [balance, aliases.cash, "Cash", "balance"], [balance, aliases.totalAssets, "Total Assets", "balance"],
  ];
  for (const [table, names, label, statement] of requiredRows) if (!values(table, names)) issues.push({ severity: "error", statement, message: `${table.sheet.name}: ${label} account was not found.` });
  const hasLiabilityEquation = Boolean(values(balance, aliases.liabilitiesAndEquity) || (values(balance, aliases.totalLiabilities) && values(balance, aliases.equity)));
  if (!hasLiabilityEquation) issues.push({ severity: "error", statement: "balance", message: `${balance.sheet.name}: Total Liabilities and Equity, or both Total Liabilities and Total Equity, are required.` });

  for (const [key, label] of [["payroll", "Payroll"], ["marketing", "Marketing"], ["software", "Software"]] as const) {
    if (!values(income, aliases[key])) issues.push({ severity: "warning", statement: "income", message: `${income.sheet.name}: ${label} was not found and will be treated as zero.` });
  }

  const history = commonMonths.map((month): HistoricalMonth => {
    const revenue = valueAt(income, aliases.revenue, month) ?? 0;
    const cloud = Math.abs(valueAt(income, aliases.cloud, month) ?? 0);
    const payroll = Math.abs(valueAt(income, aliases.payroll, month) ?? 0);
    const marketing = Math.abs(valueAt(income, aliases.marketing, month) ?? 0);
    const software = Math.abs(valueAt(income, aliases.software, month) ?? 0);
    const totalOperatingExpenses = Math.abs(valueAt(income, aliases.operatingExpenses, month) ?? 0);
    const explicitOther = valueAt(income, aliases.other, month);
    const other = Math.abs(explicitOther ?? Math.max(0, totalOperatingExpenses - payroll - marketing - software));
    const cash = valueAt(balance, aliases.cash, month) ?? 0;
    const totalAssets = valueAt(balance, aliases.totalAssets, month) ?? 0;
    const totalLiabilities = valueAt(balance, aliases.totalLiabilities, month) ?? 0;
    const equity = valueAt(balance, aliases.equity, month) ?? 0;
    const liabilitiesAndEquity = valueAt(balance, aliases.liabilitiesAndEquity, month) ?? totalLiabilities + equity;
    if (material(totalAssets - liabilitiesAndEquity, totalAssets)) issues.push({ severity: "error", statement: "balance", month, message: `Balance sheet is out by ${Math.round(totalAssets - liabilitiesAndEquity).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}.` });

    const reportedNetIncome = valueAt(income, aliases.netIncome, month);
    const modeledNetIncome = revenue - cloud - payroll - marketing - software - other;
    if (reportedNetIncome !== undefined && material(reportedNetIncome - modeledNetIncome, revenue)) issues.push({ severity: "warning", statement: "income", month, message: "Reported net income does not match the imported operating accounts." });

    if (cashFlow) {
      const cashFlowEnding = valueAt(cashFlow, aliases.endingCash, month);
      if (cashFlowEnding !== undefined && material(cashFlowEnding - cash, cash)) issues.push({ severity: "error", statement: "cashflow", month, message: "Cash-flow ending cash does not match balance-sheet cash." });
      const beginning = valueAt(cashFlow, aliases.beginningCash, month);
      const movement = valueAt(cashFlow, aliases.netCashChange, month);
      if (beginning !== undefined && movement !== undefined && cashFlowEnding !== undefined && material(beginning + movement - cashFlowEnding, cashFlowEnding)) issues.push({ severity: "error", statement: "cashflow", month, message: "Beginning cash plus net cash movement does not equal ending cash." });
      const cashFlowNetIncome = valueAt(cashFlow, aliases.netIncome, month);
      if (cashFlowNetIncome !== undefined && reportedNetIncome !== undefined && material(cashFlowNetIncome - reportedNetIncome, reportedNetIncome)) issues.push({ severity: "error", statement: "cashflow", month, message: "Cash-flow net income does not match the income statement." });
    }

    return {
      month, revenue, payroll, cloud, marketing, software, other, cash,
      accountsReceivable: valueAt(balance, aliases.accountsReceivable, month),
      prepaids: valueAt(balance, aliases.prepaids, month),
      fixedAssets: valueAt(balance, aliases.fixedAssets, month),
      accountsPayable: valueAt(balance, aliases.accountsPayable, month),
      accruedExpenses: valueAt(balance, aliases.accruedExpenses, month),
      debt: valueAt(balance, aliases.debt, month),
      shareholdersEquity: valueAt(balance, aliases.equity, month),
    };
  });

  if (!cashFlow) issues.push({ severity: "warning", statement: "cashflow", message: "Cash Flow tab was not found; cash flow will be derived from the other statements." });
  return { history, issues, months: commonMonths, sheets: workbook.worksheets.map((sheet) => sheet.name) };
}

export async function downloadFinancialWorkbook(history: HistoricalMonth[]) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Financial model";
  const monthHeaders = history.map((month) => month.month);
  const addSheet = (name: string, rows: Array<[string, ...number[]]>) => {
    const sheet = workbook.addWorksheet(name);
    sheet.addRow(["Account", ...monthHeaders]);
    rows.forEach((row) => sheet.addRow(row));
    sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
    sheet.getColumn(1).width = 30;
    for (let column = 2; column <= monthHeaders.length + 1; column += 1) { sheet.getColumn(column).width = 14; sheet.getColumn(column).numFmt = "$#,##0;[Red]($#,##0)"; }
    sheet.getRow(1).font = { bold: true };
  };
  const pick = (fn: (month: HistoricalMonth, index: number) => number) => history.map(fn);
  const netIncome = pick((month) => month.revenue - month.cloud - month.payroll - month.marketing - month.software - month.other);
  const receivables = pick((month) => month.accountsReceivable ?? month.revenue * .5);
  const prepaids = pick((month) => month.prepaids ?? 20_000);
  const fixedAssets = pick((month) => month.fixedAssets ?? 150_000);
  const payables = pick((month) => month.accountsPayable ?? month.cloud + month.software);
  const accrued = pick((month) => month.accruedExpenses ?? month.payroll * .25);
  const debt = pick((month) => month.debt ?? 0);
  const assets = history.map((month, index) => month.cash + receivables[index] + prepaids[index] + fixedAssets[index]);
  const liabilities = history.map((_, index) => payables[index] + accrued[index] + debt[index]);
  const equity = history.map((month, index) => month.shareholdersEquity ?? assets[index] - liabilities[index]);
  const openingCash = history.map((month, index) => index ? history[index - 1].cash : month.cash - netIncome[index]);
  const cashChange = history.map((month, index) => month.cash - openingCash[index]);

  addSheet("Income Statement", [
    ["Revenue", ...pick((month) => month.revenue)], ["Cost of Revenue", ...pick((month) => month.cloud)], ["Payroll", ...pick((month) => month.payroll)],
    ["Marketing", ...pick((month) => month.marketing)], ["Software", ...pick((month) => month.software)], ["Other Operating Expenses", ...pick((month) => month.other)],
    ["Total Operating Expenses", ...pick((month) => month.payroll + month.marketing + month.software + month.other)], ["Net Income", ...netIncome],
  ]);
  addSheet("Balance Sheet", [
    ["Cash and Cash Equivalents", ...pick((month) => month.cash)], ["Accounts Receivable", ...receivables], ["Prepaid Expenses", ...prepaids], ["Property and Equipment", ...fixedAssets],
    ["Total Assets", ...assets], ["Accounts Payable", ...payables], ["Accrued Expenses", ...accrued], ["Debt", ...debt], ["Total Liabilities", ...liabilities],
    ["Shareholders Equity", ...equity], ["Total Liabilities and Equity", ...assets],
  ]);
  addSheet("Cash Flow", [["Beginning Cash", ...openingCash], ["Net Income", ...netIncome], ["Net Change in Cash", ...cashChange], ["Ending Cash", ...pick((month) => month.cash)]]);
  const data = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "financial-statements-template.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}
