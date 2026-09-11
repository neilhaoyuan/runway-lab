import { describe, expect, it } from "vitest";
import { modelStateSchema } from "./model-state";

const state = {
  version: 1 as const,
  history: [{ month: "2026-01", revenue: 10, payroll: 4, cloud: 1, marketing: 1, software: 1, other: 1, cash: 100 }],
  scenarios: [{
    id: "base",
    name: "Base Case",
    description: "",
    color: "#5577dd",
    assumptions: { startingMonth: "2026-01", startingCash: 100, startingRevenue: 10, monthlyRevenueGrowth: .05, basePayroll: 4, cloudPercentOfRevenue: .1, marketingMonthly: 1, softwareMonthly: 1, otherMonthly: 1, hires: [], fundingEvents: [] },
    overrides: [],
  }],
  activeScenarioId: "base",
};

describe("cloud model state", () => {
  it("accepts a complete local model snapshot", () => {
    expect(modelStateSchema.parse(state).activeScenarioId).toBe("base");
  });

  it("rejects an active scenario that is not present", () => {
    expect(modelStateSchema.safeParse({ ...state, activeScenarioId: "missing" }).success).toBe(false);
  });
});
