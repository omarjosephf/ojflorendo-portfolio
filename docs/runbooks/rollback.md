# Portfolio rollback

Rollback is appropriate for a release that breaks primary journeys, exposes
private data, weakens security, or makes critical content inaccessible. Obtain
explicit owner approval for rollback; ordinary visual refinement can use a
follow-up reviewed change instead.

## Known-good target before the September redesign

- Production commit: `842c72752736d4bafeb21b687eed285325d609de`.
- Successful production deployment recorded on 31 August 2026:
  `ojflorendo-portfolio-fzav2t23d-oj-s-personal-projects.vercel.app`.

In the existing Vercel portfolio project's deployment history, verify the
deployment's commit and production status, then use its rollback/promote action
after approval. Alternatively, revert the redesign through a new pull request,
pass CI, and merge through the normal release workflow. Never force-push.

The redesign changes no environment-variable contract or provider configuration,
so the existing secrets remain compatible. Leave DNS and secrets unchanged.

After rollback, verify the canonical HTTPS domain, intended deployment/commit,
homepage and both project routes, security headers, navigation, contact behavior,
metadata, responsive layout and reduced motion. Record the incident, impact,
verification and corrective follow-up in the release pull request or incident
record. Do not claim success solely because a deployment reports ready.
