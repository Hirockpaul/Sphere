import express from "express";
import { agent, getPdfUrl, getPresentationUrl } from "../controllers/agent.controller.js";

const router = express.Router();

router.post("/chat", agent);
router.post("/pdf-url", getPdfUrl);
router.post("/presentation-url", getPresentationUrl);

export default router;
