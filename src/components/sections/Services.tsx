import { positioning } from "@/data/positioning";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function Services() {
  return (
    <Section
      id="services"
      eyebrow="01 / How I can help"
      title="A clear starting point for your website."
      intro={positioning.services.intro}
    >
      <div>
        {positioning.services.offers.map((offer, index) => (
          <Reveal key={offer.title} className="service-row">
            <span className="service-index" aria-hidden="true">0{index + 1}</span>
            <div>
              <h3>{offer.title}</h3>
              <p>{offer.description}</p>
              <span className="service-status">{offer.status}</span>
            </div>
            <ul>{offer.includes.map((item) => <li key={item}>{item}</li>)}</ul>
          </Reveal>
        ))}
      </div>
      <Reveal className="services-notes">
        <p><strong>Scope note:</strong> {positioning.services.scopeNote}</p>
        <p><strong>Related work:</strong> {positioning.services.relatedWork}</p>
      </Reveal>
    </Section>
  );
}
