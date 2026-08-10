import Firecrawl from "@mendable/firecrawl-js";
import { extractUrl } from "./searchRouter.js";

const MAX_DOCUMENT_LENGTH = 12_000;

export const extractWebpage = async (url) => {
  if (!process.env.FIRECRAWL_API_KEY) {
    return {
      type: "documentation",
      status: "error",
      error: "Webpage extraction is not configured yet.",
    };
  }

  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("Unsupported URL protocol");

    const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });
    const document = await firecrawl.scrape(parsedUrl.toString(), {
      formats: ["markdown"],
      onlyMainContent: true,
      timeout: 30_000,
    });
    const markdown = typeof document?.markdown === "string" ? document.markdown : "";

    if (!markdown) throw new Error("No webpage content returned");

    return {
      type: "documentation",
      status: "success",
      url: parsedUrl.toString(),
      title: document.metadata?.title || parsedUrl.hostname,
      markdown: markdown.slice(0, MAX_DOCUMENT_LENGTH),
    };
  } catch {
    return {
      type: "documentation",
      status: "error",
      url,
      error: "The requested webpage could not be retrieved.",
    };
  }
};

export const documentationSearch = async (state) => {
  const url = extractUrl(state.prompt);
  if (!url) return null;

  return {
    ...state,
    toolResult: await extractWebpage(url),
    searchResults: [],
    images: [],
  };
};
