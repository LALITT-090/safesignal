export { getAnonymousToken } from "./anonymous-token";

export type IncidentType =
  | "harassment"
  | "following"
  | "stalking"
  | "inappropriate_behaviour"
  | "safety_concern"
  | "other";

export type SemanticSimilarityProvider = {
  similarity(a: string, b: string): Promise<number>;
};

export type Report = {
  id: string;
  incidentType: IncidentType;
  description?: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  anonymousToken: string;
};

export type PatternGroup = {
  id: string;
  reports: Report[];
};

export type ValidationResult = {
  valid: boolean;
  suspicious: boolean;
  totalReports: number;
  uniqueReporters: number;
  timeSpreadHours: number;
  categoryDiversity: number;
  tokenConcentration: number;
  reporterDiversityRatio?: number;
  suspiciousReasons?: string[];
};

export type TrendAnalysis = {
  currentCount: number;
  previousCount: number;
  percentageChange: number;
  direction: "rising" | "stable" | "declining";
  currentWindowStart: Date;
  previousWindowStart: Date;
};

export type RiskComponentScore = {
  location: number;
  time: number;
  behaviour: number;
  reporterDiversity: number;
  categoryDiversity: number;
  trend: number;
};

export type RiskScoreResult = {
  score: number;
  components: RiskComponentScore;
};

export type AuthorityAlert = {
  id: string;
  patternGroupId: string;
  title: string;
  severity: "elevated" | "high";
  riskScore: number;
  reportCount: number;
  independentReporterSignals: number;
  activityChangePercent?: number;
  categorySummary: string[];
  generalLocation: string;
  explanation: string;
  createdAt: Date;
  requiresHumanReview: true;
};

export type RelatedResult = {
  related: boolean;
  distanceMeters: number;
  timeDifferenceHours: number;
  categoryRelated: boolean;
  reasons?: string[];
};

export type PatternReport = {
  id?: string | number;
  report_id: string;
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

export type PatternCluster = {
  label: string;
  reports: PatternReport[];
  locationSimilarity: number;
  timeSimilarity: number;
  categorySimilarity: number;
  behaviourSimilarity: number;
  corroborationScore: number;
  reporterDiversity: number;
  recentCount: number;
  previousCount: number;
  risingPercent: number;
  suspicious: boolean;
  suspiciousMessage: string;
  connectionExplanation: string[];
};

export type SpatialCandidateGroup = {
  id: string;
  reports: Report[];
};

export const LOCATION_RADIUS_METERS = 500;
export const TIME_WINDOW_DAYS = 7;
export const DBSCAN_EPSILON_METERS = 500;
export const DBSCAN_MIN_POINTS = 2;
export const MIN_UNIQUE_REPORTERS = 2;
export const RISK_ALERT_THRESHOLD = 70;

export const RELATED_INCIDENT_TYPES: Record<IncidentType, IncidentType[]> = {
  harassment: ["harassment", "inappropriate_behaviour", "following", "stalking"],
  following: ["following", "harassment", "stalking"],
  stalking: ["stalking", "following", "harassment"],
  inappropriate_behaviour: ["inappropriate_behaviour", "harassment", "safety_concern"],
  safety_concern: ["safety_concern", "harassment", "inappropriate_behaviour"],
  other: ["other"],
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "with",
  "was",
  "were",
  "for",
  "from",
  "that",
  "this",
  "into",
  "near",
  "after",
  "before",
  "about",
  "around",
  "been",
  "have",
  "has",
  "there",
  "what",
  "when",
  "where",
  "someone",
  "people",
  "report",
  "reports",
  "feeling",
  "seems",
  "felt",
  "like",
  "saw",
  "being",
  "also",
  "not",
  "very",
  "during",
  "while",
  "their",
  "them",
  "same",
]);

export function normalizeIncidentType(value: string | null | undefined): IncidentType {
  const normalized = (value || "").trim().toLowerCase();

  if (normalized.includes("follow")) {
    return "following";
  }

  if (normalized.includes("stalk")) {
    return "stalking";
  }

  if (normalized.includes("unsafe") || normalized.includes("safety") || normalized.includes("concern")) {
    return "safety_concern";
  }

  if (normalized.includes("harass")) {
    return "harassment";
  }

  if (normalized.includes("inappropriate") || normalized.includes("behaviour") || normalized.includes("behavior")) {
    return "inappropriate_behaviour";
  }

  if (normalized.includes("other")) {
    return "other";
  }

  return "other";
}

export function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0").toUpperCase();
}

export function createPatternGroupId(reports: Report[]) {
  const sortedIds = [...new Set(reports.map((report) => report.id))].sort();
  const seed = sortedIds.join("|") || "empty";
  return `PG-${hashString(seed).slice(0, 6)}`;
}

export function haversineDistanceMeters(a: Pick<Report, "latitude" | "longitude"> | { latitude: number; longitude: number }, b: Pick<Report, "latitude" | "longitude"> | { latitude: number; longitude: number }) {
  const earthRadiusMeters = 6371000;
  const latitudeDelta = ((b.latitude - a.latitude) * Math.PI) / 180;
  const longitudeDelta = ((b.longitude - a.longitude) * Math.PI) / 180;
  const latA = (a.latitude * Math.PI) / 180;
  const latB = (b.latitude * Math.PI) / 180;

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(latA) * Math.cos(latB) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusMeters * centralAngle;
}

export function isWithinTimeWindow(a: Date | string | number, b: Date | string | number) {
  const left = new Date(a).getTime();
  const right = new Date(b).getTime();

  if (Number.isNaN(left) || Number.isNaN(right)) {
    return false;
  }

  return Math.abs(left - right) <= TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export function isWithinActiveWindow(reportDate: Date | string | number, now: Date = new Date()) {
  const reportTime = new Date(reportDate).getTime();
  const currentTime = new Date(now).getTime();

  if (Number.isNaN(reportTime) || Number.isNaN(currentTime)) {
    return false;
  }

  return currentTime - reportTime <= TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export function isRelated(newReport: Report, existingReport: Report): RelatedResult {
  const distanceMeters = haversineDistanceMeters(newReport, existingReport);
  const timeDifferenceHours = Math.abs(
    (newReport.createdAt.getTime() - existingReport.createdAt.getTime()) / (60 * 60 * 1000)
  );
  const categoryRelated =
    RELATED_INCIDENT_TYPES[newReport.incidentType]?.includes(existingReport.incidentType) ||
    RELATED_INCIDENT_TYPES[existingReport.incidentType]?.includes(newReport.incidentType) ||
    false;

  const related =
    distanceMeters <= LOCATION_RADIUS_METERS &&
    isWithinTimeWindow(newReport.createdAt, existingReport.createdAt) &&
    categoryRelated;

  return {
    related,
    distanceMeters,
    timeDifferenceHours,
    categoryRelated,
    reasons: [
      `Location within ${LOCATION_RADIUS_METERS}m: ${distanceMeters <= LOCATION_RADIUS_METERS}`,
      `Time within ${TIME_WINDOW_DAYS} days: ${isWithinTimeWindow(newReport.createdAt, existingReport.createdAt)}`,
      `Related incident category: ${categoryRelated}`,
    ],
  };
}

export function tokenizeDescription(text: string | null | undefined) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export function calculateJaccardSimilarity(first: string[], second: string[]) {
  if (first.length === 0 && second.length === 0) {
    return 1;
  }

  if (first.length === 0 || second.length === 0) {
    return 0;
  }

  const setA = new Set(first);
  const setB = new Set(second);
  const intersection = [...setA].filter((token) => setB.has(token)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function createDefaultSemanticSimilarityProvider(): SemanticSimilarityProvider {
  return {
    async similarity(a: string, b: string) {
      const tokensA = tokenizeDescription(a);
      const tokensB = tokenizeDescription(b);
      return calculateJaccardSimilarity(tokensA, tokensB);
    },
  };
}

export function isLegacyReportLike(value: unknown): value is PatternReport {
  return !!value && typeof value === "object" && "report_id" in value && typeof (value as PatternReport).report_id === "string";
}

export function toSafeSignalReport(report: PatternReport): Report | null {
  if (!isLegacyReportLike(report)) {
    return null;
  }

  const latitude = Number(report.latitude);
  const longitude = Number(report.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const createdAtValue = report.incident_time ? new Date(report.incident_time) : new Date();

  return {
    id: String(report.id ?? report.report_id),
    incidentType: normalizeIncidentType(report.category || "other"),
    description: report.description ?? undefined,
    latitude,
    longitude,
    createdAt: createdAtValue,
    anonymousToken:
      typeof report.anonymous_token === "string" && report.anonymous_token.trim().length > 0
        ? report.anonymous_token.trim()
        : String(report.report_id),
  };
}

export function calculateTokenConcentration(reports: Report[]) {
  if (reports.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();
  for (const report of reports) {
    counts.set(report.anonymousToken, (counts.get(report.anonymousToken) || 0) + 1);
  }

  const mostUsedTokenCount = Math.max(...counts.values());
  return mostUsedTokenCount / reports.length;
}

export function validatePatternGroup(patternGroup: PatternGroup): ValidationResult {
  const { reports } = patternGroup;
  const totalReports = reports.length;
  const uniqueReporters = new Set(reports.map((report) => report.anonymousToken)).size;
  const timestamps = reports.map((report) => report.createdAt.getTime()).sort((left, right) => left - right);
  const timeSpreadHours = timestamps.length > 1
    ? (timestamps[timestamps.length - 1] - timestamps[0]) / (60 * 60 * 1000)
    : 0;
  const categorySet = new Set(reports.map((report) => report.incidentType));
  const categoryDiversity = categorySet.size;
  const tokenConcentration = calculateTokenConcentration(reports);
  const reporterDiversityRatio = totalReports > 0 ? uniqueReporters / totalReports : 0;

  const suspiciousReasons: string[] = [];

  if (tokenConcentration >= 0.6) {
    suspiciousReasons.push("High anonymous-token concentration");
  }

  if (uniqueReporters < MIN_UNIQUE_REPORTERS && totalReports >= 2) {
    suspiciousReasons.push("Low independent reporter signal diversity");
  }

  if (timeSpreadHours <= 24 && totalReports >= 3) {
    suspiciousReasons.push("Multiple highly similar submissions in a short interval");
  }

  if (categoryDiversity >= 3 && reporterDiversityRatio < 0.8) {
    suspiciousReasons.push("Repeated targeting pattern");
  }

  const valid = totalReports >= 2 && uniqueReporters >= MIN_UNIQUE_REPORTERS;
  const suspicious = suspiciousReasons.length > 0;

  return {
    valid,
    suspicious,
    totalReports,
    uniqueReporters,
    timeSpreadHours,
    categoryDiversity,
    tokenConcentration,
    reporterDiversityRatio,
    suspiciousReasons: suspiciousReasons.length > 0 ? suspiciousReasons : undefined,
  };
}

export function calculateTrend(reports: Report[]): TrendAnalysis {
  const sortedReports = [...reports].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  if (sortedReports.length === 0) {
    const now = new Date();
    return {
      currentCount: 0,
      previousCount: 0,
      percentageChange: 0,
      direction: "stable",
      currentWindowStart: new Date(now.getTime() - TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      previousWindowStart: new Date(now.getTime() - TIME_WINDOW_DAYS * 2 * 24 * 60 * 60 * 1000),
    };
  }

  const latestTime = new Date(Math.max(...sortedReports.map((report) => report.createdAt.getTime())));
  const currentWindowStart = new Date(latestTime.getTime() - TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const previousWindowStart = new Date(currentWindowStart.getTime() - TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const currentCount = sortedReports.filter((report) => report.createdAt >= currentWindowStart && report.createdAt <= latestTime).length;
  const previousCount = sortedReports.filter(
    (report) => report.createdAt >= previousWindowStart && report.createdAt < currentWindowStart
  ).length;

  const percentageChange = previousCount === 0 ? (currentCount > 0 ? 100 : 0) : ((currentCount - previousCount) / previousCount) * 100;

  return {
    currentCount,
    previousCount,
    percentageChange: Number(percentageChange.toFixed(1)),
    direction: percentageChange > 0 ? "rising" : percentageChange < 0 ? "declining" : "stable",
    currentWindowStart,
    previousWindowStart,
  };
}

export function calculateRiskScore(patternGroup: PatternGroup, validation: ValidationResult, trend: TrendAnalysis): RiskScoreResult {
  const reportCount = patternGroup.reports.length;
  const averageDistance =
    reportCount > 1
      ? patternGroup.reports.reduce((sum, report, index) => {
          const otherReports = patternGroup.reports.slice(index + 1);
          const pairDistances = otherReports.map((otherReport) => haversineDistanceMeters(report, otherReport));
          return sum + (pairDistances.length ? pairDistances.reduce((distanceTotal, distance) => distanceTotal + distance, 0) / pairDistances.length : 0);
        }, 0) / reportCount
      : 0;

  const locationScore = Math.max(0, Math.min(100, 100 - (averageDistance / LOCATION_RADIUS_METERS) * 100));
  const timeScore = validation.timeSpreadHours <= 24 ? 90 : Math.max(20, 100 - (validation.timeSpreadHours / 72) * 100);
  const behaviourScores = [] as number[];

  for (let index = 0; index < patternGroup.reports.length; index += 1) {
    for (let comparisonIndex = index + 1; comparisonIndex < patternGroup.reports.length; comparisonIndex += 1) {
      const first = patternGroup.reports[index];
      const second = patternGroup.reports[comparisonIndex];
      const tokensA = tokenizeDescription(first.description || "");
      const tokensB = tokenizeDescription(second.description || "");
      behaviourScores.push(calculateJaccardSimilarity(tokensA, tokensB));
    }
  }

  const behaviourScore = behaviourScores.length
    ? (behaviourScores.reduce((sum, item) => sum + item, 0) / behaviourScores.length) * 100
    : 0;

  const reporterDiversityScore = Number(((validation.uniqueReporters / Math.max(reportCount, 1)) * 100).toFixed(1));
  const categoryDiversityScore = Number(((validation.categoryDiversity / Math.max(reportCount, 1)) * 100).toFixed(1));
  const trendScore = Math.max(0, Math.min(100, (trend.percentageChange / 200) * 100 + 50));

  const components: RiskComponentScore = {
    location: Math.round(locationScore),
    time: Math.round(timeScore),
    behaviour: Math.round(behaviourScore),
    reporterDiversity: Math.round(reporterDiversityScore),
    categoryDiversity: Math.round(categoryDiversityScore),
    trend: Math.round(trendScore),
  };

  const score = Math.min(
    100,
    Math.round(
      (components.location +
        components.time +
        components.behaviour +
        components.reporterDiversity +
        components.categoryDiversity +
        components.trend) /
        6
    )
  );

  return { score, components };
}

export function analyzePatternGroup(patternGroup: PatternGroup, provider: SemanticSimilarityProvider = createDefaultSemanticSimilarityProvider()): Promise<{
  patternGroup: PatternGroup;
  validation: ValidationResult;
  trend: TrendAnalysis;
  risk: RiskScoreResult;
  authorityAlert?: AuthorityAlert;
}> {
  return (async () => {
    const sortedReports = [...patternGroup.reports].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    const normalizedGroup: PatternGroup = {
      id: createPatternGroupId(sortedReports),
      reports: sortedReports,
    };

    const validation = validatePatternGroup(normalizedGroup);
    const trend = calculateTrend(normalizedGroup.reports);
    const risk = calculateRiskScore(normalizedGroup, validation, trend);

    const semanticScores: number[] = [];
    for (let index = 0; index < normalizedGroup.reports.length; index += 1) {
      for (let comparisonIndex = index + 1; comparisonIndex < normalizedGroup.reports.length; comparisonIndex += 1) {
        const first = normalizedGroup.reports[index];
        const second = normalizedGroup.reports[comparisonIndex];
        const similarityValue = await provider.similarity(first.description || "", second.description || "");
        semanticScores.push(Math.max(0, Math.min(1, similarityValue)));
      }
    }

    if (semanticScores.length > 0) {
      const semanticAverage = (semanticScores.reduce((sum, value) => sum + value, 0) / semanticScores.length) * 100;
      risk.components.behaviour = Math.round(Math.min(100, semanticAverage));
      risk.score = Math.min(
        100,
        Math.round(
          (risk.components.location +
            risk.components.time +
            risk.components.behaviour +
            risk.components.reporterDiversity +
            risk.components.categoryDiversity +
            risk.components.trend) /
            6
        )
      );
    }

    const requiresHumanReview = validation.valid || validation.suspicious;
    const severity: AuthorityAlert["severity"] = risk.score >= 85 ? "high" : "elevated";
    const authorityAlert: AuthorityAlert | undefined =
      risk.score >= RISK_ALERT_THRESHOLD && requiresHumanReview
        ? {
            id: `AL-${hashString(normalizedGroup.id).slice(0, 6)}`,
            patternGroupId: normalizedGroup.id,
            title: "Rising reported safety activity",
            severity,
            riskScore: risk.score,
            reportCount: validation.totalReports,
            independentReporterSignals: validation.uniqueReporters,
            activityChangePercent: Number(trend.percentageChange.toFixed(1)),
            categorySummary: [...new Set(normalizedGroup.reports.map((report) => report.incidentType))],
            generalLocation: `Area ${normalizedGroup.reports[0].latitude.toFixed(3)}, ${normalizedGroup.reports[0].longitude.toFixed(3)}`,
            explanation:
              "Rising reported safety activity in a local area with related incident types and multiple independent reporter signals. This is not a determination of guilt or identity, and it requires human review.",
            createdAt: new Date(),
            requiresHumanReview: true,
          }
        : undefined;

    return {
      patternGroup: normalizedGroup,
      validation,
      trend,
      risk,
      authorityAlert,
    };
  })();
}

export function dbscanSpatialCandidateGroups(reports: Report[], epsilonMeters = DBSCAN_EPSILON_METERS, minPoints = DBSCAN_MIN_POINTS): SpatialCandidateGroup[] {
  const activeReports = reports.filter((report) => isWithinActiveWindow(report.createdAt)).sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  const visited = new Set<string>();
  const groups: SpatialCandidateGroup[] = [];

  for (const report of activeReports) {
    if (visited.has(report.id)) {
      continue;
    }

    visited.add(report.id);
    const neighbors = activeReports.filter(
      (candidate) => candidate.id !== report.id && haversineDistanceMeters(report, candidate) <= epsilonMeters
    );

    if (neighbors.length + 1 < minPoints) {
      continue;
    }

    const clusterMembers = new Set<string>([report.id]);
    const queue = [...neighbors.map((neighbor) => neighbor.id)];

    while (queue.length > 0) {
      const candidateId = queue.shift();
      if (!candidateId || clusterMembers.has(candidateId)) {
        continue;
      }

      clusterMembers.add(candidateId);
      const candidate = activeReports.find((item) => item.id === candidateId);
      if (!candidate) {
        continue;
      }

      const candidateNeighbors = activeReports.filter(
        (item) => item.id !== candidate.id && haversineDistanceMeters(candidate, item) <= epsilonMeters
      );

      if (candidateNeighbors.length + 1 >= minPoints) {
        candidateNeighbors.forEach((neighbor) => {
          if (!clusterMembers.has(neighbor.id)) {
            queue.push(neighbor.id);
          }
        });
      }
    }

    const members = activeReports.filter((candidate) => clusterMembers.has(candidate.id));
    if (members.length >= minPoints) {
      groups.push({
        id: `SC-${hashString(members.map((member) => member.id).sort().join("|")).slice(0, 6)}`,
        reports: members,
      });
    }
  }

  return groups;
}

export function createCandidateGroups(reports: Report[]): PatternGroup[] {
  const groups = dbscanSpatialCandidateGroups(reports);

  if (groups.length > 0) {
    return groups.map((group) => ({
      id: createPatternGroupId(group.reports),
      reports: group.reports,
    }));
  }

  const relatedGroups: PatternGroup[] = [];
  const processed = new Set<string>();

  for (let index = 0; index < reports.length; index += 1) {
    const report = reports[index];
    if (processed.has(report.id)) {
      continue;
    }

    const matches = reports.filter((candidate) => {
      if (candidate.id === report.id) {
        return false;
      }

      return isRelated(report, candidate).related;
    });

    if (matches.length > 0) {
      const groupReports = [report, ...matches];
      relatedGroups.push({
        id: createPatternGroupId(groupReports),
        reports: groupReports,
      });
      groupReports.forEach((item) => processed.add(item.id));
    }
  }

  return relatedGroups;
}

export function buildPatternGroups(reports: Report[]) {
  const activeReports = reports.filter((report) => isWithinActiveWindow(report.createdAt));
  return createCandidateGroups(activeReports);
}

export function buildPatternClusters(reports: PatternReport[]) {
  const validReports = reports
    .map((report) => toSafeSignalReport(report))
    .filter((report): report is Report => Boolean(report));

  if (validReports.length === 0) {
    return [];
  }

  const patternGroups = buildPatternGroups(validReports);

  return patternGroups
    .map((group) => {
      const validation = validatePatternGroup(group);
      const trend = calculateTrend(group.reports);
      const risk = calculateRiskScore(group, validation, trend);
      const label = group.reports.length > 1 ? `Pattern Group ${group.id.slice(-4)}` : "Independent reporter signal";

      const explanation = [
        "Reports are within the same local area.",
        `Reports occurred within a ${TIME_WINDOW_DAYS}-day time window.`,
        "Related incident categories were reviewed together.",
        "Behavioural similarity was evaluated using deterministic text matching.",
        `${validation.uniqueReporters} independent reporter signals contributed to this pattern.`,
      ];

      return {
        label,
        reports: group.reports.map((report) => ({
          id: report.id,
          report_id: report.id,
          category: report.incidentType,
          description: report.description ?? null,
          location_name: "General area",
          location_label: "General area",
          latitude: report.latitude,
          longitude: report.longitude,
          incident_time: report.createdAt.toISOString(),
          status: "submitted",
        })),
        locationSimilarity: Math.min(100, Math.round(risk.components.location)),
        timeSimilarity: Math.min(100, Math.round(risk.components.time)),
        categorySimilarity: Math.min(100, Math.round(risk.components.categoryDiversity)),
        behaviourSimilarity: Math.min(100, Math.round(risk.components.behaviour)),
        corroborationScore: risk.score,
        reporterDiversity: validation.uniqueReporters,
        recentCount: trend.currentCount,
        previousCount: trend.previousCount,
        risingPercent: Number(trend.percentageChange.toFixed(1)),
        suspicious: validation.suspicious,
        suspiciousMessage: validation.suspicious
          ? "Suspicious/coordinated reporting behaviour flagged for human review."
          : "No unusual reporting concentration detected.",
        connectionExplanation: explanation,
      } satisfies PatternCluster;
    })
    .sort((left, right) => {
      if (right.corroborationScore !== left.corroborationScore) {
        return right.corroborationScore - left.corroborationScore;
      }

      return right.reports.length - left.reports.length;
    });
}

export const mockPatternCases = {
  case1: [
    { id: "R1", incidentType: "harassment", latitude: 51.5072, longitude: -0.1276, createdAt: new Date("2026-09-01T10:00:00Z"), anonymousToken: "A", description: "Group followed me near the station and shouted comments." },
    { id: "R2", incidentType: "following", latitude: 51.5076, longitude: -0.1269, createdAt: new Date("2026-09-03T16:00:00Z"), anonymousToken: "B", description: "Someone kept walking behind me on the street." },
    { id: "R3", incidentType: "stalking", latitude: 51.5079, longitude: -0.1271, createdAt: new Date("2026-09-05T20:30:00Z"), anonymousToken: "C", description: "Repeated loitering and following near the station." },
    { id: "R4", incidentType: "inappropriate_behaviour", latitude: 51.5068, longitude: -0.1281, createdAt: new Date("2026-09-08T19:00:00Z"), anonymousToken: "D", description: "Unwanted comments and harassment near the station." },
    { id: "R5", incidentType: "safety_concern", latitude: 51.5075, longitude: -0.1272, createdAt: new Date("2026-09-10T21:00:00Z"), anonymousToken: "E", description: "Repeated worrying behaviour around the same area after dark." },
  ],
  case2: [
    { id: "R6", incidentType: "harassment", latitude: 51.5001, longitude: -0.1301, createdAt: new Date("2026-09-12T08:00:00Z"), anonymousToken: "A", description: "Harassment near the cafe, same person keeps following me." },
    { id: "R7", incidentType: "harassment", latitude: 51.5004, longitude: -0.1298, createdAt: new Date("2026-09-12T08:05:00Z"), anonymousToken: "A", description: "Harassment near the cafe, same person keeps following me." },
    { id: "R8", incidentType: "harassment", latitude: 51.5007, longitude: -0.1295, createdAt: new Date("2026-09-12T08:12:00Z"), anonymousToken: "A", description: "Harassment near the cafe, same person keeps following me." },
    { id: "R9", incidentType: "harassment", latitude: 51.5011, longitude: -0.1292, createdAt: new Date("2026-09-12T08:18:00Z"), anonymousToken: "A", description: "Harassment near the cafe, same person keeps following me." },
    { id: "R10", incidentType: "harassment", latitude: 51.5015, longitude: -0.1289, createdAt: new Date("2026-09-12T08:24:00Z"), anonymousToken: "A", description: "Harassment near the cafe, same person keeps following me." },
    { id: "R11", incidentType: "harassment", latitude: 51.5021, longitude: -0.1285, createdAt: new Date("2026-09-12T08:35:00Z"), anonymousToken: "A", description: "Harassment near the cafe, same person keeps following me." },
    { id: "R12", incidentType: "harassment", latitude: 51.5028, longitude: -0.1284, createdAt: new Date("2026-09-12T08:47:00Z"), anonymousToken: "A", description: "Harassment near the cafe, same person keeps following me." },
    { id: "R13", incidentType: "harassment", latitude: 51.5033, longitude: -0.1282, createdAt: new Date("2026-09-12T09:00:00Z"), anonymousToken: "A", description: "Harassment near the cafe, same person keeps following me." },
    { id: "R14", incidentType: "harassment", latitude: 51.5037, longitude: -0.1279, createdAt: new Date("2026-09-12T09:10:00Z"), anonymousToken: "A", description: "Harassment near the cafe, same person keeps following me." },
    { id: "R15", incidentType: "harassment", latitude: 51.5041, longitude: -0.1276, createdAt: new Date("2026-09-12T09:20:00Z"), anonymousToken: "A", description: "Harassment near the cafe, same person keeps following me." },
  ],
  case3: [
    { id: "R16", incidentType: "harassment", latitude: 51.5072, longitude: -0.1276, createdAt: new Date("2026-09-04T10:00:00Z"), anonymousToken: "A", description: "Harassment near the station." },
    { id: "R17", incidentType: "safety_concern", latitude: 40.7128, longitude: -74.0060, createdAt: new Date("2026-09-04T10:30:00Z"), anonymousToken: "B", description: "Concerns in another city." },
    { id: "R18", incidentType: "following", latitude: 48.8566, longitude: 2.3522, createdAt: new Date("2026-09-04T11:00:00Z"), anonymousToken: "C", description: "Following in a different city." },
  ],
  case4: [
    { id: "R19", incidentType: "harassment", latitude: 51.5072, longitude: -0.1276, createdAt: new Date("2026-08-01T10:00:00Z"), anonymousToken: "A", description: "Past incident." },
    { id: "R20", incidentType: "following", latitude: 51.5076, longitude: -0.1269, createdAt: new Date("2026-08-02T10:00:00Z"), anonymousToken: "B", description: "Past incident." },
  ],
  case5: [
    { id: "R21", incidentType: "following", latitude: 51.5072, longitude: -0.1276, createdAt: new Date("2026-09-08T10:00:00Z"), anonymousToken: "A", description: "Someone kept following me to the station." },
    { id: "R22", incidentType: "stalking", latitude: 51.5075, longitude: -0.1281, createdAt: new Date("2026-09-09T11:00:00Z"), anonymousToken: "B", description: "Repeated following and stalking near the station." },
  ],
};
