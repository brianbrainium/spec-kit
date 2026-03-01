# Codex Web UI Pack: Implement

## When to use
- `tasks.md` exists and you want to execute a specific bounded subset.
- You need code + tests for explicit task IDs only.

### COPY/PASTE INTO CODEX WEB TASK
```text
Phase: Implement only.

Use templates/commands/implement.md as execution policy reference.
Implement ONLY these task IDs from specs/<feature>/tasks.md:
<PASTE TASK IDS>

Rules:
- Never edit .specify/templates/* except via specify init/upgrade.
- Do not expand scope beyond listed task IDs.
- Run relevant tests/checks and report outcomes.
- Stop after showing file diffs and test results.

Output:
1) Files changed and why
2) Test/check command results
3) Remaining task IDs not yet implemented
4) STOP
```
