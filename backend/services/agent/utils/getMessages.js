import axios from "axios";

export const getMessages = async (conversationId, userId) => {
  const { data } = await axios.get(`${process.env.CHAT_SERVICE}/messages`, {
    params: { conversationId },
    headers: { "x-user-id": userId },
  });

  return Array.isArray(data) ? data : [];
};

export const getUserMessages = async (userId) => {
  const { data } = await axios.get(`${process.env.CHAT_SERVICE}/memory/messages`, {
    headers: { "x-user-id": userId },
  });

  return Array.isArray(data) ? data : [];
};
