import express from "express";
import "dotenv/config";
import connectDb from "./config/db.js";

const port = process.env.PORT || 8002;

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "chat" });
});

const startServer = async () => {
  await connectDb();

  app.listen(port, () => {
    console.log(`chat service is running on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error("Unable to start chat service:", error);
  process.exit(1);
});
