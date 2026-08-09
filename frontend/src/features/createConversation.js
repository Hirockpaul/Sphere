 import api from "../../utils/axios"
export const createConversation = async () => {
    const { data } = await api.post("/chat/conversations")
    return data
}
