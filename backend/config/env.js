import dotenv from "dotenv";

dotenv.config();

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
};
