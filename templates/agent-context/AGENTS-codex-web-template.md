# AGENTS.md (Codex Web UI Template)

Use this template in target repos that run Spec Kit via Codex Web UI tasks.

## Workflow Sources

- Canonical command runbooks: `templates/commands/*.md`
- Project principles: `.specify/memory/constitution.md`
- Feature lifecycle artifacts: `specs/<feature>/spec.md`, `specs/<feature>/plan.md`, `specs/<feature>/tasks.md`
- Project automation scripts: `.specify/scripts/` (notably `create-new-feature`, `setup-plan`, `check-prerequisites`)

## Operating Invariants

- Never edit `.specify/templates/*` except via `specify init` or `specify upgrade`.
- Execute exactly one phase per Codex task: Constitution → Specify → Plan → Tasks → Implement → Analyze.
- Plan and Tasks phases never modify implementation code.
- Implement tasks are bounded to explicit task IDs from `tasks.md`.
- Stop each task after presenting the scoped diff/results for that phase.

## Project verification commands

> Fill these with repo-specific checks.

- `# unit tests command`
- `# lint/typecheck command`
- `# integration/e2e command`

## Copy/Paste Starter Prompt (Codex Web)

```text
You are working in a Spec Kit repo with phase-gated execution.
Follow templates/commands/*.md as canonical runbooks.
Never edit .specify/templates/* except via specify init/upgrade.
Perform one phase only, stop after showing the scoped diff and verification results.
If prerequisites are missing, stop and report the exact missing artifact.
```
