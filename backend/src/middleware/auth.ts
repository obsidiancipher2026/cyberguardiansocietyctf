import type { NextFunction, Request, Response } from "express";
import { User } from "../models";
import { verifyUserAccessToken } from "../utils/tokens";
import { forbidden, unauthorized } from "../utils/errors";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw unauthorized();

    const payload = verifyUserAccessToken(token);
    const user = await User.findByPk(payload.uid);
    if (!user) throw unauthorized();
    if (user.isBanned) throw forbidden("Account is banned");
    // Re-check approval/verification on every request so a user demoted or
    // un-approved after login loses access at the next request, not at the
    // next token expiry.
    if (!user.isApproved) throw forbidden("Account pending administrator approval");
    if (!user.isVerified) throw forbidden("Email not verified");

    req.user = user;
    next();
  } catch (err) {
    next(unauthorized("Authentication required"));
  }
}
