---
description: Validate ADL example documents against the spec and schema
---

# Example Validator Skill

Validate ADL example documents in `examples/` and `versions/0.1.0/examples/`:

1. **Required fields**: Check `adl_spec`, `name`, `description`, `version` are present
2. **Schema compliance**: Validate against `versions/0.1.0/schema.json`
3. **Naming convention**: Verify snake_case for all field names
4. **Extension fields**: Confirm custom extensions use `x_` prefix
5. **Format**: Check JSON is valid JSON, YAML is valid YAML
6. **Index**: Verify `examples/README.md` lists all example files
