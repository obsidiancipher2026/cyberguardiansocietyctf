import type { NextFunction, Request, Response } from "express";
import { User, AdminSession } from "../models";
import { verifyAdminAccessToken } from "../utils/tokens";
import { forbidden, notFound, unauthorized } from "../utils/errors";
import { timingSafeEqual } from "../utils/crypto";
import { config } from "../config";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: User;
    }
  }
}

/**
 * Vault gate — every request to /api/admin/* must carry the secret vault
 * header. A mismatch answers 404 so the API surface stays invisible to
 * anyone who has not been given the panel slug.
 */
export function requireVault(req: Request, _res: Response, next: NextFunction): void {
  const header = req.get("x-cgs-vault") || "";
  const slug = config.admin.slug || "";
  if (!slug || !header || header.length !== slug.length || !timingSafeEqual(header, slug)) {
    next(notFound());
    return;
  }
  next();
}

/**
 * Strict admin gate — verifies the dedicated admin JWT (separate secret,
 * separate issuer/audience), confirms the account is still an admin in good
 * standing, and checks the bound vault session is still active (not revoked,
 * not expired). Revoking a session in the Security panel takes effect
 * immediately.
 */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw unauthorized();

    const payload = verifyAdminAccessToken(token);
    const admin = await User.findByPk(payload.uid);
    if (!admin || admin.role !== "admin") throw forbidden("Access denied");
    if (admin.isBanned) throw forbidden("Administrator account is suspended");

    if (payload.sid) {
      const session = await AdminSession.findByPk(payload.sid);
      if (!session || session.revoked || session.adminId !== payload.uid || session.expiresAt.getTime() < Date.now()) {
        throw unauthorized("Vault session revoked or expired");
      }
    }

    req.admin = admin;
    next();
  } catch (err) {
    if (err instanceof Error && "status" in err) {
      next(err);
      return;
    }
    next(unauthorized("Admin authentication required"));
  }
}
