import Link from "next/link";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { projects } from "@/data/projects";
import type { ProjectItem } from "@/types";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { GithubIcon } from "@/components/ui/BrandIcons";

function ProjectCard({ project, index }: { project: ProjectItem; index: number }) {
  const imageContent = project.image ? (
    <img src={project.image} alt="" width={1104} height={320} loading="lazy" decoding="async" />
  ) : <div className="project-placeholder"><Sparkles size={40} aria-hidden="true" /></div>;
  return (
    <article className={`project-card project-card-${index + 1}`}>
      {project.caseStudy ? (
        <Link href={`/projects/${project.slug}`} className="project-frame" aria-label={`Preview ${project.title}`}>
          <div className="project-browser"><span className="preview-dots" aria-hidden="true">● ● ●</span><span>{project.title}</span></div>
          {imageContent}
          <span className="project-frame-label">Inside the project <ArrowUpRight size={18} aria-hidden="true" /></span>
        </Link>
      ) : <div className="project-frame">{imageContent}</div>}
      <div className="project-details">
        <div className="project-heading"><span className="project-number" aria-hidden="true">0{index + 1}</span><h3>{project.title}</h3><span className="project-status">{project.status}</span></div>
        <p className="project-description">{project.description}</p>
        <ul className="project-technologies">{project.technologies.map((tech) => <li key={tech}>{tech}</li>)}</ul>
        <div className="project-links">
          {project.caseStudy ? <Link href={`/projects/${project.slug}`} className="text-link" aria-label={`Read the ${project.title} case study`}>Read case study <ArrowRight size={17} aria-hidden="true" /></Link> : null}
          {project.liveUrl ? <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="text-link" aria-label={`${project.title} — live site (opens in a new tab)`}>Live site <ArrowUpRight size={17} aria-hidden="true" /></a> : null}
          {project.githubUrl ? <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-link" aria-label={`${project.title} — source on GitHub (opens in a new tab)`}><GithubIcon className="h-4 w-4" />Code</a> : null}
        </div>
      </div>
    </article>
  );
}

export function Projects() {
  return (
    <Section id="projects" eyebrow="01 / Projects" title="Selected work" intro="Projects built to solve real problems. This portfolio is the first—more software, automation, and AI work is in development.">
      <div className="projects-grid">
        {projects.map((project, index) => <Reveal key={project.slug}><ProjectCard project={project} index={index} /></Reveal>)}
      </div>
      <div className="projects-next">
        <Sparkles size={24} aria-hidden="true" />
        <div><h3>More purposeful projects are in development</h3><p>Each will be published with an honest description of its status, decisions, limitations, and lessons learned.</p></div>
        <a href="#now" className="text-link">What’s next <ArrowUpRight size={18} aria-hidden="true" /></a>
      </div>
    </Section>
  );
}
