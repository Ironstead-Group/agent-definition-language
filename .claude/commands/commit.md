---
description: Create conventional commit from staged changes
allowed-tools: Bash, Read, Grep
---

# Conventional Commit

1. **Check:** `git status --short` and `git diff --cached --stat`

2. **Type:** `feat|fix|docs|style|refactor|test|chore`

3. **Format:** `type(scope): imperative description` (max 72 chars)
   - Imperative mood: "add" not "added"
   - Focus on why, not what
   - No period at end

4. **Commit:**
   ```bash
   git commit -m "$(cat <<'EOF'
   type(scope): description

   Optional body.

   EOF
   )"
   ```

**NEVER:** Include credits or attribution in messages

**Examples:**
- `feat(site): add GitHub widget with live stats`
- `fix(spec): correct lifecycle validation`
- `docs: update adl_spec field usage`
