import dotenv from "dotenv";
import path from "path";

// Load the repo-root .env (backend/src/config and backend/dist/config are both
// three levels below the repository root, so ../../../.env resolves correctly
// whether the backend runs from TypeScript or compiled output).
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config();

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: (process.env.NODE_ENV || "development") === "production",
  port: num(process.env.PORT, 4000),
  appUrl: process.env.APP_URL || "http://localhost:3000",
  frontendOrigins: (process.env.CORS_ORIGINS || process.env.FRONTEND_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  db: {
    dialect: ((process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DB_URL) ? "postgres" : (process.env.DB_DIALECT || "sqlite")) as "sqlite" | "postgres",
    url: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DB_URL,
    storage: process.env.DB_STORAGE || "./data/cgs-ctf.sqlite",
    host: process.env.DB_HOST || "localhost",
    port: num(process.env.DB_PORT, 5432),
    database: process.env.DB_NAME || "cgs_ctf",
    username: process.env.DB_USER || "cgs",
    password: process.env.DB_PASSWORD || "",
    logging: false,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret",
    accessTtl: process.env.JWT_ACCESS_TTL || "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
    refreshTtlDays: num(process.env.JWT_REFRESH_TTL_DAYS, 14),
    issuer: "cgs-ctf-api",
    audience: "cgs-ctf-users",
  },

  admin: {
    slug: process.env.ADMIN_PANEL_SLUG || "cgs-ctrl-a7f8e2d1b9c4k6m3",
    username: process.env.ADMIN_USERNAME || "Master",
    email: process.env.ADMIN_EMAIL || "admin@cyberguardiansociety.org",
    password: process.env.ADMIN_PASSWORD || "%7O#CyberGuardians26_CGS!",
    forceReset: process.env.ADMIN_FORCE_RESET === "true",
    sessionTtlDays: num(process.env.ADMIN_SESSION_TTL_DAYS, 7),
    accessTtl: process.env.ADMIN_ACCESS_TTL || "30m",
    jwtSecret: process.env.JWT_ADMIN_SECRET || "dev-admin-secret-change-me",
    issuer: "cgs-ctf-admin",
    audience: "cgs-ctf-admins",
    loginMaxAttempts: num(process.env.ADMIN_LOGIN_MAX_ATTEMPTS, 5),
    loginWindowMs: num(process.env.ADMIN_LOGIN_WINDOW_MS, 15 * 60_000),
    lockoutMs: num(process.env.ADMIN_LOCKOUT_MS, 15 * 60_000),
  },

  bcryptRounds: num(process.env.BCRYPT_ROUNDS, 12),

  rateLimit: {
    windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 60000),
    max: num(process.env.RATE_LIMIT_MAX, 100),
  },

  upload: {
    // Resolve relative paths against the backend package root (backend/src/config
    // and backend/dist/config are both two levels below it) so uploads always land
    // in the same directory regardless of the process working directory.
    dir: (() => {
      const raw = process.env.UPLOAD_DIR || "./uploads";
      return path.isAbsolute(raw) ? raw : path.resolve(__dirname, "..", "..", raw);
    })(),
    maxMb: num(process.env.MAX_UPLOAD_MB, 25),
  },

  logDir: process.env.LOG_DIR || "./logs",

};

const DEFAULTS = {
  jwtAccess: "dev-access-secret",
  jwtRefresh: "dev-refresh-secret",
  jwtAdmin: "dev-admin-secret-change-me",
  adminUsername: "Master",
  adminEmail: "admin@cyberguardiansociety.org",
  adminPassword: "%7O#CyberGuardians26_CGS!",
  adminSlug: "cgs-ctrl-a7f8e2d1b9c4k6m3",
  flagPepper: "cgs-ctf-flag-pepper-change-me",
};

/**
 * Fail-closed production guard: refuse to start with any committed default or
 * missing secret so a misconfigured deployment can never boot with
 * world-readable credentials. Mirrors the FLAG_PEPPER guard in utils/crypto.ts.
 */
export function validateConfig(): void {
  if (!config.isProd) return;

  const required: Array<[string, string | undefined, string]> = [
    ["JWT_ACCESS_SECRET", process.env.JWT_ACCESS_SECRET, DEFAULTS.jwtAccess],
    ["JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET, DEFAULTS.jwtRefresh],
    ["JWT_ADMIN_SECRET", process.env.JWT_ADMIN_SECRET, DEFAULTS.jwtAdmin],
    ["ADMIN_USERNAME", process.env.ADMIN_USERNAME, DEFAULTS.adminUsername],
    ["ADMIN_EMAIL", process.env.ADMIN_EMAIL, DEFAULTS.adminEmail],
    ["ADMIN_PASSWORD", process.env.ADMIN_PASSWORD, DEFAULTS.adminPassword],
    ["ADMIN_PANEL_SLUG", process.env.ADMIN_PANEL_SLUG, DEFAULTS.adminSlug],
    ["FLAG_PEPPER", process.env.FLAG_PEPPER, DEFAULTS.flagPepper],
  ];

  const missing: string[] = [];
  for (const [name, value, fallback] of required) {
    if (!value || value === fallback) missing.push(name);
  }
  if (config.db.dialect === "postgres" && !config.db.password) missing.push("DB_PASSWORD");

  if (missing.length > 0) {
    throw new Error(
      "Refusing to start in production: the following secrets are missing or still set to " +
        "the committed defaults. Generate unique values (e.g. `openssl rand -hex 32`) and set " +
        `them in the .env file: ${missing.join(", ")}`
    );
  }
}
