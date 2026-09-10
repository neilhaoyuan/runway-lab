import { parseScenarioCommand } from "../ai/parse-scenario";
import { agentPlanSchema, type AgentPlan, type AgentRequest, type AgentScenarioPatch } from "./types";

function money(raw: string) {
  const normalized = raw.toLowerCase().replace(/[$,\s]/g, "");
  const multiplier = normalized.endsWith("m") ? 1_000_000 : normalized.endsWith("k") ? 1_000 : 1;
  return Number(normalized.replace(/[km]$/, "")) * multiplier;
}

function scenarioByText(request: AgentRequest, text: string) {
  const lower = text.toLowerCase();
  return request.context.scenarios.find((scenario) => lower.includes(scenario.name.toLowerCase()));
}

function parsedPatch(message: string): AgentScenarioPatch {
  try {
    const patch = parseScenarioCommand(message);
    return {
      ...patch,
      hires: patch.hires?.map(({ role, count, annualSalary, startMonth }) => ({ role, count, annualSalary, startMonth })),
      fundingEvents: patch.fundingEvents?.map(({ amount, month }) => ({ amount, month })),
    };
  } catch { return {}; }
}

export function localAgentPlan(request: AgentRequest): AgentPlan {
  const message = request.message.trim();
  const lower = message.toLowerCase();
  const active = request.context.scenarios.find((scenario) => scenario.id === request.context.activeScenarioId) ?? request.context.scenarios[0];
  const mentioned = scenarioByText(request, message);

  if (/reconcil|fix (?:the )?statements|statement (?:error|issue)/.test(lower) && request.context.reconciliationIssues.length) {
    const first = request.context.reconciliationIssues.find((issue) => issue.severity === "error") ?? request.context.reconciliationIssues[0];
    return agentPlanSchema.parse({ reply: `I found ${request.context.reconciliationIssues.length} reconciliation findings. I need source authority before proposing accounting adjustments.`, questions: [`For ${first.month ?? "the affected period"}, which source should be authoritative for “${first.message}”?`], actions: [] });
  }

  const actual = lower.match(/set\s+(revenue|payroll|cloud|marketing|software|other|cash|ending cash|accounts receivable|prepaids|fixed assets|accounts payable|accrued expenses|debt|shareholders equity)\s+(?:in|for)\s+(20\d{2}-(?:0[1-9]|1[0-2]))\s+to\s+([$]?\d[\d,.]*\s*[km]?)/);
  if (actual) {
    const fields: Record<string, string> = { "cash": "endingCash", "ending cash": "endingCash", "accounts receivable": "accountsReceivable", "fixed assets": "fixedAssets", "accounts payable": "accountsPayable", "accrued expenses": "accruedExpenses", "shareholders equity": "shareholdersEquity" };
    const field = fields[actual[1]] ?? actual[1];
    return agentPlanSchema.parse({ reply: "I prepared one historical-statement adjustment.", questions: [], actions: [{ type: "adjust_actual", label: `Set ${actual[1]} for ${actual[2]} to ${actual[3]}`, month: actual[2], field, value: money(actual[3]), reason: message }] });
  }

  if (/\b(delete|remove)\b.*\bscenario\b|\b(delete|remove) scenario\b/.test(lower)) {
    const target = mentioned ?? (/\b(current|selected)\b/.test(lower) ? active : undefined);
    if (!target) return { reply: "I need to know which scenario to delete.", questions: ["Which scenario should I delete?"], actions: [] };
    return { reply: `I can delete ${target.name} after your approval.`, questions: [], actions: [{ type: "delete_scenario", label: `Delete scenario “${target.name}”`, scenarioId: target.id }] };
  }

  if (/\b(select|switch to|use)\b/.test(lower) && mentioned) return { reply: `I can switch the workspace to ${mentioned.name}.`, questions: [], actions: [{ type: "select_scenario", label: `Select ${mentioned.name}`, scenarioId: mentioned.id }] };

  const rename = message.match(/rename(?: the)?(?: current)? scenario to ["“]?([^"”]+)["”]?$/i);
  if (rename && active) return { reply: `I can rename ${active.name}.`, questions: [], actions: [{ type: "update_scenario_details", label: `Rename “${active.name}” to “${rename[1].trim()}”`, scenarioId: active.id, name: rename[1].trim() }] };

  if (/\b(create|new)\b.*\bscenario\b/.test(lower)) {
    const name = message.match(/(?:called|named)\s+["“]?([^"”]+?)["”]?(?:\s+(?:based|with)\b|$)/i)?.[1]?.trim();
    if (!name) return { reply: "I can create it once it has a name.", questions: ["What should the new scenario be called?"], actions: [] };
    const source = mentioned ?? active;
    const patch = parsedPatch(message);
    return { reply: `I can create ${name} from ${source?.name ?? "the current plan"}.`, questions: [], actions: [{ type: "create_scenario", label: `Create scenario “${name}”`, name, sourceScenarioId: source?.id, patch }] };
  }

  const patch = parsedPatch(message);
  const target = mentioned ?? active;
  if (Object.keys(patch).length && target) return { reply: `I prepared changes for ${target.name}.`, questions: [], actions: [{ type: "update_scenario", label: `Update ${target.name}`, scenarioId: target.id, patch }] };
  return { reply: "I need a little more detail before changing the model.", questions: ["Do you want to modify a scenario, create a new scenario, or reconcile an uploaded statement?"], actions: [] };
}
