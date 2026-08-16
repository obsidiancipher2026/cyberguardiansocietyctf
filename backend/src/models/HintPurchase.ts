import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../db";

export class HintPurchase extends Model<InferAttributes<HintPurchase>, InferCreationAttributes<HintPurchase>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare hintId: number;
  declare cost: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

HintPurchase.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    hintId: { type: DataTypes.INTEGER, allowNull: false },
    cost: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: "HintPurchase",
    tableName: "hint_purchases",
    indexes: [{ unique: true, fields: ["userId", "hintId"] }],
  }
);
