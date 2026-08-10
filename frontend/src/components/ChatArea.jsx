import { useEffect } from "react";
import Nav from "./Nav";
import MessageList from "./messageList";
import ChatInput from "./chatInput";
import { useDispatch, useSelector, useStore } from "react-redux";
import getMessages from "../features/getMessages";
import { setComposerDraft, setMessages } from "../redux/messageSlice";

function ChatArea() {
    const { selectedConversation } = useSelector(state => state.conversation)
    const dispatch = useDispatch()
    const store = useStore()

    useEffect(() => {
        let cancelled = false
        dispatch(setComposerDraft(null))

        const getMesg = async () => {
            if (selectedConversation?._id) {
                const data = await getMessages(selectedConversation._id)
                if (cancelled) return
                const messageState = store.getState().message
                if (
                    messageState.conversationId === selectedConversation._id &&
                    (messageState.isGenerating || messageState.messages.length > 0)
                ) return
                dispatch(setMessages({ conversationId: selectedConversation._id, messages: data }))
            } else {
                dispatch(setMessages({ conversationId: null, messages: [] }))
            }
        }

        getMesg()

        return () => {
            cancelled = true
        }
    }, [dispatch, selectedConversation?._id, store])

    return (
        <div className='flex-1 flex flex-col bg-[var(--sphere-bg)]'>
            <Nav />
            <MessageList />
            <ChatInput />
        </div>

    )
}
export default ChatArea
