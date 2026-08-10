const URL_PATTERN = /https?:\/\/[^\s<>()]+/i;

export const SEARCH_INTENTS = Object.freeze({
  TIME: "time",
  NEWS: "news",
  WEB_SEARCH: "web_search",
  FACT_CHECK: "fact_check",
  DOCUMENTATION: "documentation",
});

export const extractUrl = (prompt = "") => prompt.match(URL_PATTERN)?.[0] || null;

export const detectSearchIntent = (prompt = "") => {
  const query = prompt.toLowerCase().trim();

  if (extractUrl(prompt) || /\b(docs?|documentation|api reference|read (?:this|the) (?:page|url|website))\b/.test(query)) {
    return SEARCH_INTENTS.DOCUMENTATION;
  }

  if (/\b(fact[ -]?check|verify|is (?:this|that) (?:claim|information|statement)|is .* (?:true|correct|accurate))\b/.test(query)) {
    return SEARCH_INTENTS.FACT_CHECK;
  }

  if (/\b(current time|local time|time now|what time|current date|date today|today'?s date)\b/.test(query)) {
    return SEARCH_INTENTS.TIME;
  }

  if (/\b(news|headlines?|breaking news|current events?)\b/.test(query)) {
    return SEARCH_INTENTS.NEWS;
  }

  return SEARCH_INTENTS.WEB_SEARCH;
};
