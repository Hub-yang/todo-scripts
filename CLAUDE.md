# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@huberyyang/todo-scripts` is a CLI tool (bin name `hubery`) that scaffolds repetitive frontend project config into other repos. Published to npm, consumed as a devDependency and invoked as `npx hubery <script>`. It is bin-only — no library API, no `types`/`exports` field in `package.json`.

Currently the only implemented subcommand is `commitlint-init`, which wires up commitlint + husky + lint-staged (optionally commitizen/cz-git) in whatever project it's run from.

## Commands

```bash
pnpm dev              # tsdown --watch
pnpm build             # tsdown build → dist/
pnpm build:prod        # nr typecheck && nr lint:fix && nr test:run && tsdown (full pre-release gate)
pnpm test               # vitest (watch)
pnpm test:run           # vitest run (single pass)
pnpm typecheck           # tsc --noEmit
pnpm lint / lint:fix      # eslint .
pnpm release              # nr build:prod && bumpp && npm publish
pnpm preview               # nr build && node bin/index.js commitlint-init (self-dogfood in this repo)
```

Run a single test file: `pnpm vitest run tests/utils.test.ts`

`build:prod`, `preview`, and `taze` invoke `nr`/`ni` (from `@antfu/ni`) but that package is not in `devDependencies` — it must be available globally (e.g. via `npm i -g @antfu/ni`) for those scripts to work.

## Architecture

**Entry flow**: `bin/index.js` is the real entrypoint — it imports the built `dist/main.js` and explicitly calls the exported `main()`. `main.ts` itself has no top-level side effects (it only exports `main`); this split exists specifically so `main.ts` can be imported safely from tests without triggering a real CLI run (importing a module that self-invokes `main()` with the test runner's own `process.argv` would call `process.exit()` mid test suite).

`main()` parses argv with `mri`, looks up `process.argv[2]` against a hardcoded `scriptsMap` array (currently just `['commitlint-init']`), and dynamically `import()`s the matching compiled script from the same directory, calling its exported `init(options)`. Adding a new subcommand means: add a new file under `src/scripts/`, export an `init(options)` from it, and add its name to `scriptsMap`. The `-h/--help` flag only takes effect when parsed from argv positions after the script name (e.g. `hubery commitlint-init --help`), since flags are parsed from `argv.slice(3)` — a bare `hubery --help` does not work.

**tsdown** (`tsdown.config.ts`) builds every file matching `src/scripts/**.ts` as a separate entry (so `main.ts` → `dist/main.js`, `commitlint-init.ts` → `dist/commitlint-init.js`), sharing a common chunk for anything imported from `src/constants` and `src/utils`. This is why `main.ts`'s dynamic import path is `./${script}.js` — it resolves against the built `dist/` layout, not `src/`.

**Shared layers** (`src/utils/index.ts`, `src/constants/index.ts`) provide the primitives every script builds on:
- Package-manager detection (`getPkgManager` reads `npm_config_user_agent`) drives `getInstallCommand`/`getUninstallCommand`/`getRunCommand`/`getExecCommand`, which branch across npm/pnpm/yarn/bun/deno.
- `isMonorepo()` checks package.json's `workspaces` field first, then falls back to actually parsing `pnpm-workspace.yaml` (via the `yaml` package) and checking for a non-empty `packages` array — merely having a `pnpm-workspace.yaml` file (e.g. one used only for pnpm settings, like this repo's own) is not treated as a monorepo.
- `isTsProject()` scans the invoking project's root dir for any `tsconfig*.json`.
- `checkPackage()` is the install-if-missing primitive most scripts call before using a package; installs go through `execCommand` so failures exit cleanly via `printErr` rather than throwing.
- `getPackageJSON()`/`writePackageJSON()` read/rewrite the invoking project's `package.json` wholesale (`JSON.stringify(data, null, 2)`), typed via the `PackageJsonLike` interface (also exported from this module, alongside `ArgvOptions` which `main.ts` and `commitlint-init.ts` share).
- `getCommitPreHook()`/`getCommitMsgHook()` in `src/constants/index.ts` are functions (not constants) — they call `getExecCommand()` lazily when invoked, not at module load time.

**`commitlint-init.ts`** is the reference implementation for what a script does end-to-end: check/`git init`, `checkPackage` a fixed list of deps, write a commitlint config file (name depends on `isTsProject()`), run `husky init` then write the two hook files, rewrite the target `package.json`, and (if eslint is present in the target project) temporarily add/run/remove a throwaway `__hubery__:fix` lint script against the files it just generated. Writes for the commitlint config file and the two husky hooks are skipped (with a `printWarn`) if the target file already exists, so re-running the tool on a project with customized configs won't clobber them.

## Testing

Vitest (`vitest.config.ts`, `@` aliased to `src`). Test files live in `tests/`: `constants.test.ts` and `utils.test.ts` cover the shared primitives (package-manager detection matrix, `isTsProject`, `isMonorepo`, `getPackageJSON`, print helpers, hook-string builders); `main.test.ts` and `commitlint-init.test.ts` cover the CLI dispatch and `init()` orchestration by mocking `@/utils`, the dynamically-imported script module, `node:fs`/`node:fs/promises`, and `yocto-spinner`.

## Release

`pnpm release` runs the full local gate (`build:prod`) then `bumpp` (version bump + tag) then `npm publish`. `.github/workflows/release.yml` is the only GitHub Actions workflow — it triggers only on push to `main` and, when the head commit message matches `chore: release vX.Y.Z`, creates the git tag and a GitHub Release (via `softprops/action-gh-release`, with `generate_release_notes: true` acting as the changelog — see `CHANGELOG.md`).

Quality gating (typecheck + lint + test) is not a separate CI workflow — it lives entirely in the local `pre-commit` hook: husky's `pre-commit` runs `lint-staged`, whose config is `lint-staged.config.mjs` (not the `package.json` `lint-staged` field — removed to avoid a second, conflicting config source). Each of the three tasks (`pnpm typecheck`, `pnpm lint:fix`, `pnpm test:run`) is declared as a zero-arg function (`() => 'pnpm typecheck'`), lint-staged's documented way to run a command without appending the matched staged filenames as arguments — required because `tsc`/`vitest` behave incorrectly if given an arbitrary subset of changed files instead of running against the whole project. `commit-msg` runs `commitlint --edit`.

## Conventions

Code comments in this repo: Chinese. Commit messages: English — this is a deliberate exception to this user's usual default of Chinese commit messages elsewhere.
