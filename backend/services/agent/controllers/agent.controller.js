import axios from "axios";
import { graph } from "../graph/graph.js";
import {
    addMessage,
    addUserMessages,
    clearMemory,
    clearUserMemory,
} from "../config/memory.js";

export const agent = async (req, res) => {
    try {


        const {
            prompt,
            conversationId,
            mode = "send",
            messageId,
            assistantMessageId,
            agent = req.body.agentMode || "auto",
        } = req.body
        const userId = req.headers["x-user-id"];
        const cleanPrompt = typeof prompt === "string" ? prompt.trim() : "";

        if (!cleanPrompt || !conversationId || !userId) {
            return res.status(400).json({ message: "Prompt and conversation are required" });
        }

        let userMessage;
        let conversation;
        if (mode === "edit") {
            if (!messageId) return res.status(400).json({ message: "A user message is required to edit" });
            const { data } = await axios.patch(`${process.env.CHAT_SERVICE}/messages/${messageId}`, {
                content: cleanPrompt,
            }, { headers: { "x-user-id": userId } });
            userMessage = data.message;
            conversation = data.conversation;
        } else if (mode === "regenerate") {
            if (!assistantMessageId) return res.status(400).json({ message: "An assistant message is required to regenerate" });
            await axios.delete(`${process.env.CHAT_SERVICE}/messages/${assistantMessageId}`, {
                headers: { "x-user-id": userId },
            });
        } else if (mode !== "retry") {
            const { data } = await axios.post(`${process.env.CHAT_SERVICE}/messages`, {
                conversationId, role: "user", content: cleanPrompt
            }, { headers: { "x-user-id": userId } });
            userMessage = data.message;
            conversation = data.conversation;
        }
        // The database was just mutated, so force the next memory read to refill
        // Redis with the authoritative conversation history.
        await clearMemory(conversationId);
        if (mode !== "send") await clearUserMemory(userId);
        const result = await graph.invoke({
            prompt: cleanPrompt,
            conversationId,
            userId,
            agent,
        })
        const response = result.aiResponse
        const images = Array.isArray(result.images) ? result.images : []
        const artifact = result.agent === "coding"
            && Array.isArray(result.codingResponse?.files)
            && result.codingResponse.files.length > 0
            ? {
                responseType: result.codingResponse.responseType,
                summary: result.codingResponse.summary,
                files: result.codingResponse.files,
            }
            : undefined

        if (typeof response !== "string" || !response.trim()) {
            throw new Error("The selected agent returned an empty response");
        }

        const { data: savedAssistant } = await axios.post(`${process.env.CHAT_SERVICE}/messages`, {
            conversationId, role: "assistant", content: response, images, artifact
        }, { headers: { "x-user-id": userId } })
        await addMessage(conversationId, "assistant", response)
        await addUserMessages(userId, conversationId, [
            { role: "user", content: cleanPrompt },
            { role: "assistant", content: response },
        ])
       return res.status(200).json({
           answer: response,
           response,
           images,
           agent: result.agent,
           ...(result.agent === "coding" ? {
               codingIntent: result.codingIntent,
               codingResponse: result.codingResponse,
           } : {}),
           userMessage,
           assistantMessage: savedAssistant.message,
           conversation: savedAssistant.conversation || conversation,
       });


    } catch (error) {
        const upstreamMessage = error.response?.data?.message || error.response?.data?.error;
        console.error("Agent request failed:", upstreamMessage || error.message);
        return res.status(error.response?.status || 500).json({
            message: upstreamMessage || error.message || "Unable to process the message",
        });
    }
}
