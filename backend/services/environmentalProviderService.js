import EnvironmentalImportJob from "../models/EnvironmentalImportJob.js";
import EnvironmentalSignal from "../models/EnvironmentalSignal.js";
import { env } from "../config/env.js";
import { listKnownCountyCentroids, normalizeCountyName } from "../utils/locationResolver.js";
import { ApiError } from "../utils/apiError.js";
import { serializeEnvironmentalImportJob } from "../utils/serializers.js";

const PROVIDER_KEYS = {
  NASA_POWER: "NASA_POWER",
  SENTINEL_HUB: "SENTINEL_HUB",
};

const providerLocks = new Map();
const providerSchedules = [];
let schedulerStarted = false;
let sentinelTokenCache = {
  accessToken: "",
  expiresAt: 0,
};

function formatCompactDate(date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatIsoDate(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}.`);
  }

  return response.json();
}

function getSelectedCounties() {
  const allCounties = listKnownCountyCentroids();

  if (!env.environmentalSyncCounties.length) {
    return allCounties;
  }

  const selected = new Set(env.environmentalSyncCounties.map(normalizeCountyName));
  return allCounties.filter((entry) => selected.has(normalizeCountyName(entry.county)));
}

async function mapWithConcurrency(items, concurrency, worker) {
  const safeConcurrency = Math.max(Math.min(concurrency, items.length || 1), 1);
  const results = [];
  let currentIndex = 0;

  async function runWorker() {
    while (currentIndex < items.length) {
      const itemIndex = currentIndex;
      currentIndex += 1;
      results[itemIndex] = await worker(items[itemIndex], itemIndex);
    }
  }

  await Promise.all(Array.from({ length: safeConcurrency }, () => runWorker()));
  return results;
}

function buildJobPayload({
  sourceType,
  providerKey,
  providerName,
  triggerMode,
  totalRecords,
  importedRecords,
  failedRecords,
  importedCounties,
  errorSamples,
  summaryMessage,
  createdBy,
}) {
  return {
    sourceType,
    importFormat: "JSON",
    providerName,
    providerKey,
    jobType: "PROVIDER_SYNC",
    triggerMode,
    status: importedRecords && failedRecords ? "PARTIAL" : importedRecords ? "COMPLETED" : "FAILED",
    totalRecords,
    importedRecords,
    failedRecords,
    importedCounties,
    errorSamples: errorSamples.slice(0, 8),
    summaryMessage,
    ...(createdBy ? { createdBy } : {}),
  };
}

function buildSummaryMessage({ providerName, importedRecords, failedRecords }) {
  if (!importedRecords && failedRecords) {
    return `${providerName} sync did not import any county signals.`;
  }

  if (failedRecords) {
    return `${providerName} sync imported ${importedRecords} county signals with ${failedRecords} county errors.`;
  }

  return `${providerName} sync imported ${importedRecords} county signals successfully.`;
}

async function persistProviderSignals(records, { createdBy } = {}) {
  if (!records.length) {
    return 0;
  }

  await EnvironmentalSignal.bulkWrite(
    records.map((record) => {
      const update = {
        county: record.county,
        locationName: record.locationName,
        sourceType: record.sourceType,
        providerKey: record.providerKey,
        rainfallMm: record.rainfallMm,
        humidityPct: record.humidityPct,
        temperatureC: record.temperatureC,
        vegetationIndex: record.vegetationIndex,
        soilMoisturePct: record.soilMoisturePct,
        notes: record.notes,
      };

      if (createdBy) {
        update.createdBy = createdBy;
      }

      return {
        updateOne: {
          filter: {
            county: record.county,
            sourceType: record.sourceType,
            providerKey: record.providerKey,
            capturedAt: record.capturedAt,
          },
          update: {
            $set: update,
            $setOnInsert: {
              capturedAt: record.capturedAt,
            },
          },
          upsert: true,
        },
      };
    }),
  );

  return records.length;
}

async function fetchWeatherSignal(countyEntry) {
  const targetDate = new Date(Date.now() - env.nasaPowerLookbackDays * 24 * 60 * 60 * 1000);
  const compactDate = formatCompactDate(targetDate);
  const apiUrl = new URL("/api/temporal/daily/point", env.nasaPowerBaseUrl);

  apiUrl.searchParams.set("parameters", "PRECTOTCORR,RH2M,T2M");
  apiUrl.searchParams.set("community", "AG");
  apiUrl.searchParams.set("longitude", String(countyEntry.coordinates.longitude));
  apiUrl.searchParams.set("latitude", String(countyEntry.coordinates.latitude));
  apiUrl.searchParams.set("start", compactDate);
  apiUrl.searchParams.set("end", compactDate);
  apiUrl.searchParams.set("format", "JSON");
  apiUrl.searchParams.set("time-standard", "UTC");

  const response = await fetchJson(apiUrl.toString());
  const parameters = response?.properties?.parameter || {};
  const rainfallSeries = parameters.PRECTOTCORR || {};
  const humiditySeries = parameters.RH2M || {};
  const temperatureSeries = parameters.T2M || {};
  const dateKey = Object.keys(rainfallSeries).sort().pop();

  if (!dateKey) {
    throw new Error("NASA POWER returned no rainfall record for this county.");
  }

  return {
    county: countyEntry.county,
    locationName: `${countyEntry.county} county centroid`,
    sourceType: "WEATHER_FEED",
    providerKey: PROVIDER_KEYS.NASA_POWER,
    rainfallMm: Number(rainfallSeries[dateKey]) || 0,
    humidityPct: Number(humiditySeries[dateKey]) || 0,
    temperatureC: Number(temperatureSeries[dateKey]) || 0,
    vegetationIndex: 50,
    soilMoisturePct: 50,
    notes: `NASA POWER daily agroclimatology sync for ${dateKey}.`,
    capturedAt: formatIsoDate(new Date(`${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}T00:00:00Z`)),
  };
}

async function getSentinelToken() {
  if (sentinelTokenCache.accessToken && sentinelTokenCache.expiresAt > Date.now() + 60_000) {
    return sentinelTokenCache.accessToken;
  }

  if (!env.sentinelHubClientId || !env.sentinelHubClientSecret) {
    throw new ApiError(400, "Sentinel Hub credentials are not configured.");
  }

  const tokenUrl = new URL("/auth/realms/main/protocol/openid-connect/token", env.sentinelHubBaseUrl);
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.sentinelHubClientId,
    client_secret: env.sentinelHubClientSecret,
  });

  const response = await fetch(tokenUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Unable to fetch Sentinel Hub OAuth token.");
  }

  const payload = await response.json();
  sentinelTokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (Number(payload.expires_in) || 3600) * 1000,
  };

  return sentinelTokenCache.accessToken;
}

async function fetchSatelliteSignal(countyEntry) {
  const token = await getSentinelToken();
  const now = new Date();
  const from = new Date(Date.now() - env.sentinelHubLookbackDays * 24 * 60 * 60 * 1000);
  const delta = env.sentinelHubBBoxDelta;
  const statsUrl = new URL("/api/v1/statistics", env.sentinelHubBaseUrl);
  const bbox = [
    countyEntry.coordinates.longitude - delta,
    countyEntry.coordinates.latitude - delta,
    countyEntry.coordinates.longitude + delta,
    countyEntry.coordinates.latitude + delta,
  ];
  const payload = {
    input: {
      bounds: {
        bbox,
        properties: {
          crs: "http://www.opengis.net/def/crs/EPSG/0/4326",
        },
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: {
              from: from.toISOString(),
              to: now.toISOString(),
            },
            maxCloudCoverage: env.sentinelHubMaxCloudCoverage,
          },
        },
      ],
    },
    aggregation: {
      timeRange: {
        from: from.toISOString(),
        to: now.toISOString(),
      },
      aggregationInterval: {
        of: `P${env.sentinelHubLookbackDays}D`,
      },
      resx: 0.01,
      resy: 0.01,
    },
    calculations: {
      data: {
        statistics: {
          default: {
            statistics: {
              mean: true,
            },
          },
        },
      },
    },
    evalscript: `//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B04", "B08", "dataMask"]
    }],
    output: [{
      id: "data",
      bands: ["ndvi"],
      sampleType: "FLOAT32"
    }, {
      id: "dataMask",
      bands: 1
    }]
  };
}

function evaluatePixel(samples) {
  const denominator = samples.B08 + samples.B04;
  const ndvi = denominator === 0 ? 0 : (samples.B08 - samples.B04) / denominator;

  return {
    data: [ndvi],
    dataMask: [samples.dataMask]
  };
}`,
  };
  const response = await fetch(statsUrl.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Sentinel Hub statistics request failed.");
  }

  const data = await response.json();
  const latestInterval = Array.isArray(data?.data) ? data.data[data.data.length - 1] : null;
  const meanNdvi = latestInterval?.outputs?.data?.bands?.ndvi?.stats?.mean;

  if (typeof meanNdvi !== "number") {
    throw new Error("Sentinel Hub returned no NDVI mean for this county.");
  }

  return {
    county: countyEntry.county,
    locationName: `${countyEntry.county} county area`,
    sourceType: "SATELLITE_FEED",
    providerKey: PROVIDER_KEYS.SENTINEL_HUB,
    rainfallMm: 0,
    humidityPct: 0,
    temperatureC: 0,
    vegetationIndex: Math.min(Math.max(Number((meanNdvi * 100).toFixed(1)), 0), 100),
    soilMoisturePct: 50,
    notes: `Sentinel Hub NDVI sync using a ${env.sentinelHubLookbackDays}-day interval.`,
    capturedAt: formatIsoDate(now),
  };
}

async function runProviderSync(providerKey, { triggerMode = "MANUAL", createdBy = null } = {}) {
  if (providerLocks.get(providerKey)) {
    throw new ApiError(409, "This provider sync is already running.");
  }

  providerLocks.set(providerKey, true);

  try {
    const selectedCounties = getSelectedCounties();
    const providerName = providerKey === PROVIDER_KEYS.NASA_POWER ? "NASA POWER" : "Sentinel Hub";
    const sourceType = providerKey === PROVIDER_KEYS.NASA_POWER ? "WEATHER_FEED" : "SATELLITE_FEED";
    const fetcher = providerKey === PROVIDER_KEYS.NASA_POWER ? fetchWeatherSignal : fetchSatelliteSignal;
    const results = await mapWithConcurrency(selectedCounties, env.environmentalProviderConcurrency, async (countyEntry) => {
      try {
        const record = await fetcher(countyEntry);
        return { ok: true, record };
      } catch (error) {
        return { ok: false, error: `${countyEntry.county}: ${error.message}` };
      }
    });
    const records = results.filter((entry) => entry.ok).map((entry) => entry.record);
    const errorSamples = results.filter((entry) => !entry.ok).map((entry) => entry.error);
    const importedRecords = await persistProviderSignals(records, { createdBy });
    const importedCounties = Array.from(new Set(records.map((record) => record.county))).slice(0, 10);
    const summaryMessage = buildSummaryMessage({
      providerName,
      importedRecords,
      failedRecords: errorSamples.length,
    });
    const job = await EnvironmentalImportJob.create(
      buildJobPayload({
        sourceType,
        providerKey,
        providerName,
        triggerMode,
        totalRecords: selectedCounties.length,
        importedRecords,
        failedRecords: errorSamples.length,
        importedCounties,
        errorSamples,
        summaryMessage,
        createdBy,
      }),
    );
    const hydratedJob = await EnvironmentalImportJob.findById(job._id).populate("createdBy", "name role");

    return {
      message: summaryMessage,
      job: serializeEnvironmentalImportJob(hydratedJob),
    };
  } finally {
    providerLocks.set(providerKey, false);
  }
}

function buildProviderConfig() {
  return [
    {
      key: PROVIDER_KEYS.NASA_POWER,
      label: "NASA POWER weather",
      description: "Daily county climate sync for rainfall, humidity, and temperature.",
      sourceType: "WEATHER_FEED",
      providerName: "NASA POWER",
      enabled: env.nasaPowerEnabled,
      configured: true,
      schedulerEnabled: env.environmentalAutoSyncEnabled,
      intervalMinutes: env.nasaPowerIntervalMinutes,
    },
    {
      key: PROVIDER_KEYS.SENTINEL_HUB,
      label: "Sentinel Hub vegetation",
      description: "Satellite NDVI sync for county vegetation health.",
      sourceType: "SATELLITE_FEED",
      providerName: "Sentinel Hub",
      enabled: env.sentinelHubEnabled,
      configured: Boolean(env.sentinelHubClientId && env.sentinelHubClientSecret),
      schedulerEnabled: env.environmentalAutoSyncEnabled,
      intervalMinutes: env.sentinelHubIntervalMinutes,
    },
  ];
}

export async function listEnvironmentalProviderStatuses() {
  const providerConfigs = buildProviderConfig();
  const jobs = await Promise.all(
    providerConfigs.map((provider) =>
      EnvironmentalImportJob.findOne({ providerKey: provider.key, jobType: "PROVIDER_SYNC" })
        .sort({ createdAt: -1 })
        .populate("createdBy", "name role"),
    ),
  );

  return providerConfigs.map((provider, index) => ({
    ...provider,
    countyScope: env.environmentalSyncCounties.length ? env.environmentalSyncCounties : ["All known counties"],
    latestJob: jobs[index] ? serializeEnvironmentalImportJob(jobs[index]) : null,
    isRunning: Boolean(providerLocks.get(provider.key)),
  }));
}

export async function triggerEnvironmentalProviderSync(providerKey, options = {}) {
  if (providerKey === PROVIDER_KEYS.NASA_POWER) {
    if (!env.nasaPowerEnabled) {
      throw new ApiError(400, "NASA POWER sync is disabled.");
    }

    return runProviderSync(PROVIDER_KEYS.NASA_POWER, options);
  }

  if (providerKey === PROVIDER_KEYS.SENTINEL_HUB) {
    if (!env.sentinelHubEnabled) {
      throw new ApiError(400, "Sentinel Hub sync is disabled.");
    }

    if (!env.sentinelHubClientId || !env.sentinelHubClientSecret) {
      throw new ApiError(400, "Sentinel Hub credentials are not configured.");
    }

    return runProviderSync(PROVIDER_KEYS.SENTINEL_HUB, options);
  }

  throw new ApiError(404, "Environmental provider not found.");
}

export function startEnvironmentalProviderScheduler() {
  if (schedulerStarted || !env.environmentalAutoSyncEnabled) {
    return;
  }

  schedulerStarted = true;
  const providers = buildProviderConfig().filter((provider) => provider.enabled && provider.configured);

  providers.forEach((provider) => {
    const intervalMs = provider.intervalMinutes * 60 * 1000;
    const runner = () =>
      triggerEnvironmentalProviderSync(provider.key, { triggerMode: "SCHEDULED" }).catch((error) => {
        console.error(`Scheduled ${provider.providerName} sync failed`, error.message);
      });

    const startupTimer = setTimeout(runner, 15_000);
    const intervalTimer = setInterval(runner, intervalMs);
    providerSchedules.push(startupTimer, intervalTimer);
    console.log(`Environmental provider scheduler armed for ${provider.providerName} every ${provider.intervalMinutes} minutes.`);
  });
}
