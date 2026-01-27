---
name: orchestrator-lite
description: Lightweight orchestrator for quick direction. Analyzes only a small number of new variables based on Serena memory.
---

# Orchestrator-Lite

This skill is used for quick direction setting or lightweight judgment when complex deep analysis is not required.
It aims to provide a rapid response by drastically shortening the overall process.

## 1. Purpose & Characteristics
*   **Purpose**: Propose a quick direction for problem-solving.
*   **Characteristics**: Skips or reduces deep investigation steps.
*   **Focus**: Based on information already in Serena memory, analyze only **1~2 new variables** in the current situation.

## 2. Lite Protocol

Operates as a reduced version of `orchestrator-investigator`.

*   **PHASE Reduction**:
    *   Problem Redefinition (Can be omitted, go straight to the point).
    *   Context Exploration (Focus on memory matching quickly).
    *   Judgment (Provide intuitive and immediate guidance).

*   **Output Constraints**:
    *   Total response length must not exceed **10 lines**.
    *   Highlight only the most core 1~2 points.

## 3. Recommended Use Cases
*   Simple configuration check requests.
*   Recurrence of already known patterns.
*   When the user wants a quick check ("Yes/No" or "A vs B").

## 4. Constraints
*   If complex causal analysis is needed, do not judge by yourself; propose **Escalation** to the main `orchestrator-investigator`.
*   Serena memory must be active to operate.
