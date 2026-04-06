import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";

async function startServer() {
  try {
    await connectDatabase();

    app.listen(process.env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start FarmGuard API", error);
    process.exit(1);
  }
}

startServer();
