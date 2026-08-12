import api from '../../utils/axios'

const configuredTimeout = Number(import.meta.env.VITE_AGENT_TIMEOUT_MS);
const AGENT_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout >= 30000
  ? configuredTimeout
  : 300000;

async function sendMessage(payload) {
 try {
    const {data} = await api.post("/agents/chat", payload, {
      timeout: AGENT_TIMEOUT_MS,
    })
    return data
 } catch (error) {
    console.error("Failed to send message:", error)
    throw error
 }
}

export default sendMessage
