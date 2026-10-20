import { site } from "@/data/site";
import { Container } from "@/components/ui/Container";

/** The journey's stops, for the reader who wants to jump ahead. */
const STOPS = [
  { label: "Origin", href: "#origin" },
  { label: "Teaching", href: "#teaching" },
  { label: "Building", href: "#building" },
  { label: "Experience", href: "#experience" },
  { label: "Skills", href: "#skills" },
  { label: "Now", href: "#now" },
  { label: "Credentials", href: "#education" },
];

/**
 * Stage one. The name is the page's h1; while the journey scene draws the name
 * in stars, CSS hides this heading visually (it stays in the accessibility
 * tree), and without the scene it shows in the display face.
 */
export function AboutArrival() {
  return (
    <section id="about" aria-labelledby="about-heading" className="jf-stage jf-arrival" data-stage="">
      <Container className="jf-arrival-inner">
        <h1 id="about-heading" className="jf-about-name">
          <span>Joseph</span> <span>Florendo</span>
        </h1>
        <div className="jf-arrival-card">
          <figure className="jf-portrait">
            <img
              src="/images/profile/oj-hero-600.webp"
              srcSet="/images/profile/oj-hero-600.webp 600w, /images/profile/oj-hero-1000.webp 1000w"
              sizes="(min-width: 768px) 220px, 160px"
              alt="Joseph Florendo wearing glasses and a cream top"
              width={600}
              height={750}
              decoding="async"
            />
          </figure>
          <div>
            <p className="jf-arrival-line">
              I build AI automations in public. This is how I got here, and what I am building now.
            </p>
            <nav aria-label="Journey" className="jf-stops">
              <ul>
                {STOPS.map((stop) => (
                  <li key={stop.href}>
                    <a href={stop.href}>{stop.label}</a>
                  </li>
                ))}
                {site.cvPath ? (
                  <li>
                    <a href={site.cvPath} target="_blank" rel="noopener noreferrer">
                      Public CV<span className="sr-only"> (PDF, opens in a new tab)</span>
                    </a>
                  </li>
                ) : null}
              </ul>
            </nav>
          </div>
        </div>
      </Container>
    </section>
  );
}
