import {
  detectSearchIntent,
  documentationSearch,
  SEARCH_INTENTS,
  tavilySearch,
  timeTool,
} from "../tools/index.js";

export const searchAgent = async (state) => {
  const searchIntent = detectSearchIntent(state.prompt);
  const searchState = { ...state, searchIntent };

  console.log(`Search Intent: ${searchIntent}`);

  switch (searchIntent) {
    case SEARCH_INTENTS.TIME:
      return timeTool(searchState);
    case SEARCH_INTENTS.DOCUMENTATION: {
      const documentState = await documentationSearch(searchState);
      return documentState || tavilySearch(searchState);
    }
    case SEARCH_INTENTS.NEWS:
    case SEARCH_INTENTS.FACT_CHECK:
    case SEARCH_INTENTS.WEB_SEARCH:
    default:
      return tavilySearch(searchState);
  }
};
