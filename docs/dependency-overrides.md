# Dependency overrides

Every entry in the `overrides` block of `package.json` is recorded here with the
information Handbook §25.1 requires: the affected package and version, the
advisory, why the override is necessary, compatibility evidence, an owner, a
review date, a removal condition, and the regression tests that cover it.

An override is a statement that we are resolving a transitive dependency
differently from what its parent asked for. That is a reasonable thing to do to
close a vulnerability and an unreasonable thing to leave lying around
unexplained, which is what this file is for. **Temporary overrides may not remain
indefinitely without review.**

---

## `postcss > nanoid` — `^3.3.18`

- **Status:** Active
- **Added:** 2026-08-28
- **Owner:** OJ Florendo
- **Review by:** 2026-11-28 (3 months)

### Affected package and version

`nanoid@3.3.16`, reached transitively:

```text
next@16.2.12          → postcss@8.5.25 → nanoid@3.3.16   (production)
@tailwindcss/postcss  → postcss@8.5.25 → nanoid@3.3.16   (development)
```

### Advisory

[**GHSA-2v37-7h3g-55p8**](https://github.com/advisories/GHSA-2v37-7h3g-55p8) —
**High severity.** *nanoid: custom generators can loop indefinitely when size is
zero.* Affects `nanoid < 3.3.18`.

### Why the override is necessary

`postcss@8.5.25` depends on `nanoid ^3.3.16` and there is no newer `postcss`
release that requires a patched `nanoid`. The vulnerable version therefore
cannot be removed by upgrading a direct dependency: `next` pins `postcss`, and
`postcss` pins `nanoid`. An override is the only way to resolve the patched
version without waiting for two upstream releases to propagate.

Handbook §25 makes a high-severity finding a release blocker, so leaving it was
not an option, and `npm audit fix --force` was not used.

### Exploitability assessment

Low in this codebase, and the override was applied regardless rather than
arguing the risk away.

The flaw requires calling nanoid's **custom generator** API with a size of zero.
Nothing in this project calls `nanoid` directly — `grep` over `src/`, `e2e/` and
`scripts/` returns no reference. It is reached only through `postcss`, which uses
it internally to generate source-map identifiers at build time, with sizes it
controls itself. There is no path by which a visitor influences that call.

The assessment is recorded because "we patched it" and "it was exploitable" are
different claims and should not be merged.

### Compatibility evidence

- `postcss@8.5.25` requires `nanoid: ^3.3.16`. **`3.3.18` satisfies that range**,
  so this is a semver-compatible patch bump, not a forced incompatible
  resolution.
- `nanoid@3.3.18` declares `engines: ^10 || ^12 || ^13.7 || ^14 || >=15.0.1`,
  satisfied by the project's Node 24.
- Verified after `npm ci` from the regenerated lockfile:
  `next@16.2.12 → postcss@8.5.25 → nanoid@3.3.18`, single resolved copy.
- `npm audit` and `npm audit --omit=dev` both report **0 vulnerabilities**.
- The complete quality gate was re-run on the reinstalled tree — see the
  Definition-of-Done evidence for that run's results.

### Why it is scoped to `postcss`

Written as a nested override under `postcss` rather than a bare top-level
`"nanoid"` entry. A top-level entry would force `3.3.18` on *every* future
consumer of `nanoid` anywhere in the tree, including ones that legitimately
require a different major version — a broader change than the problem needs. The
narrower form fixes exactly the path that is vulnerable and leaves the rest of
the resolution alone.

### Removal condition

Remove this override when `postcss` publishes a release depending on
`nanoid >= 3.3.18` and that release has propagated into the `next` and
`@tailwindcss/postcss` dependency trees.

To check:

```bash
npm view postcss dependencies.nanoid
```

When that range no longer admits a vulnerable version, delete the nested
`nanoid` entry, run `npm install --package-lock-only`, confirm `npm ls nanoid`
still resolves to a patched version without the override, and run the full gate.

### Regression tests required when changed or removed

The dependency audit gate itself (`scripts/verify-dependency-audit.mjs`) is the
direct regression test: it requires **zero** vulnerability entries in both the
production-only and full audits, so reintroducing the vulnerable version fails
the gate rather than passing quietly.

Beyond that, because `postcss` is part of the CSS build path, removing or
changing this override requires the complete gate — in particular `npm run
build` and the end-to-end suite, which would surface a broken stylesheet that
unit tests would not.
