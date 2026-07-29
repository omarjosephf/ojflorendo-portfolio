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
