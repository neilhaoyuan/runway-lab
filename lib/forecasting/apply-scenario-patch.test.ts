import { describe, expect, it } from "vitest";
import { applyScenarioPatch } from "./apply-scenario-patch";
import type { Assumptions, HistoricalMonth, ModelOverride } from "./types";

const history: HistoricalMonth[] = [{ month: "2026-12", revenue: 100_000, payroll: 50_000, cloud: 10_000, marketing: 5_000, software: 4_000, other: 3_000, cash: 500_000 }];
const assumptions: Assumptions = { startingMonth: "2026-12", startingCash: 500_000, startingRevenue: 100_000, monthlyRevenueGrowth: .05, basePayroll: 50_000, cloudPercentOfRevenue: .1, marketingMonthly: 5_000, softwareMonthly: 4_000, otherMonthly: 3_000, hires: [], fundingEvents: [] };
const overrides: ModelOverride[] = [
  { month: "2027-01", revenueGrowth: .06, payroll: 51_000, cloud: 10_600, marketing: 6_000, software: 9_999, other: 8_888, accountsReceivable: 50_000, accountsPayable: 7_000, capitalExpenditures: 2_000, funding: 123 },
  { month: "2027-02", revenueGrowth: .07, payroll: 52_000, cloud: 11_342, marketing: 6_500, software: 9_500, other: 8_500, accountsReceivable: 52_000, accountsPayable: 7_200, capitalExpenditures: 3_000, funding: 456 },
];

describe("quick edit scenario patches", () => {
  it("changes only the requested override field", () => {
    const result = applyScenarioPatch(assumptions, overrides, history, { marketingMonthly: 20_000 });
    expect(result.overrides.map((row) => row.marketing)).toEqual([20_000, 20_000]);
    expect(result.overrides.map((row) => row.software)).toEqual([9_999, 9_500]);
    expect(result.overrides.map((row) => row.funding)).toEqual([123, 456]);
  });

  it("adds new-hire payroll only from the hire start month", () => {
    const result = applyScenarioPatch(assumptions, overrides, history, { hires: [{ id: "hire", role: "Engineer", count: 1, annualSalary: 120_000, startMonth: "2027-02" }] });
    expect(result.overrides[0].payroll).toBe(51_000);
    expect(result.overrides[1].payroll).toBe(62_000);
    expect(result.overrides[1].software).toBe(9_500);
  });

  it("updates all editable recurring scenario assumptions", () => {
    const result = applyScenarioPatch(assumptions, overrides, history, { basePayroll: 60_000, softwareMonthly: 12_000, otherMonthly: 11_000 });
    expect(result.overrides.map((row) => row.payroll)).toEqual([61_000, 62_000]);
    expect(result.overrides.map((row) => row.software)).toEqual([12_000, 12_000]);
    expect(result.overrides.map((row) => row.other)).toEqual([11_000, 11_000]);
  });
});
