---
name: serena-code-navigator
description: Automated code navigation using Serena tools - finds files, analyzes symbols, and provides intelligent code exploration
trigger: auto
domain: tooling
tools:
  serena_find_file: true
  serena_get_symbols_overview: true
  serena_find_symbol: true
  serena_find_referencing_symbols: true
---

# Serena Code Navigator

Intelligent code navigation workflow that combines Serena tools for efficient codebase exploration.

## When to Apply

- Exploring unfamiliar codebases
- Finding specific functions or classes
- Understanding code dependencies
- Navigating large projects

## Workflow

### Phase 1: Discovery
1. Use `serena_find_file` to locate relevant files
2. Use `serena_list_dir` to understand project structure

### Phase 2: Analysis
1. Use `serena_get_symbols_overview` to get file structure
2. Use `serena_find_symbol` to locate specific symbols

### Phase 3: Dependency Analysis
1. Use `serena_find_referencing_symbols` to understand usage
2. Trace call chains and dependencies

## Best Practices

1. Start broad with `list_dir`, then narrow down with `find_file`
2. Use `get_symbols_overview` before reading full files
3. Always check references before modifying code
4. Combine multiple Serena tools for comprehensive analysis

## Example Usage

```typescript
// Navigate to a component and understand its usage
const workflow = [
  'serena_find_file("Button.tsx")',
  'serena_get_symbols_overview("Button.tsx")',
  'serena_find_symbol("Button")',
  'serena_find_referencing_symbols("Button")',
];
```

## Context

- Learned from repeated code exploration patterns
- Optimized for TypeScript/React codebases
- Confidence: High (based on 5+ observed usages)
