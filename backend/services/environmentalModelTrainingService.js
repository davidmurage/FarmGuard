import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "../config/env.js";

const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultTrainingScriptPath = path.resolve(serviceDirectory, "../ml/train_environmental_model.py");

export async function trainEnvironmentalModel() {
  if (!existsSync(defaultTrainingScriptPath)) {
    throw new Error(`Python training script not found at ${defaultTrainingScriptPath}.`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(env.mlPythonCommand, [defaultTrainingScriptPath], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let didFinish = false;

    const timeoutId = setTimeout(() => {
      if (!didFinish) {
        didFinish = true;
        child.kill();
        reject(new Error("Python environmental model training timed out."));
      }
    }, Math.max(env.mlScoringTimeoutMs * 3, 12000));

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (error) => {
      if (didFinish) {
        return;
      }

      didFinish = true;
      clearTimeout(timeoutId);
      reject(new Error(`Unable to launch Python environmental trainer: ${error.message}`));
    });

    child.on("close", (code) => {
      if (didFinish) {
        return;
      }

      didFinish = true;
      clearTimeout(timeoutId);

      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();
        reject(new Error(stderr || `Python environmental trainer exited with code ${code}.`));
        return;
      }

      try {
        const stdout = Buffer.concat(stdoutChunks).toString("utf8").trim();
        resolve(stdout ? JSON.parse(stdout) : {});
      } catch (error) {
        reject(new Error(`Invalid JSON returned by Python environmental trainer: ${error.message}`));
      }
    });
  });
}
