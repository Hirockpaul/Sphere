import { documentationSearch } from "../search/firecrawl.js";
import { tavilySearch } from "../search/tavily.js";

const CURRENT_EXTERNAL_REQUEST = /\b(?:latest|current|newest|up[- ]to[- ]date|as of (?:today|now|20\d{2})|official (?:docs?|documentation)|api reference|recently released)\b/i;
const EXTERNAL_TECHNOLOGY = /\b(?:api|sdk|library|framework|package|version|stripe|next\.?js|react|angular|vue|node\.?js|openai|firebase|aws|azure|google cloud)\b/i;
const URL_PATTERN = /https?:\/\/[^\s<>()]+/i;

export const requiresCodingResearch = (prompt = "") => {
  const value = typeof prompt === "string" ? prompt : "";
  return URL_PATTERN.test(value) || (CURRENT_EXTERNAL_REQUEST.test(value) && EXTERNAL_TECHNOLOGY.test(value));
};

export const researchCodingRequest = async (prompt) => {
  const state = { prompt, searchIntent: "documentation" };
  const result = URL_PATTERN.test(prompt)
    ? await documentationSearch(state)
    : await tavilySearch(state);

  if (result?.toolResult?.status === "success") {
    return `${result.toolResult.title || "Documentation"}\n${result.toolResult.markdown || ""}`.slice(0, 12_000);
  }
  const sources = Array.isArray(result?.searchResults) ? result.searchResults : [];
  return sources.map(({ title, url, content }) => `${title}\n${url}\n${content}`).join("\n\n").slice(0, 12_000);
};
