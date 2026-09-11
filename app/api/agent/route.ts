import { NextResponse } from "next/server";
import { agentPlanJsonSchema, agentPlanSchema, agentRequestSchema, type AgentRequest } from "@/lib/agent/types";
import { localAgentPlan } from "@/lib/agent/local-planner";

function agentPrompt(request: AgentRequest) {
  return `You are a financial-modeling agent. Interpret the user's request and return only the structured plan required by the response schema.

You may propose only these actions: create_scenario, update_scenario, update_scenario_details, select_scenario, delete_scenario, adjust_actual, resolve_reconciliation_issue.
Never invent scenario IDs, issue IDs, months, or current values. Use only IDs in the context. Never resolve a reconciliation issue unless the user has provided enough accounting detail to identify the correction. Ask focused questions when the authoritative source or accounting treatment is ambiguous. Do not calculate forecast outputs; the deterministic engine does that after approval. Destructive actions require a clearly worded action label.

Context:
${JSON.stringify(request.context)}

User request:
${request.message}`;
}

async function geminiPlan(request: AgentRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ model, input: agentPrompt(request), response_format: { type: "text", mime_type: "application/json", schema: agentPlanJsonSchema } }),
  });
  if (!response.ok) {
    const body = await response.text();
    let detail = body.slice(0, 500);
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } };
      detail = parsed.error?.message ?? detail;
    } catch { /* Preserve the text response for server diagnostics. */ }
    throw new Error(`AI provider request failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  const data = await response.json() as { steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
  const text = data.steps?.flatMap((step) => step.type === "model_output" ? step.content ?? [] : []).find((content) => content.type === "text")?.text;
  if (!text) throw new Error("Gemini returned no structured plan");
  return agentPlanSchema.parse(JSON.parse(text));
}

export async function POST(request: Request) {
  try {
    const input = agentRequestSchema.parse(await request.json());
    try {
      const plan = await geminiPlan(input);
      if (plan) return NextResponse.json({ plan, provider: "gemini" });
    } catch (error) {
      console.error("Financial agent provider failed; using local fallback.", error);
      const plan = localAgentPlan(input);
      return NextResponse.json({ plan, provider: "local", notice: "The financial agent used its built-in command parser for this request." });
    }
    return NextResponse.json({ plan: localAgentPlan(input), provider: "local", notice: "The financial agent used its built-in command parser for this request." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create an agent plan." }, { status: 400 });
  }
}
