import { Sequelize } from "sequelize";

let sequelize;

if (process.env.DATABASE_URL) {
  // Railway / Production
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "mysql",
    logging: false,
  });
} else {
  // Local development
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      dialect: "mysql",
    }
  );
}

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("MySQL connected!");
  } catch (error) {
    console.error("Unable to connect to MySQL!", error);
  }
}

testConnection();

export default sequelize;
