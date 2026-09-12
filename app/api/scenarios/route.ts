import { NextResponse } from "next/server";
import { z } from "zod";
import { forecast } from "@/lib/forecasting/engine";
import { assumptionsSchema } from "@/lib/forecasting/schema";
import { createClient } from "@/lib/supabase/server";

const createScenarioSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  assumptions: assumptionsSchema,
});

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured; demo mode remains available." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data, error } = await supabase.from("scenarios").select("*, scenario_assumptions(assumptions_json)").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ scenarios: data });
}

export async function POST(request: Request) {
  try {
    const input = createScenarioSchema.parse(await request.json());
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: "Supabase is not configured; demo mode remains available." }, { status: 503 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: scenario, error: scenarioError } = await supabase.from("scenarios").insert({ company_id: input.companyId, name: input.name, description: input.description }).select("id").single();
    if (scenarioError) return NextResponse.json({ error: scenarioError.message }, { status: 400 });

    const result = forecast(input.assumptions, 12);
    const [assumptionsWrite, resultsWrite] = await Promise.all([
      supabase.from("scenario_assumptions").insert({ scenario_id: scenario.id, assumptions_json: input.assumptions }),
      supabase.from("scenario_results").insert(result.months.map((month) => ({ scenario_id: scenario.id, month: `${month.month}-01`, revenue: month.revenue, expenses: month.totalExpenses, net_cash_flow: month.netCashFlow, ending_cash: month.endingCash, calculation_version: "v1" }))),
    ]);
    const writeError = assumptionsWrite.error ?? resultsWrite.error;
    if (writeError) {
      await supabase.from("scenarios").delete().eq("id", scenario.id);
      return NextResponse.json({ error: writeError.message }, { status: 400 });
    }
    return NextResponse.json({ id: scenario.id, result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Unable to persist scenario." }, { status: 500 });
  }
}
