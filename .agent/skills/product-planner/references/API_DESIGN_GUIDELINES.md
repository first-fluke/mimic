# API Design Guidelines

## 1. Common Rules (공통 규칙)

### Authentication
-   **Header**: `Authorization: Bearer <token>`
-   **Policy**: Define explicit scope per endpoint (e.g., `user:read`, `admin:write`, or `public`).

### Localization
-   **Method**: Use `Accept-Language` header.
-   **Default**: `en` if not specified or unsupported.
-   **Fallback**: If strict localization fails, fall back to English or the closest available locale.

### Pagination
-   **Style**: Cursor-based preferred for feeds/lists (better performance with large datasets). Limit/Offset allowed for small admin tables.
-   **Params**:
    -   `cursor` (string, encoded)
    -   `limit` (int, default: 20, max: 100)
-   **Response**:
    ```json
    {
      "items": [...],
      "next_cursor": "string_or_null"
    }
    ```

### Naming Conventions
-   **Method**: `snake_case` for JSON fields and query parameters (aligns with Python/Pydantic).
-   **URL**: `kebab-case` for resource names (e.g., `/api/v1/recipe-books`).

## 2. Endpoint Standards (각 API 필수 요건)

### Request Schema
-   **Validation**: Strict typing via Pydantic.
-   **Constraints**: Define `min_length`, `max_length`, `regex`, `ge/le` for numbers.
-   **Enums**: Use string enums for fixed values.

### Response Schema
-   **Explicit Fields**: No `dict` or `Any`. All fields must be typed.
-   **Nullable**: Explicitly mark optional fields.
-   **Computed Fields**: Document any calculated properties clearly.

### Error Specifications
-   **Structure**:
    ```json
    {
      "status": 400,
      "code": "resource_not_found",
      "message": "The recipe was not found.",
      "details": { "recipe_id": "123" }
    }
    ```
-   **Standard Codes**: Define project-wide error codes in `src/lib/exceptions.py`.

### Idempotency
-   **Requirement**: Critical for payment, coin deduction, and AI generation endpoints.
-   **Header**: `Idempotency-Key` (UUID).
-   **Behavior**: Retry with same key returns cached success response without re-executing logic.

### Versioning
-   **Strategy**: URI Versioning (`/api/v1/...`).
-   **Breaking Changes**: Additive changes only within a version. Removals require v2.

## 3. Testing & generation

### Code Generation
-   **Backend**: Pydantic models -> `openapi.json` (auto-generated).
-   **Frontend/Mobile**: `openapi.json` -> Orval/Retrofit clients. Ensure types are perfectly synced.

### Test Coverage
-   **Success Case**: Happy path verification.
-   **Failure Cases**:
    -   Validation errors (422)
    -   Auth errors (401/403)
    -   Not found (404)
    -   Logic conflicts (409)
