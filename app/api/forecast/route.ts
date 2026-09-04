import { NextResponse } from "next/server";
import { z } from "zod";
import { forecast } from "@/lib/forecasting/engine";
import { assumptionsSchema } from "@/lib/forecasting/schema";

const requestSchema = z.object({ assumptions: assumptionsSchema, horizon: z.number().int().min(1).max(60).default(12) });

export async function POST(request: Request) {
  try {
    const { assumptions, horizon } = requestSchema.parse(await request.json());
    return NextResponse.json(forecast(assumptions, horizon));
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Forecast failed." }, { status: 500 });
  }
}
