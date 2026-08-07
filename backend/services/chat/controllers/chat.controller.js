import Conversation from "../models/conversation-model.js";
import Message from "../models/message-model.js";

export const createConversation = async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const conversation = await Conversation.create({ userId });

        return res.status(201).json(conversation);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const getConversations = async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const conversations = await Conversation.find({ userId })
        .sort({ updatedAt: -1 });

        return res.status(200).json(conversations);
    } catch (error) {
        return res.status(500).json({ message: `get conversations error: ${error.message}` });
    }
}

export const updateConversations = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { id, title } = req.body;
        const trimmedTitle = typeof title === "string" ? title.trim() : "";

        if (!id || !trimmedTitle || trimmedTitle.length > 120) {
            return res.status(400).json({ message: "A valid conversation id and title up to 120 characters are required" });
        }

        const conversation = await Conversation.findOneAndUpdate(
            { _id: id, userId },
            { title: trimmedTitle },
            { new: true, runValidators: true }
        );

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        return res.status(200).json(conversation);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid conversation id" });
        }

        return res.status(500).json({ message: `update conversation error: ${error.message}` });
    }
}

export const saveMessage = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { conversationId, role, content } = req.body;
        const conversation = await Conversation.exists({ _id: conversationId, userId });

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        const message = await Message.create({ conversationId, role, content });
    
        return res.status(201).json(message);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid conversation id" });
        }

        return res.status(500).json({ message: `save message error: ${error.message}` });
    }
}

export const getMessages = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const conversationId = req.query.conversationId;
        const conversation = await Conversation.exists({ _id: conversationId, userId });

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        const messages = await Message.find({ conversationId })
        .sort({ createdAt: 1 });
        return res.status(200).json(messages);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid conversation id" });
        }

        return res.status(500).json({ message: `get messages error: ${error.message}` });
    }
}
