import rateLimit, { type Options } from "express-rate-limit";
import { API_ERROR_CODES } from "@cgs-ctf/shared";
import { config } from "../config";

export function limiter(opts: Partial<Options> = {}) {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: { code: API_ERROR_CODES.RATE_LIMITED, message: "Too many requests, slow down" },
    },
    ...opts,
  });
}

export const strictLimiter = (max: number, windowMs = 60_000) =>
  limiter({ max, windowMs, standardHeaders: true });
