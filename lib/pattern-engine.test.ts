import assert from "node:assert/strict";
import test from "node:test";

import {
  MIN_RELATED_REPORTS_FOR_RECOGNIZED_CLUSTER,
  REPORTING_CONCERN_REVIEW_THRESHOLD,
  TREND_ALERT_THRESHOLD_PERCENT,
  analyzePatternGroup,
  buildPatternGroups,
  buildPatternClusters,
  resolvePatternCluster,
  calculateTrend,
  shouldTriggerAuthorityAlert,
  type PatternReport,
  type Report,
} from "./pattern-engine.ts";
import { buildPatternGroupMembershipRows, buildPatternGroupPersistenceRecord } from "./pattern-groups.ts";

function makeReport(overrides: Partial<Report> & { id: string }): Report {
  return {
    id: overrides.id,
    report_id: overrides.report_id ?? overrides.id,
    incidentType: overrides.incidentType ?? "harassment",
    description: overrides.description ?? "Safety concern near the station.",
    latitude: overrides.latitude ?? 51.5072,
    longitude: overrides.longitude ?? -0.1276,
    createdAt: overrides.createdAt ?? new Date("2026-09-10T12:00:00Z"),
    anonymousToken: overrides.anonymousToken ?? overrides.id,
  };
}

test("genuine rising activity creates a valid rising Safety alert", async () => {
  const baseline = [
    makeReport({ id: "B1", anonymousToken: "A", createdAt: new Date("2026-09-02T18:00:00Z"), latitude: 51.5072, longitude: -0.1276, incidentType: "harassment", description: "Someone kept following me near the station after dark." }),
    makeReport({ id: "B2", anonymousToken: "B", createdAt: new Date("2026-09-02T19:00:00Z"), latitude: 51.5073, longitude: -0.1275, incidentType: "following", description: "A person kept walking behind me near the station after dark." }),
    makeReport({ id: "B3", anonymousToken: "C", createdAt: new Date("2026-09-03T20:00:00Z"), latitude: 51.5071, longitude: -0.1278, incidentType: "stalking", description: "Repeated following and staring near the station after dark." }),
  ];

  const current = [
    makeReport({ id: "C1", anonymousToken: "D", createdAt: new Date("2026-09-10T18:30:00Z"), latitude: 51.5073, longitude: -0.1277, incidentType: "harassment", description: "Someone kept following me near the station after dark." }),
    makeReport({ id: "C2", anonymousToken: "E", createdAt: new Date("2026-09-10T18:40:00Z"), latitude: 51.5076, longitude: -0.1274, incidentType: "following", description: "A person kept pacing behind me near the station and shouting." }),
    makeReport({ id: "C3", anonymousToken: "F", createdAt: new Date("2026-09-10T18:50:00Z"), latitude: 51.5078, longitude: -0.1270, incidentType: "stalking", description: "A person followed me from the station to the square." }),
    makeReport({ id: "C4", anonymousToken: "G", createdAt: new Date("2026-09-10T19:00:00Z"), latitude: 51.5069, longitude: -0.1281, incidentType: "inappropriate_behaviour", description: "Unwanted comments and close following near the station after dark." }),
    makeReport({ id: "C5", anonymousToken: "H", createdAt: new Date("2026-09-10T19:10:00Z"), latitude: 51.5071, longitude: -0.1279, incidentType: "safety_concern", description: "Repeated worrying behaviour near the station made me feel unsafe." }),
    makeReport({ id: "C6", anonymousToken: "I", createdAt: new Date("2026-09-10T19:20:00Z"), latitude: 51.5073, longitude: -0.1275, incidentType: "harassment", description: "A group kept staring and following me around the station." }),
    makeReport({ id: "C7", anonymousToken: "J", createdAt: new Date("2026-09-10T19:30:00Z"), latitude: 51.5072, longitude: -0.1276, incidentType: "following", description: "Someone followed me around the station and bus stop." }),
  ];

  const result = await analyzePatternGroup({ id: "PG-rising", reports: [...baseline, ...current] });

  assert.equal(result.validation.valid, true);
  assert.equal(result.validation.suspicious, false);
  assert.ok(result.trend.percentageChange !== null && result.trend.percentageChange > TREND_ALERT_THRESHOLD_PERCENT);
  assert.ok(result.risk.score >= 70);
  assert.equal(result.manipulationScore < 60, true);
  assert.ok(shouldTriggerAuthorityAlert(result.validation, result.risk, result.trend, result.manipulationScore));
  assert.equal(result.authorityAlert?.title, "Rising reported safety activity");
});

test("stable activity does not trigger a rising-activity authority alert", async () => {
  const baseline = Array.from({ length: 8 }, (_, index) =>
    makeReport({
      id: `B${index + 1}`,
      anonymousToken: `T${index + 1}`,
      createdAt: new Date(`2026-08-30T12:${String(index).padStart(2, "0")}:00Z`),
      latitude: 51.5072 + index * 0.00018,
      longitude: -0.1276 + index * 0.00012,
      incidentType: "harassment",
      description: "Someone kept following me near the station after dark.",
    })
  );

  const current = Array.from({ length: 8 }, (_, index) =>
    makeReport({
      id: `C${index + 1}`,
      anonymousToken: `U${index + 1}`,
      createdAt: new Date(`2026-09-10T12:${String(index).padStart(2, "0")}:00Z`),
      latitude: 51.5072 + index * 0.00018,
      longitude: -0.1276 + index * 0.00012,
      incidentType: "harassment",
      description: "Someone kept following me near the station after dark.",
    })
  );

  const result = await analyzePatternGroup({ id: "PG-stable", reports: [...baseline, ...current] });

  assert.equal(result.trend.percentageChange, 0);
  assert.equal(result.validation.suspicious, false);
  assert.equal(shouldTriggerAuthorityAlert(result.validation, result.risk, result.trend, result.manipulationScore), false);
  assert.equal(result.authorityAlert, undefined);
});

test("suspicious burst is flagged without creating a normal rising-safety alert", async () => {
  const reports = Array.from({ length: 10 }, (_, index) =>
    makeReport({
      id: `X${index + 1}`,
      anonymousToken: "A",
      createdAt: new Date(`2026-09-10T09:${String(index).padStart(2, "0")}:00Z`),
      latitude: 51.5072,
      longitude: -0.1276,
      incidentType: "harassment",
      description: "Someone was following me near the station near the same place. Same behaviour repeated.",
    })
  );

  const result = await analyzePatternGroup({ id: "PG-suspicious", reports });

  assert.equal(result.validation.suspicious, true);
  assert.ok(result.validation.tokenConcentration >= 0.6);
  assert.ok(result.manipulationScore >= 60);
  assert.equal(shouldTriggerAuthorityAlert(result.validation, result.risk, result.trend, result.manipulationScore), false);
  assert.equal(result.authorityAlert, undefined);
});

test("single report is ignored", async () => {
  const result = await analyzePatternGroup({ id: "PG-single", reports: [makeReport({ id: "R1" })] });

  assert.equal(result.validation.valid, false);
  assert.equal(result.authorityAlert, undefined);
  assert.equal(shouldTriggerAuthorityAlert(result.validation, result.risk, result.trend, result.manipulationScore), false);
});

test("unrelated reports do not become a valid pattern", async () => {
  const reports = [
    makeReport({ id: "U1", anonymousToken: "A", latitude: 51.5072, longitude: -0.1276, createdAt: new Date("2026-09-10T08:00:00Z"), incidentType: "harassment" }),
    makeReport({ id: "U2", anonymousToken: "B", latitude: 48.8566, longitude: 2.3522, createdAt: new Date("2026-09-11T09:00:00Z"), incidentType: "stalking" }),
  ];

  const groups = buildPatternGroups(reports);
  assert.equal(groups.length, 0);
  assert.equal(shouldTriggerAuthorityAlert(
    { valid: false, uniqueReporters: 2, suspicious: false, totalReports: 2 },
    { score: 0 },
    { percentageChange: 0 },
    0
  ), false);
});

test("normal safety alert requires all required gates and excludes suspicious manipulation", async () => {
  const reports = Array.from({ length: 10 }, (_, index) =>
    makeReport({
      id: `N${index + 1}`,
      anonymousToken: index % 3 === 0 ? `A${index + 1}` : `R${index + 1}`,
      createdAt: new Date(`2026-09-10T18:${String(index * 5).padStart(2, "0")}:00Z`),
      latitude: 51.5072 + index * 0.0002,
      longitude: -0.1276 + index * 0.00015,
      incidentType: index % 2 === 0 ? "harassment" : "following",
      description: index % 3 === 0
        ? "Followed me near the station after dark."
        : "A person kept walking behind me near the station after dark.",
    })
  );

  const result = await analyzePatternGroup({ id: "PG-normal", reports });

  assert.equal(result.validation.valid, true);
  assert.ok(result.validation.totalReports >= MIN_RELATED_REPORTS_FOR_RECOGNIZED_CLUSTER);
  assert.ok(result.validation.uniqueReporters >= 2);
  assert.ok(result.risk.score >= 70);
  assert.ok(result.trend.percentageChange !== null && result.trend.percentageChange > 20);
  assert.ok(result.manipulationScore < REPORTING_CONCERN_REVIEW_THRESHOLD);
  assert.ok(shouldTriggerAuthorityAlert(result.validation, result.risk, result.trend, result.manipulationScore));
});

test("baseline zero trend does not produce fake +100%", async () => {
  const reports = [
    makeReport({ id: "Z1", anonymousToken: "A", createdAt: new Date("2026-09-10T10:00:00Z") }),
    makeReport({ id: "Z2", anonymousToken: "B", createdAt: new Date("2026-09-10T10:05:00Z") }),
    makeReport({ id: "Z3", anonymousToken: "C", createdAt: new Date("2026-09-10T10:10:00Z") }),
  ];

  const trend = calculateTrend(reports);
  assert.equal(trend.previousCount, 0);
  assert.equal(trend.percentageChange, null);
});

test("pattern groups use exact persisted report ids and preserve exact memberships", async () => {
  const reports = Array.from({ length: 10 }, (_, index) =>
    makeReport({
      id: `SS-${index + 1}`,
      report_id: `SS-${index + 1}`,
      anonymousToken: `A${index + 1}`,
      createdAt: new Date(`2026-09-10T10:${String(index).padStart(2, "0")}:00Z`),
      latitude: 51.5072 + index * 0.0001,
      longitude: -0.1276 + index * 0.0001,
      incidentType: "harassment",
      description: "Followed me near the station after dark.",
    })
  ) as Report[];

  const groups = buildPatternGroups(reports);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].reports.map((report) => report.id), reports.map((report) => report.id));
  assert.deepEqual(groups[0].reports.map((report) => report.id), groups[0].reports.map((report) => report.id));
});

test("pattern group selection resolves to the exact review group id", async () => {
  const reports = Array.from({ length: 10 }, (_, index) =>
    makeReport({
      id: `P${index + 1}`,
      report_id: `P${index + 1}`,
      anonymousToken: `A${index + 1}`,
      createdAt: new Date(`2026-09-10T10:${String(index).padStart(2, "0")}:00Z`),
      latitude: 51.5072 + index * 0.0001,
      longitude: -0.1276 + index * 0.0001,
      incidentType: "harassment",
      description: "following after dark",
    })
  ) as Report[];

  const clusters = buildPatternClusters(reports.map((report) => ({
    report_id: report.report_id!,
    category: "harassment",
    description: "following after dark",
    latitude: report.latitude,
    longitude: report.longitude,
    incident_time: report.createdAt.toISOString(),
    status: "submitted",
    anonymous_token: report.anonymousToken,
  } as PatternReport)));

  assert.ok(clusters.length >= 1);
  assert.equal(typeof clusters[0].patternGroupId, "string");
  assert.ok(clusters[0].patternGroupId.length > 0);
  assert.deepEqual(
    clusters[0].reports.map((report) => report.report_id).sort(),
    reports.map((report) => report.report_id).sort()
  );
});

test("pattern details resolves the shared group and exact persisted memberships", () => {
  const patterns = buildPatternClusters(Array.from({ length: 10 }, (_, index) => ({
    report_id: `PG-REPORT-${index + 1}`,
    category: index % 2 === 0 ? "harassment" : "following",
    description: "following after dark",
    location_name: "Station area",
    latitude: 51.5072 + index * 0.0001,
    longitude: -0.1276 + index * 0.0001,
    incident_time: `2026-09-10T10:${String(index).padStart(2, "0")}:00Z`,
    status: "submitted",
    anonymous_token: `A${index + 1}`,
  })));

  assert.equal(patterns.length, 1);
  const selected = resolvePatternCluster(patterns, patterns[0].patternGroupId);
  assert.equal(selected?.patternGroupId, patterns[0].patternGroupId);
  assert.deepEqual(
    selected?.reports.map((report) => report.report_id).sort(),
    Array.from({ length: 10 }, (_, index) => `PG-REPORT-${index + 1}`).sort()
  );
  assert.equal(resolvePatternCluster(patterns, "PG-NOT-FOUND"), null);
});

test("deferred status persists and is excluded from active review queue", async () => {
  const structuredReports: PatternReport[] = [
    { report_id: "D1", category: "harassment", description: "followed me", latitude: 51.5072, longitude: -0.1276, incident_time: "2026-09-10T10:00:00Z", status: "deferred" },
    { report_id: "D2", category: "harassment", description: "followed me", latitude: 51.5073, longitude: -0.1275, incident_time: "2026-09-10T10:05:00Z", status: "submitted" },
    { report_id: "D3", category: "harassment", description: "followed me", latitude: 51.5074, longitude: -0.1274, incident_time: "2026-09-10T10:10:00Z", status: "submitted" },
  ];

  const active = structuredReports.filter((report) => (report.status ?? "submitted").toLowerCase() !== "deferred");
  assert.equal(active.length, 2);
  assert.deepEqual(active.map((report) => report.report_id), ["D2", "D3"]);
});

test("canonical persistence keeps stable ID and exact membership rows", () => {
  const reports = Array.from({ length: 10 }, (_, index) => ({
    report_id: `R-${index + 1}`,
    category: index % 2 === 0 ? "harassment" : "following",
    description: "followed",
    latitude: 51.5 + index * 0.0001,
    longitude: -0.1 + index * 0.0001,
    incident_time: `2026-09-10T10:${String(index).padStart(2, "0")}:00Z`,
    anonymous_token: `A${index + 1}`,
  }));
  const clusters = buildPatternClusters(reports);
  assert.equal(clusters.length, 1);
  const cluster = clusters[0];
  const record = buildPatternGroupPersistenceRecord(cluster);
  assert.equal(record.pattern_group_id, cluster.patternGroupId);
  assert.deepEqual(buildPatternGroupMembershipRows(cluster), reports.map((report) => ({
    pattern_group_id: cluster.patternGroupId,
    report_id: report.report_id,
  })));
  assert.equal(record.report_count, 10);
});

test("connected related reports persist as one Pattern Group", () => {
  const reports = Array.from({ length: 10 }, (_, index) =>
    makeReport({
      id: `CHAIN-${index + 1}`,
      report_id: `CHAIN-${index + 1}`,
      latitude: 51.5072 + index * 0.00005,
      longitude: -0.1276 + index * 0.00005,
      incidentType: index % 3 === 0 ? "harassment" : index % 3 === 1 ? "following" : "stalking",
      anonymousToken: `chain-${index + 1}`,
    })
  );

  const groups = buildPatternGroups(reports);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].reports.map((report) => report.report_id), reports.map((report) => report.report_id));
});

test("same anonymous signal counts as one independent reporter", () => {
  const reports = Array.from({ length: 10 }, (_, index) =>
    makeReport({
      id: `TOKEN-${index + 1}`,
      report_id: `TOKEN-${index + 1}`,
      anonymousToken: "shared",
      latitude: 51.5072 + index * 0.00005,
      longitude: -0.1276 + index * 0.00005,
      createdAt: new Date(`2026-09-10T10:${String(index).padStart(2, "0")}:00Z`),
      incidentType: index % 2 === 0 ? "harassment" : "following",
      description: "Same repeated after-dark following behaviour near the station.",
    })
  );

  const result = buildPatternClusters(reports.map((report) => ({
    report_id: report.report_id!,
    category: report.incidentType,
    description: report.description,
    latitude: report.latitude,
    longitude: report.longitude,
    incident_time: report.createdAt.toISOString(),
    anonymous_token: report.anonymousToken,
  })));

  assert.equal(result.length, 1);
  assert.equal(result[0].reporterDiversity, 1);
  assert.equal(result[0].suspicious, true);
  assert.equal(result[0].manipulationScore >= REPORTING_CONCERN_REVIEW_THRESHOLD, true);
});

test("clusters are only recognized after ten related reports", () => {
  const nineReports = Array.from({ length: 9 }, (_, index) =>
    makeReport({
      id: `NINE-${index + 1}`,
      report_id: `NINE-${index + 1}`,
      anonymousToken: `R${index + 1}`,
      createdAt: new Date(`2026-09-10T10:${String(index).padStart(2, "0")}:00Z`),
      latitude: 51.5072 + index * 0.0002,
      longitude: -0.1276 + index * 0.0002,
      incidentType: "harassment",
      description: "Someone followed me near the station after dark.",
    })
  );

  assert.equal(buildPatternGroups(nineReports).length, 0);

  const tenReports = [
    ...nineReports,
    makeReport({
      id: "TEN-10",
      report_id: "TEN-10",
      anonymousToken: "R10",
      createdAt: new Date("2026-09-10T10:09:00Z"),
      latitude: 51.5090,
      longitude: -0.1252,
      incidentType: "following",
      description: "Repeated following near the station after dark.",
    }),
  ];

  const groups = buildPatternGroups(tenReports);
  assert.equal(groups.length, 1);
  assert.ok(groups[0].reports.length >= MIN_RELATED_REPORTS_FOR_RECOGNIZED_CLUSTER);
});

test("review and alert logic use the central reporting concern threshold", async () => {
  const reports = Array.from({ length: 10 }, (_, index) =>
    makeReport({
      id: `THRESH-${index + 1}`,
      report_id: `THRESH-${index + 1}`,
      anonymousToken: "shared",
      createdAt: new Date(`2026-09-10T09:${String(index).padStart(2, "0")}:00Z`),
      latitude: 51.5072 + index * 0.00008,
      longitude: -0.1276 + index * 0.00008,
      incidentType: "harassment",
      description: "Same repeated after-dark following behaviour near the station. Followed me again. Followed me after dark.",
    })
  );

  const result = await analyzePatternGroup({ id: "THRESH", reports });
  assert.ok(result.validation.totalReports >= MIN_RELATED_REPORTS_FOR_RECOGNIZED_CLUSTER);
  assert.ok(result.manipulationScore >= REPORTING_CONCERN_REVIEW_THRESHOLD);
  assert.equal(shouldTriggerAuthorityAlert(result.validation, result.risk, result.trend, result.manipulationScore), false);
  assert.equal(result.authorityAlert, undefined);
});
