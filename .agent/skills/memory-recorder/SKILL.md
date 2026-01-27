---
name: memory-recorder
description: Recording skill that selectively saves only long-term valuable facts to Serena memory.
---

# Memory-Recorder

This skill manages the project's long-term memory, Serena.
Its purpose is to prevent indiscriminate data storage and strictly select **high-value reusable information** for structured recording.

## 1. Memory Storage Principles

### Storage Whitelist (Save)
*   System structural information that rarely changes over time (Architecture, Environment configs).
*   Confirmed facts that are repeatedly referenced.
*   Behaviors verified by official documents or actual tests/logs.
*   Finalized conclusions reached after debate (Decision Records).
*   Frequently occurring failure patterns and solutions (Troubleshooting Guide).

### Storage Blacklist (Do Not Save)
*   Simple guesses or unverified hypotheses.
*   Uncertain possibilities like "Items might be...".
*   Temporary phenomena or issues limited to specific transient situations.
*   Subjective judgments or impressions.
*   Unverified experiment results.

## 2. Memory Initialization Template

When initializing memory for a new project or module, use the following template to structure it.

```markdown
# [Project/Module Name] Context

## Basic Info
- Service Name:
- Runtime Environment:
- Main Language / Framework:
- Communication Protocol:
- Key Infra Components (Proxy, CDN, LB, etc.):

## Architecture Fixed Facts
- Request/Response Flow:
- Streaming / Buffering Characteristics:
- Timeout / Connection Policy:

## Fact Base
- [Source: Log/Test] ...
- [Source: Doc] ...

## Known Patterns
### [Pattern Name]
- Occurrence Condition:
- Solution / Response:
```

## 3. Memory Update Rules during Incident Response

Follow these rules when updating memory during an Incident.

1.  **Post-Resolution**: Record only after the incident is fully resolved and the cause is solidified. Do not record hypotheses during resolution.
2.  **Field Data First**: If existing memory conflicts with new actual field data, prioritize and record the latest field data (overwrite) and specify the change history.
3.  **Clarity**: Write concisely so anyone can understand "What was the problem and how was it solved".

## 4. Usage Method

When the Orchestrator or User requests "Remember this," or when a significant discovery is made, use the `write_memory` tool to record it.
You must adhere to the principles above to judge the value of the information before writing.
