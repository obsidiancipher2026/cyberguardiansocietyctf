import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../db";
import type { User } from "./User";
import type { Challenge } from "./Challenge";

export class Submission extends Model<InferAttributes<Submission>, InferCreationAttributes<Submission>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare challengeId: number;
  declare isCorrect: boolean;
  declare pointsAwarded: CreationOptional<number>;
  declare bloodPointsAwarded: CreationOptional<number>;
  declare ipAddress: CreationOptional<string | null>;
  declare flagHash: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare user?: User;
  declare challenge?: Challenge;
}

Submission.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    challengeId: { type: DataTypes.INTEGER, allowNull: false },
    isCorrect: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    pointsAwarded: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    bloodPointsAwarded: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true },
    flagHash: { type: DataTypes.STRING(64), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: "Submission",
    tableName: "submissions",
    indexes: [{ fields: ["userId"] }, { fields: ["challengeId"] }, { fields: ["isCorrect"] }],
  }
);
