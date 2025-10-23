import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./users.js";

const BudgetExpenditure = sequelize.define(
  "expenditure",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    activity: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
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
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    appropriation: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    allotment: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    allotmentBalance: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    releases: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    actualExpenditure: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    actualPayment: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  { timestamps: true }
);

User.hasMany(BudgetExpenditure);
BudgetExpenditure.belongsTo(User);


export default BudgetExpenditure;