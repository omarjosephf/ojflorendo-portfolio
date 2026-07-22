import { skillGroups } from "@/data/skills";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function Skills() {
  return (
    <Section
      id="skills"
      eyebrow="Skills"
      title="What I work with"
      intro="A mix of software, AI, data and digital skills built through study, training work and real projects."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {skillGroups.map((group, i) => (
          <Reveal
            key={group.title}
            delay={((i % 4) + 1) as 1 | 2 | 3 | 4}
            className="glass hover-card flex flex-col rounded-2xl p-6"
          >
            <h3 className="font-heading text-lg font-semibold text-ink">
              {group.title}
            </h3>
            <p className="mt-1.5 text-sm text-muted">{group.summary}</p>
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
