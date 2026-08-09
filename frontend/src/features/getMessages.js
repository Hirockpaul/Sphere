import api from '../../utils/axios'

async function getMessages(conversationId) {
  if (!conversationId) return []

  try {
    const { data } = await api.get('/chat/messages', {
      params: { conversationId },
    })
    return Array.isArray(data) ? data : []
  } catch(error) {
    console.error('Failed to fetch messages:', error)
    return []
  }
}

export default getMessages
