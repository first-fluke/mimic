# [Feature Name] Specification

**Status:** [Draft/Review/Approved]
**Owner:** [Name]
**Date:** [YYYY-MM-DD]

## 1. Overview
### 1.1 Goal
*Why are we building this? What problem does it solve?*

### 1.2 User Value
*What is the benefit for the user?*

### 1.3 Scope
**In Scope:**
*   [Feature 1]
*   [Feature 2]

**Out of Scope:**
*   [Feature 3]

## 2. User Stories
| Actor | Action | Goal/Benefit | Priority |
| ----- | ------ | ------------ | -------- |
| User  | ...    | ...          | P0       |

## 3. UI/UX Design
*(Describe the user flow, screens, and interactions)*
- **Screen 1:** Description...
- **Screen 2:** Description...

## 4. Technical Implementation

### 4.1 Architecture Changes
*Which components are affected? (Web, API, Mobile, Worker, AI)*

### 4.2 Database Schema (`ERD.md`)
```mermaid
erDiagram
    %% Add new tables or modifications here
```

### 4.3 API Design
**GET /api/v1/resource**
- **Auth**: [Bearer / Public]
- **Params**:
  - `cursor`: [string]
  - `limit`: [int, default 20]
- **Response**: `200 OK` (Schema Name)
- **Error Cases**:
  - `400`: Invalid parameters
  - `401`: Unauthorized

*(See `references/API_DESIGN_GUIDELINES.md` for naming and error specs)*

### 4.4 AI & Performance
- **Latency Target**: [e.g. < 200ms or Async]
- **Cost Controls**: [Token limits, Quotas]
- **Idempotency**: [Required for POST? Yes/No]

### 4.5 Mobile & Offline
- **Offline support**: [Yes/No]
- **Retry Policy**: [Standard/Aggressive/None]

## 5. Implementation Plan
1.  [ ] Database Migration
2.  [ ] API Implementation
3.  [ ] Frontend UI
4.  [ ] Integration Tests
