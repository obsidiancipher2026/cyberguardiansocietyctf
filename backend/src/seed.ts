import { connectDb } from "./db";
import { Competition } from "./models";
import { logger } from "./utils/logger";

async function seed() {
  await connectDb();

  const comp = await Competition.findOne({ order: [["id", "DESC"]] });
  if (!comp) {
    await Competition.create({
      name: process.env.COMPETITION_NAME || "CGS CTF",
      startTime: null,
      endTime: null,
    });
    logger.info("Competition config created");
  }

  process.exit(0);
}

seed().catch((err) => {
  logger.error("Seed failed", { error: (err as Error).message, stack: (err as Error).stack });
  process.exit(1);
});
