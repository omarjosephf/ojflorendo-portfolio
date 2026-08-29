# How OJ works: his approach, process and working method

## OJ's approach to starting a new project

OJ's approach to a new project starts with the real problem rather than the
technology. He clarifies the goal, the intended users, the constraints, and the
definition of success before choosing any tool or framework. Choosing a stack
before understanding the problem is how projects end up technically impressive
and practically useless.

He then works honestly through the engagement: saying when something is
uncertain, asking questions when information is missing, and declining work
outside his current capability rather than promising it. An honest limitation
stated early costs far less than one discovered late. This is why unfamiliar
projects often begin with a discovery phase or a single defined module rather
than a large committed scope.

## How OJ uses AI in his work, and who is accountable for the result

OJ uses AI as an accountable tool rather than a substitute for judgement. He uses
it to accelerate research, prototyping, implementation, debugging, and review,
while testing the output and remaining responsible for the final work.

His working rule is that AI-generated work is untrusted until it has been read
and verified. OJ directs the decisions, approves the changes, verifies the
output, and is accountable for the result. He does not present AI-assisted work
as independently created or verified by the AI provider, and he does not describe
his projects as built by AI, because that would obscure who is actually
responsible for them.

This matters more in his work than in most, since one of his projects exists
specifically to demonstrate that a confident AI answer is not the same as a
correct one.

## What OJ considers when building: accessibility, security and performance

When OJ builds something he considers clarity, accessibility, performance,
security, and maintainability alongside visual quality. Accessibility is treated
as a requirement rather than optional polish: keyboard access, focus visibility,
colour contrast, screen-reader behaviour, reduced-motion support, and usability at
200% zoom are all part of what "finished" means.

Performance is treated as a feature rather than a benchmark score, and he does
not trade accessibility or correctness for a better audit result. On the security
side he works with a minimal attack surface, secure defaults, defence in depth,
and no unnecessary collection of personal data. He does not describe any system
as unhackable or completely secure, because no system is.

## How OJ finishes a piece of work and what evidence he provides

OJ finishes by reviewing the completed work, testing important behaviour,
documenting meaningful decisions, and either resolving or disclosing known
limitations. "It works" is a claim that should be supported by something a reader
can check, so his projects carry measurements, test suites, and stated limits
rather than assertions.

Where a quality claim is made, it is reproducible: his document assistant project
ships an evaluation set that scores its own accuracy and refusal behaviour with
one command, and the published numbers state their sample size rather than
implying more coverage than they have.

## The engineering standards and governance OJ works to

OJ's platform and its supporting projects are governed by a written engineering
handbook covering risk classification, security, privacy, accessibility, testing,
release control, and AI-assisted engineering.

In practice this means changes are risk-classified before work begins,
architecture decisions are recorded in decision records with their alternatives
and trade-offs, threat models are written for anything that adds a trust
boundary, and quality gates covering dependency audit, linting, type checking,
unit tests, production build, and end-to-end browser tests must pass before
release. Publication, deployment, secret changes, and infrastructure changes
require explicit approval rather than happening by implication. This is unusual
for a personal portfolio and is deliberate: it is the working method he would
bring to a professional team.
