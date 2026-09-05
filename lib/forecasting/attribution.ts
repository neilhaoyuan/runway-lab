import { forecast } from "./engine";
import type { Assumptions, AttributionDriver } from "./types";

function effectiveRunway(assumptions: Assumptions, cashMonth: number, horizon = 12): number {
  const result = forecast(assumptions, horizon);
  // For plans that survive the horizon, convert terminal cash into runway-equivalent
  // months using one fixed burn unit. This keeps attribution informative without
  // pretending the displayed runway is finite.
  return result.runwayMonths ?? horizon + result.endingCash / cashMonth;
}

export function attributeScenario(base: Assumptions, scenario: Assumptions): AttributionDriver[] {
  const baseResult = forecast(base, 12);
  const cashMonth = Math.max(1, Math.abs(baseResult.months[0].netCashFlow));
  const scenarioRunway = effectiveRunway(scenario, cashMonth);
  const groups: Array<{ name: string; keys: (keyof Assumptions)[]; detail: string }> = [
    { name: "Revenue growth", keys: ["monthlyRevenueGrowth"], detail: "Monthly compounding growth assumption" },
    { name: "Team plan", keys: ["hires", "basePayroll"], detail: "Base payroll and planned hires" },
    { name: "Cloud costs", keys: ["cloudPercentOfRevenue"], detail: "Infrastructure as a share of revenue" },
    { name: "Marketing", keys: ["marketingMonthly"], detail: "Recurring monthly marketing investment" },
    { name: "Software & other", keys: ["softwareMonthly", "otherMonthly"], detail: "Operating overhead" },
    { name: "Fundraising", keys: ["fundingEvents"], detail: "Timing and size of capital events" },
  ];

  return groups.map((group) => {
    const counterfactual = { ...scenario };
    group.keys.forEach((key) => {
      (counterfactual as unknown as Record<string, unknown>)[key] = base[key];
    });
    const withoutChange = effectiveRunway(counterfactual, cashMonth);
    return {
      name: group.name,
      impactMonths: Math.round((scenarioRunway - withoutChange) * 10) / 10,
      detail: group.detail,
    };
  }).filter((driver) => Math.abs(driver.impactMonths) >= 0.1).sort((a, b) => Math.abs(b.impactMonths) - Math.abs(a.impactMonths));
}
