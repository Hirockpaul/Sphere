import { TavilySearch } from "@langchain/tavily";

const MAX_RESULTS = 5;
const MAX_CONTENT_LENGTH = 1_500;

const shouldIncludeImages = (prompt = "") => /\b(images?|photos?|pictures?|visuals?)\b/i.test(prompt);

const normalizeResult = (result) => ({
  title: typeof result?.title === "string" ? result.title : "Untitled result",
  url: typeof result?.url === "string" ? result.url : "",
  content: typeof result?.content === "string"
    ? result.content.slice(0, MAX_CONTENT_LENGTH)
    : "",
  score: typeof result?.score === "number" ? result.score : null,
});

export const tavilySearch = async (state) => {
  if (!process.env.TAVILY_API_KEY) {
    return {
      ...state,
      searchResults: [],
      images: [],
      toolResult: { type: "search", status: "error", error: "Web search is not configured." },
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

    if (response?.error) throw new Error(response.error);

    const searchResults = (Array.isArray(response?.results) ? response.results : [])
      .slice(0, MAX_RESULTS)
      .map(normalizeResult)
      .filter(({ url, content }) => url && content);
    const images = includeImages && Array.isArray(response?.images)
      ? response.images
          .map((image) => (typeof image === "string" ? image : image?.url))
          .filter(Boolean)
          .slice(0, 5)
      : [];

    return {
      ...state,
      searchResults,
      images,
      toolResult: searchResults.length
        ? null
        : { type: "search", status: "error", error: "No relevant web results were found." },
    };
  } catch {
    return {
      ...state,
      searchResults: [],
      images: [],
      toolResult: { type: "search", status: "error", error: "Web search is temporarily unavailable." },
    };
  }
};
