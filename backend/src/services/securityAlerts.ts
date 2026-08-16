import { SecurityAlert } from "../models";
import type { AlertSeverity } from "../models/SecurityAlert";
import { adminEvents } from "./adminEvents";
import { logger } from "../utils/logger";

export interface AlertInput {
  severity: AlertSeverity;
  category: string;
  title: string;
  message?: string | null;
  details?: Record<string, unknown> | null;
}

/**
 * Persist a security alert and push it to every connected vault operator.
 * This is the single entry point for all automated security events
 * (brute-force, submission throttling, plagiarism, traffic anomalies).
 */
export async function raiseAlert(input: AlertInput): Promise<SecurityAlert> {
  const alert = await SecurityAlert.create({
    severity: input.severity,
    category: input.category,
    title: input.title,
    message: input.message ?? null,
    details: input.details ?? null,
  });
  logger.warn("Security alert raised", { id: alert.id, severity: alert.severity, category: alert.category, title: alert.title });
  adminEvents.broadcast("security-alert", {
    id: alert.id,
    severity: alert.severity,
    category: alert.category,
    title: alert.title,
    message: alert.message,
    details: alert.details,
    acknowledged: false,
    createdAt: alert.createdAt.toISOString(),
  });
  return alert;
}
