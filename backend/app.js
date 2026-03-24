import cors from "cors";
import express from "express";
import morgan from "morgan";

import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import alertRoutes from "./routes/alerts.js";
import dashboardRoutes from "./routes/dashboard.js";
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
    modules: ["auth", "reports", "alerts", "dashboard"],
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", environment: env.nodeEnv });
});

app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
