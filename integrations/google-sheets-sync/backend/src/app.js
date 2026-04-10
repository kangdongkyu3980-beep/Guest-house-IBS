const express = require("express");
const helmet = require("helmet");
const healthRoutes = require("./routes/healthRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const { env } = require("./config/env");
const logger = require("./utils/logger");

const app = express();

app.use(helmet());
app.use(
  express.json({
    limit: "1mb"
  })
);

app.use((req, _res, next) => {
  logger.info("Incoming request", {
    method: req.method,
    path: req.path
  });
  next();
});

app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    message: "Google Sheets sync backend is running",
    environment: env.nodeEnv
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/webhooks", webhookRoutes);

app.use((error, _req, res, _next) => {
  logger.error("Unhandled application error", {
    error: error.message,
    stack: error.stack
  });

  res.status(500).json({
    ok: false,
    message: "Internal server error"
  });
});

module.exports = app;
