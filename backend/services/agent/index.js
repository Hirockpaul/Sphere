import express from "express";
import "dotenv/config";
import connectDb from "./config/db.js";
import { graph } from "./graph/graph.js";
import router from "./routers/agents.route.js";


const port = process.env.PORT || 8002;

const app = express();
app.use(express.json());
app.use(router);


app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "agents" });
});

app.post("/", async (req, res, next) => {
  try {
    const prompt = req.body?.prompt;

    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "prompt must be a non-empty string" });
    }

    const result = await graph.invoke({ prompt: prompt.trim() });
    return res.status(200).json({
      agent: result.agent,
      response: result.aiResponse,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error("Agent request failed:", error);
  res.status(500).json({ error: "Unable to process the request" });
});

const startServer = async () => {
  await connectDb();

  app.listen(port, () => {
    console.log(`agents service is running on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error("Unable to start agents service:", error);
  process.exit(1);
});
