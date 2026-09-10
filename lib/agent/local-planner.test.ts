import { describe, expect, it } from "vitest";
import { localAgentPlan } from "./local-planner";
import type { AgentRequest } from "./types";

const scenarioAssumptions = {
  monthlyRevenueGrowth: .05,
  basePayroll: 100_000,
  cloudPercentOfRevenue: .1,
  marketingMonthly: 10_000,
  softwareMonthly: 7_000,
  otherMonthly: 5_000,
  hires: [],
  fundingEvents: [],
};

function request(message: string): AgentRequest {
  return {
    message,
    context: {
      activeScenarioId: "base",
      scenarios: [
        { id: "base", name: "Base Case", description: "Current plan", assumptions: scenarioAssumptions },
        { id: "growth", name: "Aggressive Growth", description: "Growth plan", assumptions: scenarioAssumptions },
      ],
      history: [],
      reconciliationIssues: [],
    },
  };
}

describe("local financial agent", () => {
  it("creates a named scenario from the referenced source", () => {
    const plan = localAgentPlan(request("Create a scenario called Downside based on Base Case with revenue growth at 2%"));
    expect(plan.actions[0]).toMatchObject({ type: "create_scenario", name: "Downside", sourceScenarioId: "base", patch: { monthlyRevenueGrowth: .02 } });
  });

  it("updates the named scenario instead of the active scenario", () => {
    const plan = localAgentPlan(request("Set marketing to $25k in Aggressive Growth"));
    expect(plan.actions[0]).toMatchObject({ type: "update_scenario", scenarioId: "growth", patch: { marketingMonthly: 25_000 } });
  });

  it("asks for accounting authority before reconciling statements", () => {
    const input = request("Fix the statements");
    input.context.reconciliationIssues = [{ id: "issue-1", severity: "error", statement: "balance", month: "2026-08", message: "Assets do not equal liabilities and equity" }];
    const plan = localAgentPlan(input);
    expect(plan.actions).toEqual([]);
    expect(plan.questions).toHaveLength(1);
  });
});
