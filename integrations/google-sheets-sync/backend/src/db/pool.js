const { Pool } = require("pg");
const { env } = require("../config/env");
const logger = require("../utils/logger");

const pool = new Pool({
  connectionString: env.databaseUrl
});

pool.on("connect", () => {
  logger.info("PostgreSQL connection established");
});

pool.on("error", (error) => {
  logger.error("Unexpected PostgreSQL pool error", { error: error.message });
});

module.exports = pool;
