import express from "express";
import { agent, getPdfUrl, getPresentationUrl } from "../controllers/agent.controller.js";
import multer from "../config/multer.js";
import { agentRateLimit } from "../middleware/agentRateLimit.js";

const router = express.Router();

router.post("/chat", multer.single("file"), agentRateLimit, agent);
router.post("/pdf-url", getPdfUrl);
router.post("/presentation-url", getPresentationUrl);

export default router;
