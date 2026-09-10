import { ArrowDown, ArrowUpRight } from "lucide-react";
import { site } from "@/data/site";
import { positioning } from "@/data/positioning";
import { Container } from "@/components/ui/Container";
import { HeroPortrait } from "@/components/ui/HeroPortrait";

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
            {/*
              The name is a display wordmark, not the heading. The page-level h1
              still states the offer, because a visitor deciding whether this
              person can help them needs the offer first, and the title,
              description and structured data all lead with it for the same
              reason. aria-hidden keeps the name from being announced twice:
              it is already the nav wordmark and the About heading.
            */}
            <p className="hero-wordmark" aria-hidden="true">
              {positioning.hero.displayName.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>
            <h1 id="hero-heading" className="hero-offer">
              {positioning.hero.headline.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
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
          <HeroPortrait />
        </div>
        <div className="hero-bottom">
          <p><span className="availability-dot" aria-hidden="true" /> {positioning.hero.availability}</p>
          <p>{positioning.hero.locationNote}</p>
          <a href="#services" aria-label="Scroll to services"><ArrowDown size={22} aria-hidden="true" /></a>
        </div>
      </Container>
    </section>
  );
}
