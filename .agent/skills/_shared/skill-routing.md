# Skill Routing Map

Routing rules for Orchestrator and workflow-guide to assign tasks to the correct agent.

---

## Keyword → Skill Mapping

| User Request Keyword | Primary Skill | Notes |
|---------------------|--------------|-------|
| API, endpoint, REST, GraphQL, database, migration | **backend-agent** | |
| Auth, auth, JWT, login, register, password | **backend-agent** | May also create auth UI task for frontend |
| UI, component, component, page, form, screen (web) | **frontend-agent** | |
| Style, Tailwind, responsive, responsive, CSS | **frontend-agent** | |
| Mobile, iOS, Android, Flutter, React Native, app | **mobile-agent** | |
| Offline, push notification, camera, GPS | **mobile-agent** | |
| Bug, bug, error, crash, not working, broken, slow | **debug-agent** | |
| Review, review, security, security, performance, performance | **qa-agent** | |
| Accessibility, accessibility, WCAG, a11y | **qa-agent** | |
| Plan, plan, breakdown, breakdown, task, sprint | **pm-agent** | |
| Automatic, automatic, parallel, parallel, orchestrate | **orchestrator** | |
| Workflow, workflow, guide, manual, Agent Manager | **workflow-guide** | |

---

## Composite Request Routing

| Request Pattern | Execution Order |
|----------------|----------------|
| "Make a full-stack app" | pm → (backend + frontend) parallel → qa |
| "Make a mobile app" | pm → (backend + mobile) parallel → qa |
| "Full-stack + mobile" | pm → (backend + frontend + mobile) parallel → qa |
| "Fix bug and review" | debug → qa |
| "Add feature and test" | pm → relevant agent → qa |
| "Do everything automatically" | orchestrator (internally pm → agents → qa) |
| "I'll manage manually" | workflow-guide |

---

## Inter-Agent Dependency Rules

### Parallel Execution Possible (No Dependencies)
- backend + frontend (when API contract is predefined)
- backend + mobile (when API contract is predefined)
- frontend + mobile (independent of each other)

### Sequential Execution Required
- pm → all other agents (planning first)
- Implementation agents → qa (review after implementation)
- Implementation agents → debug (debugging after implementation)
- backend → frontend/mobile (when running in parallel without API contract)

### QA Always Last
- qa-agent runs after all implementation tasks complete
- Exception: Can run immediately when user requests review of specific files

---

## Escalation Rules

| Situation | Escalation Target |
|-----------|------------------|
| Agent discovers bug in different domain | Create task for debug-agent |
| CRITICAL found in QA | Re-run relevant domain agent |
| Architecture change needed | Request re-planning from pm-agent |
| Performance issue found (during implementation) | Current agent fixes, debug-agent if serious |
| API contract mismatch | orchestrator re-runs backend agent |

---

## Agent Turn Limit Guide

| Agent | Default Turns | Max Turns (including retries) |
|-------|--------------|------------------------------|
| pm-agent | 10 | 15 |
| backend-agent | 20 | 30 |
| frontend-agent | 20 | 30 |
| mobile-agent | 20 | 30 |
| debug-agent | 15 | 25 |
| qa-agent | 15 | 20 |
