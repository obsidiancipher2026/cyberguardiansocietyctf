import type { Request } from "express";
import { ActivityLog, AdminAuditLog } from "../models";

export interface AuditInput {
  category: string;
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  details?: Record<string, unknown> | null;
}

export async function logAudit(req: Request, input: AuditInput): Promise<void> {
  try {
    await AdminAuditLog.create({
      adminId: req.admin?.id ?? null,
      category: input.category,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId != null ? String(input.targetId) : null,
      details: input.details ?? null,
      ipAddress: (req.ip || req.socket?.remoteAddress || null)?.slice(0, 64) ?? null,
      userAgent: (req.get("user-agent") || null)?.slice(0, 512) ?? null,
    });
  } catch {
    // Audit must never break the primary operation
  }

  // Mirror every admin action into the activity log so the "Logs" management
  // section captures the full platform picture (admin + user + system events).
  try {
    await ActivityLog.create({
      userId: req.admin?.id ?? null,
      category: `admin.${input.category}`,
      action: input.action,
      message: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId != null ? String(input.targetId) : null,
      details: input.details ?? null,
      ipAddress: (req.ip || req.socket?.remoteAddress || null)?.slice(0, 64) ?? null,
      userAgent: (req.get("user-agent") || null)?.slice(0, 512) ?? null,
    });
  } catch {
    // never break the primary operation
  }
}