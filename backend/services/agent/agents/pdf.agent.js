import { getModel } from "../config/llmModel.js";
import { generatePdf } from "../tools/pdf/generatePdf.js";
import { createSafeFilename } from "../tools/pdf/createSafeFilename.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { z } from "zod";

export const pdfSchema = z.object({
  title: z.string().trim().min(1),
  subtitle: z.string(),
  sections: z.array(z.object({
    heading: z.string().trim().min(1),
    points: z.array(z.string().trim().min(1)).min(1),
  }).strict()).min(1),
}).strict();

const getTextContent = (content) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
};

export const parsePdfContent = (content) => {
  let json = getTextContent(content).trim();
  const fenced = json.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) json = fenced[1].trim();
  if (!json) throw new Error("PDF model returned an empty response.");
  return pdfSchema.parse(JSON.parse(json));
};

export const pdfAgent = async (params, dependencies = {}) => {
  try {
    const loadModel = dependencies.getModel || getModel;
    const renderPdf = dependencies.generatePdf || generatePdf;
    const savePdf = dependencies.uploadToS3 || uploadToS3;
    const createSignedUrl = dependencies.getFromS3 || getFromS3;
    const now = dependencies.now || Date.now;
    const llm = await loadModel("pdf");

    const prompt = `
You are Sphere's PDF content generation agent.

Your job is to create clear, well-structured content that will be rendered into a professional PDF.

IMPORTANT OUTPUT RULES:

- Return ONLY valid JSON.
- Do NOT return Markdown.
- Do NOT use code fences.
- Do NOT add explanations before or after the JSON.
- Do NOT include comments inside the JSON.
- Use double quotes for all JSON keys and string values.
- The response must be directly parseable using JSON.parse().

Use exactly this structure:

{
  "title": "Document title",
  "subtitle": "Short descriptive subtitle",
  "sections": [
    {
      "heading": "Section heading",
      "points": [
        "Point one",
        "Point two",
        "Point three"
      ]
    }
  ]
}

CONTENT RULES:

- Create 4 to 8 sections depending on topic complexity.
- Do not create unnecessary sections.
- Each section should contain 3 to 6 concise bullet points.
- Keep every bullet clear and informative.
- Avoid repeating information.
- Use simple, professional language.
- Maintain a logical flow.
- Make the content suitable for a professional PDF.
- Do not use Markdown formatting.
- Do not use emojis unless explicitly requested.
- Do not invent statistics, quotes, references, or unsupported claims.
- Explain technical topics progressively.
- Include examples when useful.
- Keep the document focused on the requested topic.

TITLE RULES:

- Create a concise and meaningful title.
- Create a short descriptive subtitle.
- Avoid generic titles such as "Document" or "Report" unless appropriate.

TOPIC:

${params.prompt}
`;

    const response = await llm.invoke(prompt);

    const data = parsePdfContent(response.content);
    const pdfBuffer = await renderPdf(data);
    const baseName = createSafeFilename(data.title);
    const filename = `${baseName}-${now()}.pdf`;
    const key = `generated-pdfs/${filename}`;

    await savePdf(
      key,
      pdfBuffer,
      "application/pdf"
    );

    // 24 hours
    const downloadUrl = await createSignedUrl(
      key,
      24 * 60 * 60,
      filename,
    );

    return {
      agent: "pdf",
      aiResponse: `Your PDF, **${data.title}**, is ready.`,
      pdfArtifact: {
        key,
        filename,
        title: data.title,
        downloadUrl,
      },
    };
  } catch (error) {
    console.error("PDF Agent error:", error);

    return {
      agent: "pdf",
      aiResponse:
        "Failed to generate the PDF. Please try again.",
    };
  }
};
