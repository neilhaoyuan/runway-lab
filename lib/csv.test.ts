import { describe, expect, it } from "vitest";
import { parseHistoricalCsv } from "./csv";

const header = "month,revenue,payroll,cloud,marketing,software,other,cash";
const rows = Array.from({ length: 12 }, (_, index) => {
  const month = String(index + 1).padStart(2, "0");
  return `2025-${month},${50000 + index * 1000},70000,9000,12000,6000,8000,900000`;
});

describe("historical CSV import", () => {
  it("imports and sorts twelve valid months", () => {
    const result = parseHistoricalCsv([header, ...rows.reverse()].join("\n"));
    expect(result).toHaveLength(12);
    expect(result[0].month).toBe("2025-01");
    expect(result[11].month).toBe("2025-12");
  });

  it("accepts quoted currency values", () => {
    const quoted = rows.map((row) => row.replace(",70000,", ',"$70,000",'));
    expect(parseHistoricalCsv([header, ...quoted].join("\n"))[0].payroll).toBe(70000);
  });

  it("rejects fewer than twelve months", () => {
    expect(() => parseHistoricalCsv([header, ...rows.slice(0, 11)].join("\n"))).toThrow("At least 12 months");
  });
});
