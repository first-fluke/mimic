# AI & Mobile Considerations

## 1. AI Integration

### Latency & Timeout
-   **Hard Limits**: Set explicit timeouts for all LLM calls (e.g., 30s for generation).
-   **UX Handling**:
    -   < 2s: Synchronous wait allowed.
    -   > 2s: Must use Async Task (Cloud Tasks) + Polling/SSE/Push.
    -   **Spinner/Skeleton**: Mandatory for waiting states.

### Cost Control
-   **Token Limits**: Max output token params must be set per prompt type.
-   **Rate Limiting**: Per-user limits on expensive endpoints (e.g., "5 AI recipes per hour").
-   **Tiering**: Differentiate Free vs Premium model usage (Gemini Flash vs Pro).

### Idempotency (AI Specific)
-   **Prevent Duplication**: AI calls are expensive. Prevent double-charging/double-generation on network retries using `Idempotency-Key` or checking `job_id` status strictly.

## 2. Mobile & Network

### Network Environment
-   **Assumption**: User is on unstable 3G/LTE.
-   **Resilience**:
    -   **Retry Policy**: Exponential backoff for idempotent GET requests.
    -   **Offline Mode**: Critical generic data (e.g., categories, user profile) should be cached locally (Hive/SharedPrefs).
    -   **Optimistic Updates**: UI updates immediately; rollback on error.

### Internationalization (fallback)
-   **Safety Net**: Never crash if a translation key is missing.
-   **Fallback Chain**: `User Locale` -> `App Default (English)` -> `Key Name`.
