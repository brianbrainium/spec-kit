## Spec Kit Workflow Guardrails

- Artifacts:
  - Constitution: `.specify/memory/constitution.md`
  - Feature artifacts: `specs/<feature>/spec.md`, `plan.md`, `tasks.md`
  - Automation scripts: `.specify/scripts/`
  - Canonical runbooks: `templates/commands/*.md`
- Invariants:
  - Never edit `.specify/templates/*` except via `specify init` or `specify upgrade`.
  - One phase per Codex task.
  - Plan/Tasks phases do **not** touch source code.
  - Implement phase only executes explicit, bounded task IDs.
