 import assert from "node:assert/strict";
import test from "node:test";
import {
  generateSlideVisuals,
  parsePptContent,
  pptAgent,
} from "../agents/ppt.agent.js";
import { agentNodes } from "../graph/graph.js";
import { generatePpt } from "../tools/ppt/generatePPt.js";
import {
  applyImageKitTransform,
  createImageKitGenerationUrl,
  downloadPresentationImage,
  findImageKitAsset,
  generatePresentationImage,
  MAX_WAIT_MS,
  POLL_INTERVAL_MS,
} from "../providers/presentation-image.provider.js";
import { renderSlideHtml } from "../tools/ppt/renderSlideHtml.js";

const presentationData = {
  title: "API Architecture",
  subtitle: "How requests move through a modern system",
  theme: {
    style: "modern",
    primaryColor: "4F46E5",
    secondaryColor: "7C3AED",
    accentColor: "2563EB",
    backgroundColor: "F8FAFC",
    textColor: "0F172A",
  },
  slides: [
    { type: "cover", title: "API Architecture", subtitle: "A visual system guide" },
    {
      type: "architecture",
      title: "Request Flow",
      layers: [
        { title: "Client", components: ["Web app"] },
        { title: "Services", components: ["API", "Database"] },
      ],
    },
    {
      type: "comparison",
      title: "Design Choices",
      left: { title: "REST", points: ["Resource oriented", "HTTP semantics"] },
      right: { title: "GraphQL", points: ["Query oriented", "Typed schema"] },
    },
    {
      type: "takeaway",
      title: "Key Takeaways",
      points: ["Keep boundaries explicit", "Measure before optimizing"],
    },
  ],
};

const imageKitEnvironment = {
  IMAGEKIT_ID: "sphere",
  IMAGEKIT_URL_ENDPOINT: "https://ik.imagekit.io/sphere",
  IMAGEKIT_PRIVATE_KEY: "test-only",
};

const requiredVisual = {
  required: true,
  type: "photo",
  purpose: "Context",
  placement: "right",
  aspectRatio: "16:9",
  prompt: "Person on the right / no text?",
  alt: "A person at work",
};

const successfulAgentDependencies = (overrides = {}) => ({
  getModel: async () => ({
    invoke: async () => ({ content: JSON.stringify(presentationData) }),
  }),
  generatePpt: async () => ({
    write: async () => Buffer.from("pptx"),
  }),
  uploadToS3: async () => {},
  getFromS3: async () => "https://example.com/presentation",
  now: () => 42,
  ...overrides,
});

const jpegResponse = (bytes = [1, 2, 3]) => new Response(
  Uint8Array.from(bytes),
  { status: 200, headers: { "content-type": "image/jpeg" } },
);

const pendingImageResponse = () => new Response("preparing", {
  status: 200,
  headers: {
    "content-type": "text/html",
    "is-intermediate-response": "true",
  },
});

test("routes PPT requests to the PPT agent", () => {
  assert.equal(agentNodes.ppt, pptAgent);
});

test("validates presentation JSON and accidental fences", () => {
  assert.deepEqual(parsePptContent(JSON.stringify(presentationData)), presentationData);
  assert.deepEqual(parsePptContent(structuredClone(presentationData)), presentationData);
  assert.deepEqual(parsePptContent(`\`\`\`json\n${JSON.stringify(presentationData)}\n\`\`\``), presentationData);
  assert.deepEqual(parsePptContent(`Here is the JSON:\n\`\`\`json\n${JSON.stringify(presentationData)}\n\`\`\`\nDone.`), presentationData);
});
test("normalizes harmless planner metadata without requesting correction", () => {
  const noisy = structuredClone(presentationData);
  noisy.theme.primaryColor = "";
  noisy.slides[0].purpose = "opening overview";
  noisy.slides[0].density = "minimal and cinematic";
  noisy.slides[0].image = { query: "ignored legacy field" };
  const imageSlide = {
    type: "image",
    title: "API Connections",
    imageQuery: { prompt: "connected services" },
    caption: "Systems communicating",
    points: [],
    purpose: "visual explanation",
    density: "low density",
  };
  noisy.slides.splice(2, 0, imageSlide);
  const parsed = parsePptContent(JSON.stringify(noisy));
  assert.equal(parsed.theme.primaryColor, "");
  assert.equal(parsed.slides[0].purpose, "opening overview");
  assert.equal(parsed.slides[0].image, undefined);
  assert.equal(parsed.slides[2].imageQuery, "connected services");
});
test("uses one valid JSON planning request without a correction call", async () => {
  let invocations = 0;
  const dependencies = successfulAgentDependencies({
    getModel: async () => ({
      invoke: async () => {
        invocations += 1;
        return { content: JSON.stringify(presentationData) };
      },
    }),
  });
  const result = await pptAgent({ prompt: "Explain APIs" }, dependencies);
  assert.equal(invocations, 1);
  assert.equal(result.presentationArtifact.title, presentationData.title);
});
test("renders presentation data to a PPTX buffer", async () => {
  const ppt = await generatePpt(presentationData);
  const buffer = await ppt.write({ outputType: "nodebuffer" });
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 1000);
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
});
test("uploads readable presentation metadata under generated-presentations", async () => {
  const uploads = [];
  const dependencies = successfulAgentDependencies({
    getModel: async (name) => {
      assert.equal(name, "ppt");
      return {
        invoke: async () => ({ content: JSON.stringify(presentationData) }),
      };
    },
    uploadToS3: async (...args) => uploads.push(args),
  });
  const result = await pptAgent({ prompt: "Explain APIs" }, dependencies);
  assert.equal(uploads[0][0], "generated-presentations/api-architecture-42.pptx");
  assert.equal(result.presentationArtifact.filename, "api-architecture-42.pptx");
  assert.equal(result.agent, "ppt");
});

test("asks Gemini once to correct invalid presentation JSON", async () => {
  let calls = 0;
  const dependencies = successfulAgentDependencies({
    getModel: async () => ({
      invoke: async () => {
        calls += 1;
        return {
          content: calls === 1 ? "not json" : JSON.stringify(presentationData),
        };
      },
    }),
  });
  const result = await pptAgent({ prompt: "Explain APIs" }, dependencies);
  assert.equal(calls, 2);
  assert.equal(result.presentationArtifact.title, presentationData.title);
});

test("exports a local editorial fallback when both planning providers fail", async () => {
  const quotaError = Object.assign(
    new Error("429 Too Many Requests: quota exceeded"),
    { status: 429, name: "RateLimitQuotaExhaustedError" },
  );
  const dependencies = successfulAgentDependencies({
    getModel: async () => ({
      invoke: async () => {
        throw quotaError;
      },
    }),
  });
  const result = await pptAgent({ prompt: "Explain APIs" }, dependencies);
  assert.match(result.aiResponse, /is ready/i);
  assert.equal(result.presentationArtifact.slides.length, 5);
  assert.deepEqual(
    result.presentationArtifact.slides.map((slide) => slide.layout),
    ["hero", "editorial", "process", "comparison", "closing"],
  );
});

test("falls back to Groq planning when the primary PPT model fails", async () => {
  const requestedModels = [];
  const dependencies = successfulAgentDependencies({
    getModel: async (name) => {
      requestedModels.push(name);
      if (name === "ppt") {
        return {
          invoke: async () => {
            throw Object.assign(new Error("quota exceeded"), { status: 429 });
          },
        };
      }
      return {
        invoke: async () => ({ content: JSON.stringify(presentationData) }),
      };
    },
  });
  const result = await pptAgent({ prompt: "Explain APIs" }, dependencies);
  assert.deepEqual(requestedModels, ["ppt", "search"]);
  assert.equal(result.presentationArtifact.title, presentationData.title);
});

test("validates optional visual plans without breaking legacy slides", () => {
  const current = structuredClone(presentationData);
  current.slides[0].visual = requiredVisual;
  assert.equal(parsePptContent(JSON.stringify(current)).slides[0].visual.type, "photo");
  assert.equal(parsePptContent(JSON.stringify(presentationData)).slides[0].visual, undefined);
});

test("validates story layouts and rejects three identical consecutive layouts", () => {
  const varied = structuredClone(presentationData);
  varied.slides[0].layout = "hero";
  varied.slides[1].layout = "editorial";
  varied.slides[2].layout = "comparison";
  varied.slides[3].layout = "closing";
  const parsedLayouts = parsePptContent(JSON.stringify(varied)).slides
    .map((slide) => slide.layout);
  assert.deepEqual(parsedLayouts, ["hero", "editorial", "comparison", "closing"]);
  varied.slides[0].layout = varied.slides[1].layout = varied.slides[2].layout = "editorial";
  assert.throws(() => parsePptContent(JSON.stringify(varied)), /same layout cannot be used more than twice/i);
});

test("HTML templates expose distinct layouts and strong hierarchy", () => {
  const editorial = renderSlideHtml({
    type: "content",
    title: "Old title",
    keyMessage: "Giants shape the savanna",
    purpose: "image-story",
    density: "low",
    layout: "editorial",
    supportingText: "Elephants are ecosystem engineers.",
    visual: {
      required: true,
      type: "photo",
      url: "https://example.com/elephant.jpg",
      alt: "Elephants",
      placement: "left",
    },
  });
  const closing = renderSlideHtml({
    type: "takeaway",
    title: "Protect wildlife",
    keyMessage: "Protecting wildlife protects us",
    purpose: "closing",
    density: "very-low",
    layout: "closing",
    points: ["Act now"],
  });
  assert.match(editorial, /data-layout="editorial"/);
  assert.match(editorial, /h-\[450px\] w-\[800px\]/);
  assert.match(editorial, /font-serif/);
  assert.match(editorial, /bg-\[#0B0B0B\]/);
  assert.match(editorial, /text-\[#D4AF37\]/);
  assert.match(closing, /data-layout="closing"/);
  assert.doesNotMatch(closing, /<li/);
});

test("HTML layouts use editorial structures instead of repeated card panels", () => {
  const comparison = renderSlideHtml({
    type: "comparison",
    title: "Two Paths",
    layout: "comparison",
    left: { title: "Craft", points: ["Intentional"] },
    right: { title: "Scale", points: ["Repeatable"] },
  });
  const timeline = renderSlideHtml({
    type: "timeline",
    title: "The Journey",
    layout: "timeline",
    events: [
      { date: "01", title: "Begin", description: "Set direction" },
      { date: "02", title: "Build", description: "Create momentum" },
    ],
  });
  assert.match(comparison, /grid-cols-2 gap-14/);
  assert.match(timeline, /rounded-full/);
  assert.doesNotMatch(comparison, /shadow-/);
});

test("builds encoded, cached ImageKit URLs and unique regeneration paths", () => {
  const options = {
    prompt: requiredVisual.prompt,
    presentationId: "deck-1",
    slideId: "slide-1",
    environment: imageKitEnvironment,
    now: () => 1_000_000,
  };
  const first = createImageKitGenerationUrl(options);
  const again = createImageKitGenerationUrl(options);
  const regenerated = createImageKitGenerationUrl({ ...options, regenerate: true, nonce: "new-version" });
  assert.equal(first.path, again.path);
  assert.notEqual(first.path, regenerated.path);
  assert.match(first.url, /Person%20on%20the%20right%20%2F%20no%20text%3F/);
  assert.match(first.url, /^https:\/\/ik\.imagekit\.io\/sphere\/ik-genimg-prompt-/);
  assert.match(first.url, /\?tr=w-1536,h-864,c-at_max,q-90,f-jpg&ik-t=/);
  assert.match(first.url, /&ik-s=[a-f0-9]{40}$/);
  assert.doesNotMatch(first.url, /PRIVATE|test-only/);
});

test("keeps existing ImageKit transforms and transforms unoptimized asset URLs", () => {
  const known = "https://ik.imagekit.io/ikmedia/tr:w-800,h-450/docs_images/examples/example_food_1.jpg";
  assert.equal(applyImageKitTransform(known), known);
  assert.equal(
    applyImageKitTransform("https://ik.imagekit.io/demo/photos/food.jpg", { width: 800, height: 450 }),
    "https://ik.imagekit.io/demo/tr:w-800,h-450,c-at_max,q-90,f-auto/photos/food.jpg",
  );
});

test("uses a verified existing ImageKit asset in HTML and PPTX export", async () => {
  const known = "https://ik.imagekit.io/ikmedia/tr:w-800,h-450/docs_images/examples/example_food_1.jpg";
  const current = structuredClone(presentationData);
  current.slides[0].layout = "image-right";
  current.slides[0].visual = { ...requiredVisual, searchQuery: "editorial food" };
  const slides = await generateSlideVisuals(current, "deck", {
    findPresentationImage: async ({ query }) => { assert.equal(query, "editorial food"); return { url: known }; },
    downloadPresentationImage: (url, options) => downloadPresentationImage(url, options, {
      fetch: async (requestedUrl) => {
        assert.equal(requestedUrl, known);
        return new Response(Uint8Array.from([255, 216, 255, 217]), { status: 200, headers: { "content-type": "image/jpeg" } });
      },
    }),
    generatePresentationImage: async () => { throw new Error("generation should not run when an asset is found"); },
  });
  assert.match(slides[0].html, /https:\/\/ik\.imagekit\.io\/ikmedia\/tr:w-800,h-450\/docs_images\/examples\/example_food_1\.jpg/);
  assert.match(slides[0].html, /loading="eager" decoding="sync"/);
  const ppt = await generatePpt({ ...current, slides });
  const buffer = await ppt.write({ outputType: "nodebuffer" });
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
});

test("searches the ImageKit media library without exposing its private key", async () => {
  let requestedUrl;
  let authorization;
  const asset = await findImageKitAsset({ query: "cinematic studio" }, {
    environment: imageKitEnvironment,
    fetch: async (url, options) => {
      requestedUrl = url;
      authorization = options.headers.Authorization;
      const assets = [{
        fileType: "image",
        url: "https://ik.imagekit.io/sphere/studio.jpg",
        filePath: "/studio.jpg",
        fileId: "one",
      }];
      return new Response(JSON.stringify(assets), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });
  assert.equal(asset.url, "https://ik.imagekit.io/sphere/studio.jpg");
  assert.match(requestedUrl, /^https:\/\/api\.imagekit\.io\/v1\/files\?/);
  assert.doesNotMatch(requestedUrl, /test-only/);
  assert.match(authorization, /^Basic /);
});

test("requires backend ImageKit configuration", () => {
  assert.throws(
    () => createImageKitGenerationUrl({
      prompt: "test",
      presentationId: "p",
      slideId: "s",
      environment: {},
    }),
    /missing IMAGEKIT_ID/,
  );
});

test("downloads an ImageKit result without live generation", async () => {
  const result = await generatePresentationImage({ prompt: "clean office", presentationId: "p", slideId: "s" }, {
    environment: imageKitEnvironment,
    fetch: async () => jpegResponse(),
  });
  assert.match(result.data, /^data:image\/jpeg;base64,/);
});

test("waits for ImageKit intermediate generation responses", async () => {
  let requests = 0;
  let waits = 0;
  const result = await generatePresentationImage({ prompt: "clean office", presentationId: "p", slideId: "s" }, {
    environment: imageKitEnvironment,
    fetch: async () => ++requests === 1
      ? pendingImageResponse()
      : jpegResponse(),
    wait: async () => { waits += 1; },
  });
  assert.equal(requests, 2);
  assert.equal(waits, 1);
  assert.match(result.data, /^data:image\/jpeg;base64,/);
});

test("polls the same ImageKit URL through multiple intermediate responses", async () => {
  let requests = 0;
  const urls = [];
  const waits = [];
  const result = await generatePresentationImage({ prompt: "clean office", presentationId: "p", slideId: "s" }, {
    environment: imageKitEnvironment,
    fetch: async (url) => {
      urls.push(url);
      requests += 1;
      return requests < 4
        ? pendingImageResponse()
        : jpegResponse();
    },
    wait: async (milliseconds) => { waits.push(milliseconds); },
    logger: { info() {}, error() {} },
  });
  assert.equal(requests, 4);
  assert.equal(new Set(urls).size, 1);
  assert.deepEqual(waits, [POLL_INTERVAL_MS, POLL_INTERVAL_MS, POLL_INTERVAL_MS]);
  assert.match(result.data, /^data:image\/jpeg;base64,/);
});

test("rejects ImageKit errors and non-intermediate HTML", async () => {
  const quiet = { info() {}, error() {} };
  await assert.rejects(
    generatePresentationImage({ prompt: "test", presentationId: "p", slideId: "error" }, {
      environment: imageKitEnvironment,
      fetch: async () => new Response("failed", { status: 200, headers: { "content-type": "text/html", "ik-error": "generation denied" } }),
      logger: quiet,
    }),
    (error) => error.code === "IMAGEKIT_REQUEST_FAILED" && /generation denied/.test(error.message),
  );
  await assert.rejects(
    generatePresentationImage({ prompt: "test", presentationId: "p", slideId: "html" }, {
      environment: imageKitEnvironment,
      fetch: async () => new Response("unexpected", { status: 200, headers: { "content-type": "text/html" } }),
      logger: quiet,
    }),
    (error) => error.code === "IMAGE_RESPONSE_INVALID" && /without an intermediate response/.test(error.message),
  );
});

test("times out only after the configured ImageKit wait budget", async () => {
  const started = Date.now();
  await assert.rejects(
    generatePresentationImage({ prompt: "test", presentationId: "p", slideId: "timeout" }, {
      environment: imageKitEnvironment,
      timeoutMs: 25,
      pollIntervalMs: 5,
      fetch: async () => pendingImageResponse(),
      logger: { info() {}, error() {} },
    }),
    (error) => error.code === "IMAGE_TIMEOUT",
  );
  assert.ok(Date.now() - started >= 20);
  assert.equal(MAX_WAIT_MS, 120_000);
});

test("only required visuals invoke ImageKit and their URL reaches HTML", async () => {
  const current = structuredClone(presentationData);
  current.slides[0].visual = requiredVisual;
  let calls = 0;
  const slides = await generateSlideVisuals(current, "deck", { generatePresentationImage: async () => {
    calls += 1;
    return { url: "https://ik.imagekit.io/sphere/image.jpg", path: "image.jpg", data: "data:image/jpeg;base64,AQID" };
  } });
  assert.equal(calls, 1);
  assert.match(slides[0].html, /https:\/\/ik\.imagekit\.io\/sphere\/image\.jpg/);
  assert.equal(slides[1].visual, undefined);
});

test("an optional ImageKit failure preserves the presentation slide", async () => {
  const current = structuredClone(presentationData);
  current.slides[0].visual = requiredVisual;
  const slides = await generateSlideVisuals(current, "deck", { generatePresentationImage: async () => { throw new Error("offline"); } });
  assert.equal(slides.length, current.slides.length);
  assert.equal(slides[0].visual.required, false);
});

test("limits required slide image generation concurrency to two", async () => {
  const current = structuredClone(presentationData);
  current.slides.forEach((slide) => {
    slide.visual = requiredVisual;
  });
  let active = 0;
  let maximum = 0;
  const slides = await generateSlideVisuals(current, "deck", {
    maxConcurrentImageGenerations: 2,
    generatePresentationImage: async ({ slideId }) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setImmediate(resolve));
      active -= 1;
      return { url: `https://example.com/${slideId}.jpg`, path: `${slideId}.jpg`, data: "data:image/jpeg;base64,AQID" };
    },
  });
  assert.equal(slides.length, current.slides.length);
  assert.equal(maximum, 2);
});

test("uses distinct existing ImageKit assets across multiple visual slides", async () => {
  const current = structuredClone(presentationData);
  current.slides.slice(0, 3).forEach((slide, index) => {
    slide.visual = { ...requiredVisual, searchQuery: `scene ${index}` };
  });
  const assets = ["one.jpg", "two.jpg", "three.jpg"];
  let searches = 0;
  const slides = await generateSlideVisuals(current, "deck", {
    findPresentationImage: async ({ excludeUrls }) => {
      const available = assets.map((name) => `https://ik.imagekit.io/sphere/${name}`).find((url) => !excludeUrls.includes(url));
      searches += 1;
      return { url: available };
    },
    downloadPresentationImage: async (url) => ({ url, path: new URL(url).pathname, data: "data:image/jpeg;base64,AQID" }),
    generatePresentationImage: async () => { throw new Error("generation should not be needed"); },
  });
  assert.equal(searches, 3);
  assert.equal(new Set(slides.slice(0, 3).map((slide) => slide.visual.url)).size, 3);
});
