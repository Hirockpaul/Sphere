import { z } from "zod";
import { getModel } from "../config/llmModel.js";
import { generatePpt } from "../tools/ppt/generatePPt.js";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { createSafeFilename } from "../tools/pdf/createSafeFilename.js";
import { downloadPresentationImage, findImageKitAsset, generatePresentationImage } from "../providers/presentation-image.provider.js";
import { renderSlideHtml } from "../tools/ppt/renderSlideHtml.js";

const text = z.string().trim().min(1);
const points = z.array(text).min(1).max(8);
const visualSchema = z.discriminatedUnion("required", [
  z.object({ required: z.literal(false), type: z.enum(["diagram", "chart", "icon", "none"]).optional(), purpose: z.string().optional() }).strict(),
  z.object({ required: z.literal(true), type: z.enum(["photo", "illustration", "product", "background"]), purpose: text, placement: z.enum(["hero", "left", "right", "background", "card"]), aspectRatio: z.enum(["16:9", "4:3", "3:4", "1:1", "9:16"]), prompt: text, searchQuery: z.string().optional(), alt: text, url: z.string().url().optional(), path: z.string().optional() }).strict(),
]);
export const pptLayouts = ["hero", "image-left", "image-right", "full-bleed-image", "editorial", "big-number", "stat-grid", "three-cards", "four-cards", "comparison", "quote", "timeline", "process", "map", "gallery", "image-caption", "text-overlay", "split-content", "closing"];
const storyFields = {
  slideId: text.optional(),
  purpose: z.string().optional(),
  keyMessage: text.optional(), emotionalTone: text.optional(),
  density: z.string().optional(),
  layout: z.enum(pptLayouts).optional(),
  eyebrow: z.string().max(40).optional(), supportingText: z.string().max(280).optional(),
  visual: visualSchema.optional(),
};
const slide = (shape) => z.object({ ...shape, ...storyFields }).strip();
const base = { title: text };
const slideSchema = z.discriminatedUnion("type", [
  slide({ type: z.literal("cover"), title: text, subtitle: z.string() }),
  slide({ type: z.literal("content"), ...base, points }),
  slide({ type: z.literal("comparison"), ...base, left: z.object({ title: text, points }), right: z.object({ title: text, points }) }),
  slide({ type: z.literal("table"), ...base, columns: z.array(text).min(2).max(6), rows: z.array(z.array(z.string()).min(2).max(6)).min(1).max(7) }),
  slide({ type: z.literal("chart"), ...base, chartType: z.enum(["bar", "line", "pie", "doughnut", "scatter", "radar"]), description: z.string(), categories: z.array(text).min(1), series: z.array(z.object({ name: text, values: z.array(z.number()) })).min(1), unit: z.string() }),
  slide({ type: z.literal("kpi"), ...base, items: z.array(z.object({ value: text, label: text, description: z.string() })).min(2).max(4) }),
  slide({ type: z.literal("process"), ...base, steps: z.array(z.object({ number: z.number().int(), title: text, description: z.string() })).min(2).max(7) }),
  slide({ type: z.literal("timeline"), ...base, events: z.array(z.object({ date: text, title: text, description: z.string() })).min(2).max(7) }),
  slide({ type: z.literal("architecture"), ...base, layers: z.array(z.object({ title: text, components: z.array(text).min(1) })).min(2).max(6) }),
  slide({ type: z.literal("diagram"), ...base, nodes: z.array(z.object({ id: text, label: text, description: z.string() })).min(2).max(8), connections: z.array(z.object({ from: text, to: text, label: z.string() })).max(10) }),
  slide({ type: z.literal("image"), ...base, imageQuery: text, caption: z.string(), points: z.array(text).max(5) }),
  slide({ type: z.literal("code"), ...base, language: text, code: text, explanation: z.array(text).max(5) }),
  slide({ type: z.literal("quote"), ...base, quote: text, author: z.string() }),
  slide({ type: z.literal("pros_cons"), ...base, pros: points, cons: points }),
  slide({ type: z.literal("example"), ...base, problem: text, solution: text, result: text }),
  slide({ type: z.literal("highlight"), ...base, highlight: text, description: z.string() }),
  slide({ type: z.literal("takeaway"), ...base, points }),
]);

export const pptSchema = z.object({ title: text, subtitle: z.string(), theme: z.object({ style: text, primaryColor: z.string(), secondaryColor: z.string(), accentColor: z.string(), backgroundColor: z.string(), textColor: z.string() }).strip(), slides: z.array(slideSchema).min(3).max(12) }).strip().superRefine((data, context) => {
  if (data.slides[0]?.type !== "cover") context.addIssue({ code: "custom", path: ["slides", 0], message: "First slide must be a cover" });
  if (data.slides.at(-1)?.type !== "takeaway") context.addIssue({ code: "custom", path: ["slides", data.slides.length - 1], message: "Last slide must be a takeaway" });
  for (let index = 2; index < data.slides.length; index += 1) {
    const layouts = data.slides.slice(index - 2, index + 1).map((item) => item.layout).filter(Boolean);
    if (layouts.length === 3 && new Set(layouts).size === 1) context.addIssue({ code: "custom", path: ["slides", index, "layout"], message: "The same layout cannot be used more than twice in a row" });
  }
});

export const parsePptContent = (content) => {
  if (content && typeof content === "object" && !Array.isArray(content)) return pptSchema.parse(normalizePptData(content));
  const raw = typeof content === "string" ? content : Array.isArray(content) ? content.filter((part) => part?.type === "text").map((part) => part.text).join("\n") : "";
  const trimmed = raw.trim();
  if (!trimmed) throw new SyntaxError("The presentation model returned no JSON content");
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  let candidate = (fenced?.[1] || trimmed).trim();
  if (!candidate.startsWith("{")) {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) candidate = candidate.slice(start, end + 1);
  }
  return pptSchema.parse(normalizePptData(JSON.parse(candidate)));
};

const normalizePptData = (data) => ({
  ...data,
  slides: Array.isArray(data?.slides) ? data.slides.map((slideData) => ({
    ...slideData,
    ...(slideData?.type === "image" && slideData.imageQuery && typeof slideData.imageQuery !== "string"
      ? { imageQuery: slideData.imageQuery.query || slideData.imageQuery.prompt || JSON.stringify(slideData.imageQuery) }
      : {}),
  })) : data?.slides,
});

const validationSummary = (error) => {
  if (Array.isArray(error?.issues)) return error.issues.slice(0, 12).map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`).join("; ");
  return error instanceof SyntaxError ? error.message : "The response did not match the presentation schema";
};

const planPresentation = async (model, prompt) => {
  const first = await model.invoke(`${PRESENTATION_PROMPT}\n\nUSER TOPIC:\n${prompt}`);
  try {
    return parsePptContent(first.content);
  } catch (error) {
    console.warn("[PPT] Correcting invalid presentation plan", { reason: validationSummary(error) });
    const invalid = typeof first.content === "string" ? first.content : JSON.stringify(first.content);
    const corrected = await model.invoke(`Correct the presentation JSON below. Return only one complete valid JSON object, with no Markdown or explanation. Preserve the intended content. Fix this validation problem: ${validationSummary(error)}\n\nINVALID JSON:\n${invalid.slice(0, 50_000)}\n\nREQUIRED RULES:\nThe first slide must be type cover, the last type takeaway, and there must be 3-12 slides. A required visual must use type photo, illustration, product, or background and include purpose, placement, aspectRatio, prompt, and alt. A non-image visual must be {"required":false,"type":"none"}. Story fields purpose, keyMessage, emotionalTone, density, layout, eyebrow, and supportingText are allowed. Never use the same layout three times consecutively. Do not add other fields outside the documented structures. Ensure all strings are JSON escaped and the final object is closed.`);
    try {
      return parsePptContent(corrected.content);
    } catch (correctionError) {
      const failure = new Error(`Presentation planning failed after correction: ${validationSummary(correctionError)}`);
      failure.code = "PRESENTATION_PLAN_INVALID";
      failure.cause = correctionError;
      throw failure;
    }
  }
};

const PRESENTATION_PROMPT = `You are an expert AI presentation designer, visual storyteller, and information architect. Transform the user's topic into a professional presentation rendered with PptxGenJS.

Return only valid JSON without Markdown, code fences, comments, or explanations. Use 1 cover slide, 6-10 content slides according to topic complexity, and 1 final takeaway slide. Each slide communicates one clear idea. Avoid repeating information and generic bullet sequences.

Top-level structure: {"title":"","subtitle":"","theme":{"style":"modern","primaryColor":"","secondaryColor":"","accentColor":"","backgroundColor":"","textColor":""},"slides":[]}.

Allowed slide structures: cover {type,title,subtitle}; content {type,title,points}; comparison {type,title,left:{title,points},right:{title,points}}; table {type,title,columns,rows}; chart {type,title,chartType,description,categories,series:[{name,values}],unit}; kpi {type,title,items:[{value,label,description}]}; process {type,title,steps:[{number,title,description}]}; timeline {type,title,events:[{date,title,description}]}; architecture {type,title,layers:[{title,components}]}; diagram {type,title,nodes:[{id,label,description}],connections:[{from,to,label}]}; image {type,title,imageQuery,caption,points}; code {type,title,language,code,explanation}; quote {type,title,quote,author}; pros_cons {type,title,pros,cons}; example {type,title,problem,solution,result}; highlight {type,title,highlight,description}; takeaway {type,title,points}.

First plan the complete story internally: narrative arc, purpose, key message, emotional tone, visual opportunity, density, and layout of every slide. Then output only the final JSON. Every slide must include purpose, keyMessage, emotionalTone, density, and layout; eyebrow and supportingText are optional. Supported layouts: hero, image-left, image-right, full-bleed-image, editorial, big-number, stat-grid, three-cards, four-cards, comparison, quote, timeline, process, map, gallery, image-caption, text-overlay, split-content, closing. Never use one layout more than twice consecutively. Use hero or full-bleed-image for the cover and closing for the takeaway.

Use comparisons, tables, editable charts, processes, timelines, and architecture/diagram structures when they fit. Never invent statistics, quotes, authors, or evidence. Keep titles to 3-8 words and points to 5-15 words. Keep every slide below 80 words and hero slides near 20-40 words. Most slides should use zero to two points: prefer one statement, one statistic, a quote, three key ideas, a comparison, or a short paragraph. Use a consistent premium editorial system: near-black #0B0B0B background, #F5F5F5 text, #A3A3A3 muted text, warm-gold #D4AF37 accents, large Georgia-style serif display headings, clean sans-serif support, generous whitespace, thin rules, and asymmetric composition. Avoid dashboards, admin panels, repetitive cards, centered-everything layouts, gradients, shadows, and title-plus-three-bullets repetition. Every slide needs one primary focal element, one secondary element, and limited supporting detail. Vary density and layout across the deck.

Images are selective storytelling tools, not a default. Across a typical 10-slide deck, target 2-4 AI-generated images and never request more than 4. Prefer editable diagrams, charts, timelines, comparison layouts, typography, lines, icons, and shapes for the remaining slides. Use {"required":false,"type":"none"} when an image would not materially improve the slide. Never request raster images for charts, tables, timelines, architecture, diagrams, or code. When useful, use {"required":true,"type":"photo|illustration|product|background","purpose":"...","placement":"hero|left|right|background|card","aspectRatio":"16:9","prompt":"...","searchQuery":"...","alt":"..."}. Return prompt, search query, placement, and alt text only; never invent an image URL or filename. The application resolves the URL. Prompts must describe realistic cinematic editorial photography, subject and environment, viewpoint, dramatic warm practical light, deep shadows, meaningful composition, focal placement matching the selected layout, intentional negative space for typography, restrained charcoal and gold direction, aspect ratio, and these negative constraints: no text, logos, watermarks, duplicated objects, or anatomical distortion.`;

const createFallbackPresentation = (prompt) => {
  const topic = prompt.replace(/\s+/g, " ").trim().slice(0, 90);
  return {
    title: topic,
    subtitle: "An editorial perspective",
    theme: { style: "premium-editorial", primaryColor: "D4AF37", secondaryColor: "A3A3A3", accentColor: "D4AF37", backgroundColor: "0B0B0B", textColor: "F5F5F5" },
    slides: [
      { type: "cover", title: topic, subtitle: "A focused visual narrative", purpose: "Opening perspective", keyMessage: topic, emotionalTone: "confident", density: "very-low", layout: "hero", visual: { required: false, type: "none" } },
      { type: "content", title: "Why It Matters", points: ["The context shaping this conversation", "The opportunity hidden inside the change"], purpose: "Context", keyMessage: "See the larger shift", emotionalTone: "thoughtful", density: "low", layout: "editorial", visual: { required: false, type: "none" } },
      { type: "process", title: "A Clear Way Forward", steps: [{ number: 1, title: "Understand", description: "Define the essential challenge" }, { number: 2, title: "Focus", description: "Choose the highest-value direction" }, { number: 3, title: "Act", description: "Turn intent into momentum" }], purpose: "Process", keyMessage: "Clarity creates momentum", emotionalTone: "practical", density: "medium", layout: "process", visual: { required: false, type: "none" } },
      { type: "comparison", title: "From Noise to Signal", left: { title: "Without Focus", points: ["Scattered priorities", "Unclear outcomes"] }, right: { title: "With Focus", points: ["Shared direction", "Measurable progress"] }, purpose: "Comparison", keyMessage: "Focus changes the outcome", emotionalTone: "decisive", density: "medium", layout: "comparison", visual: { required: false, type: "none" } },
      { type: "takeaway", title: "The Essential Takeaway", points: ["Start with clarity, then build with intention"], purpose: "Closing statement", keyMessage: "Make the next move intentional", emotionalTone: "inspiring", density: "very-low", layout: "closing", visual: { required: false, type: "none" } },
    ],
  };
};

export const generateSlideVisuals = async (data, presentationId, dependencies = {}) => {
  const imageGenerator = dependencies.generatePresentationImage || generatePresentationImage;
  const imageDownloader = dependencies.downloadPresentationImage || downloadPresentationImage;
  const imageFinder = dependencies.findPresentationImage || ((options) => findImageKitAsset(options, dependencies));
  const usedAssetUrls = new Set();
  let assetSearch = Promise.resolve();
  const findDistinctAsset = (options) => {
    const result = assetSearch.then(async () => {
      const found = await imageFinder({ ...options, excludeUrls: [...usedAssetUrls] });
      if (found?.url) usedAssetUrls.add(found.url);
      return found;
    });
    assetSearch = result.catch(() => undefined);
    return result;
  };
  const slides = new Array(data.slides.length);
  let nextIndex = 0;
  const processSlide = async (source, index) => {
    const slideId = source.slideId || `slide-${index + 1}`;
    const current = { ...source, slideId };
    if (!source.visual?.required) return { ...current, html: renderSlideHtml(current) };
    try {
      const found = await findDistinctAsset({ query: source.visual.searchQuery || source.visual.prompt, aspectRatio: source.visual.aspectRatio, presentationId, slideId });
      const generated = found?.url
        ? await imageDownloader(found.url, { aspectRatio: source.visual.aspectRatio })
        : await imageGenerator({ prompt: source.visual.prompt, aspectRatio: source.visual.aspectRatio, presentationId, slideId });
      const enriched = { ...current, visual: { ...source.visual, url: generated.url, path: generated.path }, imageData: generated.data };
      return { ...enriched, html: renderSlideHtml(enriched) };
    } catch (error) {
      console.error("[PPT] Optional visual generation failed", { slide: index + 1, code: error.code || "IMAGE_GENERATION_FAILED", message: error.message });
      const fallback = { ...current, visual: { required: false, type: "none", purpose: source.visual.purpose } };
      return { ...fallback, html: renderSlideHtml(fallback) };
    }
  };
  const worker = async () => {
    while (nextIndex < data.slides.length) {
      const index = nextIndex++;
      slides[index] = await processSlide(data.slides[index], index);
    }
  };
  const maxConcurrency = Math.max(1, Math.min(2, dependencies.maxConcurrentImageGenerations ?? 1));
  await Promise.all(Array.from({ length: Math.min(maxConcurrency, data.slides.length) }, worker));
  return slides;
};

export const pptAgent = async (state, dependencies = {}) => {
  const prompt = typeof state?.prompt === "string" ? state.prompt.trim() : "";
  if (!prompt) return { agent: "ppt", aiResponse: "Please provide a topic for the presentation." };
  try {
    console.info("[PPT] Planning presentation");
    const modelFactory = dependencies.getModel || getModel;
    const model = await modelFactory("ppt");
    let data;
    try {
      data = await planPresentation(model, prompt);
    } catch (primaryError) {
      console.warn("[PPT] Primary planner failed; trying fallback model", { code: primaryError.code || primaryError.status || "PLANNER_FAILED", message: primaryError.message });
      try {
        const fallbackModel = await modelFactory("search");
        data = await planPresentation(fallbackModel, prompt);
      } catch (fallbackError) {
        console.warn("[PPT] External planners failed; using local editorial fallback", { code: fallbackError.code || fallbackError.status || "PLANNER_FAILED", message: fallbackError.message });
        data = createFallbackPresentation(prompt);
      }
    }
    const timestamp = (dependencies.now || Date.now)();
    const presentationId = `${createSafeFilename(data.title)}-${timestamp}`;
    const slides = await generateSlideVisuals(data, presentationId, dependencies);
    console.info("[PPT] Exporting PPTX");
    const presentation = await (dependencies.generatePpt || generatePpt)({ ...data, slides });
    const buffer = await presentation.write({ outputType: "nodebuffer" });
    const filename = `${presentationId}.pptx`;
    const key = `generated-presentations/${filename}`;
    await (dependencies.uploadToS3 || uploadToS3)(key, buffer, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    const downloadUrl = await (dependencies.getFromS3 || getFromS3)(key, 24 * 60 * 60, filename, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    const metadata = slides.map(({ imageData, ...item }) => item);
    return { agent: "ppt", aiResponse: `Your presentation, **${data.title}**, is ready.`, presentationArtifact: { key, filename, title: data.title, downloadUrl, slides: metadata } };
  } catch (error) {
    console.error("PPT Agent error:", error);
    const quotaExceeded = error?.status === 429 || error?.name === "RateLimitQuotaExhaustedError" || /quota|rate limit|429/i.test(error?.message || "");
    return { agent: "ppt", aiResponse: quotaExceeded
      ? "Presentation generation is temporarily unavailable because the Gemini API quota has been reached. Please retry after the quota resets or update the Gemini API billing/quota."
      : "Failed to generate the presentation. Please try again." };
  }
};
