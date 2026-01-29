# Context Budget Management

Context window is finite. Especially in Flash-tier models, unnecessary loading directly degrades performance.
Follow this guide to use context efficiently.

---

## Core Principles

1. **No full file reading** — Read only necessary functions/classes
2. **No duplicate reading** — Don't re-read already read files
3. **Lazy resource loading** — Load only necessary resources at necessary times
4. **Keep records** — Memo read files and symbols in progress

---

## File Reading Strategy

### When Using Serena MCP (Recommended)

```
❌ Bad: read_file("app/api/todos.py")          ← Entire file 500 lines
✅ Good: find_symbol("create_todo")              ← That function 30 lines
✅ Good: get_symbols_overview("app/api")          ← Function list only
✅ Good: find_referencing_symbols("TodoService")  ← Usage locations only
```

### When Reading Files Without Serena

```
❌ Bad: Reading entire file at once
✅ Good: Check first 50 lines of file (import + class definition) → Read only necessary functions
```

---

## Resource Loading Budget

### Flash-tier Models (128K Context)

| Category | Budget | Notes |
|----------|--------|-------|
| SKILL.md | ~800 tokens | Auto-loaded |
| execution-protocol.md | ~500 tokens | Always loaded |
| Task resource 1 | ~500 tokens | Selected by difficulty |
| Task resource 2 | ~500 tokens | Complex only |
| error-playbook.md | ~800 tokens | Only on error |
| **Total Resource Budget** | **~3,100 tokens** | ~2.4% of total |
| **Working Budget** | **~125K tokens** | Rest of capacity |

### Pro-tier Models (1M+ Context)

| Category | Budget | Notes |
|----------|--------|-------|
| Resource budget | ~5,000 tokens | Can load generously |
| Working budget | ~1M tokens | Large files possible |

Pro has less budget pressure, but unnecessary loading still distracts attention.

---

## Track Read Files (Record in Progress)

Agents record read files/symbols when updating progress:

```markdown
## Turn 3 Progress

### Read Files
- app/api/todos.py: create_todo(), update_todo() (find_symbol)
- app/models/todo.py: Todo class (find_symbol)
- app/schemas/todo.py: Entire file (short file, 40 lines)

### Not Yet Read
- app/services/todo_service.py (to read next turn)
- tests/test_todos.py (to reference after implementation)

### Completed Work
- Added priority field to TodoCreate schema
```

This ensures:
- No duplicate file reading
- Clear what to do next turn
- Orchestrator can understand agent state

---

## Large File Handling Strategy

### Files 500+ Lines

1. Understand structure with `get_symbols_overview`
2. Read only necessary symbols with `find_symbol`
3. Never read entire file

### Complex Components (React/Flutter)

1. Read only component's props/state definitions first
2. Read render/build method only when modification needed
3. Skip style section if not modification target

### Test Files

1. Read only after implementation complete (unnecessary before)
2. Check only existing test patterns (first 1-2 test functions)
3. Write rest following the pattern

---

## Context Overflow Signs & Response

| Sign | Meaning | Response |
|------|---------|----------|
| Forgets previously read code | Context window exhausted | Memo key info in progress, make re-reference possible |
| Re-reads same file | Poor tracking | Check "read files" list in progress |
| Output suddenly shortens | Output token shortage | Write only essentials, omit additional explanations |
| Ignores instructions | Forgot SKILL.md content | Re-reference only execution-protocol essentials |
