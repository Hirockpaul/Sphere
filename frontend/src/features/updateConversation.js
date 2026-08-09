import api from "../../utils/axios";

export async function updateConversationTitle(conversationId, title) {
  const { data } = await api.patch("/chat/conversations", {
    id: conversationId,
    title,
  });
  return data;
}
