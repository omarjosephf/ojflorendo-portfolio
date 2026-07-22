import { experience } from "@/data/experience";
import { Section } from "@/components/ui/Section";
import { ExperienceTimeline } from "@/components/sections/ExperienceTimeline";

export function Experience() {
  return (
    <Section
      id="experience"
      eyebrow="Experience"
      title="Where I've worked"
      intro="Training, digital marketing, e-commerce operations and front-end work."
    >
      <ExperienceTimeline items={experience} />
    </Section>
  );
}
