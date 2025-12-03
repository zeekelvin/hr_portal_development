import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("employees")
    .select("id, first_name, last_name, role, status, location")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const body = await req.json();
  const { data, error } = await supabase.from("employees").insert(body).select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data?.[0] ?? null, { status: 201 });
}
