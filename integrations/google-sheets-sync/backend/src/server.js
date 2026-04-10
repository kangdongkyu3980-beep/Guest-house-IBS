const app = require("./app");
const { env, validateEnv } = require("./config/env");
const logger = require("./utils/logger");

try {
  validateEnv();

  app.listen(env.port, () => {
    logger.info(`Server started on http://localhost:${env.port}`);
  });
} catch (error) {
  logger.error("Server failed to start", { error: error.message });
  process.exit(1);
}
