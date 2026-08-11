import assert from "node:assert/strict";
import test from "node:test";
import reducer, { addMessage, removeMessage, selectArtifact, setMessages } from "../src/redux/messageSlice.js";

const artifactMessage = (id, path) => ({
  _id: id,
  conversationId: "conversation-1",
  role: "assistant",
  content: `Generated ${path}`,
  artifact: {
    responseType: "files",
    summary: path,
    files: [{ path, language: "javascript", content: `// ${path}` }],
  },
});

test("historical artifact responses can be selected and reopened", () => {
  let state = reducer(undefined, setMessages({
    conversationId: "conversation-1",
    messages: [artifactMessage("old", "old.js"), artifactMessage("new", "new.js")],
  }));
  assert.equal(state.activeArtifactMessageId, "new");

  state = reducer(state, selectArtifact("old"));
  assert.equal(state.activeArtifactMessageId, "old");
  assert.equal(state.artifacts.find((artifact) => artifact.messageId === "old").files[0].path, "old.js");

  state = reducer(state, addMessage({ conversationId: "conversation-1", role: "assistant", content: "No code" }));
  assert.equal(state.activeArtifactMessageId, "old");

  state = reducer(state, removeMessage("old"));
  assert.equal(state.activeArtifactMessageId, "new");
});

test("a newly generated artifact becomes the active workspace", () => {
  let state = reducer(undefined, setMessages({ conversationId: "conversation-1", messages: [] }));
  state = reducer(state, addMessage(artifactMessage("first", "index.html")));
  assert.equal(state.activeArtifactMessageId, "first");
});
