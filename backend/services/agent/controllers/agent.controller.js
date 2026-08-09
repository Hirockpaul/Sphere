import axios from "axios";
import { graph } from "../graph/graph.js";

export const agent = async (req, res) => {
    try {
        const { prompt, conversationId, mode = "send", messageId, assistantMessageId } = req.body
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
        const { data: history } = await axios.get(`${process.env.CHAT_SERVICE}/messages`, {
            params: { conversationId },
            headers: { "x-user-id": userId },
        });
        const result = await graph.invoke({
            prompt: cleanPrompt,
            conversationId,
            messages: history,
        })
        const response = result.aiResponse

        if (typeof response !== "string" || !response.trim()) {
            throw new Error("The selected agent returned an empty response");
        }

        const { data: savedAssistant } = await axios.post(`${process.env.CHAT_SERVICE}/messages`, {
            conversationId,role:"assistant",content:response
        }, { headers: { "x-user-id": userId } })
       return res.status(200).json({
           response,
           userMessage,
           assistantMessage: savedAssistant.message,
           conversation: savedAssistant.conversation || conversation,
       });


    } catch (error) {
        const upstreamMessage = error.response?.data?.message || error.response?.data?.error;
        console.error("Agent request failed:", upstreamMessage || error.message);
        return res.status(500).json({
            message: upstreamMessage || error.message || "Unable to process the message",
        });
    }
}
