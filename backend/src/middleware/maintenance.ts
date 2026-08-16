import type { NextFunction, Request, Response } from "express";
import { API_ERROR_CODES } from "@cgs-ctf/shared";
import { getCompetitionState } from "../services/competition";

export async function maintenanceGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  // The admin vault must stay reachable during maintenance so the operator
  // can take the platform out of maintenance mode. The public competition
  // probe is exempt too: it only exposes the maintenance flags themselves,
  // which is exactly what the client-side lockdown gate polls to activate.
  if (
    req.path.startsWith("/api/admin") ||
    req.path === "/api/public/competition" ||
    req.path === "/api/public/competition/"
  ) {
    next();
    return;
  }
  const state = await getCompetitionState();
  if (state.maintenanceMode) {
    res.status(503).json({
      error: {
        code: API_ERROR_CODES.MAINTENANCE,
        message: state.maintenanceMessage || "CGS CTF is under maintenance. Check back soon.",
      },
    });
    return;
  }
  next();
}
