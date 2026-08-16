import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../db";

export class ActivityLog extends Model<InferAttributes<ActivityLog>, InferCreationAttributes<ActivityLog>> {
  declare id: CreationOptional<number>;
  declare userId: number | null;
  declare category: string;
  declare action: string;
  declare message: CreationOptional<string | null>;
  declare targetType: CreationOptional<string | null>;
  declare targetId: CreationOptional<string | null>;
  declare details: CreationOptional<Record<string, unknown> | null>;
  declare ipAddress: CreationOptional<string | null>;
  declare userAgent: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ActivityLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    category: { type: DataTypes.STRING(32), allowNull: false },
    action: { type: DataTypes.STRING(128), allowNull: false },
    message: { type: DataTypes.STRING(512), allowNull: true },
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
    modelName: "ActivityLog",
    tableName: "activity_logs",
    indexes: [{ fields: ["userId"] }, { fields: ["category"] }, { fields: ["action"] }, { fields: ["createdAt"] }],
  }
);