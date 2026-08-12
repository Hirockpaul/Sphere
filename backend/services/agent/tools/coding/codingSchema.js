import { z } from "zod";
import { CODING_INTENTS } from "./codingIntent.js";

const relativePath = z.string().trim().min(1).max(240).superRefine((path, context) => {
  const normalized = path.replaceAll("\\", "/");

  if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
    context.addIssue({ code: "custom", message: "File paths must be relative" });
  }

  if (normalized.split("/").includes("..")) {
    context.addIssue({ code: "custom", message: "File paths cannot traverse parent directories" });
  }
});

const unsafeCredential = /\b(?:api[_-]?key|secret|password|passwd|token)\b\s*[:=]\s*["'][^"'\n${][^"'\n]*["']/i;

export const normalizeCodingContent = (content) => {
  if (typeof content !== "string") {
    return content;
  }

  let normalized = content;
  const slashContinuedLines = normalized.match(/\\\r?\n/g)?.length || 0;

  if (normalized.startsWith('"') && normalized.endsWith('"')) {
    try {
      const decoded = JSON.parse(normalized);
      if (typeof decoded === "string") {
        normalized = decoded;
      }
    } catch {
      const escapedQuotes = normalized.match(/\\"/g)?.length || 0;
      if (slashContinuedLines >= 2 || (/[\r\n]/.test(normalized) && escapedQuotes >= 2)) {
        normalized = normalized.slice(1, -1).replaceAll('\\"', '"');
      }
    }
  }

  if (slashContinuedLines >= 2) {
    normalized = normalized
      .replace(/\\\r?\n/g, "\n")
      .replaceAll('\\"', '"');
  }

  if (!/[\r\n]/.test(normalized) && (normalized.includes("\\n") || normalized.includes("\\r\\n"))) {
    normalized = normalized
      .replaceAll("\\r\\n", "\n")
      .replaceAll("\\n", "\n")
      .replaceAll("\\t", "  ");
  }

  const providerMarkers = normalized.match(/">/g)?.length || 0;
  if (!/[\r\n]/.test(normalized) && providerMarkers >= 3) {
    normalized = normalized
      .replace(/([A-Za-z0-9.!?])">(?=\s*<)/g, "$1\n")
      .replace(/(?<=[>;{},/\])])">/g, "\n")
      .replace(/">(?=\s*">)/g, "\n")
      .replaceAll("\\\"", '"');
  }

  return normalized;
};

export const codingFileSchema = z.object({
  path: relativePath,
  language: z.string().trim().min(1).max(50),
  content: z.string().superRefine((content, context) => {
    if (/```/.test(content)) {
      context.addIssue({ code: "custom", message: "File content cannot contain Markdown fences" });
    }

    if (unsafeCredential.test(content)) {
      context.addIssue({ code: "custom", message: "File content appears to contain a hard-coded credential" });
    }
  }),
});

export const codingIssueSchema = z.object({
  severity: z.enum(["low", "medium", "high", "critical"]),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  line: z.number().int().positive().nullable().default(null),
});

// Gemini's response_schema rejects JSON Schema keywords such as
// `exclusiveMinimum`. Use this transport-only shape for fallback generation,
// then validate the result with the strict schema below.
export const codingFallbackResponseSchema = z.object({
  intent: z.enum(Object.values(CODING_INTENTS)),
  responseType: z.enum(["text", "code", "files", "review", "architecture"]),
  summary: z.string(),
  explanation: z.string().default(""),
  files: z.array(z.object({
    path: z.string(),
    language: z.string(),
    content: z.string(),
  })).default([]),
  issues: z.array(z.object({
    severity: z.enum(["low", "medium", "high", "critical"]),
    title: z.string(),
    description: z.string(),
    line: z.number().nullable().default(null),
  })).default([]),
  suggestions: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
});

export const codingResponseSchema = z.object({
  intent: z.enum(Object.values(CODING_INTENTS)),
  responseType: z.enum(["text", "code", "files", "review", "architecture"]),
  summary: z.string().trim().min(1),
  explanation: z.string().default(""),
  files: z.array(codingFileSchema).default([]),
  issues: z.array(codingIssueSchema).default([]),
  suggestions: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
}).superRefine((response, context) => {
  if (response.intent === CODING_INTENTS.GENERATE && response.responseType !== "files") {
    context.addIssue({
      code: "custom",
      path: ["responseType"],
      message: "Generation requests require the files response type",
    });
  }

  if (response.intent === CODING_INTENTS.REVIEW && response.responseType !== "review") {
    context.addIssue({ code: "custom", path: ["responseType"], message: "Reviews require the review response type" });
  }

  if (response.intent === CODING_INTENTS.ARCHITECTURE && response.responseType !== "architecture") {
    context.addIssue({
      code: "custom",
      path: ["responseType"],
      message: "Architecture requests require the architecture response type",
    });
  }

  const fileRequiredIntents = [
    CODING_INTENTS.GENERATE,
    CODING_INTENTS.REFACTOR,
    CODING_INTENTS.TEST,
  ];
  const requiresFiles = fileRequiredIntents.includes(response.intent);

  if (requiresFiles && response.files.length === 0) {
    context.addIssue({ code: "custom", path: ["files"], message: "This intent requires at least one generated file" });
  }
});

export const parseCodingResponse = (value) => {
  if (!value || typeof value !== "object" || !Array.isArray(value.files)) {
    return codingResponseSchema.parse(value);
  }

  const files = value.files.map((file) => {
    if (!file || typeof file !== "object") {
      return file;
    }

    return {
      ...file,
      content: normalizeCodingContent(file.content),
    };
  });
  const candidate = { ...value, files };

  return codingResponseSchema.parse(candidate);
};
