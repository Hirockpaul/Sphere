import {Code2,FileText, Globe2, Image as ImageIcon, MessageSquare, Mic, Paperclip, Presentation, Send, X, Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import useChatRequest from "../hooks/useChatRequest";
import { setComposerAgent, setComposerDraft, setMessages } from "../redux/messageSlice";
import { createConversation } from "../features/createConversation";
import {
  addConversation,
  setSelectedConversation,
} from "../redux/conversationSlice";

const agentModes = [
  { id: "auto", label: "Auto", icon: Zap, description: "Choose the best mode for your request." },
  { id: "chat", label: "Chat", icon: MessageSquare, description: "Ask questions and explore ideas." },
  { id: "coding", label: "Coding", icon: Code2, description: "Write, debug, explain, and improve code." },
  { id: "pdf", label: "PDF", icon: FileText, description: "Create professional PDF documents." },
  { id: "ppt", label: "PPT", icon: Presentation, description: "Create presentations, slides, and pitch decks." },
  { id: "image", label: "Image", icon: ImageIcon, description: "Generate and work with images." },
  { id: "search", label: "Search", icon: Globe2, description: "Research information from the web." },
];

function ChatInput({ compact = false }) {
  const [message, setMessage] = useState("");
  const [selectedMode, setSelectedMode] = useState("auto");
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [sourceImage, setSourceImage] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [analysisImage, setAnalysisImage] = useState(null);
  const [attachmentError, setAttachmentError] = useState("");
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const dispatch = useDispatch();
  const { selectedConversation } = useSelector((state) => state.conversation);
  const { generationError, composerDraft } = useSelector((state) => state.message);
  const { submit, retry, isGenerating } = useChatRequest();

  useEffect(() => {
    if (!composerDraft) return;
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(composerDraft.content.length, composerDraft.content.length);
    });
  }, [composerDraft]);
  useEffect(() => { dispatch(setComposerAgent(selectedMode)); }, [dispatch, selectedMode]);

  const resizeTextarea = (event) => {
    const textarea = event.currentTarget;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  };

  const submitMessage = async (event) => {
    event.preventDefault();

    const prompt = (composerDraft?.content ?? message).trim();
    if (!prompt || isGenerating || isCreatingConversation) return;
    setMessage("");

    let conversation = selectedConversation;
    try {
      if (!conversation?._id) {
        setIsCreatingConversation(true);
        conversation = await createConversation();
        dispatch(addConversation(conversation));
        dispatch(setSelectedConversation(conversation));
        dispatch(setMessages({ conversationId: conversation._id, messages: [] }));
      }

      const succeeded = await submit(prompt, {
        ...(composerDraft && !composerDraft.draftOnly ? {
          mode: "edit",
          messageId: composerDraft.messageId,
          originalMessage: composerDraft.originalMessage,
        } : {}),
        conversationId: conversation._id,
        agent: selectedMode,
        ...(selectedMode === "image" && sourceImage ? { sourceImage } : {}),
        ...(selectedMode === "pdfRag" && pdfFile ? { file: pdfFile } : {}),
        ...(selectedMode === "imageAnalyzer" && analysisImage ? { file: analysisImage } : {}),
      });
      if (succeeded) setSourceImage(null);
      if (succeeded) setPdfFile(null);
      if (succeeded) setAnalysisImage(null);
      if (succeeded && composerDraft) dispatch(setComposerDraft(null));
      if (!succeeded) setMessage(prompt);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      setMessage(prompt);
    } finally {
      setIsCreatingConversation(false);
    }
  };
  const attachImage = (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) return; const reader = new FileReader(); reader.onload = () => { const [, data] = String(reader.result).split(",", 2); setSourceImage({ mimeType: file.type, data, name: file.name }); }; reader.readAsDataURL(file); };
  const attachFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAttachmentError("");
    if (file.size > 20 * 1024 * 1024) {
      setAttachmentError("Files must be 20 MB or smaller.");
      return;
    }
    if (file.type === "application/pdf") {
      setPdfFile(file);
      setAnalysisImage(null);
      setSourceImage(null);
      setSelectedMode("pdfRag");
      return;
    }
    if (["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      if (selectedMode === "image") {
        if (file.size > 10 * 1024 * 1024) {
          setAttachmentError("Image-generation references must be 10 MB or smaller.");
          return;
        }
        attachImage({ target: { files: [file], value: "" } });
      } else {
        setAnalysisImage(file);
        setPdfFile(null);
        setSourceImage(null);
        setSelectedMode("imageAnalyzer");
      }
      return;
    }
    setAttachmentError("Upload a PDF, PNG, JPEG, or WebP file.");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className={`w-full shrink-0 bg-[var(--sphere-bg)] px-3 ${compact ? 'pb-3' : 'py-4'} md:px-5`}>
      <form
        onSubmit={submitMessage}
        className="composer mx-auto flex w-full max-w-4xl flex-col rounded-[22px] border border-[var(--sphere-input-border)] bg-[var(--sphere-input)] px-4 pb-3 pt-4 sm:px-5"
      >
        <div className="mode-strip mb-3 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {agentModes.map(({ id, label, icon: Icon, description }) => {
            const isSelected = selectedMode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedMode(id)}
                title={description}
                data-tooltip={description}
                aria-pressed={isSelected}
                className={`mode-button flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px] font-medium sm:px-3.5 ${isSelected
                  ? "mode-button-active border-[#8b73ff] bg-[var(--sphere-purple)] text-white"
                  : "border-white/[0.06] bg-white/[0.025] text-slate-500"
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        {selectedMode === "image" && sourceImage && <div className="mb-3 flex items-center justify-between rounded-lg border border-white/[.08] px-3 py-2 text-xs"><span className="truncate">Editing: {sourceImage.name}</span><button type="button" onClick={() => setSourceImage(null)} aria-label="Remove attached image"><X size={14} /></button></div>}
        {selectedMode === "pdfRag" && pdfFile && <div className="mb-3 flex items-center justify-between rounded-lg border border-white/[.08] px-3 py-2 text-xs"><span className="truncate">PDF: {pdfFile.name}</span><button type="button" onClick={() => setPdfFile(null)} aria-label="Remove attached PDF"><X size={14} /></button></div>}
        {selectedMode === "imageAnalyzer" && analysisImage && <div className="mb-3 flex items-center justify-between rounded-lg border border-white/[.08] px-3 py-2 text-xs"><span className="truncate">Image: {analysisImage.name}</span><button type="button" onClick={() => setAnalysisImage(null)} aria-label="Remove attached image"><X size={14} /></button></div>}
        {attachmentError && <p role="alert" className="mb-3 text-xs text-[var(--sphere-error)]">{attachmentError}</p>}
        {composerDraft && !composerDraft.draftOnly && (
          <div className="flex items-center justify-between rounded-lg bg-[#25232F] px-3 py-2 text-xs text-[var(--sphere-purple-hover)]">
            <span>Editing your message</span>
            <button type="button" onClick={() => { dispatch(setComposerDraft(null)); setMessage(""); }} title="Cancel editing" aria-label="Cancel editing" className="grid h-6 w-6 place-items-center rounded-md hover:bg-white/[0.08]"><X size={14} /></button>
          </div>
        )}
        <label htmlFor="chat-message" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-message"
          ref={textareaRef}
          value={composerDraft?.content ?? message}
          onChange={(event) => composerDraft
            ? dispatch(setComposerDraft({ ...composerDraft, content: event.target.value }))
            : setMessage(event.target.value)}
          onInput={resizeTextarea}
          onKeyDown={handleKeyDown}
          placeholder={selectedMode === "pdfRag" ? "Ask a question about your PDF..." : selectedMode === "imageAnalyzer" ? "Ask a question about your image..." : "What would you like to create?"}
          rows={3}
          className="max-h-40 min-h-28 w-full resize-none bg-transparent py-2 text-base leading-relaxed text-[var(--sphere-text)] outline-none placeholder:text-slate-600 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:min-h-32"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <input ref={fileInputRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={attachFile} className="hidden" />
            <button
              type="button"
              title="Attach a file"
              aria-label="Attach a file"
              onClick={() => fileInputRef.current?.click()}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-white/[.07] hover:text-slate-300"
            >
              <Paperclip size={18} />
            </button>
            <button
              type="button"
              title="Use microphone"
              aria-label="Use microphone"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-white/[0.07] hover:text-slate-300"
            >
              <Mic size={18} />
            </button>
          </div>

          <button
            type="submit"
            disabled={!(composerDraft?.content ?? message).trim() || isGenerating || isCreatingConversation}
            title="Send message"
            aria-label="Send message"
            className="send-button grid h-10 w-10 place-items-center rounded-xl bg-[var(--sphere-purple)] text-white disabled:cursor-not-allowed disabled:bg-white/[0.07] disabled:text-[var(--sphere-text-muted)]"
          >
            <Send size={18} strokeWidth={2.4} />
          </button>
        </div>
      </form>
      {generationError && (
        <div role="alert" className="mt-2 flex items-center justify-center gap-2 text-xs text-[var(--sphere-error)]">
          <span>{generationError}</span>
          <button type="button" onClick={retry} className="rounded-md border border-red-400/20 px-2 py-1 font-medium hover:bg-red-400/10">Retry</button>
        </div>
      )}
      <p className="mx-auto mt-2 max-w-4xl text-center text-[11px] text-[var(--sphere-text-muted)]">
        Sphere can make mistakes. Verify important information.
      </p>
    </div>
  );
}

export default ChatInput;
