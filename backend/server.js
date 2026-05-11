import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { startEnvironmentalProviderScheduler } from "./services/environmentalProviderService.js";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  try {
    await connectDatabase();

    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });

    startEnvironmentalProviderScheduler();
  } catch (error) {
    console.error("Failed to start FarmGuard API", error);
    process.exit(1);
  }
}

startServer();
