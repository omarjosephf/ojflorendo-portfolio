# Project: Personal Portfolio and Professional Platform

## Portfolio platform: what it is

This website. A responsive portfolio and personal platform presenting OJ's work,
experience, qualifications, and services, built on a security-conscious
foundation with room for future AI and content features.

It is live at https://ojfr.me and the source is at
https://github.com/omarjosephf/ojflorendo-portfolio. Status: live.

## Portfolio platform: why it exists

As a final-year Computing and IT student pursuing junior, internship, part-time,
freelance, and collaborative opportunities, OJ needed a professional online
presence he controls. It had to communicate clearly to employers and potential
clients, remain useful without unnecessary tracking, and provide a dependable
foundation for future projects, content, and a narrow AI guide.

## Portfolio platform: goals

- Present profile, capabilities, experience, qualifications, services, and work
  clearly and honestly.
- Provide an accessible, responsive experience across keyboard, screen-reader,
  reduced-motion, mobile, tablet, and desktop use.
- Maintain a small, security-conscious attack surface with no unnecessary
  tracking and no persistent user data.
- Keep public content in typed data so future projects and case studies can be
  added coherently.

## Portfolio platform: how OJ's own portfolio website was built

OJ's portfolio website at ojfr.me was built by him with the following technical
architecture. This describes his own site, not the websites he builds for
clients.

- Next.js App Router with React Server Components by default, and client
  components only where interaction requires them.
- Typed content modules kept separate from presentation components.
- A per-request nonce Content Security Policy generated in the Next.js proxy,
  with complementary security headers configured centrally.
- Build-time font optimisation, with no runtime third-party font dependency.
- A dynamically imported 3D scene as progressive enhancement, and a server-side
  contact route with a swappable email transport.

Technologies: Next.js, React, TypeScript, Tailwind CSS, Vitest, Playwright,
Vercel, Resend, and AI-assisted engineering with human review.

## Portfolio platform: security and privacy posture

The security posture of OJ's portfolio site is a deliberately minimal attack
surface with secure defaults. There are no user accounts, no database, no admin dashboard, no file uploads, no
payments, and no user-generated HTML. There is exactly one server-side
user-input boundary for contact messages, and a second for the assistant.

There is no behavioural analytics, no advertising tracker, no fingerprinting, and
no unnecessary cookie. Contact messages are not stored in a database or in
browser storage, and message bodies are not logged.

## Portfolio platform: the 3D hero

The Digital Core scene is progressive enhancement and never a dependency for
content or navigation. It is dynamically imported, respects reduced-motion
preferences, and has a CSS fallback. If WebGL is unavailable the site loses a
visual and nothing else.

## Portfolio platform: how the work is governed

Development follows a written engineering handbook: changes are risk-classified
before work begins, architecture decisions are recorded, security and privacy
impact is reviewed, and commit, deployment, secret, and DNS actions require
explicit approval rather than happening by implication. Quality gates cover a
dependency audit, linting, type checking, unit tests, a production build, and
end-to-end browser tests including accessibility checks.

## Portfolio platform: role and AI disclosure

OJ developed this platform through an AI-assisted engineering workflow, with
Claude Code and ChatGPT supporting research, planning, implementation, debugging,
and review. OJ directed the product decisions, approved the changes, verified the
output, and remains responsible for the final result. AI-generated suggestions
were treated as untrusted until inspected and tested. Architecture, security
controls, content, release decisions, and acceptance criteria remained under his
authority.
