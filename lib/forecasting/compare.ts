import { forecast } from "./engine";
import type { Scenario, ScenarioWithResult } from "./types";

export function compareScenarios(scenarios: Scenario[], horizon = 12): ScenarioWithResult[] {
  return scenarios.map((scenario) => ({ ...scenario, result: forecast(scenario.assumptions, horizon) }));
}
