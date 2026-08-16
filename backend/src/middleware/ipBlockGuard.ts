import type { NextFunction, Request, Response } from "express";
import { IpBlock } from "../models";

/**
 * Rejects every non-admin request coming from a blocked IP address.
 * The admin vault always stays reachable so the operator can unblock.
 */
export async function ipBlockGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.path.startsWith("/api/admin")) {
    next();
    return;
  }
  const ip = (req.ip || req.socket?.remoteAddress || "").slice(0, 64);
  if (!ip) {
    next();
    return;
  }
  try {
    const blocked = await IpBlock.findOne({ where: { ip } });
    if (blocked) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: blocked.reason || "Your IP address is blocked from this platform.",
        },
      });
      return;
    }
  } catch {
    // Never take the platform down because of a storage failure.
  }
  next();
}