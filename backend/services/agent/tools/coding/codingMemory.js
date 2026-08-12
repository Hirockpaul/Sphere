export const toCodingMessage = (message) => {
  const role = message?.role;
  const content = typeof message?.content === "string" ? message.content : "";
  const files = Array.isArray(message?.artifact?.files) ? message.artifact.files : [];
  if (role !== "assistant" || files.length === 0) {
    return { role, content };
  }

  const artifactContext = files
    .map((file) => {
      const safePath = String(file.path).replaceAll('"', "&quot;");
      return `<file path="${safePath}">\n${file.content}\n</file>`;
    })
    .join("\n");

  return {
    role,
    content: `${content}\n\nCurrent generated artifact files:\n${artifactContext}`,
  };
};
