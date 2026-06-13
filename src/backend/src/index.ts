import app from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { getNeo4jDriver, closeNeo4j } from "./config/neo4j.js";
import { initializeGraphSchema } from "./graph/schema.js";

async function main() {
  if (config.NODE_ENV !== "test") {
    try {
      getNeo4jDriver();
      await initializeGraphSchema();
      logger.info("Neo4j driver created and schema initialized");
    } catch (err) {
      logger.warn({ err }, "Neo4j unavailable — graph features disabled");
    }
  }

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
}

main();
