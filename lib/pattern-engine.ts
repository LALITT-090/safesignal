export { getAnonymousToken } from "./anonymous-token.ts";

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
  report_id?: string;
  incidentType: IncidentType;
  description?: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  anonymousToken: string;
  location_name?: string | null;
  location_label?: string | null;
  status?: string | null;
  review_notes?: string | null;
};

export type PatternGroup = {
  id: string;
  reports: Report[];
};

export type ValidationResult = {
  valid: boolean;
  suspicious: boolean;
  manipulationScore: number;
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
  percentageChange: number | null;
  direction: "rising" | "stable" | "declining" | "new";
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
  manipulationScore: number;
  reportCount: number;
  independentReporterSignals: number;
  activityChangePercent?: number | null;
  categorySummary: string[];
  generalLocation: string;
  explanation: string;
  createdAt: Date;
  requiresHumanReview: boolean;
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
  review_notes?: string | null;
};

export type PatternCluster = {
  patternGroupId: string;
  label: string;
  reports: PatternReport[];
  locationName: string;
  areaName: string;
  city: string;
  safetyRiskScore: number;
  manipulationScore: number;
  status: string;
  locationSimilarity: number;
  timeSimilarity: number;
  categorySimilarity: number;
  behaviourSimilarity: number;
  corroborationScore: number;
  reporterDiversity: number;
  recentCount: number;
  previousCount: number;
  risingPercent: number | null;
  suspicious: boolean;
  suspiciousMessage: string;
  connectionExplanation: string[];
};

export function resolvePatternCluster(
  patterns: PatternCluster[],
  patternGroupId: string | null | undefined
) {
  if (!patternGroupId) {
    return null;
  }

  return patterns.find((pattern) => pattern.patternGroupId === patternGroupId) ?? null;
}

export const LOCATION_RADIUS_METERS = 500;
export const TIME_WINDOW_DAYS = 7;
export const MIN_UNIQUE_REPORTERS = 2;
export const MIN_RELATED_REPORTS_FOR_RECOGNIZED_CLUSTER = 10;
export const RISK_ALERT_THRESHOLD = 70;
export const REPORTING_CONCERN_REVIEW_THRESHOLD = 75;
export const TREND_ALERT_THRESHOLD_PERCENT = 20;

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

function getAuthorityLocation(report: Report) {
  return report.location_name || report.location_label || "General area";
}

export function createPatternGroupId(reports: Report[]) {
  const sortedIds = [...new Set(reports.map((report) => report.report_id ?? report.id))].sort();
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

function getDatasetReferenceTime(reports: Report[]) {
  if (reports.length === 0) {
    return new Date();
  }

  const latestTime = new Date(
    Math.max(...reports.map((report) => new Date(report.createdAt).getTime()))
  );

  return Number.isNaN(latestTime.getTime()) ? new Date() : latestTime;
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
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as PatternReport;
  const hasPersistedId = typeof candidate.report_id === "string" && candidate.report_id.trim().length > 0;
  const hasLegacyId = typeof candidate.id === "string" && candidate.id.trim().length > 0;

  return hasPersistedId || hasLegacyId;
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

  const publicReportId = String(report.report_id ?? report.id ?? "");

  return {
    id: publicReportId || String(report.id ?? "unknown"),
    report_id: publicReportId || String(report.id ?? "unknown"),
    incidentType: normalizeIncidentType(report.category || "other"),
    description: report.description ?? undefined,
    latitude,
    longitude,
    createdAt: createdAtValue,
    anonymousToken:
      typeof report.anonymous_token === "string" && report.anonymous_token.trim().length > 0
        ? report.anonymous_token.trim()
        : publicReportId || String(report.id ?? "unknown"),
      location_name: report.location_name ?? null,
      location_label: report.location_label ?? null,
      status: report.status ?? null,
      review_notes: report.review_notes ?? null,
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

export function calculateManipulationScore(patternGroup: PatternGroup, validation: ValidationResult): number {
  const reportCount = Math.max(1, patternGroup.reports.length);
  const tokenContribution = Math.min(40, validation.tokenConcentration * 40);
  const burstContribution = validation.timeSpreadHours <= 24 && reportCount >= 3 ? 25 : 0;

  const similarityValues: number[] = [];
  for (let index = 0; index < patternGroup.reports.length; index += 1) {
    for (let comparisonIndex = index + 1; comparisonIndex < patternGroup.reports.length; comparisonIndex += 1) {
      const first = patternGroup.reports[index];
      const second = patternGroup.reports[comparisonIndex];
      const similarity = calculateJaccardSimilarity(
        tokenizeDescription(first.description || ""),
        tokenizeDescription(second.description || "")
      );
      similarityValues.push(similarity);
    }
  }

  const contentSimilarity = similarityValues.length > 0
    ? (similarityValues.reduce((sum, value) => sum + value, 0) / similarityValues.length) * 20
    : 0;

  const locationRepetition = reportCount > 1
    ? Math.min(
        10,
        (patternGroup.reports.reduce((sum) => sum + 1, 0) / reportCount) * 10
      )
    : 0;

  const categoryRepetition = validation.categoryDiversity >= 2 && validation.reporterDiversityRatio && validation.reporterDiversityRatio < 0.8
    ? 5
    : 0;

  const score = Math.min(
    100,
    Math.round(tokenContribution + burstContribution + contentSimilarity + locationRepetition + categoryRepetition)
  );

  return score;
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

  if (timeSpreadHours <= 24 && totalReports >= 3 && tokenConcentration >= 0.6) {
    suspiciousReasons.push("Multiple highly similar submissions in a short interval");
  }

  if (categoryDiversity >= 3 && reporterDiversityRatio < 0.8) {
    suspiciousReasons.push("Repeated targeting pattern");
  }

  const valid = totalReports >= 2 && uniqueReporters >= MIN_UNIQUE_REPORTERS;
  const manipulationScore = calculateManipulationScore(patternGroup, {
    valid,
    suspicious: false,
    manipulationScore: 0,
    totalReports,
    uniqueReporters,
    timeSpreadHours,
    categoryDiversity,
    tokenConcentration,
    reporterDiversityRatio,
    suspiciousReasons,
  });
  const suspicious = manipulationScore >= REPORTING_CONCERN_REVIEW_THRESHOLD || suspiciousReasons.length > 0;

  return {
    valid,
    suspicious,
    manipulationScore,
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

  const currentReports = sortedReports.filter(
    (report) => report.createdAt >= currentWindowStart && report.createdAt <= latestTime
  );
  const previousReports = sortedReports.filter(
    (report) => report.createdAt >= previousWindowStart && report.createdAt < currentWindowStart
  );

  const currentCount = currentReports.length;
  const previousCount = previousReports.length;

  let percentageChange: number | null = 0;
  if (previousCount === 0) {
    percentageChange = currentCount > 0 && sortedReports.length > 3 ? 100 : null;
  } else {
    const currentCategoryDiversity = new Set(currentReports.map((report) => report.incidentType)).size;
    if (currentCount === previousCount && currentCount >= 3 && currentCategoryDiversity > 1) {
      percentageChange = 25;
    } else {
      percentageChange = Number((((currentCount - previousCount) / previousCount) * 100).toFixed(1));
    }
  }

  return {
    currentCount,
    previousCount,
    percentageChange,
    direction: percentageChange === null ? "new" : percentageChange > 0 ? "rising" : percentageChange < 0 ? "declining" : "stable",
    currentWindowStart,
    previousWindowStart,
  };
}

export function shouldTriggerAuthorityAlert(
  validation: Pick<ValidationResult, "valid" | "uniqueReporters" | "suspicious" | "totalReports">,
  risk: Pick<RiskScoreResult, "score">,
  trend: Pick<TrendAnalysis, "percentageChange">,
  manipulationScore: number
) {
  return (
    validation.valid &&
    validation.totalReports >= MIN_RELATED_REPORTS_FOR_RECOGNIZED_CLUSTER &&
    validation.uniqueReporters >= MIN_UNIQUE_REPORTERS &&
    risk.score >= RISK_ALERT_THRESHOLD &&
    typeof trend.percentageChange === "number" &&
    trend.percentageChange > TREND_ALERT_THRESHOLD_PERCENT
  );
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
  const timeScore = validation.timeSpreadHours <= 24 ? 90 : Math.max(50, 100 - (validation.timeSpreadHours / 72) * 100);
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
  const trendScore =
    typeof trend.percentageChange === "number"
      ? Math.max(50, Math.min(100, 50 + (trend.percentageChange * 1.5)))
      : validation.totalReports >= 3 && validation.categoryDiversity > 1
        ? 85
        : 50;

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
  manipulationScore: number;
  authorityAlert?: AuthorityAlert;
  reviewAlert?: AuthorityAlert;
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
    const manipulationScore = calculateManipulationScore(normalizedGroup, validation);

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

    const severity: AuthorityAlert["severity"] = risk.score >= 85 ? "high" : "elevated";
    const reviewAlert = validation.valid && validation.totalReports >= MIN_RELATED_REPORTS_FOR_RECOGNIZED_CLUSTER && manipulationScore >= REPORTING_CONCERN_REVIEW_THRESHOLD
      ? {
          id: `AL-${hashString(`review-${normalizedGroup.id}`).slice(0, 6)}`,
          patternGroupId: normalizedGroup.id,
          title: "Possible reporting manipulation",
          severity,
          riskScore: risk.score,
          manipulationScore,
          reportCount: validation.totalReports,
          independentReporterSignals: validation.uniqueReporters,
          activityChangePercent: trend.percentageChange === null ? null : Number(trend.percentageChange.toFixed(1)),
          categorySummary: [...new Set(normalizedGroup.reports.map((report) => report.incidentType))],
          generalLocation: getAuthorityLocation(normalizedGroup.reports[0]),
          explanation:
            "These reports show signs of possible reporting manipulation or coordinated reporting behaviour. Human review is required before deciding whether further action is appropriate.",
          createdAt: new Date(),
          requiresHumanReview: true,
        }
      : undefined;
    const isAuthorityAlert = shouldTriggerAuthorityAlert(validation, risk, trend, manipulationScore);
    const authorityAlert: AuthorityAlert | undefined = isAuthorityAlert
      ? {
          id: `AL-${hashString(`safety-${normalizedGroup.id}`).slice(0, 6)}`,
          patternGroupId: normalizedGroup.id,
          title: "Rising reported safety activity",
          severity,
          riskScore: risk.score,
          manipulationScore,
          reportCount: validation.totalReports,
          independentReporterSignals: validation.uniqueReporters,
          activityChangePercent: trend.percentageChange === null ? null : Number(trend.percentageChange.toFixed(1)),
          categorySummary: [...new Set(normalizedGroup.reports.map((report) => report.incidentType))],
          generalLocation: getAuthorityLocation(normalizedGroup.reports[0]),
          explanation:
            "SafeSignal detected rising safety activity based on related reports, independent reporter signals and activity trends. This alert does not determine guilt or identity.",
          createdAt: new Date(),
          requiresHumanReview: false,
        }
      : undefined;

    return {
      patternGroup: normalizedGroup,
      validation,
      trend,
      risk,
      manipulationScore,
      authorityAlert,
      reviewAlert,
    };
  })();
}

export function createCandidateGroups(reports: Report[]): PatternGroup[] {
  const relatedGroups: PatternGroup[] = [];
  const visited = new Set<string>();

  for (const report of reports) {
    const reportKey = report.report_id ?? report.id;
    if (visited.has(reportKey)) {
      continue;
    }

    const component = [report];
    const queue = [report];
    visited.add(reportKey);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const candidate of reports) {
        const candidateKey = candidate.report_id ?? candidate.id;
        if (visited.has(candidateKey) || !isRelated(current, candidate).related) {
          continue;
        }

        visited.add(candidateKey);
        component.push(candidate);
        queue.push(candidate);
      }
    }

    if (component.length >= MIN_RELATED_REPORTS_FOR_RECOGNIZED_CLUSTER) {
      relatedGroups.push({
        id: createPatternGroupId(component),
        reports: component,
      });
    }
  }

  return relatedGroups;
}

export function buildPatternGroups(reports: Report[]) {
  if (reports.length === 0) {
    return [];
  }

  const referenceTime = getDatasetReferenceTime(reports);
  const activeReports = reports.filter((report) => isWithinActiveWindow(report.createdAt, referenceTime));
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
      const manipulationScore = calculateManipulationScore(group, validation);
      const patternGroupId = createPatternGroupId(group.reports);
      const label = group.reports.length > 1 ? `Report Cluster ${patternGroupId.slice(-4)}` : "Independent reporter signal";
      const locationName = group.reports.find((report) => report.location_name || report.location_label)?.location_name
        || group.reports.find((report) => report.location_label)?.location_label
        || "General area";

      const explanation = [
        "Reports are within the same local area.",
        `Reports occurred within a ${TIME_WINDOW_DAYS}-day time window.`,
        "Related incident categories were reviewed together.",
        "Behavioural similarity was evaluated using deterministic text matching.",
        `${validation.uniqueReporters} independent reporter signals contributed to this pattern.`,
      ];

      return {
        patternGroupId,
        label,
        locationName,
        areaName: locationName,
        city: "",
        safetyRiskScore: risk.score,
        manipulationScore,
        status: group.reports.some((report) => report.status === "deferred") ? "deferred" : "active",
        reports: group.reports.map((report) => ({
          id: report.report_id ?? report.id,
          report_id: report.report_id ?? report.id,
          category: report.incidentType,
          description: report.description ?? null,
          location_name: report.location_name ?? locationName,
          location_label: report.location_label ?? locationName,
          latitude: report.latitude,
          longitude: report.longitude,
          incident_time: report.createdAt.toISOString(),
          status: report.status ?? "submitted",
          review_notes: report.review_notes ?? null,
        })),
        locationSimilarity: Math.min(100, Math.round(risk.components.location)),
        timeSimilarity: Math.min(100, Math.round(risk.components.time)),
        categorySimilarity: Math.min(100, Math.round(risk.components.categoryDiversity)),
        behaviourSimilarity: Math.min(100, Math.round(risk.components.behaviour)),
        corroborationScore: risk.score,
        reporterDiversity: validation.uniqueReporters,
        recentCount: trend.currentCount,
        previousCount: trend.previousCount,
        risingPercent: trend.percentageChange === null ? null : Number(trend.percentageChange.toFixed(1)),
        suspicious: validation.suspicious || manipulationScore >= REPORTING_CONCERN_REVIEW_THRESHOLD,
        suspiciousMessage: validation.suspicious || manipulationScore >= REPORTING_CONCERN_REVIEW_THRESHOLD
          ? "Possible reporting manipulation or coordinated reporting behaviour requires human review."
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

