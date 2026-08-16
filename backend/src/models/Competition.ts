import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../db";
import type { CompetitionStatus } from "@cgs-ctf/shared";

export class Competition extends Model<InferAttributes<Competition>, InferCreationAttributes<Competition>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare startTime: Date | null;
  declare endTime: Date | null;
  declare freezeOffsetMinutes: CreationOptional<number>;
  declare status: CreationOptional<CompetitionStatus>;
  declare maintenanceMode: CreationOptional<boolean>;
  declare maintenanceMessage: CreationOptional<string | null>;
  declare submissionsKilled: CreationOptional<boolean>;
  declare scoreboardFrozen: CreationOptional<boolean>;
  declare scoreboardFrozenAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Competition.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(128), allowNull: false, defaultValue: "CGS CTF" },
    startTime: { type: DataTypes.DATE, allowNull: true },
    endTime: { type: DataTypes.DATE, allowNull: true },
    freezeOffsetMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "upcoming" },
    maintenanceMode: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    maintenanceMessage: { type: DataTypes.STRING(512), allowNull: true },
    submissionsKilled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    scoreboardFrozen: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    scoreboardFrozenAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: "Competition", tableName: "competition" }
);
