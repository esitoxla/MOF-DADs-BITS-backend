import dotenv from "dotenv";
dotenv.config();

export default {
  development: {
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASS || null,
    database: process.env.DB_NAME || "mof_db",
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
  },
  production: {
    username: process.env.DB_PROD_USER,
    password: process.env.DB_PROD_PASS,
    database: process.env.DB_PROD_NAME,
    host: process.env.DB_PROD_HOST,
    port: process.env.DB_PROD_PORT,
    dialect: "mysql",
  },
  production: {
    use_env_variable: "DATABASE_URL", 
    dialect: "mysql",
  },
};
