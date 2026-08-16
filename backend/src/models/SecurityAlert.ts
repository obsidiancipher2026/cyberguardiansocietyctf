import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../db";

export type AlertSeverity = "info" | "warning" | "critical";

export class SecurityAlert extends Model<InferAttributes<SecurityAlert>, InferCreationAttributes<SecurityAlert>> {
  declare id: CreationOptional<number>;
  declare severity: AlertSeverity;
  declare category: string;
  declare title: string;
  declare message: CreationOptional<string | null>;
  declare details: CreationOptional<Record<string, unknown> | null>;
  declare acknowledged: CreationOptional<boolean>;
  declare acknowledgedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

SecurityAlert.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    severity: { type: DataTypes.STRING(16), allowNull: false },
    category: { type: DataTypes.STRING(32), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    message: { type: DataTypes.STRING(1000), allowNull: true },
    details: { type: DataTypes.JSON, allowNull: true },
    acknowledged: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    acknowledgedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: "SecurityAlert",
    tableName: "security_alerts",
    indexes: [{ fields: ["severity"] }, { fields: ["category"] }, { fields: ["acknowledged"] }, { fields: ["createdAt"] }],
  }
);
