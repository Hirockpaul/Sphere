const LANGUAGE_BY_EXTENSION = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  json: "json",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  md: "markdown",
  markdown: "markdown",
  py: "python",
  java: "java",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  c: "c",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  yaml: "yaml",
  yml: "yaml",
  xml: "xml",
};

export default function detectLanguage(fileName = "") {
  const normalized = String(fileName).trim().toLowerCase();
  const extension = normalized.includes(".") ? normalized.split(".").pop() : "";
  return LANGUAGE_BY_EXTENSION[extension] || "text";
}
