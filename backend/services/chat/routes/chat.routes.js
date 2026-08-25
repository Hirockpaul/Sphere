import express from "express";
import {
  createConversation,
  deleteMessage,
  deleteConversation,
  getConversations,
  getMessages,
  getUserMemoryMessages,
  saveMessage,
  updateMessage,
  updateConversations,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/create-conversations", createConversation);
router.post("/conversations", createConversation);
router.get("/get-conversations", getConversations);
router.post("/update-conversations", updateConversations);
router.patch("/conversations", updateConversations);
router.delete("/conversations/:id", deleteConversation);
router.post("/messages", saveMessage);
router.get("/messages", getMessages);
router.get("/memory/messages", getUserMemoryMessages);
router.patch("/messages/:id", updateMessage);
router.delete("/messages/:id", deleteMessage);

export default router;
