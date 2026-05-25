import EnvironmentalSignal from "../models/EnvironmentalSignal.js";
import Report from "../models/Report.js";
import { normalizeCountyKey } from "../utils/locationTargeting.js";
import {
  buildClusters,
  OUTBREAK_ACTIVE_REPORT_STATUSES,
  OUTBREAK_REPORT_WINDOW_DAYS,
  OUTBREAK_SUPPORTED_REPORT_TYPES,
} from "./outbreakWarningService.js";

const SIGNAL_WINDOW_DAYS = 10;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function buildRiskLevel(score) {
  if (score >= 75) {
    return "CRITICAL";
  }

  if (score >= 55) {
    return "HIGH";
  }

  if (score >= 30) {
    return "MEDIUM";
  }

  return "LOW";
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildSignalMap(signals) {
  const countyMap = new Map();

  for (const signal of signals) {
    const county = String(signal.county || "").trim();
    const countyKey = normalizeCountyKey(county);

    if (!countyKey) {
      continue;
    }

    if (!countyMap.has(countyKey)) {
      countyMap.set(countyKey, {
        county,
        count: 0,
        rainfallMm: 0,
        humidityPct: 0,
        temperatureC: 0,
        vegetationIndex: 0,
        soilMoisturePct: 0,
        latestCapturedAt: signal.capturedAt,
      });
    }

    const bucket = countyMap.get(countyKey);
    bucket.count += 1;
    bucket.rainfallMm += Number(signal.rainfallMm || 0);
    bucket.humidityPct += Number(signal.humidityPct || 0);
    bucket.temperatureC += Number(signal.temperatureC || 0);
    bucket.vegetationIndex += Number(signal.vegetationIndex || 0);
    bucket.soilMoisturePct += Number(signal.soilMoisturePct || 0);
    bucket.latestCapturedAt =
      new Date(signal.capturedAt).getTime() > new Date(bucket.latestCapturedAt).getTime()
        ? signal.capturedAt
        : bucket.latestCapturedAt;
  }

  for (const bucket of countyMap.values()) {
    bucket.rainfallMm = Number((bucket.rainfallMm / bucket.count).toFixed(1));
    bucket.humidityPct = Number((bucket.humidityPct / bucket.count).toFixed(1));
    bucket.temperatureC = Number((bucket.temperatureC / bucket.count).toFixed(1));
    bucket.vegetationIndex = Number((bucket.vegetationIndex / bucket.count).toFixed(1));
    bucket.soilMoisturePct = Number((bucket.soilMoisturePct / bucket.count).toFixed(1));
  }

  return countyMap;
}

function computeEnvironmentalLift(cluster, countySignal) {
  if (!countySignal) {
    return 0;
  }

  let lift = 0;

  if (cluster.reportType === "LIVESTOCK") {
    if (countySignal.temperatureC >= 30) {
      lift += 3;
    }

    if (countySignal.humidityPct >= 70) {
      lift += 3;
    }

    if (countySignal.rainfallMm >= 35) {
      lift += 2;
    }

    if (countySignal.soilMoisturePct >= 70) {
      lift += 2;
    }
  } else if (cluster.reportType === "CROP") {
    if (countySignal.humidityPct >= 68) {
      lift += 3;
    }

    if (countySignal.rainfallMm >= 30) {
      lift += 3;
    }

    if (countySignal.temperatureC >= 28) {
      lift += 2;
    }

    if (countySignal.vegetationIndex <= 42 || countySignal.soilMoisturePct <= 35) {
      lift += 4;
    }
  } else {
    if (countySignal.rainfallMm >= 40) {
      lift += 3;
    }

    if (countySignal.temperatureC >= 31) {
      lift += 2;
    }
  }

  return Math.min(lift, 12);
}

function buildDrivers(cluster, countySignal, environmentalLift) {
  const drivers = [`${cluster.reportCount} recent ${cluster.reportType.toLowerCase()} reports`];

  if (cluster.highRiskCount > 0) {
    drivers.push(`${cluster.highRiskCount} high-risk case${cluster.highRiskCount === 1 ? "" : "s"}`);
  }

  if (cluster.verifiedCount > 0) {
    drivers.push(`${cluster.verifiedCount} verified case${cluster.verifiedCount === 1 ? "" : "s"}`);
  }

  if (cluster.dominantSignals.length) {
    drivers.push(`Repeated signs: ${cluster.dominantSignals.map(titleCase).slice(0, 3).join(", ")}`);
  }

  if (countySignal && environmentalLift > 0) {
    const environmentalDrivers = [];

    if (countySignal.humidityPct >= 68) {
      environmentalDrivers.push("high humidity");
    }

    if (countySignal.rainfallMm >= 30) {
      environmentalDrivers.push("recent rainfall");
    }

    if (countySignal.temperatureC >= 30) {
      environmentalDrivers.push("elevated temperatures");
    }

    if (countySignal.vegetationIndex <= 42) {
      environmentalDrivers.push("stressed vegetation");
    }

    if (countySignal.soilMoisturePct <= 35) {
      environmentalDrivers.push("dry soil conditions");
    }

    if (countySignal.soilMoisturePct >= 70) {
      environmentalDrivers.push("saturated soils");
    }

    if (environmentalDrivers.length) {
      drivers.push(`Environmental pressure: ${environmentalDrivers.slice(0, 3).join(", ")}`);
    }
  }

  return drivers.slice(0, 4);
}

function buildRecommendedActions(domainScore) {
  if (domainScore.reportType === "LIVESTOCK") {
    return [
      "Increase surveillance for similar animal symptoms in nearby herds.",
      "Isolate suspected sick animals and limit movement until verification is complete.",
      "Contact a vet quickly if new fever, coughing, diarrhea, or sudden deaths appear.",
    ];
  }

  if (domainScore.reportType === "CROP") {
    return [
      "Scout nearby fields for the same crop signs before spread accelerates.",
      "Separate affected plant material and review the recommended pest or disease control plan.",
      "Escalate quickly if wilting, leaf spots, or rapid pest pressure continues to spread.",
    ];
  }

  return [
    "Monitor local environmental conditions closely.",
    "Compare new signals against nearby reports and share changes quickly.",
  ];
}

function buildDomainScore(cluster, countySignal) {
  const basePressure = Math.min((cluster.clusterScore / 14) * 52, 52);
  const frequencyBoost = Math.min(cluster.reportCount * 6, 18);
  const severityBoost = Math.min(cluster.highRiskCount * 7, 14);
  const verificationBoost = Math.min(cluster.verifiedCount * 8, 16);
  const signalBoost = Math.min(cluster.dominantSignals.length * 2.5, 10);
  const environmentalLift = computeEnvironmentalLift(cluster, countySignal);
  const riskScore = Math.round(clamp(basePressure + frequencyBoost + severityBoost + verificationBoost + signalBoost + environmentalLift, 0, 100));

  const domainScore = {
    reportType: cluster.reportType,
    riskScore,
    riskLevel: buildRiskLevel(riskScore),
    reportCount: cluster.reportCount,
    highRiskCount: cluster.highRiskCount,
    verifiedCount: cluster.verifiedCount,
    latestReportAt: cluster.latestReportAt,
    dominantSignals: cluster.dominantSignals.map(titleCase),
    environmentalLift,
    environmentalSnapshot: countySignal
      ? {
          rainfallMm: countySignal.rainfallMm,
          humidityPct: countySignal.humidityPct,
          temperatureC: countySignal.temperatureC,
          vegetationIndex: countySignal.vegetationIndex,
          soilMoisturePct: countySignal.soilMoisturePct,
          latestCapturedAt: countySignal.latestCapturedAt,
        }
      : null,
  };

  domainScore.topDrivers = buildDrivers(cluster, countySignal, environmentalLift);
  domainScore.recommendedActions = buildRecommendedActions(domainScore);

  return domainScore;
}

function buildEmptyCountyScore(userCounty) {
  return {
    county: String(userCounty || "").trim(),
    countyKey: normalizeCountyKey(userCounty),
    overallScore: 0,
    riskLevel: "LOW",
    reportCount: 0,
    highRiskCount: 0,
    verifiedCount: 0,
    latestReportAt: null,
    primaryReportType: "",
    topSignals: [],
    topDrivers: ["FarmGuard has not received recent local livestock or crop reports in this county yet."],
    domainScores: [],
  };
}

export async function buildLocalizedRiskScores({ userCounty = "" } = {}) {
  const reportSince = new Date(Date.now() - OUTBREAK_REPORT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const signalSince = new Date(Date.now() - SIGNAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [reports, signals] = await Promise.all([
    Report.find({
      createdAt: { $gte: reportSince },
      status: { $in: OUTBREAK_ACTIVE_REPORT_STATUSES },
      reportType: { $in: OUTBREAK_SUPPORTED_REPORT_TYPES },
    }).select("reportType severity status symptoms title location review.diagnosis createdAt"),
    EnvironmentalSignal.find({
      capturedAt: { $gte: signalSince },
    }).select("county rainfallMm humidityPct temperatureC vegetationIndex soilMoisturePct capturedAt"),
  ]);

  const countySignalMap = buildSignalMap(signals);
  const clusters = buildClusters(reports);
  const countyMap = new Map();

  for (const cluster of clusters) {
    const countyKey = normalizeCountyKey(cluster.county);
    const countySignal = countySignalMap.get(countyKey);
    const domainScore = buildDomainScore(cluster, countySignal);

    if (!countyMap.has(countyKey)) {
      countyMap.set(countyKey, {
        county: cluster.county,
        countyKey,
        reportCount: 0,
        highRiskCount: 0,
        verifiedCount: 0,
        latestReportAt: cluster.latestReportAt,
        domainScores: [],
      });
    }

    const countyScore = countyMap.get(countyKey);
    countyScore.reportCount += cluster.reportCount;
    countyScore.highRiskCount += cluster.highRiskCount;
    countyScore.verifiedCount += cluster.verifiedCount;
    countyScore.latestReportAt =
      new Date(cluster.latestReportAt).getTime() > new Date(countyScore.latestReportAt).getTime()
        ? cluster.latestReportAt
        : countyScore.latestReportAt;
    countyScore.domainScores.push(domainScore);
  }

  const counties = Array.from(countyMap.values())
    .map((countyScore) => {
      const sortedDomainScores = [...countyScore.domainScores].sort(
        (left, right) => right.riskScore - left.riskScore || right.reportCount - left.reportCount,
      );
      const overallScore = sortedDomainScores[0]?.riskScore || 0;
      const topSignals = Array.from(
        new Set(sortedDomainScores.flatMap((domainScore) => domainScore.dominantSignals)),
      ).slice(0, 4);
      const topDrivers = Array.from(
        new Set(sortedDomainScores.flatMap((domainScore) => domainScore.topDrivers)),
      ).slice(0, 5);

      return {
        county: countyScore.county,
        countyKey: countyScore.countyKey,
        overallScore,
        riskLevel: buildRiskLevel(overallScore),
        reportCount: countyScore.reportCount,
        highRiskCount: countyScore.highRiskCount,
        verifiedCount: countyScore.verifiedCount,
        latestReportAt: countyScore.latestReportAt,
        primaryReportType: sortedDomainScores[0]?.reportType || "",
        topSignals,
        topDrivers,
        domainScores: sortedDomainScores,
      };
    })
    .sort((left, right) => right.overallScore - left.overallScore || right.reportCount - left.reportCount);

  const userCountyKey = normalizeCountyKey(userCounty);
  const userCountyScore = userCountyKey
    ? counties.find((county) => county.countyKey === userCountyKey) || buildEmptyCountyScore(userCounty)
    : null;

  return {
    generatedAt: new Date().toISOString(),
    windowDays: OUTBREAK_REPORT_WINDOW_DAYS,
    signalWindowDays: SIGNAL_WINDOW_DAYS,
    summary: {
      countyCount: counties.length,
      highRiskCountyCount: counties.filter((county) => ["HIGH", "CRITICAL"].includes(county.riskLevel)).length,
      criticalCountyCount: counties.filter((county) => county.riskLevel === "CRITICAL").length,
      highestScore: counties[0]?.overallScore || 0,
      activeDomainCount: counties.reduce((sum, county) => sum + county.domainScores.length, 0),
    },
    userCountyScore,
    counties,
  };
}
