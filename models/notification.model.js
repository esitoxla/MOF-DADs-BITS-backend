import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Notification = sequelize.define(
  "Notification",
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

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },

    actorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },

    entityType: {
      type: DataTypes.ENUM("revenue", "cash", "expenditure", "reallocation"),
      allowNull: false,
    },

    entityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    event: {
      type: DataTypes.ENUM("created", "reviewed"),
      allowNull: false,
    },

    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
  },
);

export default Notification;
