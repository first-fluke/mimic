# Clarification Protocol

"Assuming and proceeding" when requirements are ambiguous usually leads in the wrong direction.
Follow this protocol to secure clear requirements before execution.

---

## Required Check Items

If any of the following items are unclear, **do not assume** — record explicitly.

### Common to All Agents
| Item | Confirmation Question | Default (when assuming) |
|------|----------------------|------------------------|
| Target users | Who will use this service? | General web users |
| Core features | What are the 3 must-have features? | Inferred from task description |
| Tech stack | Are there specific framework constraints? | Project default stack |
| Authentication | Is login required? | JWT authentication included |
| Scope | Is it MVP or complete feature? | MVP |

### Backend Agent Additional Checks
| Item | Confirmation Question | Default |
|------|----------------------|--------|
| DB choice | PostgreSQL? MongoDB? SQLite? | PostgreSQL |
| API style | REST? GraphQL? | REST |
| Auth method | JWT? Session? OAuth? | JWT (access + refresh) |
| File upload | Needed? Size limit? | Not needed |

### Frontend Agent Additional Checks
| Item | Confirmation Question | Default |
|------|----------------------|--------|
| SSR/CSR | Is server-side rendering needed? | Next.js App Router (SSR) |
| Dark mode | Support needed? | Supported |
| Internationalization | Multi-language support? | Not needed |
| Existing design system | Which UI library to use? | shadcn/ui |

### Mobile Agent Additional Checks
| Item | Confirmation Question | Default |
|------|----------------------|--------|
| Platform | iOS only? Android only? Both? | Both |
| Offline | Is offline support needed? | Not needed |
| Push notifications | Needed? | Not needed |
| Minimum OS | iOS/Android minimum version? | iOS 14+, Android API 24+ |

---

## Response by Ambiguity Level

### Level 1: Slightly Ambiguous (Core is clear, details lacking)
Example: "Make a TODO app"

**Response**: Apply defaults and record assumptions list in result
```
⚠️ Assumptions:
- JWT authentication included
- PostgreSQL database
- REST API
- MVP scope (CRUD only)
```

### Level 2: Quite Ambiguous (Core features unclear)
Example: "Make a user management system"

**Response**: Narrow down to 3 core features explicitly and proceed
```
⚠️ Interpreted scope (3 core features):
1. User registration + login (JWT)
2. Profile management (view/edit)
3. Admin user list (admin role only)

NOT included (would need separate task):
- Role-based access control (beyond admin/user)
- Social login (OAuth)
- Email verification
```

### Level 3: Very Ambiguous (Direction itself unclear)
Example: "Make a good app", "Improve this"

**Response**: Do not proceed, record clarification request in result
```
❌ Cannot proceed: Requirements too ambiguous

Questions needed:
1. What is the app's primary purpose?
2. Who are the target users?
3. What are the 3 must-have features?
4. Are there existing designs or wireframes?

Status: blocked (awaiting clarification)
```

---

## PM Agent Only: Requirements Specification Framework

When PM Agent receives ambiguous requests, specify using this framework:

```
=== Requirements Specification ===

Original request: "{User's original text}"

1. Core goal: {Define in one sentence}
2. User stories:
   - "As a {user}, I want to {action} so that {benefit}"
   - (At least 3)
3. Feature scope:
   - Must-have: {List}
   - Nice-to-have: {List}
   - Out-of-scope: {List}
4. Technical constraints:
   - {Existing code / stack / compatibility}
5. Success criteria:
   - {Measurable conditions}
```

---

## Application in Sub-agent Mode

CLI sub-agents cannot ask users directly.
Therefore:

1. **Level 1**: Apply defaults + record assumptions → proceed
2. **Level 2**: Narrow scope with interpretation + specify → proceed
3. **Level 3**: `Status: blocked` + question list → do not proceed

Orchestrator receives Level 3 results, delivers questions to the user,
and re-runs the agent after receiving answers.
