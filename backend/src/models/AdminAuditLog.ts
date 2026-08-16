import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../db";

export class AdminAuditLog extends Model<InferAttributes<AdminAuditLog>, InferCreationAttributes<AdminAuditLog>> {
  declare id: CreationOptional<number>;
  declare adminId: number | null;
  declare category: string;
  declare action: string;
  declare targetType: CreationOptional<string | null>;
  declare targetId: CreationOptional<string | null>;
  declare details: CreationOptional<Record<string, unknown> | null>;
  declare ipAddress: CreationOptional<string | null>;
  declare userAgent: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

AdminAuditLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    adminId: { type: DataTypes.INTEGER, allowNull: true },
    category: { type: DataTypes.STRING(32), allowNull: false },
    action: { type: DataTypes.STRING(128), allowNull: false },
    targetType: { type: DataTypes.STRING(32), allowNull: true },
    targetId: { type: DataTypes.STRING(64), allowNull: true },
    details: { type: DataTypes.JSON, allowNull: true },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true },
    userAgent: { type: DataTypes.STRING(512), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: "AdminAuditLog",
    tableName: "admin_audit_logs",
    indexes: [{ fields: ["adminId"] }, { fields: ["category"] }, { fields: ["createdAt"] }],
  }
);
