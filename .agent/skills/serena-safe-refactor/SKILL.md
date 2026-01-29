---
name: serena-safe-refactor
description: Safe refactoring workflow using Serena tools - analyzes impact, finds references, and performs safe code transformations
trigger: auto
domain: refactoring
tools:
  serena_find_symbol: true
  serena_find_referencing_symbols: true
  serena_replace_symbol_body: true
  serena_rename_symbol: true
  serena_replace_content: true
---

# Serena Safe Refactor

Automated refactoring workflow that ensures safety by analyzing impact before making changes.

## When to Apply

- Renaming functions or classes
- Changing function signatures
- Extracting or moving code
- Large-scale refactoring operations

## Workflow

### Phase 1: Impact Analysis
1. Use `serena_find_symbol` to locate the target
2. Use `serena_find_referencing_symbols` to find all usages
3. Review impact scope

### Phase 2: Preparation
1. Check for tests covering the target code
2. Identify potential breaking changes
3. Plan migration strategy if needed

### Phase 3: Execution
1. Use `serena_rename_symbol` for safe renaming
2. Use `serena_replace_symbol_body` for implementation changes
3. Use `serena_replace_content` for pattern-based changes

### Phase 4: Verification
1. Run tests to verify changes
2. Check for compilation errors
3. Review affected files

## Best Practices

1. Always find references before refactoring
2. Make atomic changes - one symbol at a time
3. Verify with tests after each change
4. Use `rename_symbol` instead of `replace_content` when possible

## Safety Checklist

- [ ] All references found and reviewed
- [ ] Tests exist for the target code
- [ ] Breaking changes documented
- [ ] Rollback plan prepared

## Example Usage

```typescript
// Safe rename of a function
const workflow = [
  'serena_find_symbol("oldFunctionName")',
  'serena_find_referencing_symbols("oldFunctionName")',
  'serena_rename_symbol("oldFunctionName", "newFunctionName")',
];
```

## Context

- Learned from repeated refactoring patterns
- Emphasizes safety and impact analysis
- Confidence: High (based on 5+ observed usages)
