# Codex Web UI Pack: Analyze

## When to use
- Before merge to validate spec-plan-task-code alignment.
- During regressions to identify phase drift or missed requirements.

### COPY/PASTE INTO CODEX WEB TASK
```text
Phase: Analyze only.

Use templates/commands/analyze.md as canonical reference.
Audit alignment across:
- .specify/memory/constitution.md
- specs/<feature>/spec.md
- specs/<feature>/plan.md
- specs/<feature>/tasks.md
- current implementation diff

Rules:
- Never edit .specify/templates/* except via specify init/upgrade.
- Do not implement new code in analysis.

Output:
1) Coverage matrix: requirements -> task IDs -> code/test evidence
2) Gaps, risks, and suggested follow-up tasks
3) STOP
```
