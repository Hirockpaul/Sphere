# Coding Agent TODO

- [x] Inspect the existing Agent Service architecture, agents, tools, gateway, and frontend contract
- [x] Inspect the existing LangGraph state and main router
- [x] Inspect the central LLM configuration
- [x] Inspect the existing conversation memory implementation
- [x] Add Zod as a direct Agent Service dependency
- [x] Implement deterministic coding intent detection for all eight supported intents
- [x] Define and export the structured coding response and file schemas
- [x] Extend LangGraph state with `codingIntent` and `codingResponse`
- [x] Implement the Coding Agent using `getModel("coding")`
- [x] Reuse bounded existing conversation memory without duplicating the current prompt
- [x] Implement structured generation and multi-file responses
- [x] Implement code review responses and issue severity metadata
- [x] Implement debugging and uncertainty guidance
- [x] Implement code explanation responses
- [x] Implement behavior-preserving refactoring responses
- [x] Implement architecture responses
- [x] Implement test generation responses
- [x] Implement documentation responses
- [x] Validate model output, relative file paths, safe file content, and supported intents
- [x] Add controlled retry and error handling for memory, LLM, and malformed output failures
- [x] Connect the Coding Agent to the existing LangGraph router flow
- [x] Add structured coding fields to the API response without breaking existing fields
- [x] Add tests for intents, schemas, generation, review, debug, explain, refactor, architecture, tests, documentation, multi-file output, follow-ups, empty prompts, missing memory, validation failure, and LLM failure
- [x] Run Agent Service tests and syntax checks
- [x] Run the frontend production build
- [x] Verify Chat, Search, and all existing agents still compile
- [x] Record required environment configuration and final architecture

## Verification and performance

- Normal coding requests use deterministic routing and one Coding LLM invocation when structured output is valid.
- Explicit current-documentation requests are the only coding requests that use Tavily or Firecrawl.
- Coding memory is limited to six recent messages and embeds persisted artifact files for targeted follow-ups.
- Runtime timing is available with `SPHERE_PERF_LOGGING=true`; it reports router, memory/research, LLM, validation, total duration, and Coding LLM call count without prompt or credential content.
- The automated performance contract verifies one generation call for simple and complex valid requests and at most one corrective call for malformed output. Provider retries remain configured as `maxRetries: 1`.
- Each OpenRouter invocation has an application-enforced deadline (`OPENROUTER_TIMEOUT_MS`, default 90 seconds), shorter than the frontend request deadline. A timeout uses the existing Chat model once as a structured coding fallback.
