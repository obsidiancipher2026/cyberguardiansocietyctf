import { Router } from "express";
import Joi from "joi";
import { Competition } from "../../models";
import { validate } from "../../middleware/validate";
import { requireAdmin } from "../../middleware/adminAuth";
import { asyncHandler, notFound } from "../../utils/errors";
import { logAudit } from "../../services/adminAudit";
import { hub } from "../../services/realtime";
import type { CompetitionStatus } from "@cgs-ctf/shared";

const router = Router();
router.use(requireAdmin);

async function currentCompetition() {
  const comp = await Competition.findOne({ order: [["id", "DESC"]] });
  if (!comp) throw notFound();
  return comp;
}

router.get("/state", asyncHandler(async (_req, res) => {
  const comp = await currentCompetition();
  res.json({
    competition: {
      name: comp.name,
      status: comp.status,
      startAt: comp.startTime ? comp.startTime.toISOString() : null,
      endAt: comp.endTime ? comp.endTime.toISOString() : null,
      freezeScoreboard: comp.scoreboardFrozen,
      submissionsKilled: comp.submissionsKilled,
      maintenanceMode: comp.maintenanceMode,
      maintenanceMessage: comp.maintenanceMessage ?? "",
    },
    connectedClients: hub.clientCount(),
    broadcasts: [],
  });
}));

const patchSchema = Joi.object({
  name: Joi.string().trim().min(1).max(128),
  status: Joi.string().valid("setup", "upcoming", "live", "paused", "frozen", "ended"),
  startAt: Joi.date().iso().allow(null),
  endAt: Joi.date().iso().allow(null),
  maintenanceMode: Joi.boolean(),
  maintenanceMessage: Joi.string().trim().max(512).allow("").allow(null),
});

router.patch("/state", validate(patchSchema), asyncHandler(async (req, res) => {
  const comp = await currentCompetition();
  const updates: Record<string, unknown> = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.status !== undefined) updates.status = req.body.status;
  if (req.body.startAt !== undefined) updates.startTime = req.body.startAt;
  if (req.body.endAt !== undefined) updates.endTime = req.body.endAt;
  if (req.body.maintenanceMode !== undefined) updates.maintenanceMode = req.body.maintenanceMode;
  if (req.body.maintenanceMessage !== undefined) updates.maintenanceMessage = req.body.maintenanceMessage;
  if (updates.startTime && new Date(updates.startTime as string) <= new Date(Date.now() + 60_000) && comp.status === "upcoming") {
    updates.status = "live";
  }
  await comp.update(updates);
  hub.broadcast("competition", { ...comp.toJSON() });
  await logAudit(req, { category: "live", action: "state.update", targetType: "competition", targetId: comp.id, details: { fields: Object.keys(updates) } });
  res.json({ message: "Competition state updated", state: comp });
}));

const toggleSchema = Joi.object({
  enabled: Joi.boolean().required(),
  message: Joi.string().trim().max(512).optional().allow(""),
});

router.post("/maintenance", validate(toggleSchema), asyncHandler(async (req, res) => {
  const comp = await currentCompetition();
  await comp.update({
    maintenanceMode: req.body.enabled,
    maintenanceMessage: req.body.enabled ? req.body.message || "CGS CTF is under maintenance. Check back soon." : null,
  });
  hub.broadcast("competition", { ...comp.toJSON() });
  await logAudit(req, { category: "live", action: "maintenance.set", targetType: "competition", targetId: comp.id, details: { enabled: req.body.enabled } });
  res.json({ message: req.body.enabled ? "Maintenance mode enabled" : "Maintenance mode disabled" });
}));

const broadcastSchema = Joi.object({
  message: Joi.string().trim().min(1).max(1000).required(),
  level: Joi.string().valid("info", "warning", "danger").default("info"),
});

router.post("/broadcast", validate(broadcastSchema), asyncHandler(async (req, res) => {
  const payload = {
    message: req.body.message,
    level: req.body.level,
    from: req.admin!.username,
    at: new Date().toISOString(),
  };
  hub.broadcast("broadcast", payload);
  await logAudit(req, { category: "live", action: "broadcast.send", details: { level: req.body.level } });
  res.json({ message: "Broadcast sent to all connected clients" });
}));

router.get("/clients", asyncHandler(async (_req, res) => {
  res.json({ connectedClients: hub.clientCount() });
}));

export default router;
