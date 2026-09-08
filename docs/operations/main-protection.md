# Main-branch protection

`main-protection.json` is the branch-protection configuration this repository
requires, in the exact shape GitHub's REST API accepts. It exists so the control
is reviewable, diffable, and restorable, rather than living only in a settings
page nobody can audit.

The rules it encodes are the ones
`docs/ENGINEERING_HANDBOOK.md` §14.4 says the owner should maintain: a required
CI check, no force pushes, no branch deletion, and production deployment only
from a protected `main`. `SECURITY.md` states publicly that the site is deployed
from the protected `main` branch, so this file is what makes that claim true.

## Apply

```bash
gh api -X PUT repos/omarjosephf/ojflorendo-portfolio/branches/main/protection \
  --input docs/operations/main-protection.json
```

## Verify

Applying is not evidence. Read the live configuration back:

```bash
gh api repos/omarjosephf/ojflorendo-portfolio/branches/main/protection \
  --jq '{checks: [.required_status_checks.checks[].context],
         strict: .required_status_checks.strict,
         enforce_admins: .enforce_admins.enabled,
         force_push: .allow_force_pushes.enabled,
         deletions: .allow_deletions.enabled}'
```

A protected branch returns that object. An **unprotected** branch returns
`404 Branch not protected` — which is not an error to skim past, it is the
control being absent.

GitHub also supports rulesets, which are configured separately and do not appear
in the endpoint above. A complete check reads both:

```bash
gh api repos/omarjosephf/ojflorendo-portfolio/rules/branches/main
```

## Why this file is worth keeping

Recording a configuration is not the same as applying one, and this repository
learned that the hard way. The file was committed on 8 September 2026 as a record
of intended configuration and was never applied; `main` carried no protection and
no rulesets at all, while `SECURITY.md` had been claiming otherwise. Every merge
in that window was unenforced — CI was green, but nothing required it to be.

It also could not have been applied as first written. It set both `contexts` and
`checks` under `required_status_checks`, and the API accepts one or the other:

```text
422 Invalid request. For 'anyOf/1', {"contexts" => [], "checks" => [...]} is not a null.
```

So the two failure modes compounded: a control that was never turned on, stored
in a form that would have failed if anyone had tried. Both are fixed here — the
payload is now valid, and the protection is applied and verified live.

The lesson is the one the verify step above encodes: a configuration file is a
statement of intent, and only reading back the live setting is evidence.
