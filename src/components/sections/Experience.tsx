import { experience } from "@/data/experience";
import { Section } from "@/components/ui/Section";
import { ExperienceTimeline } from "@/components/sections/ExperienceTimeline";

export function Experience() {
  return (
    <Section
      id="experience"
      eyebrow="04 / Experience"
      title="Experience that informs my work."
      intro="My background includes front-end development, professional training, digital content and e-commerce operations."
    >
      <ExperienceTimeline items={experience} />
    </Section>
  );
}
