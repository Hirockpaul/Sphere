import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import MessageBubble from './MessageBubble'
import useChatRequest from '../hooks/useChatRequest'
import { selectArtifact, setComposerDraft } from '../redux/messageSlice'

const thinkingStates = {
    coding: { label: 'Sphere is building', color: '#38bdf8' },
    image: { label: 'Sphere is creating', color: '#f472b6' },
    imageAnalyzer: { label: 'Sphere is analyzing the image', color: '#a78bfa' },
    pdf: { label: 'Sphere is preparing your PDF', color: '#fb7185' },
    pdfRag: { label: 'Sphere is reading your PDF', color: '#fbbf24' },
    ppt: { label: 'Sphere is designing your presentation', color: '#fb923c' },
    search: { label: 'Sphere is searching', color: '#34d399' },
    chat: { label: 'Sphere is thinking', color: '#818cf8' },
    auto: { label: 'Sphere is thinking', color: '#818cf8' },
}

function ThinkingIndicator({ agent }) {
    const state = thinkingStates[agent] || thinkingStates.auto
    return (
        <div className='mx-auto flex w-full max-w-4xl justify-start' role='status' aria-live='polite' aria-label={state.label}>
            <div className='agent-thinking' style={{ '--thinking-color': state.color }}>
                <span className='thinking-orb' aria-hidden='true'><i /></span>
                <span className='thinking-label'>{state.label}</span>
                <span className='thinking-dots' aria-hidden='true'>
                    <i /><i /><i />
                </span>
            </div>
        </div>
    )
}

function MessageList() {
    const { selectedConversation } = useSelector(state => state.conversation)
    const { messages, isGenerating, generationAgent, activeArtifactMessageId, composerAgent } = useSelector(state => state.message)
    const { submit } = useChatRequest()
    const dispatch = useDispatch()
    const scrollRef = useRef(null)
    const bottomRef = useRef(null)

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        })
        return () => window.cancelAnimationFrame(frame)
    }, [messages, isGenerating])

    return (
        <div ref={scrollRef} className='flex-1 scroll-smooth overflow-y-auto overscroll-contain px-4 py-6 md:px-6 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>

            {messages.length == 0 || !selectedConversation ? (
                <div className='flex h-full flex-col items-center justify-center gap-4 text-center'>
                    <div className='flex flex-col gap-1.5'>
                        <h1 className='text-2xl font-semibold tracking-tight text-[var(--sphere-text)]'>{composerAgent === 'image' ? 'Create something visual' : 'Sphere'}</h1>
                        <p className='text-xl font-semibold tracking-tight text-[var(--sphere-text-secondary)]'>{composerAgent === 'image' ? 'Describe the image you want to generate.' : 'How can I help you?'}</p>
                        {composerAgent !== 'image' && <p className='max-w-[320px] text-[15px] leading-relaxed text-[var(--sphere-text-muted)]'>Ask me anything - code, ideas, explanations, or just a quick question.</p>}
                    </div>
                    <div className='flex flex-wrap justify-center gap-2 mt-1'>
                        {(composerAgent === 'image' ? ["Create a futuristic city at night", "Create a realistic restaurant hero image", "Create a minimalist developer logo"] : ["Research the latest AI trends", "Debug my code", "Analyze a document"]).map((s) => (
                                <button key={s} onClick={() => composerAgent === 'image' && dispatch(setComposerDraft({ content: s, draftOnly: true }))} className='px-3 text-[12px] text-[var(--sphere-text-secondary)] bg-transparent border border-[var(--sphere-divider)]
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
                            images={msg?.images}
                            imagePrompt={previousUser?.content}
                            artifact={msg?.artifact}
                            pdf={msg?.pdf}
                            presentation={msg?.presentation}
                            artifactActive={(msg?._id || msg?.messageId) === activeArtifactMessageId}
                            onOpenArtifact={() => dispatch(selectArtifact(msg?._id || msg?.messageId))}
                            isGenerating={isGenerating}
                            canRegenerate={isLatestAssistant}
                            onEdit={msg.role === 'user'
                                ? () => dispatch(setComposerDraft({ content: msg.content, messageId: msg._id, originalMessage: msg }))
                                : previousUser
                                    ? () => dispatch(setComposerDraft({ content: previousUser.content, messageId: previousUser._id, originalMessage: previousUser }))
                                    : null}
                            onRegenerate={() => submit(previousUser?.content, {
                                mode: 'regenerate',
                                assistantMessageId: msg._id,
                                ...(Array.isArray(msg.images) && msg.images.length ? { agent: 'image' } : {}),
                                ...(msg.pdf?.key ? { agent: 'pdf' } : {}),
                                ...(msg.presentation?.key ? { agent: 'ppt' } : {}),
                            })}
                        />
                    )})}
                    {isGenerating && (
                        <ThinkingIndicator agent={generationAgent} />
                    )}
                    <div ref={bottomRef} className='h-px scroll-mb-4' aria-hidden='true' />

                </div>
            }
        </div>
    )
}

export default MessageList
