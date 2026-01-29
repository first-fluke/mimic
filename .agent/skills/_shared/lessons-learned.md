# Lessons Learned

Repository of lessons accumulated across sessions. All agents reference this file at execution start.
QA Agent and Orchestrator add new lessons after session completion.

---

## How to Use

### Reading (All Agents)
- At Complex task start: Read your domain section to prevent same mistakes
- Medium tasks: Reference if relevant items exist
- Simple tasks: Can skip

### Writing (QA Agent, Orchestrator)
Add in this format after session completion:
```markdown
### {YYYY-MM-DD}: {agent-type} - {One-line summary}
- **Problem**: {What went wrong}
- **Cause**: {Why it happened}
- **Solution**: {How it was fixed}
- **Prevention**: {How to prevent in the future}
```

---

## Backend Lessons

> This section is referenced by backend-agent, debug-agent (for backend bugs).

### Initial Lessons (Record during project setup)
- **Use SQLAlchemy 2.0 style only**: Use `select()` instead of `query()`. Legacy style generates warnings.
- **Always review Alembic autogenerate**: Auto-generated migrations may lack indexes or have wrong types.
- **FastAPI Depends chain**: Calling other Depends inside dependency functions may cause ordering issues. Verify with tests.
- **async/await consistency**: Don't mix sync/async in one router. Unify all to async.

---

## Frontend Lessons

> This section is referenced by frontend-agent, debug-agent (for frontend bugs).

### Initial Lessons
- **Next.js App Router**: `useSearchParams()` must be used inside `<Suspense>` boundary. Otherwise build error occurs.
- **shadcn/ui components**: Import path is `@/components/ui/button` not `shadcn/ui`.
- **TanStack Query v5**: First argument of `useQuery` is object format `{ queryKey, queryFn }`. Cannot use v4's `useQuery(key, fn)` format.
- **Tailwind dark mode**: `dark:` prefix only works with `darkMode: 'class'` setting.

---

## Mobile Lessons

> This section is referenced by mobile-agent, debug-agent (for mobile bugs).

### Initial Lessons
- **Riverpod 2.4+ code generation**: When using `@riverpod` annotation, `build_runner` execution is required. Run `dart run build_runner build` before build.
- **GoRouter redirect**: Returning current path in redirect function causes infinite loop. Always return `null` to indicate no redirect.
- **Flutter 3.19+ Material 3**: `useMaterial3: true` is default. M3 is applied even without explicit ThemeData setting.
- **Network in iOS simulator**: Use `127.0.0.1` instead of localhost. Or `10.0.2.2` for Android.

---

## QA / Security Lessons

> This section is referenced by qa-agent.

### Initial Lessons
- **Rate limiting check method**: Send consecutive requests with `curl` to verify 429 response. Code review alone is insufficient.
- **CORS wildcard**: Using `*` in development is OK, but must restrict to specific domains in production builds.
- **npm audit vs safety**: Frontend uses `npm audit`, backend (Python) uses `pip-audit` or `safety check`.

---

## Debug Lessons

> This section is referenced by debug-agent.

### Initial Lessons
- **React hydration error**: Caused by code where server/client values differ like `Date.now()`, `Math.random()`, `window.innerWidth`. Wrap with `useEffect` + `useState`.
- **N+1 query detection**: Set `echo=True` in SQLAlchemy to log all queries. If same pattern queries repeat, it's N+1.
- **Flutter hot reload state loss**: StatefulWidget's initState doesn't re-run on hot reload. Put state initialization logic in didChangeDependencies.

---

## Cross-Domain Lessons

> All agents reference this.

### Initial Lessons
- **API contract mismatch**: Backend uses `snake_case`, frontend expects `camelCase` causes parsing failure. Casing must be specified in contract.
- **Timezone issues**: Backend stores in UTC, frontend displays in local timezone. Unify to ISO 8601 format.
- **Auth token delivery**: Be careful of mistakes where backend expects `Authorization: Bearer {token}` but frontend sends `token` header.

---

## Lesson Addition Protocol

### When QA Agent Adds
When discovering recurring issues during review:
1. Add lesson to relevant domain section
2. Format: `### {Date}: {One-line summary}` + Problem/Cause/Solution/Prevention
3. Serena: `edit_memory("lessons-learned.md", additional content)`

### When Orchestrator Adds
When there are failed tasks at session end:
1. Analyze failure cause
2. Add lesson to relevant domain section
3. Prevent same mistakes in next session

### When Lessons Become Too Many (50+)
- Move old lessons (6+ months) to archive
- Delete lessons invalidated by framework version upgrades
- Do this manually (agents should not delete arbitrarily)
