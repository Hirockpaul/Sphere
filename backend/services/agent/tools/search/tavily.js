import { TavilySearch } from "@langchain/tavily";

const MAX_RESULTS = 5;
const MAX_IMAGES = 5;
const MAX_CONTENT_LENGTH = 1_500;
const IMAGE_TERMS = /\b(images?|photos?|pictures?|visuals?)\b/i;

function shouldIncludeImages(prompt = "") {
  return IMAGE_TERMS.test(prompt);
}

const normalizeResult = (result) => ({
  title: typeof result?.title === "string" ? result.title : "Untitled result",
  url: typeof result?.url === "string" ? result.url : "",
  content: typeof result?.content === "string"
    ? result.content.slice(0, MAX_CONTENT_LENGTH)
    : "",
  score: typeof result?.score === "number" ? result.score : null,
});

function normalizeImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => {
      if (typeof image === "string") {
        return image;
      }

      return image?.url;
    })
    .filter(Boolean)
    .slice(0, MAX_IMAGES);
}

function searchError(message) {
  return {
    type: "search",
    status: "error",
    error: message,
  };
}

export const tavilySearch = async (state) => {
  if (!process.env.TAVILY_API_KEY) {
    return {
      ...state,
      searchResults: [],
      images: [],
      toolResult: searchError("Web search is not configured."),
    };
  }

  try {
    const includeImages = shouldIncludeImages(state.prompt);
    const searchTool = new TavilySearch({
      maxResults: MAX_RESULTS,
      topic: state.searchIntent === "news" ? "news" : "general",
      searchDepth: "advanced",
      includeImages,
    });
    const response = await searchTool.invoke({ query: state.prompt });

    if (response?.error) {
      throw new Error(response.error);
    }

    const searchResults = (Array.isArray(response?.results) ? response.results : [])
      .slice(0, MAX_RESULTS)
      .map(normalizeResult)
      .filter(({ url, content }) => url && content);
    const images = includeImages ? normalizeImages(response?.images) : [];
    const toolResult = searchResults.length
      ? null
      : searchError("No relevant web results were found.");

    return {
      ...state,
      searchResults,
      images,
      toolResult,
    };
  } catch {
    return {
      ...state,
      searchResults: [],
      images: [],
      toolResult: searchError("Web search is temporarily unavailable."),
    };
  }
};
