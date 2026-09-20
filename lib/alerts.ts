import { createClient } from "@supabase/supabase-js";
import {
  analyzePatternGroup,
  buildPatternGroups,
  normalizeIncidentType,
  type AuthorityAlert,
} from "./pattern-engine";
import { createSupabaseServerClient } from "./supabase/server";
import { isAuthorityUser } from "./supabase/authority";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export function validateAuthorityAlert(alert: Partial<AuthorityAlert>) {
  const required = [
    "patternGroupId",
    "title",
    "severity",
    "riskScore",
    "reportCount",
    "independentReporterSignals",
    "explanation",
    "generalLocation",
  ];

  const missing = required.filter((field) => {
    const value = alert[field as keyof AuthorityAlert];
    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    return {
      valid: false,
      errors: [`Missing required alert fields: ${missing.join(", ")}`],
    };
  }

  if (alert.severity !== "elevated" && alert.severity !== "high") {
    return {
      valid: false,
      errors: ["Alert severity must be elevated or high."],
    };
  }

  return { valid: true, errors: [] };
}

function buildAuthorityAlertPayload(alert: AuthorityAlert) {
  return {
    pattern_group_id: alert.patternGroupId,
    title: alert.title,
    severity: alert.severity,
    risk_score: Number(alert.riskScore),
    report_count: Number(alert.reportCount),
    independent_reporter_signals: Number(alert.independentReporterSignals),
    activity_change_percent: alert.activityChangePercent ?? null,
    category_summary: alert.categorySummary ?? [],
    general_location: alert.generalLocation,
    explanation: alert.explanation,
    requires_human_review: true,
  };
}

export async function createAuthorityAlert(alert: AuthorityAlert) {
  const validation = validateAuthorityAlert(alert);
  if (!validation.valid) {
    throw new Error(validation.errors.join("; "));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAuthorityUser(user)) {
    return null;
  }

  const { data: existingAlert, error: existingError } = await supabase
    .from("alerts")
    .select("id, status")
    .eq("pattern_group_id", alert.patternGroupId)
    .in("status", ["new", "acknowledged"])
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const payload = buildAuthorityAlertPayload(alert);

  if (existingAlert) {
    const { data, error } = await supabase
      .from("alerts")
      .update({
        ...payload,
        status: existingAlert.status === "acknowledged" ? "acknowledged" : "new",
      })
      .eq("id", existingAlert.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  try {
    const { data, error } = await supabase
      .from("alerts")
      .insert([
        {
          ...payload,
          status: "new",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    const insertError = error as { code?: string; message?: string };

    if (insertError?.code !== "23505") {
      throw new Error(insertError?.message || "Unable to create authority alert.");
    }

    const { data: retryAlert, error: retryError } = await supabase
      .from("alerts")
      .select("id, status")
      .eq("pattern_group_id", alert.patternGroupId)
      .in("status", ["new", "acknowledged"])
      .maybeSingle();

    if (retryError) {
      throw new Error(retryError.message);
    }

    if (!retryAlert) {
      throw new Error(insertError.message || "Duplicate active alert detected without recovery.");
    }

    const { data, error: updateError } = await supabase
      .from("alerts")
      .update({
        ...payload,
        status: retryAlert.status === "acknowledged" ? "acknowledged" : "new",
      })
      .eq("id", retryAlert.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return data;
  }
}

type ReportRow = {
  id?: string | number;
  report_id?: string;
  category?: string | null;
  description?: string | null;
  location_name?: string | null;
  location_label?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  incident_time?: string | null;
  status?: string | null;
  anonymous_token?: string | null;
};

export async function analyzePersistedReportsAndCreateAlerts({
  reportId,
  runAnalysis = false,
  includeCoordinates = false,
}: {
  reportId?: string;
  runAnalysis?: boolean;
  includeCoordinates?: boolean;
} = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("reports")
    .select(
      includeCoordinates
        ? "id, report_id, category, description, location_name, location_label, latitude, longitude, incident_time, status, review_notes, reviewed_by, reviewed_at, anonymous_token"
        : "id, report_id, category, description, location_name, location_label, incident_time, status"
    )
    .order("incident_time", { ascending: false });

  if (reportId) {
    query = query.eq("report_id", reportId.toUpperCase());
  }

  const { data, error } = reportId ? await query.maybeSingle() : await query;

  if (error) {
    throw new Error(error.message);
  }

  const reportList: ReportRow[] = reportId
    ? data
      ? [data as ReportRow]
      : []
    : ((data ?? []) as ReportRow[]);

  if (!runAnalysis || reportList.length === 0) {
    return {
      report: reportId ? (reportList[0] ?? null) : null,
      reports: reportList,
    };
  }

  const reportModels = reportList
    .filter(
      (report: ReportRow) =>
        report &&
        Number.isFinite(Number(report.latitude)) &&
        Number.isFinite(Number(report.longitude))
    )
    .map((report: ReportRow) => ({
      id: String(report.id ?? report.report_id),
      incidentType: normalizeIncidentType(report.category || "other"),
      description: report.description ?? undefined,
      latitude: Number(report.latitude),
      longitude: Number(report.longitude),
      createdAt: new Date(report.incident_time || Date.now()),
      anonymousToken: report.anonymous_token || String(report.report_id),
    }));

  if (reportModels.length === 0) {
    return {
      report: reportId ? (reportList[0] ?? null) : null,
      reports: reportList,
    };
  }

  const patternGroups = buildPatternGroups(reportModels);

  for (const group of patternGroups) {
    const analysis = await analyzePatternGroup(group);
    if (analysis.authorityAlert) {
      await createAuthorityAlert(analysis.authorityAlert);
    }
  }

  return {
    report: reportId ? (reportList[0] ?? null) : null,
    reports: reportList,
    patternGroupCount: patternGroups.length,
  };
}

export async function listAuthorityAlerts() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAuthorityUser(user)) {
    return [];
  }

  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
