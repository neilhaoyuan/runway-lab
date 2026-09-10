import { NextResponse } from "next/server";
import { z } from "zod";
import { parseScenarioCommand } from "@/lib/ai/parse-scenario";

const requestSchema = z.object({ command: z.string().min(3).max(500) });

export async function POST(request: Request) {
  try {
    const { command } = requestSchema.parse(await request.json());
    const patch = parseScenarioCommand(command);
    return NextResponse.json({ patch, source: "deterministic-demo-parser" });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return NextResponse.json({ error: "Could not parse that command." }, { status: 400 });
  }
}
