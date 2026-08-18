import axios from "axios";

import { getModel } from "../config/llmModel.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { uploadToS3 } from "../utils/uploadToS3.js";

const IMAGE_PROVIDER_URL = "https://image.pollinations.ai/prompt";
const IMAGE_REQUEST_TIMEOUT_MS = 120_000;
const SIGNED_URL_EXPIRATION_SECONDS =  24*60*60 ;

const IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const PROMPT_ENGINEER_INSTRUCTIONS = `
You are an expert AI image prompt engineer.

Convert the user's request into a detailed image-generation prompt. Preserve the
requested subjects and relationships exactly. Add professional composition,
coherent colors, appropriate lighting, sharp focus, realistic detail, and depth
of field when they suit the requested style. Do not force photorealism when the
user requests a logo, illustration, cartoon, or another non-photographic style.

Return only the enhanced image prompt.
`;

function readModelContent(content) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => part?.text || "")
    .join("")
    .trim();
}

async function enhanceImagePrompt(userPrompt, model) {
  const response = await model.invoke(
    `${PROMPT_ENGINEER_INSTRUCTIONS}\nUser request:\n${userPrompt}`,
  );

  return readModelContent(response.content) || userPrompt;
}

function getImageFormat(headers = {}) {
  const responseContentType = headers["content-type"] || "image/png";
  const contentType = responseContentType.split(";", 1)[0].toLowerCase();
  const extension = IMAGE_EXTENSIONS[contentType];

  if (!extension) {
    throw new Error("The image provider returned an unsupported image format");
  }

  return { contentType, extension };
}

export const visionAgent = async (state, dependencies = {}) => {
  const loadModel = dependencies.getModel || getModel;
  const httpClient = dependencies.httpClient || axios;
  const saveImage = dependencies.uploadToS3 || uploadToS3;
  const createDownloadUrl = dependencies.getFromS3 || getFromS3;

  const model = await loadModel("image");
  const imagePrompt = await enhanceImagePrompt(state.prompt, model);
  const providerUrl = `${IMAGE_PROVIDER_URL}/${encodeURIComponent(imagePrompt)}`;

  const imageResponse = await httpClient.get(providerUrl, {
    responseType: "arraybuffer",
    timeout: IMAGE_REQUEST_TIMEOUT_MS,
  });

  const { contentType, extension } = getImageFormat(imageResponse.headers);
  const imageBuffer = Buffer.from(imageResponse.data);
  const imageKey = `generated-images/image-${Date.now()}.${extension}`;

  await saveImage(imageKey, imageBuffer, contentType);

  const downloadUrl = await createDownloadUrl(
    imageKey,
    SIGNED_URL_EXPIRATION_SECONDS,
  );

  return {
    ...state,
    agent: "image",
    imageIntent: "generate_image",
    imagePrompt,
    images: [downloadUrl],
    aiResponse: "Image generated successfully.",
  };
};
