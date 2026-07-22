import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ProjectItem } from "@/types";
import { Container } from "@/components/ui/Container";

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-[68ch] text-base leading-relaxed text-muted sm:text-lg">
      {children}
    </p>
  );
}

function Block({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line/60 pt-8">
      <h2 className="font-heading text-xl font-semibold text-ink sm:text-2xl">
        {heading}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="max-w-[68ch] space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-muted">
          <span
            aria-hidden="true"
            className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-accent"
          />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Reusable, data-driven case-study template (CLAUDE.md §9 / Phase 6). */
export function CaseStudyView({ project }: { project: ProjectItem }) {
  const cs = project.caseStudy;
  if (!cs) return null;

  return (
    <article className="py-28 sm:py-32">
      <Container>
        {/* Header */}
        <Link
          href="/#projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to projects
        </Link>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
            {project.status}
          </span>
          <span className="text-xs uppercase tracking-[0.18em] text-accent">
            Case study
          </span>
        </div>

        <h1 className="mt-4 max-w-3xl font-heading text-3xl font-bold tracking-tight text-ink sm:text-5xl">
          {project.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{cs.tagline}</p>

        <ul className="mt-6 flex flex-wrap gap-2">
          {project.technologies.map((tech) => (
            <li key={tech} className="chip">
              {tech}
            </li>
          ))}
        </ul>

        {/* Body */}
        <div className="mt-14 space-y-10">
          <Block heading="Overview">
            <Prose>{cs.overview}</Prose>
          </Block>
          <Block heading="Context & problem">
            <Prose>{cs.context}</Prose>
          </Block>
          <Block heading="Goals">
            <BulletList items={cs.goals} />
          </Block>
          <Block heading="My role">
            <Prose>{cs.role}</Prose>
          </Block>
          <Block heading="Process">
            <ol className="max-w-[68ch] space-y-3">
              {cs.process.map((step, i) => (
                <li key={i} className="flex gap-3 text-muted">
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-accent"
                  >
                    {i + 1}
                  </span>
                  <span className="mt-0.5 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </Block>
          <Block heading="Technical architecture">
            <BulletList items={cs.architecture} />
          </Block>
          <Block heading="Key features">
            <BulletList items={cs.features} />
          </Block>
          <Block heading="Accessibility & security">
            <BulletList items={cs.accessibilitySecurity} />
          </Block>
          <Block heading="Performance work">
            <BulletList items={cs.performance} />
          </Block>
          <Block heading="Challenges & decisions">
            <div className="grid max-w-[68ch] gap-4">
              {cs.challenges.map((c, i) => (
                <div key={i} className="glass rounded-2xl p-5">
                  <h3 className="font-heading text-base font-semibold text-ink">
                    {c.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </Block>
          <Block heading="Outcome">
            <Prose>{cs.outcome}</Prose>
          </Block>
          <Block heading="Lessons learned">
            <BulletList items={cs.lessons} />
          </Block>
          <Block heading="Technology stack">
            <ul className="flex flex-wrap gap-2">
              {cs.stack.map((tech) => (
                <li key={tech} className="chip">
                  {tech}
                </li>
              ))}
            </ul>
          </Block>
        </div>

        {/* Return link */}
        <div className="mt-14 border-t border-line/60 pt-8">
          <Link
            href="/#projects"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-accent/60"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to all projects
          </Link>
          <Link
            href="/#contact"
            className="ml-3 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-night transition-transform hover:-translate-y-0.5"
          >
            Get in touch
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </article>
  );
}
