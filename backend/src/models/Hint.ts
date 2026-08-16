import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../db";

export class Hint extends Model<InferAttributes<Hint>, InferCreationAttributes<Hint>> {
  declare id: CreationOptional<number>;
  declare challengeId: number;
  declare content: string;
  declare cost: number;
  declare order: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Hint.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    challengeId: { type: DataTypes.INTEGER, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    cost: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: "Hint", tableName: "hints", indexes: [{ fields: ["challengeId"] }] }
);
