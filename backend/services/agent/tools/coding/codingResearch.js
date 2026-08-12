import { documentationSearch } from "../search/firecrawl.js";
import { tavilySearch } from "../search/tavily.js";

const CURRENT_KEYWORDS =
  /\b(latest|current|newest|up[- ]to[- ]date|recently released)\b/i;

const OFFICIAL_DOCS_KEYWORDS =
  /\b(official docs?|official documentation|api reference)\b/i;

const DATE_KEYWORDS =
  /\bas of (today|now|20\d{2})\b/i;

const TECHNOLOGY_KEYWORDS =
  /\b(api|sdk|library|framework|package|version|stripe|next\.?js|react|angular|vue|node\.?js|openai|firebase|aws|azure|google cloud)\b/i;

const URL_PATTERN = /https?:\/\/[^\s<>()]+/i;
const MAX_RESEARCH_LENGTH = 12_000;

function isCurrentRequest(prompt) {
  return (
    CURRENT_KEYWORDS.test(prompt) ||
    OFFICIAL_DOCS_KEYWORDS.test(prompt) ||
    DATE_KEYWORDS.test(prompt)
  );
}

function needsExternalResearch(prompt) {
  if (!prompt || typeof prompt !== "string") {
    return false;
  }

  const hasUrl = URL_PATTERN.test(prompt);
  const asksForCurrentInfo = isCurrentRequest(prompt);
  const mentionsTechnology = TECHNOLOGY_KEYWORDS.test(prompt);

  return hasUrl || (asksForCurrentInfo && mentionsTechnology);
}

export const requiresCodingResearch = needsExternalResearch;

export async function researchCodingRequest(prompt) {
  const searchState = {
    prompt,
    searchIntent: "documentation",
  };

  let result;

  if (URL_PATTERN.test(prompt)) {
    result = await documentationSearch(searchState);
  } else {
    result = await tavilySearch(searchState);
  }

  if (result?.toolResult?.status === "success") {
    const title = result.toolResult.title || "Documentation";
    const content = result.toolResult.markdown || "";

    return `${title}\n${content}`.slice(0, MAX_RESEARCH_LENGTH);
  }

  const sources = Array.isArray(result?.searchResults)
    ? result.searchResults
    : [];

  return sources
    .map((source) => {
      const title = source.title || "Untitled";
      const url = source.url || "";
      const content = source.content || "";

      return `${title}\n${url}\n${content}`;
    })
    .join("\n\n")
    .slice(0, MAX_RESEARCH_LENGTH);
}
