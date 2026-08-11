export const normalizeArtifactFiles = (files) => {
  if (!Array.isArray(files)) return [];
  const paths = new Set();

  return files.flatMap((file) => {
    if (typeof file?.path !== "string" || typeof file?.content !== "string") return [];
    const path = file.path.trim().replaceAll("\\", "/").replace(/^\.\//, "");
    if (!path || path.startsWith("/") || path.split("/").includes("..") || paths.has(path)) return [];
    paths.add(path);
    return [{ ...file, path, content: normalizeArtifactContent(file.content) }];
  });
};

export const normalizeArtifactContent = (content = "") => {
  let value = String(content);
  const slashContinuedLines = value.match(/\\\r?\n/g)?.length || 0;
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      const decoded = JSON.parse(value);
      if (typeof decoded === "string") value = decoded;
    } catch {
      const escapedQuotes = value.match(/\\"/g)?.length || 0;
      if (slashContinuedLines >= 2 || (/[\r\n]/.test(value) && escapedQuotes >= 2)) {
        value = value.slice(1, -1).replaceAll('\\"', '"');
      }
    }
  }
  if (slashContinuedLines >= 2) {
    value = value
      .replace(/\\\r?\n/g, "\n")
      .replaceAll('\\"', '"');
  }
  const hasEscapedLineBreak = value.includes("\\n") || value.includes("\\r\\n");
  if (!/[\r\n]/.test(value) && hasEscapedLineBreak) {
    value = value
      .replaceAll("\\r\\n", "\n")
      .replaceAll("\\n", "\n")
      .replaceAll("\\t", "  ");
  }
  const providerMarkers = value.match(/">/g)?.length || 0;
  if (!/[\r\n]/.test(value) && providerMarkers >= 3) {
    value = value
      .replace(/([A-Za-z0-9.!?])">(?=\s*<)/g, "$1\n")
      .replace(/(?<=[>;{},/\])])">/g, "\n")
      .replace(/">(?=\s*">)/g, "\n")
      .replaceAll("\\\"", '"');
  }
  return value;
};

export const getFileName = (path = "") => String(path).split("/").filter(Boolean).pop() || "file.txt";

export const formatAllFiles = (files) => normalizeArtifactFiles(files)
  .map((file) => `// ${file.path}\n\n${file.content}`)
  .join("\n\n");

export const slugify = (value = "project") => String(value)
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 60) || "sphere-project";

export const getArtifactsFromMessages = (messages) => (Array.isArray(messages) ? messages : [])
  .filter((message) => Array.isArray(message?.artifact?.files) && message.artifact.files.length > 0)
  .map((message) => ({ ...message.artifact, messageId: message._id || message.messageId }));

export const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const createProjectArchive = async (files, type = "blob") => {
  const zip = new JSZip();
  normalizeArtifactFiles(files).forEach((file) => zip.file(file.path, file.content));
  return zip.generateAsync({ type });
};

export const buildFileTree = (files) => {
  const root = [];
  normalizeArtifactFiles(files).forEach((file) => {
    let level = root;
    file.path.split("/").forEach((part, index, parts) => {
      const isFile = index === parts.length - 1;
      let node = level.find((item) => item.name === part && item.isFile === isFile);
      if (!node) {
        node = { name: part, path: parts.slice(0, index + 1).join("/"), isFile, children: [] };
        level.push(node);
      }
      level = node.children;
    });
  });

  const sort = (nodes) => nodes
    .sort((a, b) => Number(a.isFile) - Number(b.isFile) || a.name.localeCompare(b.name))
    .map((node) => ({ ...node, children: sort(node.children) }));
  return sort(root);
};
import JSZip from "jszip";
