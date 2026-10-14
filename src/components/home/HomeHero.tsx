import { positioning } from "@/data/positioning";
import { Container } from "@/components/ui/Container";
import { ExampleRun } from "@/components/home/ExampleRun";

const { hero } = positioning;

/**
 * The name is the page's h1 (ADR-0029): this is a personal brand, and the
 * title, structured data and social card all lead with it. The role and the
 * offer follow directly, so the first viewport still says what is on offer
 * and the primary action sits beside it.
 */
export function HomeHero() {
  return (
    <section id="top" aria-labelledby="hero-heading" className="jf-hero">
      <Container className="jf-hero-grid">
        <div className="jf-hero-copy">
          <h1 id="hero-heading" className="jf-hero-name">
            {hero.displayName.map((line, index) => (
              <span key={line}>
                {index > 0 ? " " : null}
                {line}
              </span>
            ))}
          </h1>
          <p className="jf-hero-role">{hero.role}</p>
          <p className="jf-hero-lede">{hero.headline.join(" ")}</p>
          <div className="jf-hero-actions">
            <a href="#contact" className="jf-button">
              {hero.primaryCta}
            </a>
            <a href="#projects" className="jf-button jf-button-quiet">
              {hero.secondaryCta}
            </a>
          </div>
          <p className="jf-hero-note">{hero.availability}</p>
        </div>
        <div className="jf-hero-side">
          <ExampleRun content={positioning.exampleRun} />
        </div>
      </Container>
    </section>
  );
}
