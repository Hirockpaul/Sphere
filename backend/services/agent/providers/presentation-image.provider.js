import crypto from "node:crypto";

export const MAX_WAIT_MS = 120_000;
export const POLL_INTERVAL_MS = 5_000;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export class PresentationImageError extends Error {
  constructor(message, code = "IMAGE_GENERATION_FAILED") {
    super(message);
    this.name = "PresentationImageError";
    this.code = code;
  }
}

const getConfig = (environment = process.env) => {
  const missing = ["IMAGEKIT_ID", "IMAGEKIT_URL_ENDPOINT", "IMAGEKIT_PRIVATE_KEY"].filter((name) => !environment[name]?.trim());
  if (missing.length) throw new PresentationImageError(`ImageKit is not configured: missing ${missing.join(", ")}`, "IMAGEKIT_CONFIG_MISSING");
  let endpoint;
  try {
    endpoint = new URL(environment.IMAGEKIT_URL_ENDPOINT);
  } catch {
    throw new PresentationImageError("ImageKit URL endpoint is invalid", "IMAGEKIT_CONFIG_INVALID");
  }
  if (endpoint.protocol !== "https:") throw new PresentationImageError("ImageKit URL endpoint must use HTTPS", "IMAGEKIT_CONFIG_INVALID");
  return { endpoint: endpoint.toString().replace(/\/$/, ""), privateKey: environment.IMAGEKIT_PRIVATE_KEY.trim() };
};

const ratioDimensions = (aspectRatio) => ({
  "1:1": [1024, 1024], "4:3": [1200, 900], "3:4": [900, 1200], "16:9": [1536, 864], "9:16": [864, 1536],
}[aspectRatio] || [1536, 864]);

export const applyImageKitTransform = (sourceUrl, { width = 1536, height = 864 } = {}) => {
  let url;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new PresentationImageError("Image URL is invalid", "IMAGE_URL_INVALID");
  }
  if (url.protocol !== "https:") throw new PresentationImageError("Image URL must use HTTPS", "IMAGE_URL_INVALID");
  if (!url.hostname.endsWith("imagekit.io") || /\/tr:[^/]+\//.test(url.pathname) || url.pathname.includes("/ik-genimg-prompt-")) return url.toString();
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return url.toString();
  segments.splice(1, 0, `tr:w-${width},h-${height},c-at_max,q-90,f-auto`);
  url.pathname = `/${segments.join("/")}`;
  return url.toString();
};

const signUrl = (url, endpoint, privateKey, expiresAt) => {
  const endpointWithSlash = `${endpoint}/`;
  const value = `${url.replace(endpointWithSlash, "")}${expiresAt}`;
  const signature = crypto.createHmac("sha1", privateKey).update(value).digest("hex");
  return `${url}${url.includes("?") ? "&" : "?"}ik-t=${expiresAt}&ik-s=${signature}`;
};

export const createImageKitGenerationUrl = ({ prompt, presentationId, slideId, aspectRatio = "16:9", regenerate = false, environment = process.env, nonce, now = Date.now }) => {
  const { endpoint, privateKey } = getConfig(environment);
  const cleanPrompt = String(prompt || "").trim();
  if (!cleanPrompt) throw new PresentationImageError("An image prompt is required", "IMAGE_PROMPT_MISSING");
  const [width, height] = ratioDimensions(aspectRatio);
  const stable = crypto.createHash("sha256").update(`${presentationId}:${slideId}:${cleanPrompt}:${aspectRatio}`).digest("hex").slice(0, 16);
  const version = regenerate ? (nonce || crypto.randomUUID()) : stable;
  const safePresentation = String(presentationId).replace(/[^a-zA-Z0-9_-]/g, "-");
  const safeSlide = String(slideId).replace(/[^a-zA-Z0-9_-]/g, "-");
  const path = `generated-ppt-images/${safePresentation}/${safeSlide}-${version}.jpg`;
  const transformation = `w-${width},h-${height},c-at_max,q-90,f-jpg`;
  const unsignedUrl = `${endpoint}/ik-genimg-prompt-${encodeURIComponent(cleanPrompt)}/${path}?tr=${transformation}`;
  const expiresAt = Math.floor(now() / 1000) + 24 * 60 * 60;
  const url = signUrl(unsignedUrl, endpoint, privateKey, expiresAt);
  return { url, path, width, height };
};

const readImage = async (url, fetchImpl, timeoutMs, pollIntervalMs, wait, logger) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let attempt = 0;
  try {
    while (true) {
      attempt += 1;
      logger.info(`[PPT] ImageKit polling attempt ${attempt}`);
      const response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: "image/*" } });
      const imageKitError = response.headers.get("ik-error");
      if (imageKitError) {
        throw new PresentationImageError(`ImageKit generation failed: ${imageKitError}`, "IMAGEKIT_REQUEST_FAILED");
      }
      if (!response.ok) {
        const code = response.status === 429 ? "IMAGE_RATE_LIMITED" : "IMAGEKIT_REQUEST_FAILED";
        throw new PresentationImageError(`ImageKit returned HTTP ${response.status}`, code);
      }
      if (response.headers.get("is-intermediate-response") === "true") {
        logger.info("[PPT] ImageKit image still preparing");
        await wait(pollIntervalMs, controller.signal);
        continue;
      }
      const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
      if (!ACCEPTED_IMAGE_TYPES.has(contentType)) {
        throw new PresentationImageError(
          contentType === "text/html" ? "ImageKit returned HTML without an intermediate response" : "ImageKit returned an invalid image",
          "IMAGE_RESPONSE_INVALID",
        );
      }
      logger.info("[PPT] ImageKit image ready");
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length) throw new PresentationImageError("ImageKit returned an empty image", "IMAGE_RESPONSE_INVALID");
      logger.info("[PPT] ImageKit image downloaded");
      return `data:${contentType};base64,${bytes.toString("base64")}`;
    }
  } catch (error) {
    if (error.name === "AbortError") throw new PresentationImageError("ImageKit image generation timed out", "IMAGE_TIMEOUT");
    if (error instanceof PresentationImageError) throw error;
    throw new PresentationImageError("ImageKit image generation failed");
  } finally {
    clearTimeout(timeout);
  }
};

export const generatePresentationImage = async (options, dependencies = {}) => {
  const generated = createImageKitGenerationUrl({ ...options, environment: dependencies.environment || process.env, now: dependencies.now || Date.now });
  const logger = dependencies.logger || console;
  const wait = dependencies.wait || ((milliseconds, signal) => new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => { clearTimeout(timer); reject(Object.assign(new Error("Aborted"), { name: "AbortError" })); }, { once: true });
  }));
  logger.info("[PPT] ImageKit generation started", { presentationId: options.presentationId, slideId: options.slideId });
  try {
    const data = await readImage(
      generated.url,
      dependencies.fetch || globalThis.fetch,
      dependencies.timeoutMs ?? MAX_WAIT_MS,
      dependencies.pollIntervalMs ?? POLL_INTERVAL_MS,
      wait,
      logger,
    );
    return { ...generated, data };
  } catch (error) {
    logger.error("[PPT] ImageKit generation failed", { code: error.code || "IMAGE_GENERATION_FAILED", message: error.message });
    throw error;
  }
};

export const downloadPresentationImage = async (sourceUrl, options = {}, dependencies = {}) => {
  const [width, height] = ratioDimensions(options.aspectRatio);
  const url = applyImageKitTransform(sourceUrl, { width, height });
  const response = await (dependencies.fetch || globalThis.fetch)(url, { headers: { Accept: "image/*" } });
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (!response.ok) throw new PresentationImageError(`Image asset returned HTTP ${response.status}`, "IMAGE_ASSET_UNAVAILABLE");
  if (!ACCEPTED_IMAGE_TYPES.has(contentType)) throw new PresentationImageError("Image asset did not return a supported image", "IMAGE_RESPONSE_INVALID");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new PresentationImageError("Image asset was empty", "IMAGE_RESPONSE_INVALID");
  return { url, path: new URL(url).pathname, data: `data:${contentType};base64,${bytes.toString("base64")}` };
};

export const findImageKitAsset = async ({ query, excludeUrls = [] }, dependencies = {}) => {
  const environment = dependencies.environment || process.env;
  const privateKey = environment.IMAGEKIT_PRIVATE_KEY?.trim();
  if (!privateKey || !String(query || "").trim()) return undefined;
  const cleanQuery = String(query).replace(/["\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  const params = new URLSearchParams({
    fileType: "image",
    type: "file",
    limit: "20",
    sort: "DESC_RELEVANCE",
    searchQuery: `(name HAS "${cleanQuery}" OR tags HAS "${cleanQuery}")`,
  });
  const response = await (dependencies.fetch || globalThis.fetch)(`https://api.imagekit.io/v1/files?${params}`, {
    headers: { Accept: "application/json", Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` },
  });
  if (!response.ok) return undefined;
  const assets = await response.json();
  const excluded = new Set(excludeUrls);
  const match = Array.isArray(assets) ? assets.find((asset) => asset?.fileType === "image" && typeof asset.url === "string" && !excluded.has(asset.url)) : undefined;
  return match ? { url: match.url, path: match.filePath, fileId: match.fileId } : undefined;
};

export const regeneratePresentationImage = (options, dependencies) => generatePresentationImage({ ...options, regenerate: true }, dependencies);
