import { describe, expect, it } from "vitest";
import { compareScenarios } from "./compare";
import { forecast } from "./engine";
import { assumptionsSchema } from "./schema";
import { attributeScenario } from "./attribution";
import type { Assumptions, Scenario } from "./types";

const assumptions: Assumptions = {
  startingMonth: "2027-01", startingCash: 500_000, startingRevenue: 50_000,
  monthlyRevenueGrowth: 0, basePayroll: 80_000, cloudPercentOfRevenue: .1,
  marketingMonthly: 10_000, softwareMonthly: 5_000, otherMonthly: 5_000,
  hires: [{ id: "eng", role: "Engineer", count: 1, annualSalary: 120_000, startMonth: "2027-03" }],
  fundingEvents: [{ id: "seed", amount: 200_000, month: "2027-04" }],
};

describe("forecast engine", () => {
  it("returns identical output for identical input", () => expect(forecast(assumptions, 12)).toEqual(forecast(structuredClone(assumptions), 12)));
  it("starts a hire in the specified month", () => { const result = forecast(assumptions, 4); expect(result.months[0].payroll).toBe(80_000); expect(result.months[1].month).toBe("2027-03"); expect(result.months[1].payroll).toBe(90_000); });
  it("applies funding only in the specified month", () => { const result = forecast(assumptions, 4); expect(result.months.map((m) => m.funding)).toEqual([0, 0, 200_000, 0]); });
  it("detects runway when cash falls below zero", () => { const result = forecast({ ...assumptions, startingCash: 40_000, fundingEvents: [], hires: [] }, 12); expect(result.runwayMonths).not.toBeNull(); expect(result.runwayMonths!).toBeLessThan(2); });
  it("supports a forecast that begins with a negative cash balance", () => { const result = forecast({ ...assumptions, startingCash: -25_000, fundingEvents: [], hires: [] }, 12); expect(result.runwayMonths).toBe(0); expect(result.months[0].endingCash).toBeLessThan(0); });
  it("rejects negative hire counts", () => { expect(() => assumptionsSchema.parse({ ...assumptions, hires: [{ ...assumptions.hires[0], count: -1 }] })).toThrow(); });
  it("compares scenarios using the same engine", () => { const list: Scenario[] = [{ id: "a", name: "A", description: "", color: "#fff", assumptions }, { id: "b", name: "B", description: "", color: "#000", assumptions: { ...assumptions, monthlyRevenueGrowth: .1 } }]; const compared = compareScenarios(list, 6); expect(compared).toHaveLength(2); expect(compared[1].result.endingRevenue).toBeGreaterThan(compared[0].result.endingRevenue); });
  it("attributes scenario changes with counterfactual reruns", () => { const drivers = attributeScenario(assumptions, { ...assumptions, marketingMonthly: 25_000 }); expect(drivers.find((driver) => driver.name === "Marketing")?.impactMonths).toBeLessThan(0); });
  it("balances assets against liabilities and equity every month", () => { const result = forecast(assumptions, 12); result.months.forEach((month) => expect(month.totalAssets).toBeCloseTo(month.liabilitiesAndEquity, 6)); });
  it("reconciles cash through the cash flow statement", () => { const result = forecast(assumptions, 12); result.months.forEach((month, index) => { const opening = index === 0 ? assumptions.startingCash : result.months[index - 1].endingCash; expect(month.endingCash).toBeCloseTo(opening + month.netCashFlow, 6); expect(month.netCashFlow).toBeCloseTo(month.operatingCashFlow + month.investingCashFlow + month.financingCashFlow, 6); }); });
  it("routes funding through financing cash flow and equity", () => { const result = forecast(assumptions, 4); const funded = result.months.find((month) => month.month === "2027-04")!; expect(funded.financingCashFlow).toBe(200_000); expect(funded.funding).toBe(200_000); });
});
