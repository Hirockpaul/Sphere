import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import connectDb from "./config/db.js";
import router from "./routes/auth.routes.js";

const port = process.env.PORT ;

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use("/",router);

app.listen(port, () => {
  console.log(`auth service is running on port ${port}`);
  connectDb();
});
