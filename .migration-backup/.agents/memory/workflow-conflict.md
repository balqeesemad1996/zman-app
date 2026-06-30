---
name: Workflow port conflict
description: Duplicate workflows both binding port 20082 caused artifact workflow to fail
---

The workspace had two workflows trying to run the zman-app dev server on port 20082:
1. "Start application" (manual, in .replit) — ran first, held the port
2. "artifacts/zman-app: web" (artifact-managed) — failed because port was taken

**Fix:** Remove "Start application" via `removeWorkflow()`. The artifact workflow then starts cleanly.

**Why:** Artifact workflows are auto-created from artifact.toml `[services.development]`. Any manually added workflow running the same command on the same port will conflict.

**How to apply:** When migrating a project to artifact-based workflows, always remove the manually-created "Start application" that predates the artifact system.
