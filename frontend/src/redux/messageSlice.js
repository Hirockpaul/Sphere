import { createSlice } from "@reduxjs/toolkit";

const messageSlice = createSlice({
    name: "message",
    initialState: {
        messages: [],
        conversationId: null,
        isGenerating: false,
        generationError: "",
        failedRequest: null,
        composerDraft: null,
    },
    reducers: {
      
         setMessages: (state, action) => {
            const payload = action.payload;
            state.messages = Array.isArray(payload) ? payload : (Array.isArray(payload?.messages) ? payload.messages : []);
            state.conversationId = payload?.conversationId || null;
        },
        addMessage: (state, action) => {
            if (!action.payload?.conversationId || action.payload.conversationId === state.conversationId) state.messages.push(action.payload);
        },
        replaceMessage: (state, action) => {
            const index = state.messages.findIndex((item) => item._id === action.payload.id);
            if (index >= 0) state.messages[index] = action.payload.message;
        },
        replaceMessagesFrom: (state, action) => {
            const index = state.messages.findIndex((item) => item._id === action.payload.messageId);
            if (index >= 0) state.messages.splice(index, state.messages.length - index, action.payload.message);
        },
        removeMessage: (state, action) => {
            state.messages = state.messages.filter((item) => item._id !== action.payload);
        },
        setGeneration: (state, action) => {
            state.isGenerating = Boolean(action.payload?.isGenerating);
            state.generationError = action.payload?.error || "";
            state.failedRequest = action.payload?.failedRequest || null;
        },
        setComposerDraft: (state, action) => {
            state.composerDraft = action.payload;
        }

    },

});

export const { setMessages, addMessage, replaceMessage, replaceMessagesFrom, removeMessage, setGeneration, setComposerDraft } = messageSlice.actions;
export default messageSlice.reducer;
