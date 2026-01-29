# Reasoning Templates

Fill in the blanks of these templates when multi-step reasoning is needed.
Proceed to the next step **only after completing each step** to avoid losing direction mid-way.

---

## 1. Debugging Reasoning (Debug Agent, Backend/Frontend/Mobile Agent)

Repeat the following loop when finding the cause of a bug. If unresolved after 3 iterations, record `Status: blocked`.

```
=== Hypothesis #{N} ===

Observation: {Error message, symptom, reproduction conditions}
Hypothesis: "{Phenomenon} is caused by {estimated cause}"
Verification method: {How to check — code reading, logs, tests, etc.}
Verification result: {What was actually confirmed}
Judgment: Correct / Incorrect

If correct → Move to fix step
If incorrect → Write new hypothesis #{N+1}
```

**Example:**
```
=== Hypothesis #1 ===
Observation: "Cannot read property 'map' of undefined" in TodoList
Hypothesis: ".map() is called on todos while it's in undefined state before API response"
Verification method: Check initial value of todos in TodoList component
Verification result: No initial value in useState() → undefined
Judgment: Correct → Set default value of todos to []
```

---

## 2. Architecture Decision (PM Agent, Backend Agent)

Fill out this matrix when technology selection or design decisions are needed.

```
=== Decision: {What needs to be chosen} ===

Options:
  A: {Option A}
  B: {Option B}
  C: {Option C} (if applicable)

Evaluation criteria and scores (1-5):
| Criteria         | A | B | C | Weight |
|-----------------|---|---|---|--------|
| Performance     |   |   |   | {H/M/L} |
| Implementation complexity |   |   |   | {H/M/L} |
| Team familiarity |   |   |   | {H/M/L} |
| Scalability    |   |   |   | {H/M/L} |
| Consistency with existing code |   |   |   | {H/M/L} |

Conclusion: {Option}
Reason: {1-2 line rationale}
Trade-off: {Why giving up advantages of unchosen options}
```

**Example:**
```
=== Decision: State Management Library ===

Options:
  A: Zustand
  B: Redux Toolkit
  C: React Context

| Criteria         | A | B | C | Weight |
|-----------------|---|---|---|--------|
| Performance     | 4 | 4 | 3 | M     |
| Implementation complexity | 5 | 3 | 4 | H     |
| Team familiarity | 3 | 5 | 5 | M     |
| Scalability    | 4 | 5 | 2 | M     |
| Consistency with existing code | 2 | 5 | 3 | H |

Conclusion: Redux Toolkit
Reason: Existing code uses RTK, highest team familiarity
Trade-off: Giving up Zustand's simplicity but ensuring consistency
```

---

## 3. Cause-Effect Chain (Debug Agent)

Use this to trace execution flow step by step in complex bugs.

```
=== Execution Flow Trace ===

1. [Entry point]   {file:function} - {input value}
2. [Call]     {file:function} - {passed value}
3. [Processing]     {file:function} - {transformation/logic}
4. [Failure point] {file:function} - {where something different from expected happened}
   - Expected: {expected behavior}
   - Actual: {actual behavior}
   - Cause: {why different}
5. [Result]     {Error message or incorrect output}
```

**Example:**
```
1. [Entry point]   pages/todos.tsx:TodoPage - User accesses /todos
2. [Call]     hooks/useTodos.ts:useTodos - Calls fetchTodos()
3. [Processing]     api/todos.ts:fetchTodos - Requests GET /api/todos
4. [Failure point] hooks/useTodos.ts:23 - Returns data as undefined
   - Expected: data = [] (empty array)
   - Actual: data = undefined (before fetch completes)
   - Cause: initialData not set in useQuery
5. [Result]     undefined.map() in TodoList → TypeError
```

---

## 4. Refactoring Judgment (All Implementation Agents)

Use this when deciding "whether to fix or leave as is" when modifying code.

```
=== Refactoring Judgment ===

Current code problem: {What is the issue}
Relation to task: Directly related / Indirectly related / Unrelated

Directly related → Fix it
Indirectly related → Record in result but only fix within current task scope
Unrelated     → Only record in result (never fix)
```

---

## 5. Performance Bottleneck Analysis (Debug Agent, QA Agent)

Systematically find bottlenecks when reported as "slow".

```
=== Performance Bottleneck Analysis ===

Measurements:
  - Total response time: {ms}
  - DB query time: {ms} ({N} queries)
  - Business logic: {ms}
  - Serialization/Rendering: {ms}

Bottleneck location: {Step taking the longest time}
Cause: {N+1 queries / heavy computation / large response / missing index / ...}
Solution: {Specific fix method}
Expected improvement: {X}ms → {Y}ms
```

---

## Usage Rules

1. **When to use**: Mandatory for Complex difficulty tasks, recommended for Medium
2. **Where to record**: Record reasoning process in `progress-{agent-id}.md`
3. **If unable to fill blanks**: First collect that information (Serena, code reading, log checking)
4. **If unresolved after 3 iterations**: Include `Status: blocked` + reasoning so far in result
