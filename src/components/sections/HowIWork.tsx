import { positioning } from "@/data/positioning";
import { Section } from "@/components/ui/Section";

export function HowIWork() {
  return (
    <Section id="approach" eyebrow="03 / How I work" title="Clear decisions, honest communication, accountable delivery" intro="Good work is not only about delivering something that looks impressive. It is about understanding the purpose, communicating clearly, and taking responsibility for the result.">
      <ol className="process-list">
        {positioning.howIWork.map((item, index) => (
          <li key={item.title}><span className="process-number" aria-hidden="true">0{index + 1}</span><h3>{item.title}</h3><p>{item.description}</p></li>
        ))}
      </ol>
    </Section>
  );
}
