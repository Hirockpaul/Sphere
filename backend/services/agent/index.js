import express from "express";
import { config as loadEnvironment } from "dotenv";
import { fileURLToPath } from "node:url";
import connectDb from "./config/db.js";
import { graph } from "./graph/graph.js";
import router from "./routers/agents.route.js";

const serviceDirectory = fileURLToPath(new URL(".", import.meta.url));
loadEnvironment({ path: `${serviceDirectory}.env` });
// Supply documented non-secret defaults without overriding real environment values.
loadEnvironment({ path: `${serviceDirectory}.env.example`, quiet: true });

const port = process.env.PORT || 8002;
console.info(`[Agent] Gemini model: ${process.env.GEMINI_MODEL || "gemini-3-flash-preview"}`);

const app = express();
app.use(express.json({ limit: "15mb" }));
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
      ...(result.agent === "coding" ? {
        codingIntent: result.codingIntent,
        codingResponse: result.codingResponse,
      } : {}),
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
