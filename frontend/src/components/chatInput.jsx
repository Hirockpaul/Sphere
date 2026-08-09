import { Send, Mic, Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import useChatRequest from "../hooks/useChatRequest";
import { setComposerDraft } from "../redux/messageSlice";

function ChatInput() {
  const [message, setMessage] = useState("");
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

  const resizeTextarea = (event) => {
    const textarea = event.currentTarget;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  };

  const submitMessage = async (event) => {
    event.preventDefault();

    const prompt = (composerDraft?.content ?? message).trim();
    if (!prompt || isGenerating || !selectedConversation?._id) return;
    setMessage("");
    const succeeded = await submit(prompt, composerDraft ? {
      mode: "edit",
      messageId: composerDraft.messageId,
      originalMessage: composerDraft.originalMessage,
    } : undefined);
    if (succeeded && composerDraft) dispatch(setComposerDraft(null));
    if (!succeeded) setMessage(prompt);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="w-full shrink-0 bg-[var(--sphere-bg)] px-3 py-4 md:px-5">
      <form
        onSubmit={submitMessage}
        className="mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-2xl border border-[var(--sphere-input-border)] bg-[var(--sphere-input)] px-4 pb-3 pt-4 transition focus-within:border-[var(--sphere-purple)]"
      >
        {composerDraft && (
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
          placeholder="Ask anything..."
          rows={2}
          className="max-h-40 min-h-14 w-full resize-none bg-transparent text-[15px] leading-relaxed text-[var(--sphere-text)] outline-none placeholder:text-[var(--sphere-text-muted)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <input ref={fileInputRef} type="file" className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach a file"
              aria-label="Attach a file"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-white/[0.07] hover:text-slate-300"
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
            disabled={!(composerDraft?.content ?? message).trim() || isGenerating || !selectedConversation?._id}
            title="Send message"
            aria-label="Send message"
            className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--sphere-purple)] text-white transition hover:bg-[var(--sphere-purple-hover)] disabled:cursor-not-allowed disabled:bg-white/[0.07] disabled:text-[var(--sphere-text-muted)]"
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
        Sphere can make mistakes. Check important information.
      </p>
    </div>
  );
}

export default ChatInput;
