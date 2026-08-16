import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../db";
import type { User } from "./User";
import type { Hint } from "./Hint";
import type { ChallengeCategory, ChallengeDifficulty, ChallengeVisibility } from "@cgs-ctf/shared";

export interface ChallengeAttr {
  id: number;
  title: string;
  category: ChallengeCategory;
  description: string;
  basePoints: number;
  bloodPoints: number;
  isDynamic: boolean;
  minPoints: number;
  decayFactor: number;
  flagHash: string;
  difficulty: ChallengeDifficulty;
  visibility: ChallengeVisibility;
  maxAttempts: number | null;
  createdBy: number | null;
  solveCount: number;
  attachments: { name: string; filename: string; size: number }[];
  tags: string[];
  dockerImage: string | null;
  dockerPorts: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Challenge
  extends Model<InferAttributes<Challenge>, InferCreationAttributes<Challenge>>
  implements ChallengeAttr
{
  declare id: CreationOptional<number>;
  declare title: string;
  declare category: ChallengeCategory;
  declare description: string;
  declare basePoints: number;
  declare bloodPoints: CreationOptional<number>;
  declare isDynamic: CreationOptional<boolean>;
  declare minPoints: CreationOptional<number>;
  declare decayFactor: CreationOptional<number>;
  declare flagHash: string;
  declare difficulty: ChallengeDifficulty;
  declare visibility: ChallengeVisibility;
  declare maxAttempts: CreationOptional<number | null>;
  declare createdBy: number | null;
  declare solveCount: CreationOptional<number>;
  declare attachments: CreationOptional<{ name: string; filename: string; size: number }[]>;
  declare tags: CreationOptional<string[]>;
  declare dockerImage: CreationOptional<string | null>;
  declare dockerPorts: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare hints?: Hint[];
  declare creator?: User;
}

Challenge.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(128), allowNull: false },
    category: { type: DataTypes.STRING(24), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
    basePoints: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
    bloodPoints: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isDynamic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    minPoints: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 50 },
    decayFactor: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.95 },
    flagHash: { type: DataTypes.STRING(128), allowNull: false },
    difficulty: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "medium" },
    visibility: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "draft" },
    maxAttempts: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: true },
    solveCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    attachments: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    tags: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    dockerImage: { type: DataTypes.STRING(255), allowNull: true },
    dockerPorts: { type: DataTypes.STRING(255), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: "Challenge",
    tableName: "challenges",
    indexes: [{ fields: ["category"] }, { fields: ["visibility"] }],
  }
);
