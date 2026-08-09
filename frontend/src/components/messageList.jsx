import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import MessageBubble from './MessageBubble'
import useChatRequest from '../hooks/useChatRequest'
import { setComposerDraft } from '../redux/messageSlice'

function MessageList() {
    const { selectedConversation } = useSelector(state => state.conversation)
    const { messages, isGenerating } = useSelector(state => state.message)
    const { submit } = useChatRequest()
    const dispatch = useDispatch()
    const scrollRef = useRef(null)

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages, isGenerating])

    return (
        <div ref={scrollRef} className='flex-1 overflow-y-auto px-4 py-6 md:px-6 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>

            {messages.length == 0 || !selectedConversation ? (
                <div className='flex h-full flex-col items-center justify-center gap-4 text-center'>
                    <div className='flex flex-col gap-1.5'>
                        <h1 className='text-2xl font-semibold tracking-tight text-[var(--sphere-text)]'>Sphere</h1>
                        <p className='text-xl font-semibold tracking-tight text-[var(--sphere-text-secondary)]'>How can I help you?</p>
                        <p className='max-w-[320px] text-[15px] leading-relaxed text-[var(--sphere-text-muted)]'>Ask me anything - code, ideas, explanations, or just a quick question.</p>
                    </div>
                    <div className='flex flex-wrap justify-center gap-2 mt-1'>
                        {["Research the latest AI trends",
                            "Debug my code",
                            "Analyze a document"].map((s) => (
                                <button key={s} className='text-[12px] text-[var(--sphere-text-secondary)] bg-transparent border border-[var(--sphere-divider)]
                        py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-slate-200 transition-color duration-150 cursor-pointer'>
                                    {s}
                                </button>
                            ))}
                    </div>
                </div>
            ) :
                <div>
                    {messages.map((msg, index) => {
                        const previousUser = msg.role === 'assistant'
                            ? messages.slice(0, index).findLast((item) => item.role === 'user')
                            : null
                        const isLatestAssistant = msg.role === 'assistant' && !messages.slice(index + 1).some((item) => item.role === 'assistant')
                        return (
                        <MessageBubble
                            key={msg?._id || `${msg?.role}-${index}`}
                            role={msg?.role}
                            content={msg?.content}
                            isGenerating={isGenerating}
                            canRegenerate={isLatestAssistant}
                            onEdit={msg.role === 'user'
                                ? () => dispatch(setComposerDraft({ content: msg.content, messageId: msg._id, originalMessage: msg }))
                                : previousUser
                                    ? () => dispatch(setComposerDraft({ content: previousUser.content, messageId: previousUser._id, originalMessage: previousUser }))
                                    : null}
                            onRegenerate={() => submit(previousUser?.content, { mode: 'regenerate', assistantMessageId: msg._id })}
                        />
                    )})}
                    {isGenerating && (
                        <div className='mx-auto flex w-full max-w-4xl justify-start' role='status' aria-live='polite'>
                            <div className='flex items-center gap-2 px-1 py-3 text-sm text-[var(--sphere-text-secondary)]'>
                                <span>Sphere is thinking</span>
                                <span className='flex gap-1' aria-hidden='true'><i className='thinking-dot'/><i className='thinking-dot'/><i className='thinking-dot'/></span>
                            </div>
                        </div>
                    )}

                </div>
            }
        </div>
    )
}

export default MessageList
