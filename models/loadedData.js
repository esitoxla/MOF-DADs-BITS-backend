import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./users.js";

const LoadedData = sequelize.define(
  "loadedData",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    organization: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    economicClassification: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sourceOfFunding: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    naturalAccount: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    appropriation: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: 0, // ensures value is 0 or greater
      },
    },
    allotment: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
  },
  { timestamps: true }
);

User.hasMany(LoadedData);
LoadedData.belongsTo(User);

export default LoadedData;