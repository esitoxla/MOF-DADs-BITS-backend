import { DataTypes } from "sequelize";
import User from "./users.js";
import sequelize from "../config/database.js";

const Reallocation = sequelize.define(
  "reallocation",
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
    organization: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
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
    appropriationBalance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
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
      type: DataTypes.INTEGER,
      allowNull: true, // or false if required
      references: {
        model: "Users", // table name (not model name)
        key: "id", //  foreign key column in Users table
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL", // or "CASCADE" if you want child rows deleted too
    },
    status: {
      type: DataTypes.ENUM("Pending", "Reviewed", "Approved"),
      defaultValue: "Pending",
      allowNull: false,
    },

    // Reviewer details
    reviewedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewComment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Approver details
    approvedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { timestamps: true ,
    tableName: "reallocation", 
    freezeTableName: true,
  },
);

User.hasMany(Reallocation);
Reallocation.belongsTo(User);

export default Reallocation;