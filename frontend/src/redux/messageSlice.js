import { createSlice } from "@reduxjs/toolkit";

const getArtifacts = (messages) => messages
    .filter((message) => Array.isArray(message?.artifact?.files) && message.artifact.files.length > 0)
    .map((message) => ({ ...message.artifact, messageId: message._id || message.messageId }));

const syncArtifacts = (state, { selectNewest = false } = {}) => {
    state.artifacts = getArtifacts(state.messages);
    const selectionExists = state.artifacts.some((artifact) => artifact.messageId === state.activeArtifactMessageId);
    if (selectNewest || !selectionExists) {
        state.activeArtifactMessageId = state.artifacts.at(-1)?.messageId || null;
    }
};

const messageSlice = createSlice({
    name: "message",
    initialState: {
        messages: [],
        conversationId: null,
        isGenerating: false,
        generationAgent: "auto",
        generationError: "",
        failedRequest: null,
        composerDraft: null,
        artifacts: [],
        activeArtifactMessageId: null
    },
    reducers: {
      
         setMessages: (state, action) => {
            const payload = action.payload;
            state.messages = Array.isArray(payload) ? payload : (Array.isArray(payload?.messages) ? payload.messages : []);
            state.conversationId = payload?.conversationId || null;
            syncArtifacts(state, { selectNewest: true });
        },
        addMessage: (state, action) => {
            if (!action.payload?.conversationId || action.payload.conversationId === state.conversationId) {
                state.messages.push(action.payload);
                syncArtifacts(state, { selectNewest: Boolean(action.payload?.artifact) });
            }
        },
        replaceMessage: (state, action) => {
            const index = state.messages.findIndex((item) => item._id === action.payload.id);
            if (index >= 0) {
                state.messages[index] = action.payload.message;
                syncArtifacts(state);
            }
        },
        replaceMessagesFrom: (state, action) => {
            const index = state.messages.findIndex((item) => item._id === action.payload.messageId);
            if (index >= 0) {
                state.messages.splice(index, state.messages.length - index, action.payload.message);
                syncArtifacts(state);
            }
        },
        removeMessage: (state, action) => {
            state.messages = state.messages.filter((item) => item._id !== action.payload);
            syncArtifacts(state);
        },
        setGeneration: (state, action) => {
            state.isGenerating = Boolean(action.payload?.isGenerating);
            state.generationAgent = state.isGenerating ? action.payload?.agent || "auto" : "auto";
            state.generationError = action.payload?.error || "";
            state.failedRequest = action.payload?.failedRequest || null;
        },
        setComposerDraft: (state, action) => {
            state.composerDraft = action.payload;
        },
        selectArtifact: (state, action) => {
            const messageId = action.payload;
            if (state.artifacts.some((artifact) => artifact.messageId === messageId)) {
                state.activeArtifactMessageId = messageId;
            }
        }

    },

});

export const { setMessages, addMessage, replaceMessage, replaceMessagesFrom, removeMessage, setGeneration, setComposerDraft, selectArtifact } = messageSlice.actions;
export default messageSlice.reducer;
