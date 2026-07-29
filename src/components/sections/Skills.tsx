import { skillGroups } from "@/data/skills";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function Skills() {
  return (
    <Section
      id="skills"
      eyebrow="Capabilities"
      title="Capabilities shaped by software, AI, design, and operations."
      intro="My experience combines technical development with training, UX, data, content, and digital operations. This helps me consider both how a product is built and how it will be understood, used, and maintained."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {skillGroups.map((group, index) => (
          <Reveal
            key={group.title}
            delay={((index % 4) + 1) as 1 | 2 | 3 | 4}
            className="glass hover-card flex flex-col rounded-2xl p-6"
          >
            <h3 className="font-heading text-lg font-semibold text-ink">
              {group.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {group.summary}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {group.skills.map((skill) => (
                <li key={skill} className="chip">
                  {skill}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
