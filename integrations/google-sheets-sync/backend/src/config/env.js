const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

function parseBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return String(value).toLowerCase() === "true";
}

function parseRequiredFields(value) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || "",
  webhookSecretToken: process.env.WEBHOOK_SECRET_TOKEN || "",
  requiredFields: parseRequiredFields(process.env.REQUIRED_FIELDS),
  logRowData: parseBoolean(process.env.LOG_ROW_DATA, true)
};

function validateEnv() {
  const missing = [];

  if (!env.databaseUrl) {
    missing.push("DATABASE_URL");
  }

  if (!env.webhookSecretToken) {
    missing.push("WEBHOOK_SECRET_TOKEN");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

module.exports = {
  env,
  validateEnv
};
