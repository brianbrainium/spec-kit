# Codex Web UI Pack: Specify

## When to use
- Defining a new feature from a user request.
- Updating acceptance criteria before planning.

### COPY/PASTE INTO CODEX WEB TASK
```text
Phase: Specify only.

Use templates/commands/specify.md as runbook reference.
Use .specify/scripts/bash/create-new-feature.sh (or powershell equivalent) semantics to pick/create the feature folder and spec file under specs/<feature>/spec.md.

Given this feature request:
<PASTE REQUEST>

Rules:
- Never edit .specify/templates/* except via specify init/upgrade.
- Produce spec content only (scope, user stories, requirements, acceptance criteria).
- Do not create plan.md, tasks.md, or code changes.

Output:
1) Feature identifier chosen
2) Proposed specs/<feature>/spec.md diff
3) Open questions if requirements are ambiguous
4) STOP
```
