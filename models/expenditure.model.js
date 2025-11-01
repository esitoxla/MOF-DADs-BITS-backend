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
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: 0, // ensures value is 0 or greater
      },
    },
    allotment: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    allotmentBalance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    releases: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    actualExpenditure: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    actualPayment: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true, // or false if required
      references: {
        model: "Users", // table name (not model name)
        key: "id", //  foreign key column in Users table
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL", // or "CASCADE" if you want child rows deleted too
    },
  },
  { timestamps: true }
);

User.hasMany(BudgetExpenditure);
BudgetExpenditure.belongsTo(User);


export default BudgetExpenditure;