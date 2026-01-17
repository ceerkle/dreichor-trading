import express from "express";
import dotenv from "dotenv";
import { execSync } from "node:child_process";

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
 * Startup banner
 * ----------------------------------------------------- */
console.log("=== Dreichor Deploy Agent ===");
console.log("Environment:", ENVIRONMENT);
console.log("Container:", CONTAINER_NAME);
console.log("Execution Plane Allowed:", ALLOW_EXECUTION_PLANE);
console.log("Audit Events Path:", AUDIT_EVENTS_PATH);
console.log("Snapshots Path:", SNAPSHOTS_PATH);

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
  const { image, environment, env = {} } = req.body;
  const name = CONTAINER_NAME;

  if (!image) {
    return res.status(400).json({ error: "image required" });
  }

  if (ENVIRONMENT === "prod" && image.includes(":latest")) {
    return res.status(400).json({
      error: "latest tag forbidden in prod"
    });
  }

  try {
    console.log("Deploying image:", image);

    // Stop old container if exists
    try {
      execSync(`docker rm -f ${name}`, { stdio: "ignore" });
    } catch (_) {}

    // Pull image
    execSync(`docker pull ${image}`, { stdio: "inherit" });

    const envFlags = Object.entries(env)
      .map(([k, v]) => `-e ${k}="${v}"`)
      .join(" ");

    const volumeFlags = [
      `-v ${AUDIT_EVENTS_PATH}:/var/lib/dreichor/audit-events`,
      `-v ${SNAPSHOTS_PATH}:/var/lib/dreichor/snapshots`
    ].join(" ");

    const cmd = `
docker run -d \
  --name ${name} \
  --restart unless-stopped \
  ${envFlags} \
  ${volumeFlags} \
  ${image}
`.trim();

    console.log(cmd);
    execSync(cmd, { stdio: "inherit" });

    res.json({
      status: "deployed",
      container_name: name,
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