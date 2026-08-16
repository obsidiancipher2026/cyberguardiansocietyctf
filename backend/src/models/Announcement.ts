import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../db";
import type { User } from "./User";

export type AnnouncementAudience = "all" | "teams" | "individuals";

export class Announcement extends Model<InferAttributes<Announcement>, InferCreationAttributes<Announcement>> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare content: string;
  declare isPinned: CreationOptional<boolean>;
  declare publishAt: CreationOptional<Date | null>;
  declare publishedAt: CreationOptional<Date | null>;
  declare audience: CreationOptional<AnnouncementAudience>;
  declare pushEnabled: CreationOptional<boolean>;
  declare createdBy: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare author?: User;
}

Announcement.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
    isPinned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    publishAt: { type: DataTypes.DATE, allowNull: true },
    publishedAt: { type: DataTypes.DATE, allowNull: true },
    audience: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "all" },
    pushEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdBy: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: "Announcement", tableName: "announcements" }
);
