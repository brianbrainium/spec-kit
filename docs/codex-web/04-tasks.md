# Codex Web UI Pack: Tasks

## When to use
- `plan.md` is approved and you need executable work breakdown.
- Preparing bounded units for implementation tasks.

### COPY/PASTE INTO CODEX WEB TASK
```text
Phase: Tasks only.

Use templates/commands/tasks.md as canonical behavior reference.
Generate specs/<feature>/tasks.md from approved spec + plan.

Rules:
- Never edit .specify/templates/* except via specify init/upgrade.
- Tasks must be atomic, ordered, and test-aware.
- No source code edits in this phase.

Output:
1) Proposed tasks.md diff with numbered/bounded tasks
2) Suggested implementation batch (smallest coherent subset)
3) STOP (await implementation task request)
```
