import api from "../../utils/axios";

export async function deleteConversation(conversationId) {
  if (!conversationId) return;
  await api.delete(`/chat/conversations/${conversationId}`);
}
