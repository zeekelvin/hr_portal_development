// app/api/reconciliation/ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RawRow = {
  client_name: string;
  employee_name: string;
  service_date: string; // ISO date string
  carecenta_hours: number | null;
  hha_hours: number | null;
  confirmed_appts: number | null;
  units: number | null;
  raw: Record<string, any>;
};

function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  // Strip everything except digits, dot, minus, colon (for H:MM)
  const s = String(value).trim();

  // Handle "51:15 Hrs" -> 51.25
  const timeMatch = s.match(/(\d+)\s*[:]\s*(\d+)/);
  if (timeMatch) {
    const hours = parseFloat(timeMatch[1] || "0");
    const mins = parseFloat(timeMatch[2] || "0");
    return hours + mins / 60;
  }

  // Generic numeric − strip non-numeric (except dot and minus)
  const cleaned = s.replace(/[^\d\.\-]/g, "");
  if (!cleaned) return null;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseIntSafe(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).replace(/[^\d\-]/g, "");
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function parseDate(value: any): string | null {
  if (!value) return null;

  // Excel serial date
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return null;
    const jsDate = new Date(Date.UTC(d.y, d.m - 1, d.d));
    return jsDate.toISOString().slice(0, 10);
  }

  const s = String(value).trim();
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function sheetToJsonRows(sheet: XLSX.WorkSheet): any[] {
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

/**
 * COMBINED FILE PARSER
 * For a single CareCenta export where you manually added HHAex hours in extra columns.
 * We scan the sheet to find the header row that contains:
 *   "Client"  + ("HHAex"/"HHAex Hours"/"HHA Hours") + ("CareCenta"/variants)
 * and optionally:
 *   "# of Appts" / "Confirmed Appts" / "# Appts" + "Units"
 */
function parseCombinedFile(buffer: Buffer, fallbackDate: string): RawRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  // Read as 2D array so we can choose our header row
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  });

  if (!rows || rows.length === 0) return [];

  let headerRowIndex = -1;
  let clientIdx = -1;
  let hhaIdx = -1;
  let careIdx = -1;
  let apptIdx = -1;
  let unitsIdx = -1;

  const norm = (v: any) =>
    String(v || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const normalized = row.map(norm);

    clientIdx = normalized.findIndex((c) => c === "client");
    hhaIdx = normalized.findIndex(
      (c) => c === "hhaex" || c === "hhaex hours" || c === "hha hours"
    );
    careIdx = normalized.findIndex(
      (c) =>
        c === "carecenta" ||
        c === "carecenta hours" ||
        c === "carecenta hrs" ||
        c === "carecenta hours (ddd evv)" ||
        c === "carecenta hrs (ddd evv)"
    );
    apptIdx = normalized.findIndex(
      (c) =>
        c === "# of appts" ||
        c === "confirmed appts" ||
        c === "# appts" ||
        c === "appointments"
    );
    unitsIdx = normalized.findIndex(
      (c) => c === "units" || c === "total units"
    );

    if (clientIdx !== -1 && hhaIdx !== -1 && careIdx !== -1) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.warn("parseCombinedFile: could not find a header row");
    return [];
  }

  const result: RawRow[] = [];
  let currentClient: string | null = null;

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];

    const rawClient =
      clientIdx >= 0 && clientIdx < row.length ? row[clientIdx] : null;
    if (rawClient && String(rawClient).trim().length > 0) {
      currentClient = String(rawClient).trim();
    }

    const rawHha = hhaIdx >= 0 && hhaIdx < row.length ? row[hhaIdx] : null;
    const rawCare = careIdx >= 0 && careIdx < row.length ? row[careIdx] : null;
    const rawAppts =
      apptIdx >= 0 && apptIdx < row.length ? row[apptIdx] : null;
    const rawUnits =
      unitsIdx >= 0 && unitsIdx < row.length ? row[unitsIdx] : null;

    const hhaHours = parseNumber(rawHha);
    const careHours = parseNumber(rawCare);
    const confirmed_appts = parseIntSafe(rawAppts);
    const units = parseNumber(rawUnits);

    // Skip rows that have no hours at all
    if (
      (hhaHours === null || isNaN(hhaHours)) &&
      (careHours === null || isNaN(careHours))
    ) {
      continue;
    }

    if (!currentClient) {
      // If we somehow have hours but no client label, ignore row
      continue;
    }

    result.push({
      client_name: currentClient,
      employee_name: "", // export is aggregated by client
      service_date: fallbackDate,
      carecenta_hours: careHours,
      hha_hours: hhaHours,
      confirmed_appts,
      units,
      raw: {
        rowIndex: r,
        row,
      },
    });
  }

  return result;
}

/**
 * DUAL FILE PARSER
 * For two separate exports (CareCenta + HHAeX).
 */
function parseDualFiles(careBuf: Buffer, hhaBuf: Buffer): RawRow[] {
  const careWb = XLSX.read(careBuf, { type: "buffer" });
  const hhaWb = XLSX.read(hhaBuf, { type: "buffer" });

  const careSheet = careWb.Sheets[careWb.SheetNames[0]];
  const hhaSheet = hhaWb.Sheets[hhaWb.SheetNames[0]];

  const careJson = sheetToJsonRows(careSheet);
  const hhaJson = sheetToJsonRows(hhaSheet);

  const key = (client: string, employee: string, date: string) =>
    `${client.toLowerCase()}|${employee.toLowerCase()}|${date}`;

  const careMap = new Map<
    string,
    { hours: number | null; appts: number | null; units: number | null; raw: any }
  >();

  for (const row of careJson) {
    const client =
      row["Client"] || row["Client Name"] || row["CLIENT"] || row["client"];
    const employee =
      row["Employee"] ||
      row["Employee Name"] ||
      row["EMPLOYEE"] ||
      row["Caregiver"];
    const dateVal = row["Service Date"] || row["Date"];

    const service_date = parseDate(dateVal);
    if (!client || !employee || !service_date) continue;

    const hoursVal =
      row["Hours"] ||
      row["CareCenta Hours"] ||
      row["Carecenta Hours"] ||
      row["Units"];
    const apptsVal =
      row["# of Appts"] || row["Confirmed Appts"] || row["# Appts"];
    const unitsVal = row["Units"] || row["Total Units"];

    careMap.set(key(client, employee, service_date), {
      hours: parseNumber(hoursVal),
      appts: parseIntSafe(apptsVal),
      units: parseNumber(unitsVal),
      raw: row,
    });
  }

  const rows: RawRow[] = [];

  for (const row of hhaJson) {
    const client =
      row["Client"] || row["Client Name"] || row["CLIENT"] || row["client"];
    const employee =
      row["Employee"] ||
      row["Employee Name"] ||
      row["EMPLOYEE"] ||
      row["Caregiver"];
    const dateVal = row["Service Date"] || row["Date"];

    const service_date = parseDate(dateVal);
    if (!client || !employee || !service_date) continue;

    const hhaHoursVal =
      row["Hours"] || row["HHA Hours"] || row["HHAeX Hours"] || row["Units"];

    const k = key(client, employee, service_date);
    const careEntry = careMap.get(k);

    rows.push({
      client_name: String(client || "").trim(),
      employee_name: String(employee || "").trim(),
      service_date,
      carecenta_hours: careEntry?.hours ?? null,
      hha_hours: parseNumber(hhaHoursVal),
      confirmed_appts: careEntry?.appts ?? null,
      units: careEntry?.units ?? null,
      raw: {
        care: careEntry?.raw ?? null,
        hha: row,
      },
    });
  }

  return rows;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const mode = (form.get("mode") as string) || "combined";
    const period_start = form.get("period_start") as string;
    const period_end = form.get("period_end") as string;

    if (!period_start || !period_end) {
      return NextResponse.json(
        { error: "period_start and period_end are required" },
        { status: 400 }
      );
    }

    let rawRows: RawRow[] = [];

    if (mode === "dual") {
      const careFile = form.get("carecenta_file") as File | null;
      const hhaFile = form.get("hha_file") as File | null;
      if (!careFile || !hhaFile) {
        return NextResponse.json(
          { error: "Dual mode requires carecenta_file and hha_file" },
          { status: 400 }
        );
      }
      const careBuf = Buffer.from(await careFile.arrayBuffer());
      const hhaBuf = Buffer.from(await hhaFile.arrayBuffer());
      rawRows = parseDualFiles(careBuf, hhaBuf);
    } else {
      const combinedFile = form.get("combined_file") as File | null;
      if (!combinedFile) {
        return NextResponse.json(
          { error: "Combined mode requires combined_file" },
          { status: 400 }
        );
      }
      const combinedBuf = Buffer.from(await combinedFile.arrayBuffer());
      rawRows = parseCombinedFile(combinedBuf, period_start);
    }

    if (rawRows.length === 0) {
      return NextResponse.json(
        { error: "No usable rows found in uploaded file(s)" },
        { status: 400 }
      );
    }

    // Aggregate totals
    let totalCare = 0;
    let totalHha = 0;

    for (const r of rawRows) {
      totalCare += r.carecenta_hours ?? 0;
      totalHha += r.hha_hours ?? 0;
    }

    const varianceHours = totalHha - totalCare;
    const variancePercent =
      totalCare > 0 ? (varianceHours / totalCare) * 100 : null;

    // Insert run
    const { data: runInsert, error: runError } = await supabaseAdmin
      .from("reconciliation_runs")
      .insert({
        label: null,
        period_start,
        period_end,
        source_mode: mode,
        total_hours: totalHha || totalCare,
        total_carecenta_hours: totalCare,
        total_hha_hours: totalHha,
        variance_hours: varianceHours,
        variance_percent: variancePercent,
      })
      .select("id")
      .single();

    if (runError || !runInsert) {
      console.error("reconciliation_runs insert error", runError);
      return NextResponse.json(
        {
          error: "Failed to create reconciliation run",
          supabaseError: runError,
        },
        { status: 500 }
      );
    }

    const runId = runInsert.id as string;

    // Build rows for insert
    const rowsToInsert = rawRows
      .map((r) => {
        const care =
          r.carecenta_hours === null || r.carecenta_hours === undefined
            ? null
            : Number(r.carecenta_hours);
        const hha =
          r.hha_hours === null || r.hha_hours === undefined
            ? null
            : Number(r.hha_hours);
        const variance =
          care !== null && hha !== null
            ? Number((hha - care).toFixed(2))
            : null;

        return {
          run_id: runId,
          client_name: r.client_name || null,
          employee_name: r.employee_name || null,
          service_date: r.service_date || null,
          carecenta_hours: care,
          hha_hours: hha,
          variance_hours: variance,
          confirmed_appts: r.confirmed_appts ?? null,
          units: r.units ?? null,
          notes: null,
          raw_payload: r.raw ? (r.raw as any) : null,
        };
      })
      .filter(
        (row) =>
          row.carecenta_hours !== null || row.hha_hours !== null
      );

    if (rowsToInsert.length === 0) {
      return NextResponse.json(
        { error: "No usable rows found in uploaded file(s)." },
        { status: 400 }
      );
    }

    const { error: rowsError } = await supabaseAdmin
      .from("reconciliation_rows")
      .insert(rowsToInsert);

    if (rowsError) {
      console.error("reconciliation_rows insert error", rowsError);
      return NextResponse.json(
        {
          error: "Failed to insert reconciliation rows",
          supabaseError: rowsError,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      runId,
      summary: {
        totalCarecentaHours: totalCare,
        totalHhaHours: totalHha,
        varianceHours,
        variancePercent,
        rowCount: rowsToInsert.length,
      },
    });
  } catch (error) {
    console.error("reconciliation ingest error", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
