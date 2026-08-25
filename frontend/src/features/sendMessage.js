import api from '../../utils/axios'

const configuredTimeout = Number(import.meta.env.VITE_AGENT_TIMEOUT_MS);
const AGENT_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout >= 30000
  ? configuredTimeout
  : 300000;

async function sendMessage(payload) {
 try {
    let requestBody = payload;
    if (payload.file) {
      requestBody = new FormData();
      for (const [key, value] of Object.entries(payload)) {
        if (value == null) continue;
        requestBody.append(
          key,
          typeof value === "object" && !(value instanceof File)
            ? JSON.stringify(value)
            : value,
        );
      }
    }
    const {data} = await api.post("/agents/chat", requestBody, {
      timeout: AGENT_TIMEOUT_MS,
    })
    return data
 } catch (error) {
    console.error("Failed to send message:", error)
    throw error
 }
}

export default sendMessage
