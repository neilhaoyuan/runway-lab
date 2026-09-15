"use client";

import { CalendarPlus, Check, CircleDollarSign, Plus, Trash2, Users } from "lucide-react";
import { useMemo } from "react";
import { forecast } from "@/lib/forecasting/engine";
import type { Assumptions, FundingEvent, Hire } from "@/lib/forecasting/types";
import { money, monthLabel, percent } from "@/lib/format";
import { assumptionsFromHistory } from "@/lib/forecasting/opening";
import { CashForecastChart } from "./charts";
import { overridesFor, useFinancialModel } from "./financial-model-provider";

function NumberField({ label, value, onChange, prefix, suffix, step = 1 }: { label: string; value: number; onChange: (value: number) => void; prefix?: string; suffix?: string; step?: number }) {
  const display = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return <label><span className="mb-1.5 block text-xs text-zinc-400">{label}</span><span className="relative block">{prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{prefix}</span>}<input className={`input font-mono text-sm ${prefix ? "pl-6" : ""} ${suffix ? "pr-7" : ""}`} type="number" step={step} value={display} onChange={(event) => onChange(Number(event.target.value))}/>{suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{suffix}</span>}</span></label>;
}

export function ScenarioBuilder() {
  const model = useFinancialModel();
  const assumptions = assumptionsFromHistory(model.assumptions, model.history);
  const result = useMemo(() => forecast(assumptions, 12, model.overrides), [assumptions, model.overrides]);
  const current = { ...model.activeScenario, assumptions, result };

  function apply(next: Assumptions) {
    const opened = assumptionsFromHistory(next, model.history);
    model.setAssumptions(opened);
    model.setOverrides(overridesFor(opened));
  }

  function update<K extends keyof Assumptions>(key: K, value: Assumptions[K]) {
    apply({ ...assumptions, [key]: value });
  }

  function addHire() {
    const hire: Hire = { id: `hire-${Date.now()}`, role: "Software Engineer", count: 1, annualSalary: 160_000, startMonth: result.months[2]?.month ?? assumptions.startingMonth };
    update("hires", [...assumptions.hires, hire]);
  }

  function addFunding() {
    const event: FundingEvent = { id: `fund-${Date.now()}`, amount: 1_500_000, month: result.months[5]?.month ?? assumptions.startingMonth };
    update("fundingEvents", [...assumptions.fundingEvents, event]);
  }

  return <>
    <div className="scrollbar mb-5 flex gap-3 overflow-x-auto pb-1">
      {model.scenarios.map((scenario) => <button key={scenario.id} onClick={() => model.setActiveScenarioId(scenario.id)} className={`min-w-[220px] rounded-md border p-4 text-left transition ${scenario.id === model.activeScenarioId ? "border-acid/50 bg-acid/[.05]" : "border-line bg-panel hover:border-zinc-500"}`}><span className="block truncate text-sm font-medium text-zinc-100">{scenario.name}</span><span className="mt-1.5 block truncate text-xs text-zinc-500">{scenario.description || "No description"}</span></button>)}
      <button onClick={model.addScenario} className="flex min-w-[170px] items-center justify-center gap-2 rounded-md border border-dashed border-zinc-600 px-5 text-sm text-zinc-400 transition hover:border-acid/50 hover:text-acid"><Plus size={15} /> New scenario</button>
    </div>

    <div className="grid items-start gap-5 xl:grid-cols-[390px_1fr]">
      <section className="panel self-start overflow-hidden xl:sticky xl:top-20">
        <div className="border-b border-line p-4">
          <label className="eyebrow">Scenario name</label>
          <input className="mt-2 w-full bg-transparent text-lg font-medium tracking-[-.03em] outline-none" value={model.activeScenario.name} onChange={(event) => model.updateScenarioDetails(model.activeScenarioId, { name: event.target.value })} />
          <label className="mt-4 block text-xs text-zinc-400">Description</label>
          <textarea className="mt-1.5 min-h-16 w-full resize-none rounded border border-line bg-panel p-3 text-sm leading-5 text-zinc-200 outline-none focus:border-acid/50" placeholder="Describe this operating plan" value={model.activeScenario.description} onChange={(event) => model.updateScenarioDetails(model.activeScenarioId, { description: event.target.value })} />
        </div>

        <div className="scrollbar max-h-[610px] space-y-6 overflow-y-auto p-4">
          <div><p className="mb-3 text-sm font-medium text-zinc-200">Core assumptions</p><div className="grid grid-cols-2 gap-3"><NumberField label="Revenue growth" value={assumptions.monthlyRevenueGrowth * 100} onChange={(value) => update("monthlyRevenueGrowth", value / 100)} suffix="%" step={.1}/><NumberField label="Cloud / revenue" value={assumptions.cloudPercentOfRevenue * 100} onChange={(value) => update("cloudPercentOfRevenue", value / 100)} suffix="%" step={.1}/><NumberField label="Base payroll" value={assumptions.basePayroll} onChange={(value) => update("basePayroll", value)} prefix="$" step={1000}/><NumberField label="Marketing / mo" value={assumptions.marketingMonthly} onChange={(value) => update("marketingMonthly", value)} prefix="$" step={1000}/><NumberField label="Software / mo" value={assumptions.softwareMonthly} onChange={(value) => update("softwareMonthly", value)} prefix="$" step={500}/><NumberField label="Other OpEx / mo" value={assumptions.otherMonthly} onChange={(value) => update("otherMonthly", value)} prefix="$" step={500}/></div></div>

          <div><div className="mb-3 flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-medium text-zinc-200"><Users size={14} className="text-acid"/> Hiring plan</p><button onClick={addHire} className="text-xs text-zinc-400 hover:text-zinc-100"><Plus size={13} className="inline"/> Add hire</button></div><div className="space-y-2">{assumptions.hires.map((hire) => <div key={hire.id} className="rounded-md border border-line bg-black/15 p-3"><div className="mb-3 flex items-center gap-2"><input className="min-w-0 flex-1 bg-transparent text-sm text-zinc-200 outline-none" value={hire.role} onChange={(event) => update("hires", assumptions.hires.map((item) => item.id === hire.id ? {...item, role: event.target.value} : item))}/><button aria-label="Remove hire" onClick={() => update("hires", assumptions.hires.filter((item) => item.id !== hire.id))}><Trash2 size={13} className="text-zinc-600 hover:text-red-400"/></button></div><div className="grid grid-cols-3 gap-2"><NumberField label="Count" value={hire.count} onChange={(value) => update("hires", assumptions.hires.map((item) => item.id === hire.id ? {...item, count: value} : item))}/><NumberField label="Salary" value={hire.annualSalary} onChange={(value) => update("hires", assumptions.hires.map((item) => item.id === hire.id ? {...item, annualSalary: value} : item))} prefix="$" step={5000}/><label><span className="mb-1.5 block text-xs text-zinc-400">Starts</span><input className="input !px-2 font-mono text-xs" type="month" value={hire.startMonth} onChange={(event) => update("hires", assumptions.hires.map((item) => item.id === hire.id ? {...item, startMonth: event.target.value} : item))}/></label></div></div>)}</div></div>

          <div><div className="mb-3 flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-medium text-zinc-200"><CircleDollarSign size={14} className="text-acid"/> Funding events</p><button onClick={addFunding} className="text-xs text-zinc-400 hover:text-white"><Plus size={13} className="inline"/> Add event</button></div>{assumptions.fundingEvents.length === 0 ? <button onClick={addFunding} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line py-4 text-xs text-zinc-500 hover:border-zinc-600"><CalendarPlus size={14}/> No funding planned</button> : <div className="space-y-2">{assumptions.fundingEvents.map((event) => <div key={event.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-lg border border-line bg-black/15 p-3"><NumberField label="Amount" value={event.amount} onChange={(value) => update("fundingEvents", assumptions.fundingEvents.map((item) => item.id === event.id ? {...item, amount: value} : item))} prefix="$" step={100000}/><label><span className="mb-1.5 block text-xs text-zinc-400">Month</span><input className="input !px-2 font-mono text-xs" type="month" value={event.month} onChange={(change) => update("fundingEvents", assumptions.fundingEvents.map((item) => item.id === event.id ? {...item, month: change.target.value} : item))}/></label><button aria-label="Remove funding event" className="mb-3" onClick={() => update("fundingEvents", assumptions.fundingEvents.filter((item) => item.id !== event.id))}><Trash2 size={13} className="text-zinc-600 hover:text-red-400"/></button></div>)}</div>}</div>
        </div>

        <div className="border-t border-line px-4 py-3"><div className="flex items-center justify-center gap-2 text-xs text-zinc-400"><Check size={13} className="text-acid" /> Changes saved automatically</div></div>
      </section>

      <div className="min-w-0 space-y-5">
        <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">{[["Opening cash", money(assumptions.startingCash)], ["12-mo cash", money(result.endingCash)], ["12-mo revenue", money(result.endingRevenue)], ["Break-even", result.breakEvenMonth ? monthLabel(result.breakEvenMonth, true) : "Not reached"]].map(([label,value]) => <div key={label} className="bg-panel p-4"><p className="eyebrow">{label}</p><p className="metric mt-3 text-lg">{value}</p></div>)}</div>
        <section className="panel p-5"><div className="mb-3"><p className="text-sm font-medium">Cash forecast</p><p className="mt-1 text-xs text-zinc-500">Next twelve months</p></div><div className="h-[440px]"><CashForecastChart scenarios={[current]}/></div></section>
        <section className="panel p-5"><p className="text-sm font-medium">Plan summary</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Growth", percent(assumptions.monthlyRevenueGrowth)], ["New headcount", String(assumptions.hires.reduce((sum, hire) => sum + hire.count, 0))], ["New annual payroll", money(assumptions.hires.reduce((sum, hire) => sum + hire.count * hire.annualSalary, 0))], ["Capital planned", money(assumptions.fundingEvents.reduce((sum, event) => sum + event.amount, 0))]].map(([label,value]) => <div key={label} className="rounded-lg border border-line bg-black/10 p-3"><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 font-mono text-sm text-zinc-200">{value}</p></div>)}</div></section>
      </div>
    </div>
  </>;
}
