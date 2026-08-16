import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../db";

export class IpBlock extends Model<InferAttributes<IpBlock>, InferCreationAttributes<IpBlock>> {
  declare id: CreationOptional<number>;
  declare ip: string;
  declare reason: CreationOptional<string | null>;
  declare blockedBy: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

IpBlock.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ip: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    reason: { type: DataTypes.STRING(255), allowNull: true },
    blockedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: "IpBlock",
    tableName: "ip_blocks",
    indexes: [{ fields: ["ip"] }],
  }
);