import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config";
import { connectDb } from "./db";
import { errorHandler, notFoundHandler } from "./utils/errors";
import { logger } from "./utils/logger";
import { maintenanceGuard } from "./middleware/maintenance";
import { ipBlockGuard } from "./middleware/ipBlockGuard";
import { requireAuth } from "./middleware/auth";
import { limiter } from "./middleware/rateLimiter";

import authRoutes from "./routes/auth";
import challengeRoutes from "./routes/challenges";
import scoreboardRoutes from "./routes/scoreboard";
import announcementRoutes from "./routes/announcements";
import profileRoutes from "./routes/profile";
import realtimeRoutes from "./routes/realtime";
import publicRoutes from "./routes/public";
import adminRoutes from "./routes/admin";
import { ensureAdminUser, ensureCompetitionRow } from "./services/adminBootstrap";
import { trafficMonitor } from "./services/trafficMonitor";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");

  if (config.isProd) {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: config.isProd
        ? { directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", "data:"], styleSrc: ["'self'", "'unsafe-inline'"], scriptSrc: ["'self'"] } }
        : false,
      hsts: config.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      frameguard: { action: "deny" },
      crossOriginEmbedderPolicy: false,
    })
  );

  const allowedOrigins = [
    ...config.frontendOrigins,
    config.appUrl,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ]
    .filter(Boolean)
    .map((o) => o.replace(/\/$/, ""));

  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) {
          cb(null, true);
          return;
        }
        const normalized = origin.replace(/\/$/, "");
        if (
          allowedOrigins.includes(normalized) ||
          normalized.endsWith(".vercel.app") ||
          normalized.includes("localhost") ||
          normalized.includes("127.0.0.1")
        ) {
          cb(null, true);
          return;
        }
        cb(new Error("Not allowed by CORS"));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
      // Real-time traffic sampling + anomaly detection
      trafficMonitor.record({
        ts: Date.now(),
        path: req.originalUrl.split("?")[0],
        status: res.statusCode,
        ip: (req.ip || req.socket?.remoteAddress || "unknown").slice(0, 64),
        latency: Date.now() - start,
      });
      trafficMonitor.analyze();
    });
    next();
  });

  // Support /api/backend prefix from Vercel multi-service rewrites
  app.use((req, _res, next) => {
    if (req.url.startsWith("/api/backend")) {
      req.url = req.url.replace(/^\/api\/backend/, "/api");
    }
    next();
  });

  app.get("/api/healthz", (_req, res) => res.json({ ok: true }));

  app.use(maintenanceGuard);
  app.use(ipBlockGuard);
  app.use("/api", limiter());

  app.use("/api/auth", authRoutes);
  app.use("/api/challenges", challengeRoutes);
  app.use("/api/scoreboard", scoreboardRoutes);
  app.use("/api/announcements", announcementRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/events", realtimeRoutes);
  app.use("/api/public", publicRoutes);

  // Hidden control vault — the whole surface is gated by requireVault
  app.use("/api/admin", adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export async function startServer() {
  await connectDb();
  await ensureAdminUser();
  await ensureCompetitionRow();
  const app = createApp();
  app.listen(config.port, () => {
    logger.info(`CGS CTF API listening on :${config.port} (${config.nodeEnv})`);
  });
}
