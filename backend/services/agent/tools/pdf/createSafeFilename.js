const MAX_BASE_NAME_LENGTH = 80;
const FALLBACK_BASE_NAME = "sphere-document";

export const createSafeFilename = (title) => {
  const baseName = typeof title === "string"
    ? title
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, MAX_BASE_NAME_LENGTH)
        .replace(/-+$/g, "")
    : "";

  return baseName || FALLBACK_BASE_NAME;
};
