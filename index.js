import express from "express";
import sequelize from "./config/database.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandling.js";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import expenditureRoute from "./routes/expenditure.route.js";
import reportRoute from "./routes/report.route.js";
import revenueRoute from "./routes/revenue.route.js";
import revenueReportRoute from "./routes/revenueReport.route.js";
import loadedDataRoute from "./routes/loadedData.route.js";
import budgetRoute from "./routes/budget.route.js";

const PORT = process.env.PORT || 7005;

const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: ["http://localhost:5173", "https://mof-dads-bits.netlify.app"],
    credentials: true,
  })
);


app.use(cookieParser());

//routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/expense", expenditureRoute);
app.use("/api/reports", reportRoute);
app.use("/api/revenue", revenueRoute);
app.use("/api/revenueReport", revenueReportRoute);
app.use("/api/loadedData", loadedDataRoute);
app.use("/api/budget", budgetRoute);

//middleware
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    //Test the connection by trying to authenticate, Confirms the database is reachable and credentials are correct
    await sequelize.authenticate();
    console.log("Database connected");

    app.listen(PORT, () => {
      console.log(`App is listening on ${PORT}`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    //The process never exits silently
    process.exist(1);
  }
};

startServer();
