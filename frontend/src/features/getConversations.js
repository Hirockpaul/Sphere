 import api from "../../utils/axios"

export const getConversations = async () => {
    try {
      
        const {data} = await api.get("/api/chat/get-conversations")
         console.log( data)
         return data
        
    } catch (error) {
        console.log(error)
    }
}