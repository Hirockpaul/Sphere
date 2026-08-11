import detectLanguage from "./detectLanguage.js";
import { getFileName, normalizeArtifactFiles } from "./artifactUtils.js";

const escapeClosingTag = (content, tag) => content.replace(new RegExp(`</${tag}`, "gi"), `<\\/${tag}`);

export const canPreview = (files) => {
  const normalized = normalizeArtifactFiles(files);
  const languages = normalized.map((file) => detectLanguage(file.path));
  return languages.includes("html")
    && languages.every((language) => ["html", "css", "javascript"].includes(language));
};

export const createPreview = (files) => {
  const normalized = normalizeArtifactFiles(files);
  if (!canPreview(normalized)) return null;

  const htmlFile = normalized.find((file) => getFileName(file.path).toLowerCase() === "index.html")
    || normalized.find((file) => detectLanguage(file.path) === "html");
  const css = normalized.filter((file) => detectLanguage(file.path) === "css")
    .map((file) => `/* ${file.path} */\n${file.content}`).join("\n\n");
  const javascript = normalized.filter((file) => detectLanguage(file.path) === "javascript")
    .map((file) => `// ${file.path}\n${file.content}`).join("\n\n");
  let html = htmlFile.content;

  const errorBridge = `<script>
window.addEventListener("error", function (event) {
  parent.postMessage({ type: "sphere-preview-error", message: event.message || "Preview runtime error" }, "*");
});
window.addEventListener("unhandledrejection", function (event) {
  parent.postMessage({ type: "sphere-preview-error", message: String(event.reason || "Unhandled preview error") }, "*");
});
</script>`;
  const styleTag = css ? `<style>${escapeClosingTag(css, "style")}</style>` : "";
  const scriptTag = javascript ? `<script>${escapeClosingTag(javascript, "script")}</script>` : "";

  html = /<head(?:\s[^>]*)?>/i.test(html)
    ? html.replace(/<head(?:\s[^>]*)?>/i, (openingTag) => `${openingTag}${errorBridge}${styleTag}`)
    : `${errorBridge}${styleTag}${html}`;
  html = /<\/body\s*>/i.test(html)
    ? html.replace(/<\/body\s*>/i, `${scriptTag}</body>`)
    : `${html}${scriptTag}`;
  return html;
};
