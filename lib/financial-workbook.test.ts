import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseFinancialWorkbook } from "./financial-workbook";

async function workbookBuffer({ imbalance = false }: { imbalance?: boolean } = {}) {
  const workbook = new ExcelJS.Workbook();
  const months = Array.from({ length: 12 }, (_, index) => `2025-${String(index + 1).padStart(2, "0")}`);
  const addSheet = (name: string, rows: Array<[string, ...number[]]>) => {
    const sheet = workbook.addWorksheet(name);
    sheet.addRow(["Account", ...months]);
    rows.forEach((row) => sheet.addRow(row));
  };
  const repeat = (value: number) => months.map(() => value);
  const cash = months.map((_, index) => 1_000_000 + index * 10_000);
  const assets = cash.map((value) => value + 200_000);
  const liabilities = repeat(100_000);
  const equity = assets.map((value, index) => value - liabilities[index]);
  if (imbalance) assets[4] += 25_000;

  addSheet("Income Statement", [
    ["Revenue", ...repeat(200_000)], ["Cost of Revenue", ...repeat(20_000)], ["Payroll", ...repeat(80_000)],
    ["Marketing", ...repeat(10_000)], ["Software", ...repeat(5_000)], ["Other Operating Expenses", ...repeat(5_000)],
    ["Total Operating Expenses", ...repeat(100_000)], ["Net Income", ...repeat(80_000)],
  ]);
  addSheet("Balance Sheet", [
    ["Cash and Cash Equivalents", ...cash], ["Accounts Receivable", ...repeat(150_000)], ["Prepaid Expenses", ...repeat(20_000)],
    ["Property and Equipment", ...repeat(30_000)], ["Total Assets", ...assets], ["Accounts Payable", ...repeat(50_000)],
    ["Accrued Expenses", ...repeat(50_000)], ["Total Liabilities", ...liabilities], ["Shareholders Equity", ...equity],
    ["Total Liabilities and Equity", ...assets.map((_, index) => liabilities[index] + equity[index])],
  ]);
  addSheet("Cash Flow", [
    ["Beginning Cash", ...cash.map((value, index) => index ? cash[index - 1] : value - 10_000)],
    ["Net Income", ...repeat(80_000)], ["Net Change in Cash", ...repeat(10_000)], ["Ending Cash", ...cash],
  ]);
  const data = await workbook.xlsx.writeBuffer();
  return new Uint8Array(data as unknown as ArrayBuffer).buffer;
}

describe("financial statement workbook import", () => {
  it("imports and reconciles twelve monthly statement columns", async () => {
    const result = await parseFinancialWorkbook(await workbookBuffer());
    expect(result.history).toHaveLength(12);
    expect(result.history[0].month).toBe("2025-01");
    expect(result.history[11].cash).toBe(1_110_000);
    expect(result.issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  });

  it("blocks a material balance-sheet difference", async () => {
    const result = await parseFinancialWorkbook(await workbookBuffer({ imbalance: true }));
    expect(result.issues.some((issue) => issue.severity === "error" && issue.month === "2025-05")).toBe(true);
  });
});
