import axios from "axios";
import { graph } from "../graph/graph.js";
import {
    addMessage,
    addUserMessages,
    clearMemory,
    clearUserMemory,
} from "../config/memory.js";
import { getFromS3 } from "../utils/getFromS3.js";

export const agent = async (req, res) => {
    try {


        const {
            prompt,
            conversationId,
            mode = "send",
            messageId,
            assistantMessageId,
            agent = req.body.agentMode || "auto",
            sourceImage,
        } = req.body
        const userId = req.headers["x-user-id"];
        const cleanPrompt = typeof prompt === "string" ? prompt.trim() : "";

        if (!cleanPrompt || !conversationId || !userId) {
            return res.status(400).json({ message: "Prompt and conversation are required" });
        }
        let validatedSourceImage;
        if (sourceImage != null) {
            if (!/^image\/(png|jpeg|webp)$/.test(sourceImage?.mimeType || "") || typeof sourceImage?.data !== "string" || sourceImage.data.length > 14_000_000) return res.status(400).json({ message: "Attach a valid PNG, JPEG, or WebP image up to 10 MB" });
            validatedSourceImage = { mimeType: sourceImage.mimeType, data: sourceImage.data };
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
            sourceImage: validatedSourceImage,
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
        const pdf = result.agent === "pdf" && result.pdfArtifact?.key
            ? {
                key: result.pdfArtifact.key,
                filename: result.pdfArtifact.filename,
                title: result.pdfArtifact.title,
            }
            : undefined
        const presentation = result.agent === "ppt" && result.presentationArtifact?.key
            ? {
                key: result.presentationArtifact.key,
                filename: result.presentationArtifact.filename,
                title: result.presentationArtifact.title,
                slides: result.presentationArtifact.slides,
            }
            : undefined

        if (typeof response !== "string" || !response.trim()) {
            throw new Error("The selected agent returned an empty response");
        }

        const { data: savedAssistant } = await axios.post(`${process.env.CHAT_SERVICE}/messages`, {
            conversationId, role: "assistant", content: response, images, artifact, pdf, presentation
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
           ...(result.agent === "image" ? { image: { intent: result.imageIntent } } : {}),
           ...(result.agent === "coding" ? {
               codingIntent: result.codingIntent,
               codingResponse: result.codingResponse,
           } : {}),
           ...(result.agent === "pdf" && result.pdfArtifact ? { pdf: result.pdfArtifact } : {}),
           ...(result.agent === "ppt" && result.presentationArtifact ? { presentation: result.presentationArtifact } : {}),
           userMessage,
           assistantMessage: result.pdfArtifact?.downloadUrl
               ? { ...savedAssistant.message, pdf: { ...pdf, downloadUrl: result.pdfArtifact.downloadUrl } }
               : result.presentationArtifact?.downloadUrl
                   ? { ...savedAssistant.message, presentation: { ...presentation, downloadUrl: result.presentationArtifact.downloadUrl } }
               : savedAssistant.message,
           conversation: savedAssistant.conversation || conversation,
       });


    } catch (error) {
        const upstreamMessage = error.response?.data?.message || error.response?.data?.error;
        console.error("Agent request failed:", upstreamMessage || error.message);
        return res.status(error.status || error.response?.status || 500).json({
            message: upstreamMessage || error.message || "Unable to process the message",
        });
    }
}

export const getPdfUrl = async (req, res) => {
    const key = typeof req.body?.key === "string" ? req.body.key.trim() : "";
    const filename = typeof req.body?.filename === "string" ? req.body.filename.trim() : "";
    const shouldDownload = req.body?.disposition !== "inline";
    if (!key.startsWith("generated-pdfs/") || key.includes("..")) {
        return res.status(400).json({ message: "A valid PDF object key is required" });
    }
    try {
        const safeFilename = shouldDownload && /^[a-z0-9][a-z0-9-]*\.pdf$/.test(filename)
            ? filename
            : undefined;
        const downloadUrl = await getFromS3(key, 24 * 60 * 60, safeFilename);
        return res.status(200).json({ downloadUrl });
    } catch (error) {
        console.error("PDF URL generation failed:", error);
        return res.status(500).json({ message: "Unable to create a PDF download link" });
    }
};

export const getPresentationUrl = async (req, res) => {
    const key = typeof req.body?.key === "string" ? req.body.key.trim() : "";
    const filename = typeof req.body?.filename === "string" ? req.body.filename.trim() : "";
    if (!key.startsWith("generated-presentations/") || key.includes("..")) {
        return res.status(400).json({ message: "A valid presentation object key is required" });
    }
    try {
        const safeFilename = /^[a-z0-9][a-z0-9-]*\.pptx$/.test(filename) ? filename : undefined;
        const downloadUrl = await getFromS3(key, 24 * 60 * 60, safeFilename, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        return res.status(200).json({ downloadUrl });
    } catch (error) {
        console.error("Presentation URL generation failed:", error);
        return res.status(500).json({ message: "Unable to create a presentation download link" });
    }
};
