# Codex Web UI Pack: Bootstrap

## When to use
- Starting a repo that already contains Spec Kit scaffolding from `specify init`.
- You need Codex Web UI-only workflow (no local slash commands).
- You want task-by-task execution mirroring Constitution → Specify → Plan → Tasks → Implement.

### COPY/PASTE INTO CODEX WEB TASK
```text
You are operating inside a Spec Kit repository.

Goal: verify scaffolding and prepare for phase-driven execution in Codex Web UI tasks.

Read and summarize (do not copy verbatim):
- templates/commands/constitution.md
- templates/commands/specify.md
- templates/commands/plan.md
- templates/commands/tasks.md
- templates/commands/implement.md
- templates/commands/analyze.md

Verify these paths and explain their role:
- .specify/memory/
- .specify/scripts/
- .specify/templates/
- specs/

Rules:
- Never edit .specify/templates/* except via specify init/upgrade.
- One phase per Codex task.
- Stop if required phase artifacts are missing and report exactly what is missing.

Output:
1) Readiness checklist
2) Next phase command suggestion (Constitution or Specify)
3) STOP (no implementation)
```
