import { useCallback } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import sendMessage from "../features/sendMessage";
import getMessages from "../features/getMessages";
import {
  addMessage,
  removeMessage,
  replaceMessage,
  replaceMessagesFrom,
  setGeneration,
  setMessages,
} from "../redux/messageSlice";
import { updateConversation } from "../redux/conversationSlice";

export default function useChatRequest() {
  const dispatch = useDispatch();
  const store = useStore();
  const selectedConversation = useSelector((state) => state.conversation.selectedConversation);
  const isGenerating = useSelector((state) => state.message.isGenerating);

  const submit = useCallback(async (prompt, options = {}) => {
    const conversationId = options.conversationId || selectedConversation?._id;
    const cleanPrompt = prompt?.trim();
    if (!cleanPrompt || !conversationId || store.getState().message.isGenerating) return false;

    const mode = options.mode || "send";
    const tempId = `pending-${crypto.randomUUID()}`;
    const failedRequest = { prompt: cleanPrompt, conversationId, ...options };
    dispatch(setGeneration({ isGenerating: true, agent: options.agent }));

    if (mode === "send") {
      dispatch(addMessage({
        _id: tempId,
        conversationId,
        role: "user",
        content: cleanPrompt,
        createdAt: new Date().toISOString(),
        pending: true,
      }));
    } else if (mode === "edit") {
      dispatch(replaceMessagesFrom({
        messageId: options.messageId,
        message: { ...options.originalMessage, content: cleanPrompt, pending: true },
      }));
    } else if (mode === "regenerate") {
      dispatch(removeMessage(options.assistantMessageId));
    }

    try {
      const data = await sendMessage({
        prompt: cleanPrompt,
        conversationId,
        mode,
        messageId: options.messageId,
        assistantMessageId: options.assistantMessageId,
        agent: options.agent,
        sourceImage: options.sourceImage,
      });
      if (!data?.assistantMessage) throw new Error("The agent returned an invalid response.");

      const activeId = store.getState().message.conversationId;
      if (activeId === conversationId) {
        if (mode === "send" && data.userMessage) {
          dispatch(replaceMessage({ id: tempId, message: data.userMessage }));
        } else if (mode === "edit" && data.userMessage) {
          dispatch(replaceMessage({ id: options.messageId, message: data.userMessage }));
        }
        const artifact = Array.isArray(data.codingResponse?.files) && data.codingResponse.files.length > 0
          ? {
              responseType: data.codingResponse.responseType,
              summary: data.codingResponse.summary,
              files: data.codingResponse.files,
            }
          : undefined;
        const pdf = data.pdf?.key
          ? {
              key: data.pdf.key,
              filename: data.pdf.filename,
              title: data.pdf.title,
            }
          : undefined;
        const presentation = data.presentation?.key
          ? { key: data.presentation.key, filename: data.presentation.filename, title: data.presentation.title, slides: data.presentation.slides }
          : undefined;
        const assistantMessage = {
          ...data.assistantMessage,
          ...(artifact && !data.assistantMessage.artifact ? { artifact } : {}),
          ...(pdf && !data.assistantMessage.pdf ? { pdf } : {}),
          ...(presentation && !data.assistantMessage.presentation ? { presentation } : {}),
        };
        dispatch(addMessage(assistantMessage));
      }
      if (data.conversation) dispatch(updateConversation(data.conversation));
      dispatch(setGeneration({ isGenerating: false }));
      return true;
    } catch (error) {
      const persisted = await getMessages(conversationId);
      if (store.getState().message.conversationId === conversationId) {
        dispatch(setMessages({ conversationId, messages: persisted }));
      }
      dispatch(setGeneration({
        isGenerating: false,
        error: error.code === "ECONNABORTED"
          ? "The model did not finish within the configured wait time. OpenRouter may be busy; retry the request."
          : error.response?.data?.message || error.message || "Sphere couldn't complete that response.",
        failedRequest,
      }));
      return false;
    }
  }, [dispatch, selectedConversation?._id, store]);

  const retry = useCallback(async () => {
    const failed = store.getState().message.failedRequest;
    if (!failed) return;
    const persisted = await getMessages(failed.conversationId);
    const last = persisted.at(-1);
    const retryMode = last?.role === "user" && last.content === failed.prompt ? "retry" : failed.mode;
    await submit(failed.prompt, { ...failed, mode: retryMode });
  }, [store, submit]);

  return { submit, retry, isGenerating };
}
