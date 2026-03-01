# Codex Web UI Pack: Troubleshooting

## When to use
- Codex task drifts phases (e.g., planning starts coding).
- Script prerequisites fail or artifact paths are missing.
- You need to re-anchor to Spec Kit runbooks.

### COPY/PASTE INTO CODEX WEB TASK
```text
You are correcting workflow drift in a Spec Kit repo.

Re-read references:
- templates/commands/specify.md
- templates/commands/plan.md
- templates/commands/tasks.md
- templates/commands/implement.md

Then diagnose:
1) Which phase should be active now?
2) Which required artifact is missing or stale?
3) What is the smallest next action to recover?

Hard rules:
- Never edit .specify/templates/* except via specify init/upgrade.
- One phase per Codex task.
- Plan/tasks phases do not touch source code.
- Implement phase is bounded to explicit task IDs.

Output:
- Recovery plan (3-7 steps)
- Exact next prompt to run
- STOP
```
