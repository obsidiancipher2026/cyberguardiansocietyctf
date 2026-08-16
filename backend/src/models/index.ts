import { User } from "./User";
import { ActivityLog } from "./ActivityLog";
import { Team } from "./Team";
import { Challenge } from "./Challenge";
import { Hint } from "./Hint";
import { HintPurchase } from "./HintPurchase";
import { Submission } from "./Submission";
import { Announcement } from "./Announcement";
import { Competition } from "./Competition";
import { RefreshToken } from "./RefreshToken";
import { AdminSession } from "./AdminSession";
import { AdminLoginAttempt } from "./AdminLoginAttempt";
import { AdminAuditLog } from "./AdminAuditLog";
import { SecurityAlert } from "./SecurityAlert";
import { IpBlock } from "./IpBlock";

User.belongsTo(Team, { foreignKey: "teamId", as: "team" });
Team.hasMany(User, { foreignKey: "teamId", as: "members" });
Team.belongsTo(User, { foreignKey: "ownerId", as: "owner" });

Challenge.hasMany(Hint, { foreignKey: "challengeId", as: "hints", onDelete: "CASCADE" });
Hint.belongsTo(Challenge, { foreignKey: "challengeId" });
Challenge.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

Hint.hasMany(HintPurchase, { foreignKey: "hintId", onDelete: "CASCADE" });
User.hasMany(HintPurchase, { foreignKey: "userId" });
HintPurchase.belongsTo(Hint, { foreignKey: "hintId" });
HintPurchase.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Submission, { foreignKey: "userId" });
Challenge.hasMany(Submission, { foreignKey: "challengeId", onDelete: "CASCADE" });
Submission.belongsTo(User, { foreignKey: "userId", as: "user" });
Submission.belongsTo(Challenge, { foreignKey: "challengeId", as: "challenge" });

Announcement.belongsTo(User, { foreignKey: "createdBy", as: "author" });
RefreshToken.belongsTo(User, { foreignKey: "userId", as: "user" });
AdminAuditLog.belongsTo(User, { foreignKey: "adminId", as: "admin" });
AdminSession.belongsTo(User, { foreignKey: "adminId", as: "admin" });
SecurityAlert.belongsTo(User, { foreignKey: "acknowledgedBy", as: "acknowledger" });
ActivityLog.belongsTo(User, { foreignKey: "userId", as: "user" });

export {
  User,
  Team,
  Challenge,
  Hint,
  HintPurchase,
  Submission,
  Announcement,
  Competition,
  RefreshToken,
  AdminSession,
  AdminLoginAttempt,
  AdminAuditLog,
  SecurityAlert,
  ActivityLog,
  IpBlock,
};
export { sequelize } from "../db";