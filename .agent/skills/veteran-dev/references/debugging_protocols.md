# Debugging Protocols

## Protocol 0: Stop Guessing.
Don't change random lines of code hoping it fixes the bug. You must **understand** the bug before you fix it.

## The Scientific Method for Debugging

1.  **Reproduce**: If you can't reproduce it, you can't fix it. Create a minimal reproduction script.
2.  **Isolate**: Remove everything that is not the bug. Narrow down the scope.
3.  **Hypothesize**: "I think the DB connection is timing out."
4.  **Test**: Add logging/metrics to prove or disprove the hypothesis.

## Specific Scenarios

### 1. "It's slow" (Performance)
- **Don't optimize yet**. Measure first.
- Use a profiler (`cProfile`, `py-spy`).
- Look for N+1 queries.
- Look for blocking I/O in the async loop.

### 2. "It works on my machine" (Environment)
- Check environment variables.
- Check dependency versions (`uv pip freeze`).
- Check data differences.

### 3. "Deadlock / Hanging" (Concurrency)
- Are you calling `sync` code from `async` code?
- Are you waiting on a task that never finishes?
- Use `asyncio.all_tasks()` to inspect what's running.

## The Rubber Duck
Before asking for help, explain the problem out loud to a rubber duck (or your cat). 50% of the time, you'll solve it just by explaining it.
