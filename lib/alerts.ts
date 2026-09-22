import { createClient } from "@supabase/supabase-js";
import {
  analyzePatternGroup,
  buildPatternGroups,
  buildPatternClusters,
  normalizeIncidentType,
  type PatternReport,
  type AuthorityAlert,
} from "./pattern-engine.ts";
import { persistPatternCluster, removeStalePersistedPatternGroups } from "./pattern-groups.ts";
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
    requires_human_review: alert.requiresHumanReview,
  };
}

async function reconcileExistingAlerts(patternGroups: Array<{ patternGroupId: string; locationName: string }>) {
  const supabase = getSupabaseAdmin();
  const { data: existingAlerts, error } = await supabase
    .from("alerts")
    .select("id, pattern_group_id, general_location")
    .not("pattern_group_id", "is", null);

  if (error) {
    throw new Error(`Unable to reconcile existing alerts: ${error.message}`);
  }

  const groupsById = new Map(patternGroups.map((group) => [group.patternGroupId, group]));
  const coordinateLocation = /^Area\s+-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/;

  for (const alert of existingAlerts ?? []) {
    const group = groupsById.get(alert.pattern_group_id);
    const update = group
      ? {
          pattern_group_unresolved: false,
          ...(typeof alert.general_location !== "string" || coordinateLocation.test(alert.general_location)
            ? { general_location: group.locationName }
            : {}),
        }
      : { pattern_group_unresolved: true };

    const { error: updateError } = await supabase
      .from("alerts")
      .update(update)
      .eq("id", alert.id);

    if (updateError) {
      throw new Error(`Unable to reconcile alert ${alert.id}: ${updateError.message}`);
    }
  }
}

export async function createAuthorityAlert(alert: AuthorityAlert) {
  const validation = validateAuthorityAlert(alert);
  if (!validation.valid) {
    throw new Error(validation.errors.join("; "));
  }

  const supabase = getSupabaseAdmin();

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
  review_notes?: string | null;
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
        typeof report.report_id === "string" &&
        Number.isFinite(Number(report.latitude)) &&
        Number.isFinite(Number(report.longitude))
    )
    .map((report: ReportRow) => ({
      id: String(report.id ?? report.report_id),
      report_id: report.report_id,
      incidentType: normalizeIncidentType(report.category || "other"),
      description: report.description ?? undefined,
      latitude: Number(report.latitude),
      longitude: Number(report.longitude),
      createdAt: new Date(report.incident_time || Date.now()),
      anonymousToken: report.anonymous_token || String(report.report_id),
      location_name: report.location_name ?? null,
      location_label: report.location_label ?? null,
      status: report.status ?? null,
      review_notes: report.review_notes ?? null,
    }));

  if (reportModels.length === 0) {
    return {
      report: reportId ? (reportList[0] ?? null) : null,
      reports: reportList,
    };
  }

  const patternGroups = buildPatternGroups(reportModels);
  const patternReports: PatternReport[] = reportList
    .filter((report): report is ReportRow & { report_id: string } => typeof report.report_id === "string")
    .map((report) => ({
      id: report.id,
      report_id: report.report_id,
      category: report.category,
      description: report.description,
      location_name: report.location_name,
      location_label: report.location_label,
      latitude: report.latitude,
      longitude: report.longitude,
      incident_time: report.incident_time,
      status: report.status,
      review_notes: report.review_notes,
      anonymous_token: report.anonymous_token,
    }));
  const computedClusters = buildPatternClusters(patternReports);

  for (const group of patternGroups) {
    const cluster = computedClusters.find((candidate) => candidate.patternGroupId === group.id);
    if (!cluster) {
      continue;
    }

    await persistPatternCluster(cluster);
    const analysis = await analyzePatternGroup(group);
    if (analysis.authorityAlert) {
      await createAuthorityAlert(analysis.authorityAlert);
    }
    if (analysis.reviewAlert) {
      await createAuthorityAlert(analysis.reviewAlert);
    }
  }

  await removeStalePersistedPatternGroups(computedClusters.map((cluster) => cluster.patternGroupId));

  await reconcileExistingAlerts(computedClusters.map((cluster) => ({
    patternGroupId: cluster.patternGroupId,
    locationName: cluster.locationName,
  })));

  return {
    report: reportId ? (reportList[0] ?? null) : null,
    reports: reportList,
    patternGroupCount: patternGroups.length,
  };
}

export async function listAuthorityAlerts(statusFilter?: string | null) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAuthorityUser(user)) {
    return [];
  }

  let query = supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter && ["new", "acknowledged", "resolved"].includes(statusFilter)) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const alerts = data ?? [];
  const patternGroupIds = alerts
    .map((alert) => alert.pattern_group_id)
    .filter((patternGroupId): patternGroupId is string => typeof patternGroupId === "string");

  if (patternGroupIds.length === 0) {
    return alerts;
  }

  const { data: groups, error: groupsError } = await supabase
    .from("pattern_groups")
    .select("pattern_group_id, manipulation_score, location_name, area_name")
    .in("pattern_group_id", patternGroupIds);

  if (groupsError) throw new Error(groupsError.message);

  const groupsById = new Map((groups ?? []).map((group) => [group.pattern_group_id, group]));
  const coordinateLocation = /^Area\s+-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/;

  return alerts.map((alert) => {
    const group = groupsById.get(alert.pattern_group_id);
    const storedLocation = alert.general_location;
    const location = group?.location_name || group?.area_name;

    return {
      ...alert,
      manipulation_score: group?.manipulation_score ?? null,
      general_location:
        location && (typeof storedLocation !== "string" || coordinateLocation.test(storedLocation))
          ? location
          : storedLocation,
    };
  });
}
