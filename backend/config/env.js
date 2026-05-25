import dotenv from "dotenv";

dotenv.config();

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  return String(value).toLowerCase() === "true";
}

function parseDeliveryMode(value) {
  const normalizedValue = String(value || "").trim().toUpperCase();
  return ["DISABLED", "LOG_ONLY", "TWILIO"].includes(normalizedValue) ? normalizedValue : "";
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || "",
  mongoDirectUri: process.env.MONGODB_DIRECT_URI || "",
  mongoDnsServers: (process.env.MONGO_DNS_SERVERS || "")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean),
  mongoServerSelectionTimeoutMs: Math.max(Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 8000, 1000),
  jwtSecret: process.env.JWT_SECRET || "",
  clientUrl: process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173",
  mlScoringEnabled: process.env.ML_SCORING_ENABLED !== "false",
  mlPythonCommand: process.env.ML_PYTHON_COMMAND || "python",
  mlScoringScript: process.env.ML_SCORING_SCRIPT || "",
  mlScoringTimeoutMs: Math.max(Number(process.env.ML_SCORING_TIMEOUT_MS) || 4000, 1000),
  environmentalAutoSyncEnabled: parseBoolean(process.env.ENVIRONMENTAL_AUTO_SYNC_ENABLED, false),
  environmentalSyncCounties: (process.env.ENVIRONMENTAL_SYNC_COUNTIES || "")
    .split(",")
    .map((county) => county.trim())
    .filter(Boolean),
  environmentalProviderConcurrency: Math.max(Number(process.env.ENVIRONMENTAL_PROVIDER_CONCURRENCY) || 4, 1),
  nasaPowerEnabled: parseBoolean(process.env.NASA_POWER_SYNC_ENABLED, true),
  nasaPowerBaseUrl: process.env.NASA_POWER_BASE_URL || "https://power.larc.nasa.gov",
  nasaPowerIntervalMinutes: Math.max(Number(process.env.NASA_POWER_SYNC_INTERVAL_MINUTES) || 720, 30),
  nasaPowerLookbackDays: Math.max(Number(process.env.NASA_POWER_LOOKBACK_DAYS) || 2, 1),
  sentinelHubEnabled: parseBoolean(process.env.SENTINEL_HUB_SYNC_ENABLED, false),
  sentinelHubBaseUrl: process.env.SENTINEL_HUB_BASE_URL || "https://services.sentinel-hub.com",
  sentinelHubClientId: process.env.SENTINEL_HUB_CLIENT_ID || "",
  sentinelHubClientSecret: process.env.SENTINEL_HUB_CLIENT_SECRET || "",
  sentinelHubIntervalMinutes: Math.max(Number(process.env.SENTINEL_HUB_SYNC_INTERVAL_MINUTES) || 1440, 60),
  sentinelHubLookbackDays: Math.max(Number(process.env.SENTINEL_HUB_LOOKBACK_DAYS) || 14, 1),
  sentinelHubMaxCloudCoverage: Math.min(Math.max(Number(process.env.SENTINEL_HUB_MAX_CLOUD_COVERAGE) || 35, 0), 100),
  sentinelHubBBoxDelta: Math.max(Number(process.env.SENTINEL_HUB_BBOX_DELTA) || 0.08, 0.01),
  notificationDeliveryMode:
    parseDeliveryMode(process.env.NOTIFICATION_DELIVERY_MODE) ||
    (process.env.NODE_ENV === "production" ? "DISABLED" : "LOG_ONLY"),
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioSmsFrom: process.env.TWILIO_SMS_FROM || "",
  twilioMessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || "",
  twilioWhatsAppFrom: process.env.TWILIO_WHATSAPP_FROM || "",
  fieldChannelSecret: process.env.FIELD_CHANNEL_SECRET || "",
  fieldChannelAutoCreateUsers: parseBoolean(process.env.FIELD_CHANNEL_AUTO_CREATE_USERS, true),
};
