export const CODING_INTENTS = Object.freeze({
  GENERATE: "generate",
  REVIEW: "review",
  DEBUG: "debug",
  EXPLAIN: "explain",
  REFACTOR: "refactor",
  ARCHITECTURE: "architecture",
  TEST: "test",
  DOCUMENTATION: "documentation",
});

const INTENT_RULES = [
  [CODING_INTENTS.REVIEW, /\b(review|audit|critique|code quality|security scan)\b/i],
  [CODING_INTENTS.DEBUG, /\b(debug|fix|error|exception|failing|failure|bug|crash|not working|undefined|nullpointer|stack trace)\b/i],
  [CODING_INTENTS.EXPLAIN, /\b(explain|walk me through|what does|how does|understand this)\b/i],
  [CODING_INTENTS.REFACTOR, /\b(refactor|restructure|clean up|simplify|improve maintainability|optimi[sz]e)\b/i],
  [CODING_INTENTS.ARCHITECTURE, /\b(architect(?:ure)?|system design|design a scalable|data flow|api boundaries|database design|schema design)\b/i],
  [CODING_INTENTS.TEST, /\b(unit tests?|integration tests?|test cases?|write tests?|jest|vitest|pytest|junit|testing library)\b/i],
  [CODING_INTENTS.DOCUMENTATION, /\b(readme|document(?:ation)?|api docs?|setup guide|docstrings?|code comments?|environment documentation)\b/i],
];

export const detectCodingIntent = (prompt = "") => {
  const normalizedPrompt = typeof prompt === "string" ? prompt.trim() : "";
  for (const [intent, pattern] of INTENT_RULES) {
    if (pattern.test(normalizedPrompt)) return intent;
  }
  return CODING_INTENTS.GENERATE;
};

