const URL_PATTERN = /https?:\/\/[^\s<>()]+/i;
const DOCUMENTATION_TERMS = /\b(docs?|documentation|api reference)\b/i;
const PAGE_READING_TERMS = /\bread (this|the) (page|url|website)\b/i;
const FACT_CHECK_TERMS = /\b(fact[ -]?check|verify)\b/i;
const CLAIM_VERIFICATION_TERMS = /\bis (this|that) (claim|information|statement)\b/i;
const ACCURACY_QUESTION = /\bis .+ (true|correct|accurate)\b/i;
const TIME_TERMS = /\b(current time|local time|time now|what time)\b/i;
const DATE_TERMS = /\b(current date|date today|today'?s date)\b/i;
const NEWS_TERMS = /\b(news|headlines?|breaking news|current events?)\b/i;

export const SEARCH_INTENTS = Object.freeze({
  TIME: "time",
  NEWS: "news",
  WEB_SEARCH: "web_search",
  FACT_CHECK: "fact_check",
  DOCUMENTATION: "documentation",
});

export function extractUrl(prompt = "") {
  return prompt.match(URL_PATTERN)?.[0] || null;
}

function asksForDocumentation(query) {
  return DOCUMENTATION_TERMS.test(query) || PAGE_READING_TERMS.test(query);
}

function asksForFactCheck(query) {
  return FACT_CHECK_TERMS.test(query)
    || CLAIM_VERIFICATION_TERMS.test(query)
    || ACCURACY_QUESTION.test(query);
}

function asksForTime(query) {
  return TIME_TERMS.test(query) || DATE_TERMS.test(query);
}

export const detectSearchIntent = (prompt = "") => {
  const query = prompt.toLowerCase().trim();

  if (extractUrl(prompt) || asksForDocumentation(query)) {
    return SEARCH_INTENTS.DOCUMENTATION;
  }

  if (asksForFactCheck(query)) {
    return SEARCH_INTENTS.FACT_CHECK;
  }

  if (asksForTime(query)) {
    return SEARCH_INTENTS.TIME;
  }

  if (NEWS_TERMS.test(query)) {
    return SEARCH_INTENTS.NEWS;
  }

  return SEARCH_INTENTS.WEB_SEARCH;
};
