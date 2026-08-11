const TRANSIENT_MONGO_CODES = new Set([
  "EAI_AGAIN",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENETUNREACH",
  "MongoNetworkError",
  "MongoServerSelectionError",
]);

export const isTransientMongoError = (error) => {
  const values = [
    error?.code,
    error?.name,
    error?.cause?.code,
    error?.cause?.name,
  ].filter(Boolean);
  return values.some((value) => TRANSIENT_MONGO_CODES.has(value))
    || /EAI_AGAIN|server selection|network|timed?\s*out/i.test(error?.message || "");
};

export const withMongoRetry = async (operation, options = {}) => {
  const attempts = options.attempts || 3;
  const delays = options.delays || [300, 900];
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientMongoError(error) || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delays[attempt] ?? delays.at(-1) ?? 300));
    }
  }
  throw lastError;
};
