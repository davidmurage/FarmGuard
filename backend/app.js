import cors from "cors";
import express from "express";
import morgan from "morgan";

import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import alertRoutes from "./routes/alerts.js";
import analyticsRoutes from "./routes/analytics.js";
import dashboardRoutes from "./routes/dashboard.js";
import environmentalModelRoutes from "./routes/environmentalModel.js";
import environmentalSignalRoutes from "./routes/environmentalSignals.js";
import fieldChannelRoutes from "./routes/fieldChannels.js";
import knowledgeRoutes from "./routes/knowledge.js";
import reportRoutes from "./routes/reports.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.get("/", (_req, res) => {
  res.json({
    name: "FarmGuard API",
    status: "ok",
    modules: [
      "auth",
      "reports",
      "alerts",
      "dashboard",
      "knowledge",
      "analytics",
      "environmental-signals",
      "environmental-model",
      "field-channels",
    ],
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", environment: env.nodeEnv });
});

app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/environmental-signals", environmentalSignalRoutes);
app.use("/api/environmental-model", environmentalModelRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/field-channels", fieldChannelRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
