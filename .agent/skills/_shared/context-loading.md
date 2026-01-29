# Dynamic Context Loading Guide

Agents should not read all resources at once, but load only necessary resources according to task type.
This saves context window and prevents confusion from irrelevant information.

---

## Loading Order (Common to All Agents)

### Always Load (Required)
1. `SKILL.md` — Auto-loaded (provided by Antigravity)
2. `resources/execution-protocol.md` — Execution protocol

### Load at Task Start
3. `../_shared/difficulty-guide.md` — Difficulty judgment (Step 0)

### Load by Difficulty
4. **Simple**: Implement immediately without additional loading
5. **Medium**: `resources/examples.md` (reference similar examples)
6. **Complex**: `resources/examples.md` + `resources/tech-stack.md` + `resources/snippets.md`

### Load as Needed During Execution
7. `resources/checklist.md` — Load at Step 4 (Verify)
8. `resources/error-playbook.md` — Load only when errors occur
9. `../_shared/common-checklist.md` — For Complex task final verification
10. `../_shared/serena-memory-protocol.md` — Only in CLI mode

---

## Agent-Specific Task Type → Resource Mapping

### Backend Agent

| Task Type | Required Resources |
|-----------|-------------------|
| CRUD API creation | snippets.md (route, schema, model, test) |
| Auth implementation | snippets.md (JWT, password) + tech-stack.md |
| DB migration | snippets.md (migration) |
| Performance optimization | examples.md (N+1 example) |
| Existing code modification | examples.md + Serena MCP |

### Frontend Agent

| Task Type | Required Resources |
|-----------|-------------------|
| Component creation | snippets.md (component, test) + component-template.tsx |
| Form implementation | snippets.md (form + Zod) |
| API integration | snippets.md (TanStack Query) |
| Styling | tailwind-rules.md |
| Page layout | snippets.md (grid) + examples.md |

### Mobile Agent

| Task Type | Required Resources |
|-----------|-------------------|
| Screen creation | snippets.md (screen, provider) + screen-template.dart |
| API integration | snippets.md (repository, Dio) |
| Navigation | snippets.md (GoRouter) |
| Offline features | examples.md (offline example) |
| State management | snippets.md (Riverpod) |

### Debug Agent

| Task Type | Required Resources |
|-----------|-------------------|
| Frontend bug | common-patterns.md (Frontend section) |
| Backend bug | common-patterns.md (Backend section) |
| Mobile bug | common-patterns.md (Mobile section) |
| Performance bug | common-patterns.md (Performance section) + debugging-checklist.md |
| Security bug | common-patterns.md (Security section) |

### QA Agent

| Task Type | Required Resources |
|-----------|-------------------|
| Security review | checklist.md (Security section) |
| Performance review | checklist.md (Performance section) |
| Accessibility review | checklist.md (Accessibility section) |
| Full audit | checklist.md (full) + self-check.md |

### PM Agent

| Task Type | Required Resources |
|-----------|-------------------|
| New project planning | examples.md + task-template.json + api-contracts/template.md |
| Feature addition planning | examples.md + Serena MCP (understanding existing structure) |
| Refactoring planning | Serena MCP only |

---

## Orchestrator Only: When Constructing Sub-agent Prompts

When Orchestrator constructs sub-agent prompts, refer to the mapping above and
include only resource paths matching the task type in the prompt.

```
Prompt construction:
1. Core Rules section from agent SKILL.md
2. execution-protocol.md
3. Resources matching task type (refer to table above)
4. error-playbook.md (always included — recovery essential)
5. Serena Memory Protocol (CLI mode)
```

This maximizes sub-agent context efficiency by not loading unnecessary resources.
