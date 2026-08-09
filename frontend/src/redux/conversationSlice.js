import { createSlice } from "@reduxjs/toolkit";

const conversationSlice = createSlice({
    name: "conversation",
    initialState: {
        conversations: [],
        selectedConversation:null
    },
    reducers: {
       setConversations: (state, action) => {
            const conversations = Array.isArray(action.payload) ? action.payload : [];
            state.conversations = conversations;

            const selectedId = state.selectedConversation?._id;
            state.selectedConversation =
                conversations.find((conversation) => conversation._id === selectedId) ||
                conversations[0] ||
                null;
        },
        addConversation: (state, action) => {
            if (!state.conversations.some((item) => item._id === action.payload?._id)) {
                state.conversations.unshift(action.payload);
            }
        },
        updateConversation: (state, action) => {
            const conversation = action.payload;
            const index = state.conversations.findIndex((item) => item._id === conversation?._id);
            if (index >= 0) state.conversations[index] = { ...state.conversations[index], ...conversation };
            if (state.selectedConversation?._id === conversation?._id) {
                state.selectedConversation = { ...state.selectedConversation, ...conversation };
            }
            state.conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        },
        removeConversation: (state, action) => {
            const removedId = action.payload;
            state.conversations = state.conversations.filter(
                (conversation) => conversation._id !== removedId,
            );
            if (state.selectedConversation?._id === removedId) {
                state.selectedConversation = state.conversations[0] || null;
            }
        },
         setSelectedConversation: (state, action) => {
            state.selectedConversation = action.payload;
        }

    },

});

export const { setConversations, addConversation, updateConversation, removeConversation, setSelectedConversation } = conversationSlice.actions;
export default conversationSlice.reducer;
