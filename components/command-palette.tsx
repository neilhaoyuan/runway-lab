"use client";

import { Bot, Check, Command, CornerDownLeft, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFinancialModel } from "./financial-model-provider";
import type { AgentAction, AgentPlan } from "@/lib/agent/types";
import { money, percent } from "@/lib/format";
import { reconciliationIssueId } from "@/lib/financial-workbook";

function actionDetails(action: AgentAction) {
  const details: string[] = [];
  const patch = action.patch;
  if (patch?.monthlyRevenueGrowth !== undefined) details.push(`Revenue growth → ${percent(patch.monthlyRevenueGrowth)}`);
  if (patch?.basePayroll !== undefined) details.push(`Base payroll → ${money(patch.basePayroll)} / month`);
  if (patch?.cloudPercentOfRevenue !== undefined) details.push(`Cloud / revenue → ${percent(patch.cloudPercentOfRevenue)}`);
  if (patch?.marketingMonthly !== undefined) details.push(`Marketing → ${money(patch.marketingMonthly)} / month`);
  if (patch?.softwareMonthly !== undefined) details.push(`Software → ${money(patch.softwareMonthly)} / month`);
  if (patch?.otherMonthly !== undefined) details.push(`Other OpEx → ${money(patch.otherMonthly)} / month`);
  patch?.hires?.forEach((hire) => details.push(`Add ${hire.count} ${hire.role}${hire.count === 1 ? "" : "s"} in ${hire.startMonth}`));
  patch?.fundingEvents?.forEach((event) => details.push(`Add ${money(event.amount)} funding in ${event.month}`));
  if (action.type === "adjust_actual" && action.month && action.field && action.value !== undefined) details.push(`${action.month} ${action.field} → ${money(action.value)}`);
  return details;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const model = useFinancialModel();
  const [command, setCommand] = useState("");
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [priorQuestions, setPriorQuestions] = useState<string[]>([]);
  const priorQuestionsRef = useRef<string[]>([]);

  useEffect(() => {
    priorQuestionsRef.current = priorQuestions;
  }, [priorQuestions]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape" && open) onClose(); };
    const receivePrompt = (event: Event) => {
      const prompt = (event as CustomEvent<{ command?: string }>).detail?.command;
      if (prompt && priorQuestionsRef.current.length === 0) {
        setCommand(prompt);
        setPlan(null);
        setResponse(null);
        setNotice(null);
      }
    };
    window.addEventListener("keydown", listener);
    window.addEventListener("runway:open-agent", receivePrompt);
    return () => {
      window.removeEventListener("keydown", listener);
      window.removeEventListener("runway:open-agent", receivePrompt);
    };
  }, [open, onClose]);

  if (!open) return null;

  function changeCommand(value: string) {
    setCommand(value);
    setPlan(null);
    setResponse(null);
  }

  async function createPlan() {
    if (command.trim().length < 2) { setResponse("Describe what you want the agent to do."); return; }
    setLoading(true);
    setResponse(null);
    try {
      const issues = model.pendingImport?.report.issues ?? [];
      const message = priorQuestions.length
        ? `The agent previously asked:\n${priorQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")}\nThe user answered: ${command}`
        : command;
      const result = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          context: {
            activeScenarioId: model.activeScenarioId,
            scenarios: model.scenarios.map(({ id, name, description, assumptions }) => ({
              id,
              name,
              description,
              assumptions: {
                monthlyRevenueGrowth: assumptions.monthlyRevenueGrowth,
                basePayroll: assumptions.basePayroll,
                cloudPercentOfRevenue: assumptions.cloudPercentOfRevenue,
                marketingMonthly: assumptions.marketingMonthly,
                softwareMonthly: assumptions.softwareMonthly,
                otherMonthly: assumptions.otherMonthly,
                hires: assumptions.hires,
                fundingEvents: assumptions.fundingEvents,
              },
            })),
            history: (model.pendingImport?.history ?? model.history).map(({ month, revenue, payroll, cloud, marketing, software, other, cash, accountsReceivable, prepaids, fixedAssets, accountsPayable, accruedExpenses, debt, shareholdersEquity }) => ({ month, revenue, payroll, cloud, marketing, software, other, cash, accountsReceivable, prepaids, fixedAssets, accountsPayable, accruedExpenses, debt, shareholdersEquity })),
            reconciliationIssues: issues.map((issue, index) => ({ ...issue, id: reconciliationIssueId(issue, index) })),
          },
        }),
      });
      const data = await result.json();
      if (!result.ok) { setResponse(data.error ?? "Could not create an agent plan."); return; }
      const nextPlan = data.plan as AgentPlan;
      if (nextPlan.questions.length) {
        setPlan(null);
        setResponse(nextPlan.reply);
        setPriorQuestions(nextPlan.questions);
      } else {
        setPlan(nextPlan);
        setPriorQuestions([]);
      }
      setNotice(data.notice ?? null);
    } catch {
      setResponse("Could not reach the financial agent.");
    } finally { setLoading(false); }
  }

  function applyPlan() {
    if (!plan?.actions.length) return;
    model.applyAgentActions(plan.actions);
    setResponse(`Applied: ${plan.actions.map((action) => action.label).join("; ")}. ${plan.reply}`);
    setPlan(null);
    setCommand("");
  }

  function answerQuestions(questions: string[]) {
    setPriorQuestions(questions);
    setPlan(null);
    setCommand("");
    setResponse(null);
  }

  function cancelAnswer() {
    setPriorQuestions([]);
    setCommand("");
    setResponse(null);
  }

  function answerQuestion(question: string) {
    answerQuestions(plan?.questions.length ? plan.questions : [question]);
  }

  const priorQuestion = priorQuestions.length > 0;
  const examples = ["Create a scenario called Downside based on Base Case with revenue growth at 2%", "Set marketing to $25k in Aggressive Growth", "Rename the current scenario to Board Plan", "Help me reconcile the uploaded statements"];
  return <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[9vh] backdrop-blur-sm" onMouseDown={onClose}>
    <div className="w-full max-w-2xl overflow-hidden rounded-md border border-line bg-panel shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center gap-3 border-b border-line px-4"><Bot size={18} className="text-acid" /><input autoFocus value={command} onChange={(event) => changeCommand(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createPlan(); }} placeholder={priorQuestions.length ? "Answer the agent’s questions…" : "Ask the agent to change or reconcile the model…"} className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600" /><button onClick={onClose} aria-label="Close financial agent"><X size={16} className="text-zinc-600" /></button></div>
      <div className="flex items-center border-b border-line px-4 py-2 text-xs text-zinc-500"><span>Active scenario: <span className="font-medium text-zinc-300">{model.activeScenario.name}</span></span></div>
      {priorQuestions.length > 0 && <div className="border-b border-amber-500/20 bg-amber-500/[.035] px-5 py-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0 flex-1"><p className="text-[10px] font-medium uppercase tracking-wider text-amber-500">Agent asked</p><ol className="mt-2 space-y-2">{priorQuestions.map((question, index) => <li key={`${question}-${index}`} className="flex gap-2 text-sm leading-5 text-zinc-300"><span className="font-mono text-xs text-amber-500">{index + 1}.</span><span>{question}</span></li>)}</ol></div><button onClick={cancelAnswer} className="shrink-0 text-xs text-zinc-500 hover:text-zinc-200">Cancel response</button></div></div>}
      {plan ? <div className="p-5"><div className="mb-4"><p className="text-sm font-medium">{plan.actions.length ? "Review agent plan" : "Agent needs more information"}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{plan.reply}</p></div>{plan.questions.length > 0 && <div className="mb-4 space-y-2">{plan.questions.map((question) => <button key={question} onClick={() => answerQuestion(question)} className="w-full rounded border border-amber-500/25 bg-amber-500/[.025] p-3 text-left text-xs leading-5 text-zinc-300"><span className="mb-1 block font-medium text-amber-500">Question</span>{question}<span className="mt-2 block text-acid">Answer this question →</span></button>)}</div>}{plan.actions.length > 0 && <div className="space-y-2">{plan.actions.map((action, index) => <div key={`${action.type}-${index}`} className={`rounded border p-3 ${action.type === "delete_scenario" ? "border-red-400/30 bg-red-500/[.025]" : "border-line"}`}><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-zinc-200">{action.label}</p><span className="font-mono text-[10px] uppercase text-zinc-600">{action.type.replaceAll("_", " ")}</span></div>{actionDetails(action).map((detail) => <p key={detail} className="mt-1.5 text-xs text-zinc-500">{detail}</p>)}{action.reason && <p className="mt-2 text-[10px] text-zinc-600">Reason: {action.reason}</p>}</div>)}</div>}<div className="mt-4 flex justify-end gap-2"><button className="button-ghost !h-9 text-xs" onClick={() => setPlan(null)}>Back</button>{plan.actions.length > 0 && <button className="button-primary !h-9 text-xs" onClick={applyPlan}><Check size={14} /> Approve and apply</button>}</div>{notice && <p className="mt-3 text-[10px] text-zinc-600">{notice}</p>}</div> : response ? <div className="p-5 text-sm leading-6 text-zinc-300">{response}</div> : priorQuestion ? <div className="p-5 text-xs leading-5 text-zinc-500">Type your answer above. The agent will keep this question attached as context.</div> : <div className="grid gap-2 p-4 sm:grid-cols-2">{examples.map((item) => <button key={item} onClick={() => changeCommand(item)} className="rounded border border-line p-3 text-left text-xs leading-5 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200">{item}</button>)}</div>}
      {!plan && <div className="flex items-center justify-between border-t border-line px-4 py-2"><span className="flex items-center gap-1 text-[10px] text-zinc-600"><Command size={11} /> Plans require approval</span><button onClick={createPlan} disabled={loading} className="flex items-center gap-1 text-xs text-acid disabled:opacity-50">{loading ? "Planning…" : priorQuestion ? "Send response" : "Create plan"} <CornerDownLeft size={11} /></button></div>}
    </div>
  </div>;
}
