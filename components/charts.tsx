"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money, monthLabel } from "@/lib/format";
import type { ScenarioWithResult } from "@/lib/forecasting/types";

const tooltipStyle = { background: "var(--tooltip-bg)", border: "1px solid rgb(var(--color-line))", borderRadius: 6, fontSize: 12, color: "var(--tooltip-text)" };
const tooltipProps = { contentStyle: tooltipStyle, itemStyle: { color: "var(--tooltip-text)" }, labelStyle: { color: "var(--chart-muted)", marginBottom: 4 } };

export function CashForecastChart({ scenarios }: { scenarios: ScenarioWithResult[] }) {
  const data = scenarios[0].result.months.map((month, index) => ({ month: monthLabel(month.month, index === 0), ...Object.fromEntries(scenarios.map((scenario) => [scenario.id, scenario.result.months[index].endingCash])) }));
  return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}><CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--chart-muted)", fontSize: 11 }} interval={0}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--chart-muted)", fontSize: 11 }} tickFormatter={(v) => money(v)} /><Tooltip {...tooltipProps} formatter={(value) => money(Number(value))}/>{scenarios.map((scenario) => { const color = scenario.id === "base" ? "var(--accent-css)" : scenario.color; return <Area key={scenario.id} type="monotone" dataKey={scenario.id} name={scenario.name} stroke={color} fill={color} fillOpacity={.07} strokeWidth={2} dot={false} />; })}</AreaChart></ResponsiveContainer>;
}

export function RevenueExpenseChart({ scenario }: { scenario: ScenarioWithResult }) {
  const data = scenario.result.months.map((month) => ({ month: monthLabel(month.month), revenue: month.revenue, expenses: month.totalExpenses }));
  return <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}><CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--chart-muted)", fontSize: 11 }} interval={0}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--chart-muted)", fontSize: 11 }} tickFormatter={(v) => money(v)}/><Tooltip {...tooltipProps} formatter={(value) => money(Number(value))}/><Legend iconType="line" iconSize={10} wrapperStyle={{ fontSize: 12, color: "var(--chart-muted)" }}/><Line type="monotone" dataKey="revenue" stroke="var(--accent-css)" strokeWidth={2} dot={false}/><Line type="monotone" dataKey="expenses" stroke="#7b8799" strokeWidth={1.5} dot={false}/></LineChart></ResponsiveContainer>;
}

export function ExpenseBar({ scenario }: { scenario: ScenarioWithResult }) {
  const final = scenario.result.months[0];
  const data = [{ name: "Payroll", value: final.payroll, color: "#5874d8" }, { name: "Cloud", value: final.cloud, color: "#3995a5" }, { name: "Marketing", value: final.marketing, color: "#8a72c7" }, { name: "Software", value: final.software, color: "#c58b45" }, { name: "Other", value: final.other, color: "#7b8799" }];
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 12 }}><XAxis type="number" hide/><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--chart-muted)", fontSize: 12 }} width={72}/><Tooltip cursor={{ fill: "rgb(var(--color-line) / .18)" }} {...tooltipProps} formatter={(value) => money(Number(value))}/><Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={11}>{data.map((item) => <Cell key={item.name} fill={item.color}/>)}</Bar></BarChart></ResponsiveContainer>;
}

export function ComparisonLineChart({ scenarios }: { scenarios: ScenarioWithResult[] }) {
  const data = scenarios[0].result.months.map((month, index) => ({ month: monthLabel(month.month), ...Object.fromEntries(scenarios.map((scenario) => [scenario.id, scenario.result.months[index].endingCash])) }));
  return <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 5, right: 15, left: -5, bottom: 0 }}><CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--chart-muted)", fontSize: 11 }} interval={0}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--chart-muted)", fontSize: 11 }} tickFormatter={(v) => money(v)}/><Tooltip {...tooltipProps} formatter={(value) => money(Number(value))}/><Legend verticalAlign="top" align="right" height={34} iconType="line" iconSize={12} wrapperStyle={{ fontSize: 12, color: "var(--chart-muted)" }}/>{scenarios.map((scenario) => <Line key={scenario.id} name={scenario.name} type="monotone" dataKey={scenario.id} stroke={scenario.id === "base" ? "var(--accent-css)" : scenario.color} strokeWidth={scenario.id === "base" ? 2.5 : 1.7} strokeDasharray={scenario.id === "base" ? undefined : "5 4"} dot={false}/>)}</LineChart></ResponsiveContainer>;
}
