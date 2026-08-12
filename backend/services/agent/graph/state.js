import { Annotation } from "@langchain/langgraph"

export const AgentState = Annotation.Root({
    prompt:Annotation(),
    aiResponse:Annotation(),
    agent:Annotation(),
    conversationId:Annotation(),
    userId:Annotation(),
    messages:Annotation(),
    searchIntent:Annotation(),
    searchResults:Annotation(),
    toolResult:Annotation(),
    images:Annotation(),
    artifacts:Annotation(),
    codingIntent:Annotation(),
    codingResponse:Annotation(),
    imageIntent:Annotation(),
    imagePrompt:Annotation(),
    sourceImage:Annotation(),
})
