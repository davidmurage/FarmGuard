import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "../config/env.js";

const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultScriptPath = path.resolve(serviceDirectory, "../ml/score_environmental_brief.py");

function resolveScriptPath() {
  if (!env.mlScoringScript) {
    return defaultScriptPath;
  }

  return path.isAbsolute(env.mlScoringScript)
    ? env.mlScoringScript
    : path.resolve(process.cwd(), env.mlScoringScript);
}

export async function scoreEnvironmentalBriefWithPython(payload) {
  if (!env.mlScoringEnabled) {
    throw new Error("Python ML scoring is disabled by configuration.");
  }

  const scriptPath = resolveScriptPath();

  if (!existsSync(scriptPath)) {
    throw new Error(`Python scoring script not found at ${scriptPath}.`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(env.mlPythonCommand, [scriptPath], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let didFinish = false;

    const timeoutId = setTimeout(() => {
      if (!didFinish) {
        didFinish = true;
        child.kill();
        reject(new Error("Python ML scorer timed out before responding."));
      }
    }, env.mlScoringTimeoutMs);

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
      reject(new Error(`Unable to launch Python ML scorer: ${error.message}`));
    });

    child.on("close", (code) => {
      if (didFinish) {
        return;
      }

      didFinish = true;
      clearTimeout(timeoutId);

      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();
        reject(new Error(stderr || `Python ML scorer exited with code ${code}.`));
        return;
      }

      try {
        const stdout = Buffer.concat(stdoutChunks).toString("utf8").trim();
        resolve(stdout ? JSON.parse(stdout) : {});
      } catch (error) {
        reject(new Error(`Invalid JSON returned by Python ML scorer: ${error.message}`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}
