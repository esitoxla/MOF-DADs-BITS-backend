import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: "mysql",
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
);

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
