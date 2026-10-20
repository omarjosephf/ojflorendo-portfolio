import { experience } from "@/data/experience";
import { Section } from "@/components/ui/Section";
import { ExperienceTimeline } from "@/components/sections/ExperienceTimeline";

export function Experience() {
  return (
    <Section
      id="experience"
      stage
      title="Where I've worked"
      intro="AI training, digital content and e-commerce operations, and front-end work, newest first."
    >
      <ExperienceTimeline items={experience} />
    </Section>
  );
}
