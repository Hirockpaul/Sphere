import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import MessageBubble from './MessageBubble'
import useChatRequest from '../hooks/useChatRequest'
import { selectArtifact, setComposerDraft } from '../redux/messageSlice'
import { Bug, FileSearch, Image as ImageIcon, Presentation, Search } from 'lucide-react'
import sphereLogo from '../assets/img1.png'

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

const starterActions = [
    { label: 'Research latest AI trends', prompt: 'Research the latest AI trends', icon: Search },
    { label: 'Debug my code', prompt: 'Help me debug my code', icon: Bug },
    { label: 'Analyze a document', prompt: 'Help me analyze a document', icon: FileSearch },
    { label: 'Create a presentation', prompt: 'Create a professional presentation about', icon: Presentation },
]

function SphereMark() {
    return <img className='sphere-brand-logo' src={sphereLogo} alt='' aria-hidden='true' />
}

function MessageList({ compact = false }) {
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
        <div ref={scrollRef} className={`${compact ? 'welcome-content' : 'flex-1 px-4 py-6 md:px-6'} scroll-smooth overflow-y-auto overscroll-contain space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>

            {messages.length == 0 || !selectedConversation ? (
                <div className='flex h-full flex-col items-center justify-center gap-5 text-center'>
                    <div className='flex flex-col items-center gap-2'>
                        <SphereMark />
                        <h1 className='mt-1 text-[15px] font-semibold uppercase tracking-[0.18em] text-[var(--sphere-text-secondary)]'>Sphere</h1>
                        <p className='text-2xl font-semibold tracking-[-0.025em] text-[var(--sphere-text)] sm:text-[30px]'>{composerAgent === 'image' ? 'Create something visual' : 'What are we building today?'}</p>
                        <p className='max-w-xl text-sm leading-relaxed text-[var(--sphere-text-muted)] sm:text-[15px]'>{composerAgent === 'image' ? 'Describe the image you want to generate.' : 'Code, research, documents, presentations, images, and more.'}</p>
                    </div>
                    <div className='flex max-w-3xl flex-wrap justify-center gap-2'>
                        {(composerAgent === 'image'
                            ? [
                                { label: 'Futuristic city', prompt: 'Create a futuristic city at night', icon: ImageIcon },
                                { label: 'Restaurant hero image', prompt: 'Create a realistic restaurant hero image', icon: ImageIcon },
                                { label: 'Developer logo', prompt: 'Create a minimalist developer logo', icon: ImageIcon },
                              ]
                            : starterActions
                        ).map(({ label, prompt, icon: Icon }) => (
                                <button key={label} onClick={() => dispatch(setComposerDraft({ content: prompt, draftOnly: true }))} className='starter-action'>
                                    <Icon size={14} aria-hidden='true' />
                                    {label}
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
