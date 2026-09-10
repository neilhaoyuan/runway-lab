import { describe, expect, it } from "vitest";
import { parseScenarioCommand } from "./parse-scenario";

describe("quick edit command parser", () => {
  it("parses abbreviated funding amounts", () => {
    expect(parseScenarioCommand("Raise $2M in September 2027").fundingEvents?.[0]).toMatchObject({ amount: 2_000_000, month: "2027-09" });
  });

  it("parses hires with abbreviated salaries", () => {
    expect(parseScenarioCommand("Hire two engineers in May 2027 at $180k").hires?.[0]).toMatchObject({ count: 2, annualSalary: 180_000, startMonth: "2027-05" });
  });

  it("parses percentage scenario changes", () => {
    expect(parseScenarioCommand("Set revenue growth to 8%").monthlyRevenueGrowth).toBe(.08);
    expect(parseScenarioCommand("Set cloud spend to 12%").cloudPercentOfRevenue).toBe(.12);
  });

  it("parses recurring operating costs", () => {
    expect(parseScenarioCommand("Set base payroll to $140k").basePayroll).toBe(140_000);
    expect(parseScenarioCommand("Set software to $12k").softwareMonthly).toBe(12_000);
    expect(parseScenarioCommand("Set other OpEx to $8k").otherMonthly).toBe(8_000);
  });
});
