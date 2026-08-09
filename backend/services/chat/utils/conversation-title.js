export const DEFAULT_CONVERSATION_TITLE = "New Conversation";

/*
|--------------------------------------------------------------------------
| Simple messages
|--------------------------------------------------------------------------
*/

const SPECIAL_TITLES = new Map([
  ["hello", "Greeting"],
  ["hi", "Greeting"],
  ["hey", "Conversation Starter"],
  ["hii", "Greeting"],
  ["hiii", "Greeting"],

  ["good morning", "Morning Greeting"],
  ["good afternoon", "Afternoon Greeting"],
  ["good evening", "Evening Greeting"],

  ["thanks", "Quick Thanks"],
  ["thank you", "Quick Thanks"],
  ["thx", "Quick Thanks"],

  ["okay", "Conversation Starter"],
  ["ok", "Conversation Starter"],
]);

/*
|--------------------------------------------------------------------------
| Words that usually don't provide useful title information
|--------------------------------------------------------------------------
*/

const FILLER_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "please",
  "should",
  "the",
  "this",
  "to",
  "using",
  "want",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "would",
  "you",
  "your",
]);


/*
|--------------------------------------------------------------------------
| Action words
|--------------------------------------------------------------------------
*/

const ACTION_WORDS = new Set([
  "build",
  "create",
  "develop",
  "describe",
  "design",
  "explain",
  "generate",
  "help",
  "implement",
  "make",
  "show",
  "tell",
  "write",
  "fix",
  "debug",
  "solve",
  "learn",
]);


/*
|--------------------------------------------------------------------------
| Conversational / low-value words
|--------------------------------------------------------------------------
*/

const SMALL_TALK_WORDS = new Set([
  "afternoon",
  "evening",
  "good",
  "hello",
  "hey",
  "hi",
  "hii",
  "hiii",
  "morning",
  "okay",
  "ok",
  "thanks",
  "thank",
  "there",
  "yes",
  "yeah",
  "yep",
  "you",
]);


/*
|--------------------------------------------------------------------------
| Common technology names
|--------------------------------------------------------------------------
*/

const CANONICAL_TERMS = new Map([
  ["ai", "AI"],
  ["api", "API"],
  ["aws", "AWS"],
  ["css", "CSS"],
  ["docker", "Docker"],
  ["express", "Express"],
  ["firebase", "Firebase"],
  ["git", "Git"],
  ["github", "GitHub"],
  ["gpt", "GPT"],
  ["html", "HTML"],
  ["java", "Java"],
  ["javascript", "JavaScript"],
  ["js", "JavaScript"],
  ["jwt", "JWT"],
  ["kotlin", "Kotlin"],
  ["langchain", "LangChain"],
  ["langgraph", "LangGraph"],
  ["mongodb", "MongoDB"],
  ["mongoose", "Mongoose"],
  ["mysql", "MySQL"],
  ["next", "Next.js"],
  ["next.js", "Next.js"],
  ["node", "Node.js"],
  ["nodejs", "Node.js"],
  ["node.js", "Node.js"],
  ["npm", "npm"],
  ["postgres", "PostgreSQL"],
  ["postgresql", "PostgreSQL"],
  ["python", "Python"],
  ["qdrant", "Qdrant"],
  ["react", "React"],
  ["redis", "Redis"],
  ["redux", "Redux"],
  ["sql", "SQL"],
  ["tailwind", "Tailwind"],
  ["typescript", "TypeScript"],
  ["ts", "TypeScript"],
  ["vite", "Vite"],
  ["vue", "Vue"],
]);

/*
|--------------------------------------------------------------------------
| Topic words
|--------------------------------------------------------------------------
*/

const TOPIC_TERMS = new Map([
  ["authentication", "Authentication"],
  ["authorization", "Authorization"],
  ["backend", "Backend Development"],
  ["frontend", "Frontend Development"],
  ["database", "Database"],
  ["databases", "Database"],
  ["deployment", "Deployment"],
  ["debugging", "Debugging"],
  ["error", "Error Fix"],
  ["errors", "Error Fix"],
  ["architecture", "Architecture"],
  ["microservices", "Microservices"],
  ["api", "API"],
  ["apis", "API"],
  ["chatbot", "AI Chatbot"],
  ["chat", "AI Chat"],
  ["rag", "RAG"],
  ["agents", "AI Agents"],
  ["agent", "AI Agent"],
  ["testing", "Testing"],
  ["tests", "Testing"],
  ["performance", "Performance"],
  ["optimization", "Optimization"],
  ["security", "Security"],
  ["web", "Web Development"],
  ["website", "Website"],
  ["portfolio", "Portfolio"],
  ["dashboard", "Dashboard"],
  ["project", "Project"],
  ["projects", "Projects"],
  ["resume", "Resume"],
  ["interview", "Interview Preparation"],
  ["interviews", "Interview Preparation"],
  ["learning", "Learning"],
  ["tutorial", "Tutorial"],
  ["tutorials", "Tutorial"],
]);


/*
|--------------------------------------------------------------------------
| Normalize user message
|--------------------------------------------------------------------------
*/

const normalizeMessage = (content) => {
  return content
    .toLowerCase()
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[^\p{L}\p{N}\s.+#-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};


/*
|--------------------------------------------------------------------------
| Tokenize
|--------------------------------------------------------------------------
*/

const tokenize = (content) => {
  return normalizeMessage(content)
    .split(/\s+/)
    .filter(Boolean);
};


/*
|--------------------------------------------------------------------------
| Format words
|--------------------------------------------------------------------------
*/

const formatWord = (word) => {
  const cleaned = word.replace(/^[.'-]+|[.'-]+$/g, "");

  if (!cleaned) {
    return "";
  }

  const lower = cleaned.toLowerCase();

  // Technology
  if (CANONICAL_TERMS.has(lower)) {
    return CANONICAL_TERMS.get(lower);
  }

  // Topic
  if (TOPIC_TERMS.has(lower)) {
    return TOPIC_TERMS.get(lower);
  }

  // Already uppercase abbreviation
  if (/^[A-Z\d]{2,}$/.test(cleaned)) {
    return cleaned;
  }

  return (
    cleaned.charAt(0).toUpperCase() +
    cleaned.slice(1).toLowerCase()
  );
};


/*
|--------------------------------------------------------------------------
| Remove duplicate words
|--------------------------------------------------------------------------
*/

const uniqueWords = (words) => {
  const seen = new Set();

  return words.filter((word) => {
    const key = word.toLowerCase();

    if (!word || seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
};


/*
|--------------------------------------------------------------------------
| Check if message is meaningful
|--------------------------------------------------------------------------
*/

export const isMeaningfulMessage = (content) => {
  if (typeof content !== "string") {
    return false;
  }

  const normalized = normalizeMessage(content);

  if (!normalized) {
    return false;
  }

  // Special short conversations
  if (SPECIAL_TITLES.has(normalized)) {
    return true;
  }

  const words = tokenize(content);

  return words.some((word) => {
    const lower = word.toLowerCase();

    return (
      word.length > 2 &&
      !FILLER_WORDS.has(lower) &&
      !SMALL_TALK_WORDS.has(lower)
    );
  });
};


/*
|--------------------------------------------------------------------------
| Detect question type
|--------------------------------------------------------------------------
*/

const detectIntent = (words) => {
  const normalizedWords = words.map((word) => word.toLowerCase());

  if (
    normalizedWords.includes("debug") ||
    normalizedWords.includes("error") ||
    normalizedWords.includes("errors") ||
    normalizedWords.includes("fix")
  ) {
    return "debugging";
  }

  if (
    normalizedWords.includes("build") ||
    normalizedWords.includes("create") ||
    normalizedWords.includes("develop") ||
    normalizedWords.includes("make")
  ) {
    return "build";
  }

  if (
    normalizedWords.includes("explain") ||
    normalizedWords.includes("what") ||
    normalizedWords.includes("why") ||
    normalizedWords.includes("how")
  ) {
    return "learning";
  }

  if (
    normalizedWords.includes("latest") ||
    normalizedWords.includes("news") ||
    normalizedWords.includes("current") ||
    normalizedWords.includes("recent")
  ) {
    return "research";
  }

  if (
    normalizedWords.includes("compare") ||
    normalizedWords.includes("difference") ||
    normalizedWords.includes("vs")
  ) {
    return "comparison";
  }

  return null;
};


/*
|--------------------------------------------------------------------------
| Generate title
|--------------------------------------------------------------------------
*/

export const generateConversationTitle = (content) => {
  if (typeof content !== "string") {
    return null;
  }

  const normalized = normalizeMessage(content);

  if (!normalized) {
    return null;
  }


  /*
  |--------------------------------------------------------------------------
  | 1. Handle greetings / simple conversations
  |--------------------------------------------------------------------------
  */

  if (SPECIAL_TITLES.has(normalized)) {
    return SPECIAL_TITLES.get(normalized);
  }


  /*
  |--------------------------------------------------------------------------
  | 2. Check meaningful message
  |--------------------------------------------------------------------------
  */

  if (!isMeaningfulMessage(content)) {
    return DEFAULT_CONVERSATION_TITLE;
  }


  const words = tokenize(content);

  const intent = detectIntent(words);


  /*
  |--------------------------------------------------------------------------
  | 3. Find important technologies
  |--------------------------------------------------------------------------
  */

  const technologies = words
    .filter((word) =>
      CANONICAL_TERMS.has(word.toLowerCase())
    )
    .map((word) =>
      CANONICAL_TERMS.get(word.toLowerCase())
    );


  /*
  |--------------------------------------------------------------------------
  | 4. Find important topics
  |--------------------------------------------------------------------------
  */

  const topics = words
    .filter((word) =>
      TOPIC_TERMS.has(word.toLowerCase())
    )
    .map((word) =>
      TOPIC_TERMS.get(word.toLowerCase())
    );


  /*
  |--------------------------------------------------------------------------
  | 5. Remove filler/action words
  |--------------------------------------------------------------------------
  */

  const importantWords = words.filter((word) => {
    const lower = word.toLowerCase();

    return (
      !FILLER_WORDS.has(lower) &&
      !ACTION_WORDS.has(lower) &&
      !SMALL_TALK_WORDS.has(lower)
    );
  });


  /*
  |--------------------------------------------------------------------------
  | 6. Build title based on intent
  |--------------------------------------------------------------------------
  */

  let titleWords = [];


  // Debugging
  if (intent === "debugging") {
    titleWords.push("Debugging");
  }


  // Research
  else if (intent === "research") {
    titleWords.push("Research");
  }


  // Comparison
  else if (intent === "comparison") {
    titleWords.push("Comparison");
  }


  // Build request
  else if (intent === "build") {
    // Don't add "Building" if a useful technology exists.
  }


  /*
  |--------------------------------------------------------------------------
  | 7. Add technologies
  |--------------------------------------------------------------------------
  */

  titleWords.push(...technologies);


  /*
  |--------------------------------------------------------------------------
  | 8. Add topics
  |--------------------------------------------------------------------------
  */

  titleWords.push(...topics);


  /*
  |--------------------------------------------------------------------------
  | 9. Add remaining meaningful words
  |--------------------------------------------------------------------------
  */

  if (titleWords.length < 3) {
    const remainingWords = importantWords
      .map(formatWord)
      .filter(Boolean);

    titleWords.push(...remainingWords);
  }


  /*
  |--------------------------------------------------------------------------
  | 10. Remove duplicates
  |--------------------------------------------------------------------------
  */

  titleWords = uniqueWords(titleWords);


  /*
  |--------------------------------------------------------------------------
  | 11. Limit title size
  |--------------------------------------------------------------------------
  */

  titleWords = titleWords.slice(0, 5);


  /*
  |--------------------------------------------------------------------------
  | 12. Fallback
  |--------------------------------------------------------------------------
  */

  if (titleWords.length === 0) {
    return DEFAULT_CONVERSATION_TITLE;
  }


  /*
  |--------------------------------------------------------------------------
  | 13. Single-word title
  |--------------------------------------------------------------------------
  */

  if (titleWords.length === 1) {
    titleWords.push("Basics");
  }


  return titleWords.join(" ");
};