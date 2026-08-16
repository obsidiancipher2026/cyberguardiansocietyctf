import type { Request } from "express";
import { ActivityLog } from "../models";

export interface ActivityInput {
  category: string;
  action: string;
  message?: string | null;
  targetType?: string | null;
  targetId?: string | number | null;
  details?: Record<string, unknown> | null;
  userId?: number | null;
}

/**
 * Records a platform activity entry (the "Logs" management section).
 * Flag submissions are intentionally NOT logged here — they live in the
 * Submission ledger shown by the "Submission Logs" section.
 */
export async function logActivity(req: Request, input: ActivityInput): Promise<void> {
  try {
    await ActivityLog.create({
      userId: input.userId ?? req.user?.id ?? req.admin?.id ?? null,
      category: input.category,
      action: input.action,
      message: input.message ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId != null ? String(input.targetId) : null,
      details: input.details ?? null,
      ipAddress: (req.ip || req.socket?.remoteAddress || null)?.slice(0, 64) ?? null,
      userAgent: (req.get("user-agent") || null)?.slice(0, 512) ?? null,
    });
  } catch {
    // Logging must never break the primary operation.
  }
}