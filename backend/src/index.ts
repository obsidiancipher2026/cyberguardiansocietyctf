import { startServer } from "./app";
import { validateConfig } from "./config";
import { logger } from "./utils/logger";

validateConfig();

startServer().catch((err) => {
  logger.error("Failed to start server", { error: (err as Error).message, stack: (err as Error).stack });
  process.exit(1);
});
