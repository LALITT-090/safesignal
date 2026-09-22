import { createClient } from "@supabase/supabase-js";
import { REPORTING_CONCERN_REVIEW_THRESHOLD, type PatternCluster, type PatternReport } from "./pattern-engine.ts";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function removeStalePersistedPatternGroups(activePatternGroupIds: string[]) {
  const supabase = getSupabaseAdmin();
  const { data: existingGroups, error: groupsError } = await supabase
    .from("pattern_groups")
    .select("pattern_group_id");

  if (groupsError) throw new Error(groupsError.message);

  const activeIds = new Set(activePatternGroupIds);
  const staleIds = (existingGroups ?? [])
    .map((group) => group.pattern_group_id)
    .filter((patternGroupId) => !activeIds.has(patternGroupId));

  for (const patternGroupId of staleIds) {
    const { error: alertError } = await supabase
      .from("alerts")
      .update({ pattern_group_unresolved: true })
      .eq("pattern_group_id", patternGroupId);

    if (alertError && !alertError.message.includes("pattern_group_unresolved")) {
      throw new Error(alertError.message);
    }

    const { error: membershipError } = await supabase
      .from("pattern_group_reports")
      .delete()
      .eq("pattern_group_id", patternGroupId);

    if (membershipError) throw new Error(membershipError.message);

    const { error: deleteError } = await supabase
      .from("pattern_groups")
      .delete()
      .eq("pattern_group_id", patternGroupId);

    if (deleteError) throw new Error(deleteError.message);
  }
}

type PatternGroupRow = {
  pattern_group_id: string;
  location_name: string | null;
  area_name: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  safety_risk_score: number;
  manipulation_score: number;
  recent_count: number;
  previous_count: number;
  activity_change_percent: number | null;
  activity_direction: "rising" | "stable" | "declining" | "new";
  independent_reporter_signals: number;
  report_count: number;
  status: string;
  requires_human_review: boolean;
  location_similarity: number;
  time_similarity: number;
  category_similarity: number;
  behaviour_similarity: number;
  corroboration_score: number;
  reporter_diversity: number;
  connection_explanation: string[];
  suspicious: boolean;
  suspicious_message: string | null;
};

type PatternGroupReportRow = {
  pattern_group_id: string;
  report_id: string;
};

type PersistedReportRow = {
  id?: string | number;
  report_id: string;
  category: string | null;
  description: string | null;
  location_name: string | null;
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  incident_time: string | null;
  status: string | null;
  review_notes?: string | null;
};

function toPatternCluster(row: PatternGroupRow, reports: PatternReport[]): PatternCluster {
  return {
    patternGroupId: row.pattern_group_id,
    label: `Report Cluster ${row.pattern_group_id.slice(-4)}`,
    reports,
    locationName: row.location_name || row.area_name || "Location unavailable",
    areaName: row.area_name || "",
    city: row.city || "",
    safetyRiskScore: Number(row.safety_risk_score),
    manipulationScore: Number(row.manipulation_score),
    status: row.status,
    locationSimilarity: Number(row.location_similarity),
    timeSimilarity: Number(row.time_similarity),
    categorySimilarity: Number(row.category_similarity),
    behaviourSimilarity: Number(row.behaviour_similarity),
    corroborationScore: Number(row.corroboration_score),
    reporterDiversity: Number(row.reporter_diversity),
    recentCount: Number(row.recent_count),
    previousCount: Number(row.previous_count),
    risingPercent: row.activity_change_percent === null ? null : Number(row.activity_change_percent),
    suspicious: Boolean(row.suspicious),
    suspiciousMessage: row.suspicious_message || "No unusual reporting concentration detected.",
    connectionExplanation: Array.isArray(row.connection_explanation) ? row.connection_explanation : [],
  };
}

function toPatternReport(report: PersistedReportRow): PatternReport {
  return {
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
    review_notes: report.review_notes ?? null,
  };
}

export function buildPatternGroupPersistenceRecord(cluster: PatternCluster) {
  const firstReport = cluster.reports[0];
  return {
    pattern_group_id: cluster.patternGroupId,
    location_name: cluster.locationName === "Location unavailable" ? null : cluster.locationName,
    area_name: cluster.areaName || null,
    city: cluster.city || null,
    latitude: typeof firstReport?.latitude === "number" ? firstReport.latitude : null,
    longitude: typeof firstReport?.longitude === "number" ? firstReport.longitude : null,
    safety_risk_score: cluster.safetyRiskScore,
    manipulation_score: cluster.manipulationScore,
    recent_count: cluster.recentCount,
    previous_count: cluster.previousCount,
    activity_change_percent: cluster.risingPercent,
    activity_direction: cluster.risingPercent === null ? "new" : cluster.risingPercent > 0 ? "rising" : cluster.risingPercent < 0 ? "declining" : "stable",
    independent_reporter_signals: cluster.reporterDiversity,
    report_count: cluster.reports.length,
    status: cluster.status,
    requires_human_review: cluster.manipulationScore >= REPORTING_CONCERN_REVIEW_THRESHOLD,
    location_similarity: cluster.locationSimilarity,
    time_similarity: cluster.timeSimilarity,
    category_similarity: cluster.categorySimilarity,
    behaviour_similarity: cluster.behaviourSimilarity,
    corroboration_score: cluster.corroborationScore,
    reporter_diversity: cluster.reporterDiversity,
    connection_explanation: cluster.connectionExplanation,
    suspicious: cluster.suspicious,
    suspicious_message: cluster.suspiciousMessage,
    updated_at: new Date().toISOString(),
  };
}

export function buildPatternGroupMembershipRows(cluster: PatternCluster) {
  return cluster.reports.map((report) => ({
    pattern_group_id: cluster.patternGroupId,
    report_id: report.report_id,
  }));
}

export async function persistPatternCluster(cluster: PatternCluster) {
  const supabase = getSupabaseAdmin();
  const payload = buildPatternGroupPersistenceRecord(cluster);

  const { error: groupError } = await supabase
    .from("pattern_groups")
    .upsert(payload, { onConflict: "pattern_group_id" });

  if (groupError) {
    throw new Error(`Unable to persist Pattern Group ${cluster.patternGroupId}: ${groupError.message}`);
  }

  const { error: deleteError } = await supabase
    .from("pattern_group_reports")
    .delete()
    .eq("pattern_group_id", cluster.patternGroupId);

  if (deleteError) {
    throw new Error(`Unable to synchronize Pattern Group ${cluster.patternGroupId} membership: ${deleteError.message}`);
  }

  const memberships = buildPatternGroupMembershipRows(cluster);

  if (memberships.length > 0) {
    const { error: membershipError } = await supabase
      .from("pattern_group_reports")
      .insert(memberships);

    if (membershipError) {
      throw new Error(`Unable to persist Pattern Group ${cluster.patternGroupId} membership: ${membershipError.message}`);
    }
  }
}

export async function getPersistedPatternCluster(patternGroupId: string) {
  const supabase = getSupabaseAdmin();
  const { data: group, error: groupError } = await supabase
    .from("pattern_groups")
    .select("*")
    .eq("pattern_group_id", patternGroupId)
    .maybeSingle();

  if (groupError) throw new Error(groupError.message);
  if (!group) return null;

  const { data: memberships, error: membershipError } = await supabase
    .from("pattern_group_reports")
    .select("pattern_group_id, report_id")
    .eq("pattern_group_id", patternGroupId);

  if (membershipError) throw new Error(membershipError.message);

  const reportIds = (memberships ?? []).map((membership: PatternGroupReportRow) => membership.report_id);
  const { data: reports, error: reportsError } = reportIds.length > 0
    ? await supabase
        .from("reports")
        .select("id, report_id, category, description, location_name, location_label, latitude, longitude, incident_time, status, review_notes")
        .in("report_id", reportIds)
    : { data: [], error: null };

  if (reportsError) throw new Error(reportsError.message);

  const reportsById = new Map((reports ?? []).map((report: PersistedReportRow) => [report.report_id, report]));
  const exactReports = reportIds
    .map((reportId) => reportsById.get(reportId))
    .filter((report): report is PersistedReportRow => Boolean(report))
    .map(toPatternReport);

  return toPatternCluster(group as PatternGroupRow, exactReports);
}

export async function getPersistedPatternClusterForReport(reportId: string) {
  const supabase = getSupabaseAdmin();
  const { data: membership, error } = await supabase
    .from("pattern_group_reports")
    .select("pattern_group_id")
    .eq("report_id", reportId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return membership?.pattern_group_id
    ? getPersistedPatternCluster(membership.pattern_group_id)
    : null;
}

export async function listPersistedPatternClusters() {
  const supabase = getSupabaseAdmin();
  const { data: groups, error: groupsError } = await supabase
    .from("pattern_groups")
    .select("*")
    .in("status", ["active", "deferred"])
    .order("updated_at", { ascending: false });

  if (groupsError) throw new Error(groupsError.message);

  const clusters = [] as PatternCluster[];
  for (const group of (groups ?? []) as PatternGroupRow[]) {
    const cluster = await getPersistedPatternCluster(group.pattern_group_id);
    if (cluster) clusters.push(cluster);
  }

  return clusters;
}
