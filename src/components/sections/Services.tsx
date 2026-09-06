import { Beaker } from "lucide-react";
import { positioning } from "@/data/positioning";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function Services() {
  return (
    <Section id="services" eyebrow="02 / Services" title="Practical support for digital ideas and growing organisations." intro={positioning.services.intro}>
      <div>
        {positioning.services.availableNow.map((service, index) => (
          <Reveal key={service.title} className="service-row">
            <span className="service-index" aria-hidden="true">0{index + 1}</span>
            <div><h3>{service.title}</h3><p>{service.description}</p><span className="service-status">Available now</span></div>
            <ul>{service.includes.map((item) => <li key={item}>{item}</li>)}</ul>
          </Reveal>
        ))}
      </div>
      <Reveal className="services-experimental">
        <Beaker className="text-accent" aria-hidden="true" size={28} />
        <div><h3>Experimental / available for collaboration</h3><p>{positioning.services.experimental}</p><p><strong>Scope note:</strong> {positioning.services.scopeNote}</p></div>
      </Reveal>
    </Section>
  );
}
