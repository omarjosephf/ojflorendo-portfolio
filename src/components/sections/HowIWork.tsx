import { positioning } from "@/data/positioning";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function HowIWork() {
  return (
    <Section
      id="approach"
      eyebrow="03 / How I work"
      title="Know what we are building, and why."
      intro={positioning.howIWork.intro}
    >
      <ol className="process-list">
        {positioning.howIWork.steps.map((item, index) => (
          <li key={item.title}><span className="process-number" aria-hidden="true">0{index + 1}</span><h3>{item.title}</h3><p>{item.description}</p></li>
        ))}
      </ol>
      <Reveal className="process-principle">
        <p><strong>Working principle:</strong> {positioning.howIWork.principle}</p>
      </Reveal>
    </Section>
  );
}
