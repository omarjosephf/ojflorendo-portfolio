import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { site } from "@/data/site";
import { positioning } from "@/data/positioning";
import { projects } from "@/data/projects";
import { Container } from "@/components/ui/Container";

export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-heading" className="portfolio-hero">
      <Container>
        <div className="hero-meta">
          <p>{positioning.hero.eyebrow}</p>
          <p>{site.location.replace(", United Kingdom", "")} <span aria-hidden="true">↗</span></p>
        </div>
        <div className="hero-grid">
          <div className="hero-copy">
            <h1 id="hero-heading" className="hero-name">
              <span>OJ Florendo</span>{" "}<span>Rayatchi</span>
            </h1>
            <p className="hero-headline">{site.headline}</p>
            <p className="hero-support">{positioning.hero.supportingCopy}</p>
            <div className="hero-actions">
              <a href="#contact" className="button-primary">
                {positioning.hero.primaryCta}<ArrowUpRight size={19} aria-hidden="true" />
              </a>
              <a href="#projects" className="text-link">
                {positioning.hero.secondaryCta}<ArrowDown size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="hero-work">
            <div className="hero-note" aria-hidden="true">Ideas into<br />working things. <span>↘</span></div>
            <div className="hero-project-stack">
              {projects.filter((project) => project.image && project.caseStudy).slice(0, 2).map((project, index) => (
                <Link className={`hero-preview hero-preview-${index + 1}`} key={project.slug} href={`/projects/${project.slug}`} aria-label={`Preview ${project.title}`}>
                  <div className="preview-bar"><span className="preview-dots" aria-hidden="true">● ● ●</span><span>{index === 0 ? "Portfolio & platform" : "Cited · Document assistant"}</span><ArrowUpRight size={16} aria-hidden="true" /></div>
                  <img src={project.image!} alt="" width={1104} height={320} decoding="async" fetchPriority={index === 0 ? "high" : "auto"} />
                  <span className="preview-caption">{index === 0 ? "Software, design & a personal platform" : "An AI project grounded in real sources"}</span>
                </Link>
              ))}
            </div>
            <p className="hero-work-caption"><span aria-hidden="true">↳</span> A few things I’ve brought to life</p>
          </div>
        </div>
        <div className="hero-bottom">
          <p><span className="availability-dot" aria-hidden="true" /> Open to selected projects & collaborations</p>
          <p>Thoughtful technology. Practical outcomes.</p>
          <a href="#projects" aria-label="Scroll to selected work"><ArrowDown size={22} aria-hidden="true" /></a>
        </div>
      </Container>
    </section>
  );
}
