const getTextContent = (content) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
};

export const separateSystemMessages = (messages) => {
  const systemContent = [];
  const conversation = [];

  for (const message of Array.isArray(messages) ? messages : []) {
    if (["system", "developer"].includes(message?.role)) {
      const content = getTextContent(message.content).trim();
      if (content) systemContent.push(content);
    } else {
      conversation.push(message);
    }
  }

  return { systemContent, conversation };
};
