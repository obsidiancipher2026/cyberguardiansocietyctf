import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../db";
import type { UserRole } from "@cgs-ctf/shared";

export interface UserAttr {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  university: string | null;
  country: string | null;
  passwordHash: string;
  role: UserRole;
  teamId: number | null;
  isVerified: boolean;
  isApproved: boolean;
  isBanned: boolean;
  banReason: string | null;
  banExpiresAt: Date | null;
  twoFASecret: string | null;
  twoFAEnabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class User
  extends Model<InferAttributes<User>, InferCreationAttributes<User>>
  implements UserAttr
{
  declare id: CreationOptional<number>;
  declare username: string;
  declare email: string;
  declare fullName: CreationOptional<string | null>;
  declare university: CreationOptional<string | null>;
  declare country: CreationOptional<string | null>;
  declare passwordHash: string;
  declare role: CreationOptional<UserRole>;
  declare teamId: number | null;
  declare isVerified: CreationOptional<boolean>;
  declare isApproved: CreationOptional<boolean>;
  declare isBanned: CreationOptional<boolean>;
  declare banReason: CreationOptional<string | null>;
  declare banExpiresAt: CreationOptional<Date | null>;
  declare twoFASecret: CreationOptional<string | null>;
  declare twoFAEnabled: CreationOptional<boolean>;
  declare mustChangePassword: CreationOptional<boolean>;
  declare lastLoginAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  toPublic() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      fullName: this.fullName,
      university: this.university,
      country: this.country,
      role: this.role,
      teamId: this.teamId,
      isVerified: this.isVerified,
      isApproved: this.isApproved,
      isBanned: this.isBanned,
      twoFAEnabled: this.twoFAEnabled,
      createdAt: this.createdAt.toISOString(),
    };
  }
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    fullName: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null },
    university: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null },
    country: { type: DataTypes.STRING(80), allowNull: true, defaultValue: null },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "user" },
    teamId: { type: DataTypes.INTEGER, allowNull: true },
    isVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isApproved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isBanned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    banReason: { type: DataTypes.STRING(255), allowNull: true },
    banExpiresAt: { type: DataTypes.DATE, allowNull: true },
    twoFASecret: { type: DataTypes.STRING(64), allowNull: true },
    twoFAEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    mustChangePassword: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    indexes: [{ fields: ["teamId"] }, { fields: ["role"] }],
  }
);
