# ADR-0000: Adopt Project Zero Engineering Handbook v1.1.0

- Status: Accepted — repository adoption pending merge
- Date: 2026-07-28
- Owner: OJ Florendo

## Context

Project Zero previously operated under the owner-ratified Handbook v1.0.0. The
owner has now ratified the exact supplied v1.1.0 release-candidate document
unchanged as **Project Zero Engineering Handbook v1.1.0**.

The document body retains its historical `1.1.0-rc1` and "awaiting final owner
ratification" wording because ratification promoted the exact bytes unchanged.
That historical metadata must not be interpreted as overriding the owner's later
ratification. This ADR records the promotion and repository-adoption rule without
silently rewriting the ratified policy text.

## Decision

1. Store the exact ratified bytes at `docs/ENGINEERING_HANDBOOK.md`.
2. Treat those bytes as **Project Zero Engineering Handbook v1.1.0**.
3. Record 28 July 2026 as the owner-ratification date.
4. Make the repository copy the durable source of truth when this ADR and the
   exact handbook bytes are merged into canonical `main` through the approved
   release workflow.
5. Keep v1.0.0 in Git history as the superseded governing version.
6. Use root `AGENTS.md` and `CLAUDE.md` only as privacy-safe pointers to the
   handbook and ADRs.

Ratified document SHA-256:

```text
f2c7b0029e36b6ffd70d36a909af7cce13ae5813d5f62b5c362cc0971e6d7f59
```

The checksum must be recomputed from `docs/ENGINEERING_HANDBOOK.md` after copy,
after staging, and from the committed repository file. Any mismatch blocks
adoption until explained and approved.

## Alternatives considered

### Rewrite the handbook header and changelog

Rejected for this adoption step because the owner ratified the exact candidate
unchanged. Rewriting the body would create a new, unratified byte sequence.

### Leave ratification only in chat history

Rejected because future contributors must be able to determine authority without
hidden conversation context.

### Keep private AI instruction files as repository guidance

Rejected because private briefs and machine-local instructions do not belong in
the public canonical repository.

## Security and privacy impact

This decision adds no secret, production credential, personal address, private
phone number, private CV, or machine-local path. Pointer files deliberately contain
only public governance instructions.

## Accessibility and performance impact

None. This is governance and repository-hygiene documentation only.

## Operational impact

R2 work must follow the handbook's approval, verification, PR, and release rules.
Commit, push, merge, deployment, DNS, secret, and destructive actions remain
separately controlled.

## Consequences and trade-offs

- The handbook body continues to show historical release-candidate metadata.
- This ADR is required to interpret that metadata correctly.
- Repository adoption is incomplete until the exact file and ADR are committed and
  published through the approved workflow.

## Rollback or migration

Before publication, remove the candidate files. After publication, revert the
adoption commit through a reviewed pull request; do not rewrite history.

## Related decisions

- `docs/ENGINEERING_HANDBOOK.md`
- `docs/adr/0001-contact-form-email-boundary.md`
- Project Zero Strategic Handoff, 28 July 2026
