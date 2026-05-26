---
name: "source-command-sync-spec"
description: "Sync spec content from versions/ to the documentation site"
---

# source-command-sync-spec

Use this skill when the user asks to run the migrated source command `sync-spec`.

## Command Template

Run the spec sync pipeline:

1. `cd site && npm run sync-spec`
2. Report which versions were synced and how many files were copied
3. If errors occur, diagnose and report
