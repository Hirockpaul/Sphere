import express from "express";
import { agent, getPdfUrl, getPresentationUrl } from "../controllers/agent.controller.js";
import multer from "../config/multer.js";

const router = express.Router();

router.post("/chat", multer.single("file"),agent);
router.post("/pdf-url", getPdfUrl);
router.post("/presentation-url", getPresentationUrl);

export default router;
