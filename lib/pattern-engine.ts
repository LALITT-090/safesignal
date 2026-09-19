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
  "been",
  "being",
  "also",
  "not",
  "very",
]);

function normalizeLabel(value: string | null | undefined) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function extractLocationLabel(report: PatternReport) {
  const preferred = normalizeLabel(report.location_label || report.location_name);
  if (preferred && preferred.toLowerCase() !== "location unavailable") {
    return preferred;
  }

  if (report.latitude !== null && report.latitude !== undefined && report.longitude !== null && report.longitude !== undefined) {
    return `Area ${Number(report.latitude).toFixed(3)}, ${Number(report.longitude).toFixed(3)}`;
  }

  return "General area";
}

function bucketLocation(report: PatternReport) {
  const label = normalizeLabel(report.location_label || report.location_name || "").toLowerCase();

  if (label && label !== "location unavailable") {
    return label;
  }

  if (report.latitude !== null && report.latitude !== undefined && report.longitude !== null && report.longitude !== undefined) {
    const latBucket = Number(report.latitude).toFixed(3);
    const lonBucket = Number(report.longitude).toFixed(3);
    return `${latBucket}:${lonBucket}`;
  }

  return "general-area";
}

function toTokens(text: string | null | undefined) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function calculateJaccardSimilarity(first: string[], second: string[]) {
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

function getRecentAndPreviousCounts(times: number[]) {
  if (!times.length) {
    return { recentCount: 0, previousCount: 0, risingPercent: 0 };
  }

  const latest = Math.max(...times);
  const recentWindow = 7 * 24 * 60 * 60 * 1000;
  const previousWindow = 7 * 24 * 60 * 60 * 1000;

  const recentCount = times.filter((time) => latest - time <= recentWindow).length;
  const previousStart = latest - recentWindow;
  const previousCount = times.filter(
    (time) => time >= previousStart - previousWindow && time < previousStart
  ).length;

  const risingPercent = previousCount === 0 ? (recentCount > 0 ? 100 : 0) : Math.round(((recentCount - previousCount) / previousCount) * 100);

  return { recentCount, previousCount, risingPercent };
}

function computeCluster(clusterReports: PatternReport[]): PatternCluster | null {
  const validTimes = clusterReports
    .map((report) => {
      if (!report.incident_time) return null;
      const timeValue = new Date(report.incident_time).getTime();
      return Number.isNaN(timeValue) ? null : timeValue;
    })
    .filter((time): time is number => time !== null)
    .sort((a, b) => a - b);

  if (clusterReports.length < 2) {
    return null;
  }

  const normalizedNames = clusterReports.map((report) => normalizeLabel(report.location_label || report.location_name || "").toLowerCase());
  const locationConsistency = normalizedNames.filter((value) => value && value !== "location unavailable").length
    ? Math.round((normalizedNames.filter((value, index, array) => array.indexOf(value) === index).length / Math.max(normalizedNames.length, 1)) * 100)
    : 100;

  const timeCoverage = validTimes.length
    ? Math.max(
        20,
        Math.min(
          100,
          100 - Math.round(((validTimes[validTimes.length - 1] - validTimes[0]) / (24 * 60 * 60 * 1000)) * 10)
        )
      )
    : 0;

  const categories = clusterReports
    .map((report) => normalizeLabel(report.category || ""))
    .filter(Boolean);
  const categoryCounts = new Map<string, number>();

  categories.forEach((category) => {
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  });

  const categorySimilarity = categories.length
    ? Math.round((Math.max(...(categoryCounts.values())) / categories.length) * 100)
    : 0;

  const behaviourVectors = clusterReports
    .map((report) => toTokens(report.description || ""))
    .filter((tokens) => tokens.length > 0);

  let behaviourSimilarity = 0;
  if (behaviourVectors.length >= 2) {
    const similarities: number[] = [];

    for (let index = 0; index < behaviourVectors.length; index += 1) {
      for (let comparisonIndex = index + 1; comparisonIndex < behaviourVectors.length; comparisonIndex += 1) {
        similarities.push(calculateJaccardSimilarity(behaviourVectors[index], behaviourVectors[comparisonIndex]));
      }
    }

    behaviourSimilarity = similarities.length ? Math.round((similarities.reduce((sum, value) => sum + value, 0) / similarities.length) * 100) : 0;
  }

  const corroborationScore = Math.min(
    100,
    Math.round(
      locationConsistency * 0.28 +
      timeCoverage * 0.22 +
      categorySimilarity * 0.2 +
      behaviourSimilarity * 0.3
    )
  );

  const reporterDiversity = new Set(clusterReports.map((report) => report.report_id)).size;
  const { recentCount, previousCount, risingPercent } = getRecentAndPreviousCounts(validTimes);

  const suspicious =
    clusterReports.length >= 3 &&
    reporterDiversity <= Math.max(2, Math.ceil(clusterReports.length * 0.45)) &&
    behaviourSimilarity >= 55 &&
    corroborationScore >= 72;

  const internalLabel = extractLocationLabel(clusterReports[0]);
  const label = internalLabel === "General area" ? "Emerging area" : internalLabel;

  const connectionExplanation = [
    "Reports were submitted within the same local area.",
    "Reports occurred within a similar time window.",
    "Reports contain related safety categories.",
    "Descriptions contain related behavioural signals.",
    `${reporterDiversity} anonymous submissions contributed to this pattern.`,
  ];

  return {
    label,
    reports: clusterReports,
    locationSimilarity: Math.max(0, Math.min(100, locationConsistency)),
    timeSimilarity: Math.max(0, Math.min(100, timeCoverage)),
    categorySimilarity: Math.max(0, Math.min(100, categorySimilarity)),
    behaviourSimilarity: Math.max(0, Math.min(100, behaviourSimilarity)),
    corroborationScore,
    reporterDiversity,
    recentCount,
    previousCount,
    risingPercent,
    suspicious,
    suspiciousMessage: suspicious
      ? "Suspicious/coordinated reporting behaviour flagged for human review."
      : "No unusual reporting concentration detected.",
    connectionExplanation,
  };
}

export function buildPatternClusters(reports: PatternReport[]) {
  const validReports = reports.filter((report) => report && report.report_id);
  if (!validReports.length) {
    return [];
  }

  const buckets = new Map<string, PatternReport[]>();

  validReports.forEach((report) => {
    const bucketKey = bucketLocation(report);
    const existing = buckets.get(bucketKey) || [];
    existing.push(report);
    buckets.set(bucketKey, existing);
  });

  return Array.from(buckets.values())
    .map((clusterReports) => computeCluster(clusterReports))
    .filter((cluster): cluster is PatternCluster => Boolean(cluster))
    .sort((left, right) => {
      if (right.corroborationScore !== left.corroborationScore) {
        return right.corroborationScore - left.corroborationScore;
      }

      return right.reports.length - left.reports.length;
    });
}
