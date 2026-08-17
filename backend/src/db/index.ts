import { Sequelize, type Options } from "sequelize";
import fs from "fs";
import path from "path";
import { config } from "../config";

function buildOptions(): Options {
  if (config.db.dialect === "postgres") {
    const useSsl = process.env.DB_SSL === "true" || (config.isProd && process.env.DB_SSL !== "false");
    const options: Options = {
      dialect: "postgres",
      logging: config.db.logging,
      pool: { max: 10, min: 1, idle: 10_000 },
    };
    if (useSsl) {
      options.dialectOptions = {
        ssl: { require: true, rejectUnauthorized: false },
      };
    }
    if (!config.db.url) {
      options.host = config.db.host;
      options.port = config.db.port;
      options.database = config.db.database;
      options.username = config.db.username;
      options.password = config.db.password;
    }
    return options;
  }

  // Resolve a relative storage path against the backend package root so the
  // database is always the same file regardless of the process working
  // directory (npm always runs the backend workspace from <repo>/backend).
  let rawStorage = config.db.storage;
  if (process.env.VERCEL && !path.isAbsolute(rawStorage) && !rawStorage.startsWith("/tmp")) {
    rawStorage = "/tmp/cgs-ctf.sqlite";
  }
  const storage = path.isAbsolute(rawStorage)
    ? rawStorage
    : path.resolve(__dirname, "..", "..", rawStorage);
  try {
    fs.mkdirSync(path.dirname(storage), { recursive: true });
  } catch {
    // Ignore if directory already exists
  }
  return {
    dialect: "sqlite",
    storage,
    logging: config.db.logging,
  };
}

export const sequelize = config.db.url
  ? new Sequelize(config.db.url, buildOptions())
  : new Sequelize(buildOptions());

export async function connectDb(): Promise<void> {
  await sequelize.authenticate();

  // Enforce foreign keys (SQLite ignores them by default, leaving orphan rows
  // after manual cascades) and use WAL so concurrent reads never block writes.
  if (config.db.dialect === "sqlite") {
    await sequelize.query("PRAGMA foreign_keys = ON;");
    await sequelize.query("PRAGMA journal_mode = WAL;");
  }

  const alter = config.nodeEnv !== "production" && config.db.dialect !== "sqlite";
  await sequelize.sync({ alter });

  // Migrate new columns for SQLite (addColumn is a no-op if column exists)
  if (config.db.dialect === "sqlite") {
    const qi = sequelize.getQueryInterface();
    const { DataTypes } = await import("sequelize");
    const cols = [
      { name: "fullName", attr: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null } },
      { name: "university", attr: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null } },
      { name: "country", attr: { type: DataTypes.STRING(80), allowNull: true, defaultValue: null } },
      { name: "isApproved", attr: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true } },
    ];
    for (const col of cols) {
      try {
        await qi.addColumn("users", col.name, col.attr);
      } catch {
        // Column already exists — ignore
      }
    }
    const submissionCols = [
      { name: "flagHash", attr: { type: DataTypes.STRING(64), allowNull: true, defaultValue: null } },
      { name: "bloodPointsAwarded", attr: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 } },
    ];
    for (const col of submissionCols) {
      try {
        await qi.addColumn("submissions", col.name, col.attr);
      } catch {
        // Column already exists — ignore
      }
    }
    // bloodPoints on challenges: backfill existing rows with the challenge's
    // base points so already-created challenges keep a first-blood bonus.
    try {
      await qi.addColumn("challenges", "bloodPoints", { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 });
      await sequelize.query("UPDATE challenges SET bloodPoints = basePoints WHERE bloodPoints = 0;");
    } catch {
      // Column already exists — ignore
    }
    const competitionCols = [
      { name: "scoreboardFrozenAt", attr: { type: DataTypes.DATE, allowNull: true, defaultValue: null } },
    ];
    for (const col of competitionCols) {
      try {
        await qi.addColumn("competition", col.name, col.attr);
      } catch {
        // Column already exists — ignore
      }
    }
  }
}

