import type { Request } from "express";

/**
 * Real client IP. Reads the first X-Forwarded-For entry (set by the reverse
 * proxy / CDN in production) and falls back to Express's resolved IP so the
 * value recorded in logs matches the actual visitor rather than a proxy.
 */
export function clientIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return (req.ip || req.socket?.remoteAddress || "unknown").slice(0, 64);
}
