import assert from "node:assert/strict";
import test from "node:test";

import { pdfAgent, parsePdfContent } from "../agents/pdf.agent.js";
import { pdfAgent as routedPdfAgent } from "../agents/pdf.agent.js";
import { agentNodes } from "../graph/graph.js";
import { createSafeFilename } from "../tools/pdf/createSafeFilename.js";

const validDocument = {
  title: "JavaScript Guide",
  subtitle: "A practical introduction",
  sections: [{ heading: "Foundations", points: ["Use const by default"] }],
};

test("the graph routes PDF requests to the existing PDF agent", () => {
  assert.equal(agentNodes.pdf, routedPdfAgent);
});

test("creates safe readable PDF base names", () => {
  const cases = [
    ["MongoDB vs MySQL: A Comparative Analysis", "mongodb-vs-mysql-a-comparative-analysis"],
    ["Introduction to JavaScript!", "introduction-to-javascript"],
    ["REST APIs & Authentication", "rest-apis-authentication"],
    ["  Backend Developer Roadmap  ", "backend-developer-roadmap"],
    ["###", "sphere-document"],
    ["", "sphere-document"],
    ["REST   APIs --- Authentication", "rest-apis-authentication"],
    ["Crème brûlée 日本語", "creme-brulee"],
    ["../secret", "secret"],
    ["..\\secret", "secret"],
  ];

  for (const [title, expected] of cases) {
    assert.equal(createSafeFilename(title), expected);
  }
});

test("limits safe base names and never leaves unsafe path characters", () => {
  const baseName = createSafeFilename(`${"very-long-title-".repeat(10)}ending`);
  assert.ok(baseName.length <= 80);
  assert.doesNotMatch(baseName, /[-/]$|[\\/\0-\x1f]|\.\./);
});

test("parses plain and accidentally fenced JSON through Zod", () => {
  assert.deepEqual(parsePdfContent(JSON.stringify(validDocument)), validDocument);
  assert.deepEqual(
    parsePdfContent(`\`\`\`json\n${JSON.stringify(validDocument)}\n\`\`\``),
    validDocument,
  );
});

test("rejects invalid structured content", () => {
  assert.throws(
    () => parsePdfContent(JSON.stringify({ ...validDocument, sections: [] })),
    (error) => error.name === "ZodError",
  );
});

test("validates, renders, uploads under generated-pdfs, and returns metadata", async () => {
  const uploads = [];
  const result = await pdfAgent({ prompt: "Create a JavaScript guide" }, {
    getModel: async (agent) => {
      assert.equal(agent, "pdf");
      return { invoke: async () => ({ content: JSON.stringify(validDocument) }) };
    },
    generatePdf: async (data) => {
      assert.deepEqual(data, validDocument);
      return Buffer.from("pdf");
    },
    uploadToS3: async (...args) => uploads.push(args),
    getFromS3: async (key) => `https://example.com/${key}`,
    now: () => 1234,
  });

  assert.deepEqual(uploads, [["generated-pdfs/javascript-guide-1234.pdf", Buffer.from("pdf"), "application/pdf"]]);
  assert.deepEqual(result.pdfArtifact, {
    key: "generated-pdfs/javascript-guide-1234.pdf",
    filename: "javascript-guide-1234.pdf",
    title: "JavaScript Guide",
    downloadUrl: "https://example.com/generated-pdfs/javascript-guide-1234.pdf",
  });
});

test("duplicate titles receive different readable filenames", async () => {
  let timestamp = 10;
  const dependencies = {
    getModel: async () => ({ invoke: async () => ({ content: JSON.stringify(validDocument) }) }),
    generatePdf: async () => Buffer.from("pdf"),
    uploadToS3: async () => {},
    getFromS3: async () => "https://example.com/pdf",
    now: () => timestamp++,
  };
  const first = await pdfAgent({ prompt: "guide" }, dependencies);
  const second = await pdfAgent({ prompt: "guide" }, dependencies);
  assert.equal(first.pdfArtifact.filename, "javascript-guide-10.pdf");
  assert.equal(second.pdfArtifact.filename, "javascript-guide-11.pdf");
});

test("does not render or upload malformed model output", async () => {
  let rendered = false;
  let uploaded = false;
  const result = await pdfAgent({ prompt: "Create a guide" }, {
    getModel: async () => ({ invoke: async () => ({ content: "not json" }) }),
    generatePdf: async () => { rendered = true; },
    uploadToS3: async () => { uploaded = true; },
  });

  assert.equal(rendered, false);
  assert.equal(uploaded, false);
  assert.equal(result.aiResponse, "Failed to generate the PDF. Please try again.");
  assert.equal(result.pdfArtifact, undefined);
});
