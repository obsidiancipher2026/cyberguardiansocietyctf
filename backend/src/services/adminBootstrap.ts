import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { Competition, User } from "../models";
import { config } from "../config";
import { logger } from "../utils/logger";

/**
 * Ensures the vault administrator account exists on boot.
 * Created once from environment credentials; existing accounts are never
 * silently overwritten (unless ADMIN_FORCE_RESET=true).
 */
export async function ensureAdminUser(): Promise<User> {
  const { username, email, password, forceReset } = config.admin;

  let admin = await User.findOne({
    where: {
      [Op.or]: [{ username }, { email }],
    },
  });

  if (!admin) {
    admin = await User.create({
      username,
      email,
      fullName: "Cyber Guardian Society Administrator",
      passwordHash: await bcrypt.hash(password, config.bcryptRounds),
      role: "admin",
      isVerified: true,
      isApproved: true,
    });
    logger.info("Vault administrator created from environment", { username });
    return admin;
  }

  if (admin.role !== "admin") {
    await admin.update({ role: "admin", isVerified: true, isApproved: true });
    logger.warn("Vault administrator role repaired", { username });
  }

  if (forceReset) {
    await admin.update({ passwordHash: await bcrypt.hash(password, config.bcryptRounds) });
    logger.warn("Vault administrator password force-reset from environment", { username });
  }

  return admin;
}

/**
 * Ensures a competition configuration row exists so the live controls,
 * settings and countdown endpoints work on a fresh database without
 * requiring the seed script to be run first.
 */
export async function ensureCompetitionRow(): Promise<void> {
  const exists = await Competition.findOne({ order: [["id", "DESC"]] });
  if (exists) return;
  await Competition.create({
    name: "CGS CTF",
    status: "upcoming",
    freezeOffsetMinutes: 30,
    maintenanceMode: false,
    maintenanceMessage: null,
    submissionsKilled: false,
    scoreboardFrozen: false,
    scoreboardFrozenAt: null,
  });
  logger.info("Competition configuration row created on boot");
}
