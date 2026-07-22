import Link from "next/link";
import { ArrowRight, ArrowUpRight, Hourglass, Sparkles } from "lucide-react";
import { projects } from "@/data/projects";
import type { ProjectItem } from "@/types";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { GithubIcon } from "@/components/ui/BrandIcons";

function StatusBadge({ status }: { status: ProjectItem["status"] }) {
  const isLive = status === "Live";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        isLive
          ? "bg-accent/15 text-accent"
          : "bg-surface-2 text-muted"
      }`}
    >
      {!isLive ? <Hourglass className="h-3 w-3" aria-hidden="true" /> : null}
      {status}
    </span>
  );
}

function ProjectCard({ project }: { project: ProjectItem }) {
  return (
    <article className="glass hover-card flex flex-col overflow-hidden rounded-2xl">
      {/* Decorative banner (no image supplied yet) */}
      <div className="flex h-40 items-center justify-center bg-gradient-to-br from-surface-2 to-surface">
        <Sparkles className="h-10 w-10 text-accent" aria-hidden="true" />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-heading text-lg font-semibold text-ink">
            {project.title}
          </h3>
          <StatusBadge status={project.status} />
        </div>

        <p className="mt-2 text-sm leading-relaxed text-muted">
          {project.description}
        </p>

        <ul className="mt-4 flex flex-wrap gap-2">
          {project.technologies.map((tech) => (
            <li key={tech} className="chip">
              {tech}
            </li>
          ))}
        </ul>

        {/* Case-study link + any real URLs. No dead buttons (CLAUDE.md §9). */}
        {(project.caseStudy || project.liveUrl || project.githubUrl) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {project.caseStudy ? (
              <Link
                href={`/projects/${project.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-night transition-transform hover:-translate-y-0.5"
                aria-label={`Read the ${project.title} case study`}
              >
                Read case study
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
            {project.liveUrl ? (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-night"
                aria-label={`${project.title} — live site (opens in a new tab)`}
              >
                Live site
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
            {project.githubUrl ? (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink"
                aria-label={`${project.title} — source on GitHub (opens in a new tab)`}
              >
                <GithubIcon className="h-4 w-4" />
                Code
              </a>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

export function Projects() {
  return (
    <Section
      id="projects"
      eyebrow="Projects"
      title="Selected work"
      intro="Real projects only. This site is the first — more, built with Claude Code, are on the way."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {projects.map((project) => (
          <Reveal key={project.slug}>
            <ProjectCard project={project} />
          </Reveal>
        ))}

        {/* Honest "coming soon" state — not a fake project (CLAUDE.md §3/§9) */}
        <Reveal delay={1}>
          <div className="flex h-full min-h-[16rem] flex-col items-center justify-center rounded-2xl border border-dashed border-line p-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-accent">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-heading text-lg font-semibold text-ink">
              More projects coming soon
            </h3>
            <p className="mt-2 max-w-xs text-sm text-muted">
              New software, website, AI and data projects will appear here as I
              build them.
            </p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
