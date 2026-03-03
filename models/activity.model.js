import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./users.js";


  const Activity = sequelize.define(
    "Activity",
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      organization: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["name", "organization"],
        },
      ],
    },
  );

  

Activity.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Activity, { foreignKey: "userId" });

 export default Activity;



