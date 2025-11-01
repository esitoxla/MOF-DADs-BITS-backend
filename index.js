import express from "express";
import sequelize from "./config/database.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandling.js";
import authRoute from "./routes/auth.route.js"
import userRoute from "./routes/user.route.js"
import expenditureRoute from "./routes/expenditure.route.js"
import reportRoute from "./routes/report.route.js"

const PORT = process.env.PORT || 7005;

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:5173", "https://mof-dads-bits.netlify.app"],
    credentials: true
  })
);

app.use(cookieParser());

//routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/expense", expenditureRoute);
app.use("/api/reports", reportRoute);

//middleware
app.use(notFound);
app.use(errorHandler);



sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`App is listening on ${PORT}`);
  });
});
