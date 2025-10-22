import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import bcrypt from "bcrypt"

const User = sequelize.define(
  "users",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    role: {
      type: DataTypes.ENUM("admin", "accountant", "employee"),
      defaultValue: "employee",
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "suspended"),
      defaultValue: "active",
    },
    organization: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    designation: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastLogin: {
      type: DataTypes.DATE,
    },
  },
  {
    timestamps: true,
    //scopes are a sequelize feature which controls which columns (fields) are included or excluded automatically when you query your model.

    //Whenever you query the User model normally (e.g., User.findAll() or User.findOne()), // Sequelize will automatically exclude the password field from the results.
    defaultScope: {
      attributes: { exclude: ["password"] },
    },
    //This defines a special override scope you can activate when you do want to include the password field
    scopes: {
      withPassword: { attributes: {} },
    },
    hooks: {
      // Hash password before saving a new user
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
      // Hash password before updating if it was changed
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
    },
  }
);

//Instance method to compare passwords
User.prototype.comparePassword = function (passwordFromUser) {
  return bcrypt.compare(passwordFromUser, this.password);
};

export default User;