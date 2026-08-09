import express from "express";
import dotenv from "dotenv";
import proxy from "express-http-proxy";
dotenv.config();
import cookieParser from "cookie-parser";
import cors from "cors";
const port = process.env.PORT || 8000;
import { protect } from "./middleware/auth.middleware.js";
import { getCurrentUser } from "./controllers/user.controller.js";
import { proxyWithHeader } from "./utils/proxyWithHeader.js";
import morgan from "morgan";
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(morgan("dev"))
app.use(cookieParser());
app.use("/auth", proxy(process.env.AUTH_SERVICE_URL));
app.use("/chat", protect, proxyWithHeader(process.env.CHAT_SERVICE_URL));
app.use("/agents", protect, proxyWithHeader(process.env.AGENTS_SERVICE_URL));
app.get("/me", protect, getCurrentUser);


app.listen(port, () => {
  console.log(`gateway is running on port ${port}`);
});
 
