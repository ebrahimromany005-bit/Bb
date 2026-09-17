---
name: Workspace dependency sync
description: Environment-specific guidance for restoring declared dependencies in the pnpm workspace.
---

When a workspace package's dependencies are present in its package manifest and lockfile but missing from node_modules, use a filtered frozen workspace install for that package and its dependencies rather than adding packages to the workspace root.

**Why:** A root-level package install is rejected by the workspace-root safety check and can create unrelated manifest changes, while the filtered install restores the existing locked dependency graph without changing product code.

**How to apply:** Run the filtered install for the affected workspace package with the existing lockfile before diagnosing application code or changing dependency declarations.