---
name: mimic-qa
description: "Perform end-to-end QA testing on the MIMIC extension. Use this skill to verify core functionalities like shell hooking, analysis, synthesis, and sidebar UI."
---

# MIMIC QA Tester

This skill guides you through a comprehensive QA test suite for the MIMIC extension.

## Test Areas

### 1. Shell Integration (Real-time Perception)
**Goal**: Verify that terminal commands are captured in `~/.mimic/events.jsonl`.

**Steps**:
1. Run the test script below to simulate shell commands.
2. Check if the commands appear in the log file.

```bash
# Run simulation script
./.agent/skills/mimic-qa/scripts/test_shell.sh
```

**Expected Result**:
- Script executes `echo "MIMIC_QA_TEST_$(date)"`.
- `tail ~/.mimic/events.jsonl` shows a new line with that command.

### 2. Analysis Engine
**Goal**: Verify that patterns are analyzed.

**Steps**:
1. Open Command Palette.
2. Run `MIMIC: Analyze Patterns`.

**Expected Result**:
- Notification "MIMIC: Pattern analysis..." appears.
- New insight files (`*.md`) appear in `~/.mimic/insights/` (if enough events exist).

### 3. Skill Synthesis
**Goal**: Verify skill generation.

**Steps**:
1. Check Sidebar "Synthesize Shell Script" button.
2. If disabled, hover to see "Need X more insights".
3. If enabled, click it.

**Expected Result**:
- A new editor tab opens with a generated shell script or markdown file.
- "Save" prompt appears.

### 4. Sidebar UI
**Checklist**:
- [ ] Section "Quick Actions" is visible.
- [ ] Section "Skills" shows installed skills.
- [ ] "Quota & Account" shows login status.

## Diagnostic
If any test fails, run the troubleshooting skill:
`@mimic-troubleshooter`
