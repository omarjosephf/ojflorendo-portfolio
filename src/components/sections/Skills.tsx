import { skillGroups } from "@/data/skills";
import { Section } from "@/components/ui/Section";

/** Skill groups as rows, each with its skills as a short two-column list. */
export function Skills() {
  return (
    <Section
      id="skills"
      title="The skills behind the work"
      intro="My projects combine AI automation, web development, testing and clear technical communication. My broader experience includes data, training and digital operations."
    >
      <ul className="jf-rows">
        {skillGroups.map((group) => (
          <li key={group.title} className="jf-row">
            <h3 className="jf-row-title">{group.title}</h3>
            <div>
              <p className="jf-row-text">{group.summary}</p>
              <ul className="jf-offer-list" aria-label={`${group.title} skills`}>
                {group.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
