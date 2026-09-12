import { NextResponse } from "next/server";
import { modelStateSchema } from "@/lib/model-state";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Cloud save is not configured." }, { status: 503 });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data, error } = await supabase.from("model_states").select("state_json, updated_at").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ state: null, updatedAt: null });
  const parsed = modelStateSchema.safeParse(data.state_json);
  if (!parsed.success) return NextResponse.json({ error: "The saved model is invalid and was not loaded." }, { status: 409 });
  return NextResponse.json({ state: parsed.data, updatedAt: data.updated_at });
}

export async function PUT(request: Request) {
  try {
    const state = modelStateSchema.parse(await request.json());
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: "Cloud save is not configured." }, { status: 503 });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("model_states").upsert({ user_id: user.id, state_json: state, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).select("updated_at").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ saved: true, updatedAt: data.updated_at });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save the model." }, { status: 400 });
  }
}
