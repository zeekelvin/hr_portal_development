// app/api/reconciliation/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Row = {
  service_date: string | null;
  client_name: string | null;
  employee_name: string | null;
  carecenta_hours: number | null;
  hha_hours: number | null;
  variance_hours: number | null;
  confirmed_appts: number | null;
  notes: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");      // "YYYY-MM-DD" or null
    const to = searchParams.get("to");          // "YYYY-MM-DD" or null
    const client = searchParams.get("client");  // concrete name or "all"
    const employee = searchParams.get("employee");

    let query = supabaseAdmin
      .from("reconciliation_rows")
      .select(
        "service_date, client_name, employee_name, carecenta_hours, hha_hours, variance_hours, confirmed_appts, notes"
      )
      .order("service_date", { ascending: true });

    if (from) query = query.gte("service_date", from);
    if (to) query = query.lte("service_date", to);
    if (client && client !== "all") query = query.eq("client_name", client);
    if (employee && employee !== "all")
      query = query.eq("employee_name", employee);

    const { data, error } = await query;

    if (error) {
      console.error("summary GET error", error);
      return NextResponse.json(
        { error: "Failed to load reconciliation summary", supabaseError: error },
        { status: 500 }
      );
    }

    const rows = (data || []) as Row[];

    if (rows.length === 0) {
      return NextResponse.json({
        summary: {
          totalCarecentaHours: 0,
          totalHhaHours: 0,
          varianceHours: 0,
          variancePercent: 0,
          rowCount: 0,
        },
        timeseries: [],
        employees: [],
        clients: [],
        filters: {
          clients: [],
          employees: [],
          dateMin: null,
          dateMax: null,
        },
      });
    }

    // ---- FILTER META (clients, employees, min/max dates) ----
    const clientSet = new Set<string>();
    const employeeSet = new Set<string>();
    let dateMin: string | null = null;
    let dateMax: string | null = null;

    for (const r of rows) {
      if (r.client_name) clientSet.add(r.client_name);
      if (r.employee_name) employeeSet.add(r.employee_name);

      if (r.service_date) {
        if (!dateMin || r.service_date < dateMin) dateMin = r.service_date;
        if (!dateMax || r.service_date > dateMax) dateMax = r.service_date;
      }
    }

    // ---- SUMMARY TOTALS ----
    let totalCare = 0;
    let totalHha = 0;
    let rowCount = 0;

    for (const r of rows) {
      const care = Number(r.carecenta_hours ?? 0);
      const hha = Number(r.hha_hours ?? 0);
      totalCare += care;
      totalHha += hha;
      rowCount += 1;
    }

    const varianceHours = totalHha - totalCare;
    const variancePercent =
      totalCare > 0 ? (varianceHours / totalCare) * 100 : 0;

    // ---- TIME SERIES (by service_date) ----
    const dayMap = new Map<
      string,
      { date: string; carecenta: number; hha: number }
    >();

    for (const r of rows) {
      if (!r.service_date) continue;
      const key = r.service_date;
      if (!dayMap.has(key)) {
        dayMap.set(key, {
          date: key,
          carecenta: 0,
          hha: 0,
        });
      }
      const bucket = dayMap.get(key)!;
      bucket.carecenta += Number(r.carecenta_hours ?? 0);
      bucket.hha += Number(r.hha_hours ?? 0);
    }

    const timeseries = Array.from(dayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // ---- EMPLOYEE AGGREGATES ----
    const empMap = new Map<
      string,
      {
        employee: string;
        clients: Set<string>;
        confirmedAppts: number;
        carecentaHours: number;
        hhaHours: number;
        variance: number;
      }
    >();

    for (const r of rows) {
      const empName = (r.employee_name || "Unknown").trim() || "Unknown";

      if (!empMap.has(empName)) {
        empMap.set(empName, {
          employee: empName,
          clients: new Set<string>(),
          confirmedAppts: 0,
          carecentaHours: 0,
          hhaHours: 0,
          variance: 0,
        });
      }

      const bucket = empMap.get(empName)!;
      if (r.client_name) bucket.clients.add(r.client_name);
      bucket.confirmedAppts += Number(r.confirmed_appts ?? 0);
      bucket.carecentaHours += Number(r.carecenta_hours ?? 0);
      bucket.hhaHours += Number(r.hha_hours ?? 0);
      bucket.variance += Number(r.variance_hours ?? 0);
    }

    const employees = Array.from(empMap.values()).map((e) => ({
      employee: e.employee,
      clients: e.clients.size,
      confirmedAppts: e.confirmedAppts,
      carecentaHours: e.carecentaHours,
      hhaHours: e.hhaHours,
      varianceHours: e.variance,
    }));

    // ---- CLIENT AGGREGATES ----
    const clientMap = new Map<
      string,
      {
        client: string;
        serviceDates: Set<string>;
        confirmedAppts: number;
        carecentaHours: number;
        hhaHours: number;
        varianceHours: number;
        notesCount: number;
      }
    >();

    for (const r of rows) {
      const clientName = (r.client_name || "Unknown").trim() || "Unknown";
      if (!clientMap.has(clientName)) {
        clientMap.set(clientName, {
          client: clientName,
          serviceDates: new Set<string>(),
          confirmedAppts: 0,
          carecentaHours: 0,
          hhaHours: 0,
          varianceHours: 0,
          notesCount: 0,
        });
      }

      const bucket = clientMap.get(clientName)!;
      if (r.service_date) bucket.serviceDates.add(r.service_date);
      bucket.confirmedAppts += Number(r.confirmed_appts ?? 0);
      bucket.carecentaHours += Number(r.carecenta_hours ?? 0);
      bucket.hhaHours += Number(r.hha_hours ?? 0);
      bucket.varianceHours += Number(r.variance_hours ?? 0);
      if (r.notes && r.notes.trim().length > 0) {
        bucket.notesCount += 1;
      }
    }

    const clients = Array.from(clientMap.values()).map((c) => ({
      client: c.client,
      serviceDates: c.serviceDates.size,
      confirmedAppts: c.confirmedAppts,
      carecentaHours: c.carecentaHours,
      hhaHours: c.hhaHours,
      varianceHours: c.varianceHours,
      notesCount: c.notesCount,
    }));

    return NextResponse.json({
      summary: {
        totalCarecentaHours: totalCare,
        totalHhaHours: totalHha,
        varianceHours,
        variancePercent,
        rowCount,
      },
      timeseries,
      employees,
      clients,
      filters: {
        clients: Array.from(clientSet.values()).sort(),
        employees: Array.from(employeeSet.values()).sort(),
        dateMin,
        dateMax,
      },
    });
  } catch (err) {
    console.error("summary GET fatal error", err);
    return NextResponse.json(
      { error: "Unexpected server error in reconciliation summary" },
      { status: 500 }
    );
  }
}
