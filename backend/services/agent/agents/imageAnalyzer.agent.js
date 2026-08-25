import { readFile } from "node:fs/promises";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModel } from "../config/llmModel.js";

const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function getTextContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => part?.text || "").join("\n");
}

export const imageAnalyzer = async (state, dependencies = {}) => {
  if (!state.file || !SUPPORTED_IMAGE_TYPES.has(state.file.mimetype)) {
    throw new Error("Image Analyzer requires a PNG, JPEG, or WebP image");
  }

  const imageBuffer = await (dependencies.readFile || readFile)(state.file.path);
  const model = await (dependencies.getModel || getModel)("imageAnalyzer");
  const response = await model.invoke([
    new SystemMessage(`You are Sphere's image analysis agent.
Analyze only the uploaded image and answer the user's question accurately.
Extract visible text when relevant. Explain charts and tables when relevant.
If something is unclear or not visible, say so. Do not invent details.`),
    new HumanMessage({
      content: [
        { type: "text", text: state.prompt },
        {
          type: "image_url",
          image_url: `data:${state.file.mimetype};base64,${imageBuffer.toString("base64")}`,
        },
      ],
    }),
  ]);

  const answer = getTextContent(response.content).trim();
  if (!answer) throw new Error("The image analyzer returned an empty response");
  return { agent: "imageAnalyzer", aiResponse: answer };
};
