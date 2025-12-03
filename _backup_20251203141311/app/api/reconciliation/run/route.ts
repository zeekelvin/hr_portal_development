// app/api/reconciliation/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * DELETE /api/reconciliation/run?id=<run_id>
 * Deletes a reconciliation_run and all of its reconciliation_rows.
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("id");

  if (!runId) {
    return NextResponse.json(
      { error: "Missing id query parameter" },
      { status: 400 }
    );
  }

  try {
    // First delete detail rows
    const { error: rowsError } = await supabaseAdmin
      .from("reconciliation_rows")
      .delete()
      .eq("run_id", runId);

    if (rowsError) {
      console.error("Failed to delete reconciliation_rows", rowsError);
      return NextResponse.json(
        { error: "Failed to delete reconciliation rows", supabaseError: rowsError },
        { status: 500 }
      );
    }

    // Then delete the run
    const { error: runError } = await supabaseAdmin
      .from("reconciliation_runs")
      .delete()
      .eq("id", runId);

    if (runError) {
      console.error("Failed to delete reconciliation_run", runError);
      return NextResponse.json(
        { error: "Failed to delete reconciliation run", supabaseError: runError },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete reconciliation run error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
