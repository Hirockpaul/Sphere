import Conversation from "../models/conversation-model.js";
import Message from "../models/message-model.js";
import {
    DEFAULT_CONVERSATION_TITLE,
    generateConversationTitle,
} from "../utils/conversation-title.js";
import { isTransientMongoError, withMongoRetry } from "../utils/mongoRetry.js";

export const createConversation = async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const requestedTitle = typeof req.body?.title === "string"
            ? req.body.title.trim()
            : typeof req.query.title === "string" ? req.query.title.trim() : "";
        const conversation = await Conversation.create({
            userId,
            title: requestedTitle.slice(0, 120) || DEFAULT_CONVERSATION_TITLE,
        });

        return res.status(201).json(conversation);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const deleteConversation = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const conversation = await Conversation.findOneAndDelete({
            _id: req.params.id,
            userId,
        });

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        await Message.deleteMany({ conversationId: conversation._id });
        return res.status(200).json({ message: "Conversation deleted" });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid conversation id" });
        }
        return res.status(500).json({ message: `delete conversation error: ${error.message}` });
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
            { returnDocument: "after", runValidators: true }
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
        const images = Array.isArray(req.body.images)
            ? req.body.images.filter((image) => typeof image === "string" && image.trim()).slice(0, 20)
            : [];
        const artifactInput = req.body.artifact;
        const artifactFiles = Array.isArray(artifactInput?.files)
            ? artifactInput.files.filter((file) =>
                typeof file?.path === "string" && file.path.trim()
                && typeof file?.content === "string"
            ).map((file) => ({
                path: file.path.trim(),
                language: typeof file.language === "string" ? file.language.trim() || "text" : "text",
                content: file.content,
            }))
            : [];
        const artifact = role === "assistant" && artifactFiles.length > 0
            ? {
                responseType: artifactInput.responseType === "code" ? "code" : "files",
                summary: typeof artifactInput.summary === "string" && artifactInput.summary.trim()
                    ? artifactInput.summary.trim().slice(0, 160)
                    : "Generated project",
                files: artifactFiles,
            }
            : undefined;
        const conversation = await withMongoRetry(() => Conversation.exists({ _id: conversationId, userId }));

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        const cleanContent = typeof content === "string" ? content.trim() : "";
        if (!["user", "assistant"].includes(role) || !cleanContent) {
            return res.status(400).json({ message: "A valid role and message content are required" });
        }

        const message = await withMongoRetry(() => Message.create({ conversationId, role, content: cleanContent, images, artifact }));
        const generatedTitle = role === "user" ? generateConversationTitle(cleanContent) : null;
        if (generatedTitle) {
            await withMongoRetry(() => Conversation.findOneAndUpdate(
                { _id: conversationId, userId, title: DEFAULT_CONVERSATION_TITLE },
                { title: generatedTitle, updatedAt: new Date() },
                { runValidators: true },
            ));
        }
        const updatedConversation = await withMongoRetry(() => Conversation.findByIdAndUpdate(
            conversationId,
            { updatedAt: new Date() },
            { returnDocument: "after" },
        ));

        return res.status(201).json({ message, conversation: updatedConversation });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid conversation id" });
        }
        if (isTransientMongoError(error)) {
            return res.status(503).json({ message: "MongoDB is temporarily unavailable. Please retry shortly." });
        }

        return res.status(500).json({ message: `save message error: ${error.message}` });
    }
}

export const updateMessage = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
        if (!content) return res.status(400).json({ message: "Message content is required" });

        const message = await Message.findById(req.params.id);
        if (!message || message.role !== "user") {
            return res.status(404).json({ message: "User message not found" });
        }
        const conversation = await Conversation.findOne({ _id: message.conversationId, userId });
        if (!conversation) return res.status(404).json({ message: "Conversation not found" });

        await Message.deleteMany({
            conversationId: message.conversationId,
            createdAt: { $gt: message.createdAt },
        });
        message.content = content;
        await message.save();
        conversation.updatedAt = new Date();
        await conversation.save();
        return res.status(200).json({ message, conversation });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "Invalid message id" });
        return res.status(500).json({ message: `update message error: ${error.message}` });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ message: "Message not found" });
        const conversation = await Conversation.findOne({ _id: message.conversationId, userId });
        if (!conversation) return res.status(404).json({ message: "Conversation not found" });
        await message.deleteOne();
        conversation.updatedAt = new Date();
        await conversation.save();
        return res.status(200).json({ message: "Message deleted" });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "Invalid message id" });
        return res.status(500).json({ message: `delete message error: ${error.message}` });
    }
};

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

export const getUserMemoryMessages = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const conversations = await Conversation.find({ userId }).select("_id").lean();
        const conversationIds = conversations.map(({ _id }) => _id);

        const messages = await Message.find({
            conversationId: { $in: conversationIds },
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

        return res.status(200).json(messages.reverse());
    } catch (error) {
        return res.status(500).json({ message: `get user memory error: ${error.message}` });
    }
};
