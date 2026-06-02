---
name: "source-command-build-site"
description: "Build the ADL documentation site and report any errors"
---

# source-command-build-site

Use this skill when the user asks to run the migrated source command `build-site`.

## Command Template

Run the full site build pipeline from the `site/` directory:

1. `cd site && npm run build`
2. If the build fails, read the error output and diagnose the issue
3. Report the result: success or failure with details
