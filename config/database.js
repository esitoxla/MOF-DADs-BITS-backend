import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
  }
);

async function testConnection() {
    try {
        await sequelize.authenticate()
        console.log("mysql connected!")
    } catch (error) {
       console.error("Unable to connect to mysql!", error); 
    }
}

testConnection()

export default sequelize;