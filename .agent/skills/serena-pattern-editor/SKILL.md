---
name: serena-pattern-editor
description: Pattern-based code editing using Serena tools - searches for patterns and applies bulk transformations
trigger: auto
domain: tooling
tools:
  serena_search_for_pattern: true
  serena_replace_content: true
  serena_replace_symbol_body: true
---

# Serena Pattern Editor

Automated pattern-based editing for bulk code transformations and migrations.

## When to Apply

- Migrating APIs or libraries
- Updating deprecated patterns
- Enforcing coding standards
- Bulk refactoring operations

## Workflow

### Phase 1: Pattern Discovery
1. Use `serena_search_for_pattern` to find all occurrences
2. Analyze pattern variations
3. Identify edge cases

### Phase 2: Pattern Definition
1. Define precise regex pattern
2. Test on subset of matches
3. Refine pattern as needed

### Phase 3: Transformation
1. Use `serena_replace_content` with regex mode
2. Apply wildcards for large replacements
3. Verify each change

### Phase 4: Validation
1. Run tests
2. Check for compilation errors
3. Review changes in context

## Best Practices

1. Use regex mode with wildcards for efficiency
2. Test pattern on single file first
3. Use `allow_multiple_occurrences` carefully
4. Always verify after bulk changes

## Pattern Examples

### Migration Pattern
```regex
// Old API
oldFunction\((.*?)\)

// New API
newFunction($1, { option: true })
```

### Deprecation Pattern
```regex
// Find deprecated usage
@deprecated.*\n.*function

// Replace with warning
// TODO: Migrate to new API\n$0
```

## Safety Guidelines

- Always preview changes before applying
- Use version control for rollback
- Run full test suite after changes
- Document pattern changes

## Example Usage

```typescript
// Migrate from old API to new API
const workflow = [
  'serena_search_for_pattern("oldApi\\.call")',
  'serena_replace_content("oldApi\\.call\\((.*?)\\)", "newApi.call($1)", "regex")',
];
```

## Context

- Learned from repeated migration patterns
- Optimized for large-scale transformations
- Confidence: High (based on 5+ observed usages)
