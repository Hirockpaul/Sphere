import express from "express";
import {
  createConversation,
  getConversations,
  getMessages,
  saveMessage,
  updateConversations,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/create-conversations", createConversation);
router.get("/get-conversations", getConversations);
router.post("/update-conversations", getConversations);
router.patch("/conversations", updateConversations);
router.post("/messages", saveMessage);
router.get("/messages", getMessages);

export default router;
