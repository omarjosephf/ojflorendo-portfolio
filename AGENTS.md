# Project Zero repository guidance

Read and follow `docs/ENGINEERING_HANDBOOK.md` before planning or performing
Project Zero work. Read `docs/adr/0000-handbook-adoption.md` and every ADR
relevant to the task.

OJ Florendo is the accountable human owner and final approval authority. Treat
AI-assisted output as untrusted until it has been inspected and verified.

Do not commit, push, merge, tag, deploy, modify production secrets, alter DNS,
or perform destructive actions without explicit owner approval.

Private or machine-local instructions belong only in ignored `.claude/`,
`.agents/`, `CLAUDE.local.md`, or `AGENTS.local.md` files. Their contents must
never be copied into this public repository.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
