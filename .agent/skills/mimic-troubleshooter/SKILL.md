---
name: mimic-troubleshooter
description: "Diagnose and fix issues within the MIMIC extension project. Use this skill when the user reports 'stuttering', build failures, or when you need to self-diagnose extension errors."
---

# MIMIC Troubleshooter

This skill helps you diagnose and fix common issues in the MIMIC VS Code extension development workflow.

## When to Use

- User reports "stuttering" or "lag" (performance issues).
- Build or Packaging (`vsce package`) fails.
- Extension features (like the sidebar or shell hook) are not appearing or working.
- You need to verify the integrity of the project environment (node_modules, out folder).

## Workflow

### 1. Quick Diagnosis
Run the diagnosis script to check for common signs of trouble:
```bash
./.agent/skills/mimic-troubleshooter/scripts/diagnose.sh
```

### 2. Common Fixes

#### Build Failures
- **Symptom**: `npm run compile` fails or `vsce package` errors.
- **Action**: Check `problems` in the IDE or run `npm run compile` manually to see TS errors.
- **Common Cause**: Duplicate variable declarations (e.g., `outputChannel`), missing imports, or interface mismatches.

#### "Stuttering" / Performance
- **Symptom**: User says the agent is slow or "berbucking" (Korean for stuttering/lagging).
- **Action**:
    1. Check if `ActivityWatcher` is flooding logs to `~/.mimic/events.jsonl`.
    2. run `tail -f ~/.mimic/events.jsonl` to see if it's spamming.
    3. Check `Extension Host` logs in VS Code for infinite loops or frequent errors.

#### Shell Hook Not Working
- **Symptom**: Commands not logging.
- **Action**:
    1. Check `~/.zshrc` for `source .../mimic-zsh.sh`.
    2. Verify `mimic.enableRealtimePerception` is `true` in settings.
    3. Run `source ~/.zshrc` manually.

## Reference
See [COMMON_ERRORS.md](references/common-errors.md) for a database of known error patterns and solutions.
