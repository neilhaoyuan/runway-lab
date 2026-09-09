import type { ScenarioPatch } from "./schema";
import type { Assumptions, HistoricalMonth, ModelOverride } from "./types";
import { assumptionsFromHistory } from "./opening";

export function applyScenarioPatch(assumptions: Assumptions, overrides: ModelOverride[], history: HistoricalMonth[], patch: ScenarioPatch) {
  const nextAssumptions = assumptionsFromHistory({
    ...assumptions,
    ...patch,
    hires: patch.hires ? [...assumptions.hires, ...patch.hires] : assumptions.hires,
    fundingEvents: patch.fundingEvents ? [...assumptions.fundingEvents, ...patch.fundingEvents] : assumptions.fundingEvents,
  }, history);
  let nextOverrides = overrides.map((override) => ({ ...override }));
  if (patch.monthlyRevenueGrowth !== undefined) nextOverrides = nextOverrides.map((override) => ({ ...override, revenueGrowth: patch.monthlyRevenueGrowth as number }));
  if (patch.basePayroll !== undefined) {
    const payrollDelta = patch.basePayroll - assumptions.basePayroll;
    nextOverrides = nextOverrides.map((override) => ({ ...override, payroll: override.payroll + payrollDelta }));
  }
  if (patch.marketingMonthly !== undefined) nextOverrides = nextOverrides.map((override) => ({ ...override, marketing: patch.marketingMonthly as number }));
  if (patch.softwareMonthly !== undefined) nextOverrides = nextOverrides.map((override) => ({ ...override, software: patch.softwareMonthly as number }));
  if (patch.otherMonthly !== undefined) nextOverrides = nextOverrides.map((override) => ({ ...override, other: patch.otherMonthly as number }));
  if (patch.cloudPercentOfRevenue !== undefined) {
    let revenue = nextAssumptions.startingRevenue;
    nextOverrides = nextOverrides.map((override) => {
      revenue *= 1 + override.revenueGrowth;
      return { ...override, cloud: revenue * (patch.cloudPercentOfRevenue as number) };
    });
  }
  if (patch.hires?.length) nextOverrides = nextOverrides.map((override) => ({
    ...override,
    payroll: override.payroll + patch.hires!.filter((hire) => override.month >= hire.startMonth).reduce((sum, hire) => sum + hire.count * hire.annualSalary / 12, 0),
  }));
  if (patch.fundingEvents?.length) nextOverrides = nextOverrides.map((override) => ({
    ...override,
    funding: override.funding + patch.fundingEvents!.filter((event) => event.month === override.month).reduce((sum, event) => sum + event.amount, 0),
  }));
  return { assumptions: nextAssumptions, overrides: nextOverrides };
}
