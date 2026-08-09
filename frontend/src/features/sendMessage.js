import api from '../../utils/axios'

async function sendMessage(payload) {
 try {
    console.log("POST /agents/chat:", payload)
    const {data} = await api.post("/agents/chat", payload, {
      timeout: 120000,
    })
    console.log("POST /agents/chat response:", data)
    return data
 } catch (error) {
    console.error("Failed to send message:", error)
    throw error
 }
}

export default sendMessage
