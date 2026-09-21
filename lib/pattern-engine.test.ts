import assert from "node:assert/strict";
import test from "node:test";

import {
  TREND_ALERT_THRESHOLD_PERCENT,
  analyzePatternGroup,
  buildPatternGroups,
  shouldTriggerAuthorityAlert,
  type Report,
} from "./pattern-engine.ts";

function makeReport(overrides: Partial<Report> & { id: string }): Report {
  return {
    id: overrides.id,
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
  assert.ok(result.trend.percentageChange > TREND_ALERT_THRESHOLD_PERCENT);
  assert.ok(result.risk.score >= 70);
  assert.ok(shouldTriggerAuthorityAlert(result.validation, result.risk, result.trend));
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
  assert.equal(shouldTriggerAuthorityAlert(result.validation, result.risk, result.trend), false);
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
  assert.equal(shouldTriggerAuthorityAlert(result.validation, result.risk, result.trend), false);
  assert.equal(result.authorityAlert, undefined);
});

test("single report is ignored", async () => {
  const result = await analyzePatternGroup({ id: "PG-single", reports: [makeReport({ id: "R1" })] });

  assert.equal(result.validation.valid, false);
  assert.equal(result.authorityAlert, undefined);
  assert.equal(shouldTriggerAuthorityAlert(result.validation, result.risk, result.trend), false);
});

test("unrelated reports do not become a valid pattern", async () => {
  const reports = [
    makeReport({ id: "U1", anonymousToken: "A", latitude: 51.5072, longitude: -0.1276, createdAt: new Date("2026-09-10T08:00:00Z"), incidentType: "harassment" }),
    makeReport({ id: "U2", anonymousToken: "B", latitude: 48.8566, longitude: 2.3522, createdAt: new Date("2026-09-11T09:00:00Z"), incidentType: "stalking" }),
  ];

  const groups = buildPatternGroups(reports);
  assert.equal(groups.length, 0);
  assert.equal(shouldTriggerAuthorityAlert(
    { valid: false, uniqueReporters: 2, suspicious: false },
    { score: 0 },
    { percentageChange: 0 }
  ), false);
});
