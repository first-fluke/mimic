# Difficulty Assessment & Protocol Branching

All agents judge difficulty at task start and apply appropriate protocol depth.

## Difficulty Assessment Criteria

### Simple
- Single file change
- Clear requirements (e.g., "change button color", "add field")
- Repeating existing patterns
- **Estimated turns**: 3-5

### Medium
- 2-3 file changes
- Some design judgment needed
- Applying existing patterns to new domain
- **Estimated turns**: 8-15

### Complex
- 4+ file changes
- Architecture decision needed
- Introducing new patterns
- Dependent on other agent outputs
- **Estimated turns**: 15-25

---

## Protocol Branching

### Simple → Fast Track
1. ~~Step 1 (Analyze)~~: Skip — implement directly
2. Step 3 (Implement): Implement
3. Step 4 (Verify): Checklist minimum items only

### Medium → Standard Protocol
1. Step 1 (Analyze): Brief
2. Step 2 (Plan): Brief
3. Step 3 (Implement): Full
4. Step 4 (Verify): Full

### Complex → Extended Protocol
1. Step 1 (Analyze): Full + Explore existing code with Serena
2. Step 2 (Plan): Full + Record plan in progress
3. **Step 2.5 (Checkpoint)**: Record plan in `progress-{agent-id}.md`
4. Step 3 (Implement): Full
5. **Step 3.5 (Mid-check)**: Update progress + check direction at 50% implementation
6. Step 4 (Verify): Full + Run `../_shared/common-checklist.md`

---

## Difficulty Misjudgment Recovery

- Started as Simple but more complex than expected → Switch to Medium protocol, record in progress
- Started as Medium but architecture decision needed → Upgrade to Complex
- Started as Complex but actually simple → Just finish quickly (minimal overhead)
