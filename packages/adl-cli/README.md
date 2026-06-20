# ADL CLI

The official command-line tool for the [Agent Definition Language (ADL)](https://adl-spec.org). Validate agent definitions against the spec, convert them to A2A Agent Cards or MCP configurations, scaffold new documents, and generate agent code from a spec.

Designed to be **agent- and CI-friendly**: every command is non-interactive, accepts stdin (`-`), has `--help` with examples, supports `--json` for machine-readable output, and fails fast with actionable errors.

## Quick start

```bash
npx @adl-spec/cli init                    # scaffold a new agent definition
npx @adl-spec/cli validate agent.adl.json # validate it against the schema
```

Or install globally:

```bash
npm install -g @adl-spec/cli
adl validate agent.adl.yaml
```

> **Note:** The CLI requires [Bun](https://bun.sh/) (>= 1.0.0) as its runtime.

## Commands

Run `adl <command> --help` for the full options and examples for any command.

### `adl validate <files...>`

Validate one or more ADL documents against the spec schema. Returns a non-zero exit code if any document is invalid — useful for CI pipelines and pre-commit hooks. Use `-` to read from stdin, and `--json` for machine-readable results.

```bash
adl validate agent.adl.yaml
adl validate agents/*.yaml
cat agent.adl.json | adl validate -
adl validate agent.adl.json --json
```

### `adl convert <file> --to <format>`

Generate an [A2A Agent Card](https://google.github.io/A2A/) or [MCP](https://modelcontextprotocol.io/) configuration from an ADL document. One source of truth, multiple output formats. Reads stdin with `-` and writes JSON to stdout (so it composes in pipelines).

```bash
adl convert agent.adl.yaml --to a2a
adl convert agent.adl.yaml --to mcp --output mcp-config.json
cat agent.adl.json | adl convert - --to a2a | jq .name
```

### `adl init`

Scaffold a new ADL document from a built-in template (`minimal`, `full`, or `governance`). Safe by default: it won't overwrite an existing file unless you pass `--force`. Use `--dry-run` to print to stdout instead of writing.

```bash
adl init
adl init --template governance --output my-agent.adl.json
adl init --template minimal --dry-run > agent.adl.json
adl init --template full --force
```

### `adl scaffold` (one-time)

Generate the **full framework** for a chosen target into your source tree and write/update `adl.config.json` so future `adl generate` runs keep the spec-derived files in sync. Targets are **plugins** — built-in ones plus any you load with `--plugin`. List them with `adl generate --list-targets`.

```bash
adl scaffold agent.adl.json --target vanilla-ts --output src/agent
adl scaffold agent.adl.json --target acme-go --output internal/agent --plugin @acme/adl-target-go
```

Each generated file has a **role**:

- **managed** — spec-derived, non-business-logic (models, interfaces, tool schemas, e.g. `types.ts`). Regenerated on every build; don't hand-edit.
- **scaffold** — business logic and project setup (e.g. `agent.ts`, `package.json`). Written once, then yours to edit. `adl scaffold` won't overwrite these on a re-run unless you pass `--force`.

`scaffold` records the managed files as the `regenerate` set in the emitted config, so you get the classification automatically (and can adjust it).

### `adl generate`

Generate from a single document explicitly, or — with no arguments — from `adl.config.json`. Managed files are overwritten; scaffold files are written only if missing (so your edits are preserved).

```bash
adl generate --list-targets
adl generate                                   # from adl.config.json
adl generate agent.adl.json --target vanilla-ts
adl generate agent.adl.json --target vanilla-ts --output ./src/agent
adl generate agent.adl.json --target acme-go --plugin @acme/adl-target-go
adl generate --dry-run                         # show managed vs scaffold actions
```

## Spec-first builds

The spec is the single source of truth. You scaffold the framework once, then the **spec-derived parts (models, interfaces) are regenerated on every build** while your business logic is left alone — so the code can never drift behind the spec.

1. **Scaffold once** — generates the framework and writes `adl.config.json`:

   ```bash
   adl scaffold agent.adl.json --target vanilla-ts --output src/agent
   ```

   The emitted config classifies the managed (continuously recreated) files:

   ```json
   {
     "generate": [
       {
         "source": "agent.adl.json",
         "target": "vanilla-ts",
         "output": "src/agent",
         "regenerate": ["types.ts"]
       }
     ]
   }
   ```

   `regenerate` is the set of files overwritten every run (the generator picks sensible defaults from each file's role — edit the list to change what's continuous). Multiple entries, multiple sources, and `clean: true` (wipe an output dir before writing) are all supported; top-level `plugins` load custom targets before generating.

2. **Edit the business logic** — implement behavior in the scaffold files (`agent.ts`). Commit these; they're yours.

3. **Regenerate on every build** so the managed files always reflect the current spec:

   ```jsonc
   // package.json
   {
     "scripts": {
       "prebuild": "adl validate agent.adl.json && adl generate",
       "build": "tsc"
     }
   }
   ```

Now a tool-signature change must be made in the spec: `adl generate` refreshes the managed types/interfaces your code imports, the build compiles against them, and your hand-written logic stays put. The spec leads; the code follows.

> **Tip:** if you'd rather treat an entire output directory as a disposable build artifact (everything regenerated, nothing hand-edited), gitignore it and set `regenerate: ["**"]` (or `clean: true`) for that entry.

### Writing a custom target

A target is a formatter plugin — an object (or module default export) with `id`, `label`, `outputLanguage`, and a `render(ir)` function returning `{ path, content }[]`. Publish it as an npm package or point at a local module, then reference it via `plugins` in the config or `--plugin` on the CLI. See [`@adl-spec/generator`](https://github.com/Ironstead-Group/agent-definition-language/tree/main/packages/adl-generator) for the plugin contract and built-in targets.

## Learn more

- [ADL Specification](https://adl-spec.org/specification)
- [Governance Profile](https://adl-spec.org/profiles/governance/overview)
- [GitHub](https://github.com/Ironstead-Group/agent-definition-language)

## License

[Apache-2.0](https://github.com/Ironstead-Group/agent-definition-language/blob/main/LICENSE)
