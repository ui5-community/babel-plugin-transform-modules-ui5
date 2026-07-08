# Contributing

Thanks for your interest in `babel-plugin-transform-modules-ui5`! This document
describes how to set up the project, propose changes, and get them merged.

This is a community-driven project. Issues and pull requests are very welcome —
from typo fixes and snapshot updates all the way up to new transforms.

## Code of Conduct

By participating in this project you agree to keep the discussion respectful
and constructive. Be patient with maintainers and contributors, assume good
intent, and focus feedback on the code rather than the person.

## Repository Layout

This is an [npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
monorepo with two published packages:

- [`packages/plugin`](packages/plugin/) – `babel-plugin-transform-modules-ui5`,
  the actual Babel plugin. All source and tests live here.
- [`packages/preset`](packages/preset/) – `babel-preset-transform-ui5`, a thin
  preset that wraps the plugin. This is the package most consumers install.

The two packages are kept in lockstep via Changesets' `fixed` configuration in
[.changeset/config.json](.changeset/config.json), so they always share the same
version number.

Other directories worth knowing about:

- [`.changeset/`](.changeset/) – pending release notes (one Markdown file per
  change). See [Changesets](#changesets--releases) below.
- [`.github/workflows/`](.github/workflows/) – CI: PR validation, commitlint,
  changeset checks, and the release pipeline.
- [`scripts/auto-changeset.mjs`](scripts/auto-changeset.mjs) – helper that
  generates changeset files from Conventional Commit messages.

## Prerequisites

- **Node.js ≥ 20.19** (CI runs against 20, 22, and 24 — see
  [.github/workflows/commit.yml](.github/workflows/commit.yml)).
- **npm ≥ 9** (for workspaces support).
- **git**.

### Node.js support policy

The minimum supported Node.js version is declared in each package's
`engines.node` field and enforced by CI. The policy for changing it is:

- We aim to support every Node.js LTS line that is still in **Active LTS**
  or **Maintenance**. See <https://nodejs.org/en/about/previous-releases>
  for the current schedule.
- We do **not** raise the minimum Node.js version in a patch or minor
  release. Raising the floor is a breaking change for consumers' build
  pipelines and ships as a **major** plugin version with a dedicated
  changeset.
- When picking up a dependency upgrade, the upgrade must remain
  installable on every Node.js version we still claim to support. A
  dependency that drops a supported Node line is held back (pinned to the
  last compatible release) until we decide to raise the floor ourselves.

If you propose raising the minimum Node version, please mention it
explicitly in the PR description and in the changeset, and update both
[`CONTRIBUTING.md`](CONTRIBUTING.md) and the workflow matrix.

For the full picture of what we depend on, why, and which majors are
deliberately held back, see [`DEPENDENCIES.md`](DEPENDENCIES.md).

## Getting Started

```sh
git clone https://github.com/ui5-community/babel-plugin-transform-modules-ui5.git
cd babel-plugin-transform-modules-ui5
npm ci
```

`npm ci` installs all workspace dependencies and sets up the Husky git hooks
(via the `prepare` script).

> 💡 If you don't want the Husky hooks installed (e.g. you're running automated
> tooling), set `HUSKY_SKIP=true` before `npm ci`.

## Common Scripts

All commands are run from the repo root. They fan out to every workspace via
`--workspaces --if-present`.

| Command | What it does |
| --- | --- |
| `npm test` | Run Jest tests in every package. |
| `npm run test:update-snapshot` | Update Jest snapshots after intentional output changes. |
| `npm run build` | Build every package (Babel-compiles `src/` to `dist/`). |
| `npm run clean` | Remove `dist/` from every package. |
| `npm run lint` | Run ESLint across all packages. |
| `npm run lint:commit` | Run commitlint on the most recent commit message. |
| `npm run changeset` | Interactively create a new changeset entry. |
| `npm run changeset:auto` | Auto-generate changesets from your Conventional Commits. |
| `npm run changeset:empty` | Create an empty changeset (rare; use when a commit needs no release). |

You can also target a single package directly, e.g.
`npm test -w babel-plugin-transform-modules-ui5`.

## Making Changes

### 1. Branch off `main`

```sh
git checkout -b fix/some-edge-case main
```

### 2. Touch the right files

Almost all functionality lives in [`packages/plugin/src/`](packages/plugin/src/).
The preset is intentionally minimal.

If your change is an actual transform behavior change, you will almost always
also need to add or update a fixture in
[`packages/plugin/__test__/fixtures/`](packages/plugin/__test__/fixtures/) and
update README documentation under [README.md](README.md) or the package READMEs.

### 3. Add tests

The plugin uses **fixture-based snapshot tests** under
[`packages/plugin/__test__`](packages/plugin/__test__/). Each fixture is a small
input file that the plugin transforms; the snapshot captures the output.

To add a test case:

1. Drop a new `.js` (or `.ts`) input file into the appropriate fixture folder
   under `packages/plugin/__test__/fixtures/`.
2. Run `npm test` — the runner will produce an output file under
   `__output__/` and a snapshot under `__snapshots__/`.
3. Inspect the output carefully. If correct, commit the input, the output, and
   the snapshot.
4. If you intentionally change behavior of an existing transform, run
   `npm run test:update-snapshot` and review the snapshot diff in your PR.

> ⚠️ Every change to plugin output should be reflected in a snapshot diff that
> a reviewer can inspect. PRs that change snapshots without an explanation in
> the description are usually rejected.

### 4. Lint and format

ESLint + Prettier run automatically on staged files via Husky's
`pre-commit` hook (`lint-staged`). To run them manually:

```sh
npm run lint
# or, inside packages/plugin:
npm run lint:fix
npm run format
```

### 5. Commit using Conventional Commits

This project enforces
[Conventional Commits](https://www.conventionalcommits.org/) via
[commitlint](https://commitlint.js.org/) on every push and on every PR commit
(see [.github/workflows/commit.yml](.github/workflows/commit.yml)).

The format is:

```
<type>(<optional scope>): <subject>

<optional body>

<optional footer(s)>
```

Common types:

- `feat:` — a new feature → **minor** version bump
- `fix:` — a bug fix → **patch** version bump
- `docs:` — documentation only
- `test:` — tests only (no production change)
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `chore:` / `build:` / `ci:` — tooling, dependencies, pipeline
- `feat!:` or `BREAKING CHANGE:` footer → **major** version bump

If you're not sure, you can use the commitizen-flavored helper:

```sh
npx cz
```

Examples:

```
fix(plugin): preserve leading copyright comment on dynamic imports
feat(plugin): add option to skip wrapping for sap.ui.require modules
docs: clarify export collapsing behavior
```

### 6. Add a changeset

Every PR that produces a user-visible change must include a **changeset**
entry. Changesets drive both the changelog and the next release version.

The easy path — let the script read your commit messages:

```sh
npm run changeset:auto
```

This walks the commits ahead of `origin/main` and writes one
`.changeset/auto-<sha>.md` per commit, picking the bump (`major`/`minor`/
`patch`) from the commit type.

The interactive path:

```sh
npm run changeset
```

You'll be prompted for the affected packages and the bump level, and a
Markdown file is written under `.changeset/`. Edit the body to describe what
changed from the user's perspective — that text becomes the CHANGELOG entry.

> The two packages are configured as a `fixed` group, so they always release
> together with the same version number. Picking either one in the changeset
> prompt is fine.

If your PR is purely internal (build, CI, refactor with no behavior change,
docs), you can omit the changeset — but be explicit about it in the PR
description so reviewers don't ask.

### 7. Open a Pull Request

Push your branch and open a PR against `main`. CI will run:

- commitlint on every commit message in the PR;
- ESLint;
- Jest on Node 20, 22, and 24;
- a check that pending changesets are present (when applicable).

In the PR description, please include:

- **What** changed and **why** (link the issue if there is one).
- **Snapshot diffs** to call out, if any.
- Any **migration notes** for users if behavior changed.

Maintainers may push small fixups directly to the branch (formatting, snapshot
updates) — please leave that allowed unless you have a reason not to.

## Changesets & Releases

Releases are automated by Changesets:

1. PRs are merged into `main` carrying their `.changeset/*.md` entries.
2. The release workflow ([.github/workflows/release.yml](.github/workflows/release.yml))
   opens or updates a "Version Packages" PR that bumps versions and rewrites
   `CHANGELOG.md` based on the pending changesets.
3. When a maintainer merges the Version Packages PR, the workflow publishes
   both packages to npm and creates a GitHub release.

Contributors do **not** publish manually; you only need to make sure your PR
includes the right changeset entry.

## Reporting Issues

When opening an issue, please include:

- The version of `babel-plugin-transform-modules-ui5` (or the preset).
- A **minimal** reproduction: the input source, your Babel config, and the
  expected vs. actual output.
- The Node.js and `@babel/core` versions you're running.

Bug reports with a runnable repro snippet (or a small public repo) get fixed
much faster than ones without.

## Asking Questions

For usage questions that aren't bugs, GitHub Discussions or a question-style
issue in the
[ui5-community/babel-plugin-transform-modules-ui5](https://github.com/ui5-community/babel-plugin-transform-modules-ui5)
repo are the best place. Please don't open issues against personal forks.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
