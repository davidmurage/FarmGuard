import EnvironmentalSignal from "../models/EnvironmentalSignal.js";
import Report from "../models/Report.js";
import { scoreEnvironmentalBriefWithPython } from "./environmentalMlBridge.js";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function normalizeCounty(value) {
  return String(value || "Unspecified").trim() || "Unspecified";
}

function buildBand(score) {
  if (score >= 10) {
    return "CRITICAL";
  }

  if (score >= 6.5) {
    return "HIGH";
  }

  if (score >= 3.5) {
    return "MEDIUM";
  }

  return "LOW";
}

function buildDriverSummary(environmental) {
  const drivers = [];

  if (environmental.rainfallMm >= 90) {
    drivers.push({ code: "HEAVY_RAINFALL", label: "Heavy rainfall pressure" });
  } else if (environmental.rainfallMm >= 45) {
    drivers.push({ code: "RAINFALL", label: "Elevated rainfall" });
  }

  if (environmental.humidityPct >= 85) {
    drivers.push({ code: "HIGH_HUMIDITY", label: "Very high humidity" });
  } else if (environmental.humidityPct >= 70) {
    drivers.push({ code: "HUMIDITY", label: "High humidity" });
  }

  if (environmental.temperatureC >= 34) {
    drivers.push({ code: "HEAT", label: "Heat stress conditions" });
  } else if (environmental.temperatureC >= 30) {
    drivers.push({ code: "WARMTH", label: "Elevated temperatures" });
  }

  if (environmental.vegetationIndex <= 30) {
    drivers.push({ code: "LOW_VEGETATION", label: "Low vegetation health" });
  } else if (environmental.vegetationIndex <= 45) {
    drivers.push({ code: "VEGETATION_DROP", label: "Vegetation stress" });
  }

  if (environmental.soilMoisturePct <= 25) {
    drivers.push({ code: "DRY_SOIL", label: "Dry soil conditions" });
  } else if (environmental.soilMoisturePct >= 80) {
    drivers.push({ code: "WET_SOIL", label: "Waterlogged soil risk" });
  }

  return drivers;
}

function buildRecommendedActions({ drivers, reportPressure }) {
  const actions = [];
  const driverCodes = new Set(drivers.map((driver) => driver.code));

  if (driverCodes.has("HEAVY_RAINFALL") || driverCodes.has("WET_SOIL")) {
    actions.push("Inspect drainage, runoff points, and standing water near farms and livestock shelters.");
  }

  if (driverCodes.has("HIGH_HUMIDITY") || driverCodes.has("HUMIDITY")) {
    actions.push("Increase surveillance for fast-spreading livestock infections, fungal crop pressure, and feed contamination.");
  }

  if (driverCodes.has("HEAT") || driverCodes.has("DRY_SOIL")) {
    actions.push("Advise farmers on shade, watering plans, drought-stress monitoring, and emergency feed or irrigation support.");
  }

  if (driverCodes.has("LOW_VEGETATION") || driverCodes.has("VEGETATION_DROP")) {
    actions.push("Check crop vigor, pest pressure, and pasture availability before conditions degrade further.");
  }

  if (reportPressure.highRiskReports > 0) {
    actions.push("Cross-check environmental pressure with current high-risk reports before the next alert cycle.");
  }

  if (!actions.length) {
    actions.push("Continue monitoring current environmental conditions and compare them against new field reports.");
  }

  return actions.slice(0, 4);
}

function buildNarrative({ county, band, drivers, reportPressure }) {
  const leadingDrivers = drivers.slice(0, 2).map((driver) => driver.label.toLowerCase());
  const driverText = leadingDrivers.length ? leadingDrivers.join(" and ") : "stable environmental conditions";

  if (reportPressure.totalReports > 0) {
    return `${county} is in the ${band.toLowerCase()} watch band because ${driverText} is overlapping with ${reportPressure.totalReports} recent report signals.`;
  }

  return `${county} is in the ${band.toLowerCase()} watch band because FarmGuard is seeing ${driverText} even before report volumes rise.`;
}

function aggregateSignals(signals) {
  const countyMap = new Map();

  for (const signal of signals) {
    const county = normalizeCounty(signal.county);

    if (!countyMap.has(county)) {
      countyMap.set(county, {
        county,
        signalCount: 0,
        latestCapturedAt: signal.capturedAt,
        sourceTypes: new Set(),
        rainfallMm: [],
        humidityPct: [],
        temperatureC: [],
        vegetationIndex: [],
        soilMoisturePct: [],
      });
    }

    const entry = countyMap.get(county);
    entry.signalCount += 1;
    entry.latestCapturedAt =
      new Date(signal.capturedAt).getTime() > new Date(entry.latestCapturedAt).getTime()
        ? signal.capturedAt
        : entry.latestCapturedAt;
    entry.sourceTypes.add(signal.sourceType);
    entry.rainfallMm.push(Number(signal.rainfallMm) || 0);
    entry.humidityPct.push(Number(signal.humidityPct) || 0);
    entry.temperatureC.push(Number(signal.temperatureC) || 0);
    entry.vegetationIndex.push(Number(signal.vegetationIndex) || 0);
    entry.soilMoisturePct.push(Number(signal.soilMoisturePct) || 0);
  }

  return Array.from(countyMap.values()).map((entry) => ({
    county: entry.county,
    signalCount: entry.signalCount,
    latestCapturedAt: entry.latestCapturedAt,
    sourceTypes: Array.from(entry.sourceTypes),
    environmental: {
      rainfallMm: Number(average(entry.rainfallMm).toFixed(1)),
      humidityPct: Number(average(entry.humidityPct).toFixed(1)),
      temperatureC: Number(average(entry.temperatureC).toFixed(1)),
      vegetationIndex: Number(average(entry.vegetationIndex).toFixed(1)),
      soilMoisturePct: Number(average(entry.soilMoisturePct).toFixed(1)),
    },
  }));
}

function aggregateReports(reports) {
  const countyMap = new Map();

  for (const report of reports) {
    const county = normalizeCounty(report.location?.county);

    if (!countyMap.has(county)) {
      countyMap.set(county, {
        totalReports: 0,
        highRiskReports: 0,
        verifiedReports: 0,
        livestockReports: 0,
        cropReports: 0,
        environmentReports: 0,
      });
    }

    const entry = countyMap.get(county);
    entry.totalReports += 1;
    entry.highRiskReports += ["HIGH", "CRITICAL"].includes(report.severity) ? 1 : 0;
    entry.verifiedReports += report.status === "VERIFIED" ? 1 : 0;
    entry.livestockReports += report.reportType === "LIVESTOCK" ? 1 : 0;
    entry.cropReports += report.reportType === "CROP" ? 1 : 0;
    entry.environmentReports += report.reportType === "ENVIRONMENT" ? 1 : 0;
  }

  return countyMap;
}

function buildRiskScore(environmental, reportPressure) {
  const rainfallPressure = environmental.rainfallMm >= 90 ? 3.2 : environmental.rainfallMm >= 60 ? 2.1 : environmental.rainfallMm >= 30 ? 1 : 0;
  const humidityPressure = environmental.humidityPct >= 85 ? 2.1 : environmental.humidityPct >= 70 ? 1.1 : 0;
  const heatPressure = environmental.temperatureC >= 34 ? 2.2 : environmental.temperatureC >= 30 ? 1.1 : 0;
  const vegetationStress = environmental.vegetationIndex <= 30 ? 2.8 : environmental.vegetationIndex <= 45 ? 1.6 : 0;
  const soilStress =
    environmental.soilMoisturePct <= 25
      ? 1.8
      : environmental.soilMoisturePct >= 80
        ? 1.2
        : 0;
  const reportScore = reportPressure.totalReports * 0.55 + reportPressure.highRiskReports * 1.9 + reportPressure.verifiedReports * 0.4;

  return Number((rainfallPressure + humidityPressure + heatPressure + vegetationStress + soilStress + reportScore).toFixed(2));
}

function buildDominantRisk(environmental, reportPressure) {
  const livestockScore =
    (environmental.rainfallMm >= 45 ? 1.4 : 0) +
    (environmental.humidityPct >= 70 ? 1.3 : 0) +
    reportPressure.livestockReports * 0.75;
  const cropScore =
    (environmental.vegetationIndex <= 45 ? 1.8 : 0) +
    (environmental.temperatureC >= 30 ? 1.1 : 0) +
    (environmental.soilMoisturePct <= 25 ? 1.1 : 0) +
    reportPressure.cropReports * 0.75;
  const environmentalScore =
    (environmental.rainfallMm >= 60 ? 1.5 : 0) +
    (environmental.soilMoisturePct >= 80 ? 1.1 : 0) +
    reportPressure.environmentReports * 0.75;

  const ranked = [
    { domain: "LIVESTOCK", score: livestockScore },
    { domain: "CROP", score: cropScore },
    { domain: "ENVIRONMENT", score: environmentalScore },
  ].sort((left, right) => right.score - left.score);

  return ranked[0]?.domain || "ENVIRONMENT";
}

function buildHeuristicCountyAssessment(entry, reportPressure) {
  const combinedRiskScore = buildRiskScore(entry.environmental, reportPressure);
  const band = buildBand(combinedRiskScore);
  const drivers = buildDriverSummary(entry.environmental);

  return {
    county: entry.county,
    combinedRiskScore,
    band,
    dominantRisk: buildDominantRisk(entry.environmental, reportPressure),
    latestCapturedAt: entry.latestCapturedAt,
    signalCount: entry.signalCount,
    sourceTypes: entry.sourceTypes,
    environmental: entry.environmental,
    reportPressure,
    drivers,
    recommendedActions: buildRecommendedActions({ drivers, reportPressure }),
    narrative: buildNarrative({ county: entry.county, band, drivers, reportPressure }),
    riskProbabilityPct: Number(((combinedRiskScore / 12) * 100).toFixed(1)),
    confidencePct: Number(clamp(48 + entry.signalCount * 6 + reportPressure.totalReports * 3, 48, 88).toFixed(1)),
    modelDrivers: [],
    modelNarrative: "",
    contributions: [],
  };
}

function buildFallbackScoring(reason = "") {
  return {
    engine: "HEURISTIC_FALLBACK",
    label: "Heuristic fallback",
    status: "fallback",
    modelVersion: "fg-heuristic-v1",
    message: reason || "Python ML scoring is unavailable, so FarmGuard is using its heuristic risk engine.",
    generatedAt: new Date().toISOString(),
  };
}

function buildEmptyScoring() {
  return {
    engine: "PENDING_SIGNALS",
    label: "Waiting for environmental signals",
    status: "empty",
    modelVersion: "",
    message: "Log at least one county signal to generate the environmental brief.",
    generatedAt: new Date().toISOString(),
  };
}

function buildMlPayload(counties, signalWindowDays, reportWindowDays) {
  return {
    signalWindowDays,
    reportWindowDays,
    counties: counties.map((county) => ({
      county: county.county,
      signalCount: county.signalCount,
      sourceTypes: county.sourceTypes,
      environmental: county.environmental,
      reportPressure: county.reportPressure,
      heuristic: {
        combinedRiskScore: county.combinedRiskScore,
        band: county.band,
        dominantRisk: county.dominantRisk,
      },
    })),
  };
}

function mergeMlScores(counties, mlResponse) {
  const mlCountyMap = new Map((mlResponse?.counties || []).map((county) => [county.county, county]));

  return counties.map((county) => {
    const mlCounty = mlCountyMap.get(county.county);

    if (!mlCounty) {
      return county;
    }

    return {
      ...county,
      combinedRiskScore: mlCounty.combinedRiskScore ?? county.combinedRiskScore,
      band: mlCounty.band || county.band,
      dominantRisk: mlCounty.dominantRisk || county.dominantRisk,
      riskProbabilityPct: mlCounty.riskProbabilityPct ?? county.riskProbabilityPct,
      confidencePct: mlCounty.confidencePct ?? county.confidencePct,
      modelDrivers: mlCounty.modelDrivers || [],
      modelNarrative: mlCounty.modelNarrative || county.modelNarrative,
      narrative: mlCounty.modelNarrative || county.narrative,
      contributions: mlCounty.contributions || county.contributions,
    };
  });
}

async function scoreCounties(counties, signalWindowDays, reportWindowDays) {
  if (!counties.length) {
    return {
      counties,
      scoring: buildEmptyScoring(),
    };
  }

  try {
    const mlResponse = await scoreEnvironmentalBriefWithPython(buildMlPayload(counties, signalWindowDays, reportWindowDays));

    return {
      counties: mergeMlScores(counties, mlResponse).sort((left, right) => right.combinedRiskScore - left.combinedRiskScore),
      scoring: mlResponse?.scoring || {
        engine: "PYTHON_ML",
        label: "Python ML scorer",
        status: "online",
        modelVersion: "fg-env-ml-v1",
        message: "Python model scoring is active and augmenting the heuristic engine.",
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      counties: counties.sort((left, right) => right.combinedRiskScore - left.combinedRiskScore),
      scoring: buildFallbackScoring(error.message),
    };
  }
}

function buildSummary(counties, signals, scoring) {
  return {
    countyCount: counties.length,
    signalCount: signals.length,
    reportLinkedCount: counties.filter((county) => county.reportPressure.totalReports > 0).length,
    highRiskCount: counties.filter((county) => ["HIGH", "CRITICAL"].includes(county.band)).length,
    topCounty: counties[0]?.county || "",
    topRiskScore: counties[0]?.combinedRiskScore || 0,
    averageRainfallMm: Number(average(counties.map((county) => county.environmental.rainfallMm)).toFixed(1)),
    averageVegetationIndex: Number(average(counties.map((county) => county.environmental.vegetationIndex)).toFixed(1)),
    averageRiskProbabilityPct: Number(average(counties.map((county) => county.riskProbabilityPct || 0)).toFixed(1)),
    scoringStatus: scoring.status,
  };
}

export async function buildEnvironmentalBrief({ signalWindowDays = 14, reportWindowDays = 30 } = {}) {
  const safeSignalWindowDays = clamp(Number(signalWindowDays) || 14, 7, 30);
  const safeReportWindowDays = clamp(Number(reportWindowDays) || 30, 14, 60);
  const signalSince = new Date(Date.now() - safeSignalWindowDays * 24 * 60 * 60 * 1000);
  const reportSince = new Date(Date.now() - safeReportWindowDays * 24 * 60 * 60 * 1000);

  const [signals, reports] = await Promise.all([
    EnvironmentalSignal.find({ capturedAt: { $gte: signalSince } })
      .sort({ capturedAt: -1 })
      .select("county sourceType rainfallMm humidityPct temperatureC vegetationIndex soilMoisturePct capturedAt"),
    Report.find({ createdAt: { $gte: reportSince } })
      .select("reportType severity status location createdAt"),
  ]);

  const countySignals = aggregateSignals(signals);
  const reportPressureMap = aggregateReports(reports);

  const heuristicCounties = countySignals.map((entry) => {
    const reportPressure = reportPressureMap.get(entry.county) || {
      totalReports: 0,
      highRiskReports: 0,
      verifiedReports: 0,
      livestockReports: 0,
      cropReports: 0,
      environmentReports: 0,
    };

    return buildHeuristicCountyAssessment(entry, reportPressure);
  });

  const { counties, scoring } = await scoreCounties(heuristicCounties, safeSignalWindowDays, safeReportWindowDays);

  return {
    generatedAt: new Date().toISOString(),
    signalWindowDays: safeSignalWindowDays,
    reportWindowDays: safeReportWindowDays,
    scoring,
    summary: buildSummary(counties, signals, scoring),
    counties: counties.slice(0, 12),
  };
}
