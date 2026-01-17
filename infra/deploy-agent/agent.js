import express from "express";
import dotenv from "dotenv";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

dotenv.config();

const app = express();
app.use(express.json());

/* -------------------------------------------------------
 * Cloudflare Access header guard
 * ----------------------------------------------------- */
app.use((req, res, next) => {
  // Cloudflare injects this header for authenticated requests (optional)
  if (!req.headers["cf-ray"]) {
    return res.status(401).json({ error: "not via cloudflare" });
  }
  next();
});

/* -------------------------------------------------------
 * Environment
 * ----------------------------------------------------- */
const {
  ENVIRONMENT,
  CONTAINER_NAME,
  AUDIT_EVENTS_PATH,
  SNAPSHOTS_PATH,
  ALLOW_EXECUTION_PLANE,
  PORT
} = process.env;

/* -------------------------------------------------------
 * Runtime env (authoritative, server-side)
 * ----------------------------------------------------- */
function runtimeEnvFilePath() {
  // Authoritative layout:
  // /opt/dreichor/dev/runtime.env
  // /opt/dreichor/prod/runtime.env
  if (ENVIRONMENT !== "dev" && ENVIRONMENT !== "prod") {
    throw new Error(
      `invalid ENVIRONMENT='${ENVIRONMENT}' (expected 'dev' | 'prod')`
    );
  }
  return path.join("/opt/dreichor", ENVIRONMENT, "runtime.env");
}

function requireReadableFile(p) {
  try {
    fs.accessSync(p, fs.constants.R_OK);
  } catch (_) {
    throw new Error(`runtime env file not readable: ${p}`);
  }
}

/* -------------------------------------------------------
 * Startup banner
 * ----------------------------------------------------- */
console.log("=== Dreichor Deploy Agent ===");
console.log("Environment:", ENVIRONMENT);
console.log("Container:", CONTAINER_NAME);
console.log("Execution Plane Allowed:", ALLOW_EXECUTION_PLANE);
console.log("Audit Events Path:", AUDIT_EVENTS_PATH);
console.log("Snapshots Path:", SNAPSHOTS_PATH);
try {
  console.log("Runtime env file:", runtimeEnvFilePath());
} catch (e) {
  console.log("Runtime env file: (unresolved)", e?.message || String(e));
}

/* -------------------------------------------------------
 * Sanity checks
 * ----------------------------------------------------- */
function requireEnv(name) {
  if (!process.env[name]) {
    console.error(`FATAL: Missing env var ${name}`);
    process.exit(1);
  }
}

[
  "ENVIRONMENT",
  "CONTAINER_NAME",
  "AUDIT_EVENTS_PATH",
  "SNAPSHOTS_PATH",
  "ALLOW_EXECUTION_PLANE"
].forEach(requireEnv);

/* -------------------------------------------------------
 * Health
 * ----------------------------------------------------- */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    environment: ENVIRONMENT
  });
});

/* -------------------------------------------------------
 * Deploy
 * ----------------------------------------------------- */
app.post("/v1/deploy", (req, res) => {
  const { image, environment } = req.body || {};
  const name = CONTAINER_NAME;

  // Hard security boundary: CI must not influence runtime behavior.
  if (req.body && typeof req.body === "object") {
    const forbidden = ["env", "container_name", "volumes"].filter(
      (k) => Object.prototype.hasOwnProperty.call(req.body, k)
    );
    if (forbidden.length > 0) {
      return res.status(400).json({
        status: "error",
        reason: `forbidden fields in deploy request: ${forbidden.join(", ")}`
      });
    }
  }

  if (!image) {
    return res.status(400).json({ error: "image required" });
  }

  if (ENVIRONMENT === "prod" && image.includes(":latest")) {
    return res.status(400).json({
      error: "latest tag forbidden in prod"
    });
  }

  try {
    const runtimeEnvPath = runtimeEnvFilePath();
    requireReadableFile(runtimeEnvPath);

    console.log("Deploying image:", image);

    // Pull image
    execSync(`docker pull ${image}`, { stdio: "inherit" });

    // Stop old container if exists (only after successful pull)
    try {
      execSync(`docker rm -f ${name}`, { stdio: "ignore" });
    } catch (_) {}

    const volumeFlags = [
      `-v ${AUDIT_EVENTS_PATH}:/var/lib/dreichor/audit-events`,
      `-v ${SNAPSHOTS_PATH}:/var/lib/dreichor/snapshots`
    ].join(" ");

    const cmd = `
docker run -d \
  --name ${name} \
  --restart unless-stopped \
  --network host \
  --env-file ${runtimeEnvPath} \
  ${volumeFlags} \
  ${image}
`.trim();

    console.log(cmd);
    execSync(cmd, { stdio: "inherit" });

    res.json({
      status: "deployed",
      environment,
      image
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      reason: err.message
    });
  }
});

/* -------------------------------------------------------
 * Status
 * ----------------------------------------------------- */
app.get("/v1/status", (req, res) => {
  const name = CONTAINER_NAME;

  try {
    const output = execSync(
      `docker inspect ${name} --format='{{.State.Running}}|{{.Config.Image}}|{{.State.StartedAt}}'`,
      { encoding: "utf8" }
    ).trim();

    const [running, image, startedAt] = output.split("|");

    res.json({
      container_name: name,
      running: running === "true",
      image,
      started_at: startedAt
    });
  } catch (_) {
    res.json({
      container_name: name,
      running: false
    });
  }
});

/* -------------------------------------------------------
 * Stop
 * ----------------------------------------------------- */
app.post("/v1/stop", (req, res) => {
  const name = CONTAINER_NAME;

  try {
    execSync(`docker rm -f ${name}`, { stdio: "ignore" });
  } catch (_) {}

  res.json({
    status: "stopped",
    container_name: name
  });
});

/* -------------------------------------------------------
 * Listen
 * ----------------------------------------------------- */
const listenPort = Number(PORT) || 3005;

app.listen(listenPort, "127.0.0.1", () => {
  console.log(`Deploy Agent listening on http://127.0.0.1:${listenPort}`);
});