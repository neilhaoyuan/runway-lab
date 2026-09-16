"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ComparisonLineChart } from "@/components/charts";
import { RunwayLandscapeLazy } from "@/components/runway-landscape-lazy";
import { forecast } from "@/lib/forecasting/engine";
import { assumptionsFromHistory } from "@/lib/forecasting/opening";
import { useFinancialModel } from "@/components/financial-model-provider";
import { money, monthLabel } from "@/lib/format";

export default function ComparePage() {
  const model = useFinancialModel();
  const { history } = model;
  const [baselineId, setBaselineId] = useState(model.activeScenarioId);
  const [comparisonId, setComparisonId] = useState(() => model.scenarios.find((scenario) => scenario.id !== model.activeScenarioId)?.id ?? model.activeScenarioId);
  const scenarioResults = useMemo(() => model.scenarios.map((scenario) => {
    const nextAssumptions = assumptionsFromHistory(scenario.assumptions, history);
    return { ...scenario, assumptions: nextAssumptions, result: forecast(nextAssumptions, 12, scenario.overrides) };
  }), [history, model.scenarios]);

  const baseline = scenarioResults.find((scenario) => scenario.id === baselineId) ?? scenarioResults[0];
  const comparison = scenarioResults.find((scenario) => scenario.id === comparisonId && scenario.id !== baseline.id)
    ?? scenarioResults.find((scenario) => scenario.id !== baseline.id)
    ?? baseline;
  const baselineFinal = baseline.result.months.at(-1)!;
  const comparisonFinal = comparison.result.months.at(-1)!;
  const drivers = [
    { name: "Revenue", detail: "Month 12 revenue", impact: comparisonFinal.revenue - baselineFinal.revenue },
    { name: "Payroll", detail: "Month 12 payroll", impact: comparisonFinal.payroll - baselineFinal.payroll },
    { name: "Marketing", detail: "Month 12 marketing spend", impact: comparisonFinal.marketing - baselineFinal.marketing },
    { name: "Operating cash flow", detail: "Month 12 operating cash flow", impact: comparisonFinal.operatingCashFlow - baselineFinal.operatingCashFlow },
    { name: "Ending cash", detail: "Cash after 12 months", impact: comparisonFinal.endingCash - baselineFinal.endingCash },
  ];

  return <AppShell title="Compare">
    <div className="mb-6"><p className="eyebrow">Compare</p><h1 className="mt-2 text-2xl font-medium tracking-[-.035em]">Operating plans</h1><p className="mt-2 text-xs text-zinc-600">Review the next twelve months side by side.</p></div>
    <section className="panel overflow-hidden"><div className="scrollbar overflow-x-auto"><table className="w-full min-w-[760px] border-collapse"><thead><tr><th className="border-b border-line p-4 text-left text-[9px] font-normal uppercase tracking-[.15em] text-zinc-600">Metric</th>{scenarioResults.map((scenario) => <th key={scenario.id} className="border-b border-l border-line p-4 text-left"><span className="text-[11px] font-medium">{scenario.name}</span><span className="mt-1 block text-[9px] font-normal text-zinc-600">{scenario.description}</span></th>)}</tr></thead><tbody>{[
      ["Opening cash", (scenario: typeof scenarioResults[0]) => money(scenario.assumptions.startingCash)],
      ["Ending cash", (scenario: typeof scenarioResults[0]) => money(scenario.result.endingCash)],
      ["Ending revenue", (scenario: typeof scenarioResults[0]) => money(scenario.result.endingRevenue)],
      ["Ending burn", (scenario: typeof scenarioResults[0]) => money(scenario.result.endingBurn)],
      ["Break-even", (scenario: typeof scenarioResults[0]) => scenario.result.breakEvenMonth ? monthLabel(scenario.result.breakEvenMonth, true) : "Not reached"],
    ].map(([label, getter]) => <tr key={String(label)}><th className="border-b border-line px-4 py-3 text-left text-[10px] font-normal text-zinc-500">{String(label)}</th>{scenarioResults.map((scenario) => <td key={scenario.id} className="border-b border-l border-line px-4 py-3 font-mono text-xs text-zinc-200">{(getter as (value: typeof scenario) => string)(scenario)}</td>)}</tr>)}</tbody></table></div></section>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <section className="panel p-5"><div className="mb-3"><p className="text-xs font-medium">Cash forecast</p><p className="mt-1 text-[10px] text-zinc-600">Next twelve months</p></div><div className="h-[320px]"><ComparisonLineChart scenarios={scenarioResults}/></div></section>
      <section className="panel p-5">
        <div><p className="text-xs font-medium">Scenario differences</p><p className="mt-1 text-[10px] text-zinc-600">{comparison.name} minus {baseline.name} at month 12</p></div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label><span className="mb-1.5 block text-[10px] text-zinc-500">Baseline</span><select className="input !h-9 text-xs" value={baseline.id} onChange={(event) => setBaselineId(event.target.value)}>{scenarioResults.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}</select></label>
          <label><span className="mb-1.5 block text-[10px] text-zinc-500">Compare with</span><select className="input !h-9 text-xs" value={comparison.id} onChange={(event) => setComparisonId(event.target.value)}>{scenarioResults.filter((scenario) => scenario.id !== baseline.id).map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}</select></label>
        </div>
        <div className="mt-4 divide-y divide-line">{drivers.map((driver) => <div key={driver.name} className="flex items-center justify-between py-3"><div><p className="text-[11px] text-zinc-300">{driver.name}</p><p className="mt-1 text-[9px] text-zinc-600">{driver.detail}</p></div><span className={`flex items-center gap-1 font-mono text-xs ${driver.impact > 0 ? "text-acid" : driver.impact < 0 ? "text-[#e79a91]" : "text-zinc-500"}`}>{driver.impact > 0 ? <ArrowUpRight size={12}/> : driver.impact < 0 ? <ArrowDownRight size={12}/> : <Minus size={12}/>} {driver.impact > 0 ? "+" : ""}{money(driver.impact)}</span></div>)}</div>
      </section>
    </div>
    <section className="panel mt-5 p-4"><div className="mb-3 px-1"><p className="text-sm font-medium">Runway Landscape</p><p className="mt-1 text-xs text-zinc-500">Twelve actual months branching into twelve-month plans</p></div><div className="h-[390px]"><RunwayLandscapeLazy scenarios={scenarioResults} history={history} selectedScenarioId={baseline.id} onScenarioSelect={setBaselineId}/></div></section>
  </AppShell>;
}
