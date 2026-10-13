# Runbook: blog agents (Phase 18.4, OpenRouter route from 13 October 2026)

Runs the six ADR-0026 blog agents from the owner's computer. Read the
[threat model](../threat-models/blog-live-pipeline.md) first.

## One-time setup (owner)

1. In OpenRouter, create a key for the blog only, with a hard total credit
   limit and an expiry date. Do not reuse another project's key. The key's
   limit is the provider-side spending limit. Keep OpenRouter's input and
   output logging off.
2. Save the key in a file outside the repository, as one line:
   `OPENROUTER_API_KEY=<key>`. Never paste the key into a chat or a commit.
3. Choose a data directory outside the repository for private run records and
   the spend ledger.

## Each post

Run from the repository root, with `BLOG_AGENTS_DATA_DIR` set to the data
directory:

```text
node --env-file=<key file> scripts/blog-agents.mjs ideas
```

Open the printed ideas page. It lists the ideas and the addresses and titles
of the web pages the Exa search used. Pick an idea, then:

```text
node --env-file=<key file> scripts/blog-agents.mjs run --slate <slate id> --idea <n>
```

Read the printed reading copy. A run ends in one of four states:

- **owner-review:** every gate passed and the score is above 75.
- **held:** gates failed or the score is 75 or below.
- **no-draft:** the sources could not support the brief.
- **failed:** a contract, provider or spend stop.

Only an owner-review run can be published. If you approve it:

```text
node scripts/blog-agents.mjs promote --run <run id> --date YYYY-MM-DD
```

This writes the post to `content/blog/posts` and its summary to
`src/data/blog-runs.json`, and commits nothing. To show a held or failed run in
the panel without publishing it, use `summarize --run <run id>` instead. The
post and summary then go through the normal pull request and release approval.

`spend` prints the OpenRouter route's total against its US$2.00 ceiling.

## When something goes wrong

- **Spend ceiling reached:** the call was not sent. Nothing more can run until
  the owner decides whether to raise the ceiling, which is a reviewed code
  change.
- **Unreadable ledger:** every run stops. Inspect the file; never delete it to
  get past the stop.
- **HTTP 401 or 403:** the key is wrong or revoked. The run stops without
  running Critique.
- **HTTP 402:** the key's credit limit or the account's credits are used up.
  The run stops without running Critique.
- **Cost above reservation:** treated as a global stop. Check the call's
  generation id in OpenRouter's activity log before running again.

## Rollback

Revert the pull request that added the post. Revoke the key in OpenRouter if
it may be exposed.
