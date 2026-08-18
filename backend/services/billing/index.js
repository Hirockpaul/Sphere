import express from "express";
import "dotenv/config";
import connectDb from "./config/db.js";

const port = process.env.PORT || 8003;

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello from billing" });
});

const startServer = async () => {
  await connectDb();

  app.listen(port, () => {
    console.log(`billing service is running on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error("Billing service failed to start:", error.message);
  process.exit(1);
});
