import type { HistoricalMonth } from "./forecasting/types";

const requiredColumns = ["month", "revenue", "payroll", "cloud", "marketing", "software", "other", "cash"] as const;

function parseLine(line: string): string[] {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { cells.push(value.trim()); value = ""; }
    else value += character;
  }
  cells.push(value.trim());
  return cells;
}

function numeric(value: string): number {
  return Number(value.replace(/[$,\s]/g, ""));
}

function optionalNumeric(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = numeric(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseHistoricalCsv(text: string): HistoricalMonth[] {
  const [headerLine = "", ...lines] = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const aliases: Record<string, string> = { other_expenses: "other", ending_cash: "cash", prepaid_expenses: "prepaids", fixed_assets: "fixed_assets", accounts_receivable: "accounts_receivable", accounts_payable: "accounts_payable", accrued_expenses: "accrued_expenses", shareholders_equity: "shareholders_equity" };
  const headers = parseLine(headerLine).map((item) => aliases[item.trim().toLowerCase()] ?? item.trim().toLowerCase());
  const missing = requiredColumns.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);

  const imported = lines.filter((line) => line.trim()).map((line, rowIndex) => {
    const values = parseLine(line);
    const record = Object.fromEntries(headers.map((key, index) => [key, values[index] ?? ""]));
    const row: HistoricalMonth = {
      month: record.month,
      revenue: numeric(record.revenue),
      payroll: numeric(record.payroll),
      cloud: numeric(record.cloud),
      marketing: numeric(record.marketing),
      software: numeric(record.software),
      other: numeric(record.other),
      cash: numeric(record.cash),
      accountsReceivable: optionalNumeric(record.accounts_receivable),
      prepaids: optionalNumeric(record.prepaids),
      fixedAssets: optionalNumeric(record.fixed_assets),
      accountsPayable: optionalNumeric(record.accounts_payable),
      accruedExpenses: optionalNumeric(record.accrued_expenses),
      debt: optionalNumeric(record.debt),
      shareholdersEquity: optionalNumeric(record.shareholders_equity),
    };
    const requiredValues = [row.revenue, row.payroll, row.cloud, row.marketing, row.software, row.other, row.cash];
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) || requiredValues.some((value) => !Number.isFinite(value))) throw new Error(`Invalid values on row ${rowIndex + 2}`);
    return row;
  });
  if (imported.length < 12) throw new Error(`At least 12 months are required (${imported.length} found)`);
  const sorted = imported.sort((a, b) => a.month.localeCompare(b.month));
  if (new Set(sorted.map((row) => row.month)).size !== sorted.length) throw new Error("Each month must appear only once");
  return sorted.slice(-12);
}
