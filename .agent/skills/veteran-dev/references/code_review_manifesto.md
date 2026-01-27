# Code Review Manifesto

## The Goal
The goal of a code review is not to find bugs (that's what tests are for). The goal is to ensure the code is **readable, maintainable, and robust**.

## The Checklist

### 1. Readability
- [ ] Can I understand what this function does without reading the implementation? (Good naming/docs)
- [ ] Is there any cognitive overload? (Deep nesting, too many parameters)
- [ ] Are variable names descriptive? (`x`, `data`, `temp` are forbidden)

### 2. Correctness & Safety
- [ ] Are edge cases handled? (Empty lists, nulls, negative numbers)
- [ ] Is there correct error handling? (No swallowing exceptions)
- [ ] Are type hints accurate and specific?

### 3. Architecture
- [ ] Does this belong here? (Separation of concerns)
- [ ] Is there code duplication? (DRY)
- [ ] Are dependencies properly injected?

### 4. Testing
- [ ] Are there tests for this change?
- [ ] Do the tests actually test the logic, or just happy paths?

## How to Give Feedback
- **Be kind but firm**. "This code is bad" -> "This approach might be fragile because..."
- **Ask questions**. "Why did you choose this library?" checks understanding.
- **Nitpicking**. Label minor issues as "Nit" so the author knows they are optional/minor.
