"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, CircleGauge, DollarSign, Plus, TrendingUp, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CashForecastChart, ExpenseBar, RevenueExpenseChart } from "@/components/charts";
import { RunwayLandscapeLazy } from "@/components/runway-landscape-lazy";
import { money, percent } from "@/lib/format";
import { forecast } from "@/lib/forecasting/engine";
import { assumptionsFromHistory } from "@/lib/forecasting/opening";
import { useFinancialModel } from "@/components/financial-model-provider";

export default function DashboardPage() {
  const model = useFinancialModel();
  const { history } = model;
  const scenarioResults = useMemo(() => model.scenarios.map((scenario) => {
    const nextAssumptions = assumptionsFromHistory(scenario.assumptions, history);
    return { ...scenario, assumptions: nextAssumptions, result: forecast(nextAssumptions, 12, scenario.overrides) };
  }), [history, model.scenarios]);
  const base = scenarioResults.find((scenario) => scenario.id === model.activeScenarioId) ?? scenarioResults[0];
  const first = base.result.months[0];
  const metrics = [
    { label: "Current cash", value: money(base.assumptions.startingCash), meta: "As of Sep 2026", icon: DollarSign },
    { label: "Monthly revenue", value: money(base.assumptions.startingRevenue), meta: `${percent(base.assumptions.monthlyRevenueGrowth)} MoM growth`, icon: TrendingUp },
    { label: "Monthly burn", value: money(Math.max(0, -first.netCashFlow)), meta: `${money(first.totalExpenses)} total OpEx`, icon: CircleGauge },
    { label: "12-month cash", value: money(base.result.endingCash), meta: `${money(base.result.endingCash - base.assumptions.startingCash)} net change`, icon: WalletCards },
  ];
  return <AppShell title="Overview" action={<Link href="/scenarios" className="button-primary !h-10 !px-4 text-sm"><Plus size={14}/> New scenario</Link>}>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Overview</p><h1 className="mt-2 text-2xl font-medium tracking-[-.035em]">Financial overview</h1></div><label className="min-w-[220px]"><span className="mb-1.5 block text-xs text-zinc-500">Scenario</span><select className="input !h-9" value={model.activeScenarioId} onChange={(event) => model.setActiveScenarioId(event.target.value)}>{model.scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}</select></label></div>
    <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric, index) => <div key={metric.label} className="bg-panel p-5"><div className="flex items-center justify-between"><p className="eyebrow">{metric.label}</p><metric.icon size={14} className="text-zinc-600" /></div><p className="metric mt-4 text-[28px] leading-none text-zinc-100">{metric.value}</p><p className={`mt-2 text-[10px] ${index === 1 ? "text-acid" : "text-zinc-600"}`}>{metric.meta}</p></div>)}</div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
      <section className="panel p-4"><div className="mb-3 flex items-start justify-between px-1"><div><p className="text-sm font-medium">Runway Landscape</p><p className="mt-1 text-xs text-zinc-500">Historical cash branching into operating scenarios</p></div><Link href="/compare" className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white">Compare plans <ArrowUpRight size={12}/></Link></div><div className="h-[350px]"><RunwayLandscapeLazy scenarios={scenarioResults} history={history} selectedScenarioId={model.activeScenarioId} onScenarioSelect={model.setActiveScenarioId}/></div></section>
      <section className="panel p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-medium">Operating assumptions</p><p className="mt-1 text-[10px] text-zinc-600">{base.name}</p></div><Link href="/scenarios" className="text-[10px] text-zinc-500 hover:text-white">Edit</Link></div><div className="mt-5 divide-y divide-line">{[
        ["Revenue growth", percent(first.revenueGrowth), "Next forecast month"],
        ["Planned hires", `${base.assumptions.hires.reduce((s,h) => s+h.count,0)}`, "Through Jul 2027"],
        ["Cloud / revenue", percent(first.cloud / first.revenue), "Next forecast month"],
        ["Marketing", money(first.marketing), "Next forecast month"],
        ["Funding", money(base.result.months.reduce((sum, month) => sum + month.funding, 0)), "Next 12 months"],
      ].map(([label, value, note]) => <div key={label} className="flex items-center justify-between py-4"><div><p className="text-[11px] text-zinc-300">{label}</p><p className="mt-1 text-[9px] text-zinc-600">{note}</p></div><span className="font-mono text-xs text-zinc-200">{value}</span></div>)}</div><Link href="/model" className="button-ghost mt-4 w-full !h-9 text-[11px]">Open financial model <ArrowUpRight size={12}/></Link></section>
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_.8fr]">
      <section className="panel p-5 xl:col-span-1"><div className="mb-3"><p className="text-xs font-medium">Cash forecast</p><p className="mt-1 text-[10px] text-zinc-600">Next twelve months</p></div><div className="h-56"><CashForecastChart scenarios={[base]}/></div></section>
      <section className="panel p-5"><div className="mb-3"><p className="text-xs font-medium">Revenue vs expenses</p><p className="mt-1 text-[10px] text-zinc-600">Break-even: {base.result.breakEvenMonth ?? "Beyond horizon"}</p></div><div className="h-56"><RevenueExpenseChart scenario={base}/></div></section>
      <section className="panel p-5"><div className="mb-3"><p className="text-xs font-medium">Expense mix</p><p className="mt-1 text-[10px] text-zinc-600">First forecast month</p></div><div className="h-56"><ExpenseBar scenario={base}/></div></section>
    </div>
  </AppShell>;
}
