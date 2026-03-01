# Codex Web UI Pack: Plan

## When to use
- After `spec.md` is approved.
- You need technical design, risks, and sequencing before coding.

### COPY/PASTE INTO CODEX WEB TASK
```text
Phase: Plan only.

Use templates/commands/plan.md as canonical reference.
Use .specify/scripts/bash/setup-plan.sh and .specify/scripts/bash/check-prerequisites.sh behavior as guidance before drafting.

Target feature:
<PASTE FEATURE PATH, e.g., specs/123-feature/spec.md>

Rules:
- Never edit .specify/templates/* except via specify init/upgrade.
- Create/update specs/<feature>/plan.md only.
- No implementation, no source-code edits, no task execution.

Output:
1) Proposed plan.md diff
2) Dependencies and risks
3) Explicit STOP CONDITION: planning complete, implementation not started
```
