import { Router } from "express";
import { requireVault } from "../../middleware/adminAuth";
import { limiter } from "../../middleware/rateLimiter";
import authRoutes from "./auth";
import dashboardRoutes from "./dashboard";
import userRoutes from "./users";
import challengeRoutes from "./challenges";
import announcementRoutes from "./announcements";
import liveRoutes from "./live";
import logRoutes from "./logs";
import dangerRoutes from "./danger";
import submissionRoutes from "./submissions";
import securityRoutes from "./security";
import settingsRoutes from "./settings";

const router = Router();

// The vault gate protects the ENTIRE admin API surface — including the
// login endpoint. Without the secret slug header every request answers 404,
// so the admin API is invisible to anyone who does not know the slug.
router.use(requireVault);
router.use(limiter({ max: 120, windowMs: 60_000 }));

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/users", userRoutes);
router.use("/challenges", challengeRoutes);
router.use("/announcements", announcementRoutes);
router.use("/live", liveRoutes);
router.use("/logs", logRoutes);
router.use("/danger", dangerRoutes);
router.use("/submissions", submissionRoutes);
router.use("/security", securityRoutes);
router.use("/settings", settingsRoutes);

export default router;
