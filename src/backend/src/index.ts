import app from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { closeNeo4j } from "./config/neo4j.js";

const server = app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT} [${config.NODE_ENV}]`);
});

// Graceful shutdown
function shutdown() {
  logger.info("Shutting down...");
  server.close(async () => {
    await closeNeo4j();
    logger.info("Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
