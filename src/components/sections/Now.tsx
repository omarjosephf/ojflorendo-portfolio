import { now } from "@/data/now";
import { Section } from "@/components/ui/Section";

/** What the owner is working on now, as plain rows. Placeholders are marked. */
export function Now() {
  return (
    <Section
      id="now"
      stage
      title="What I'm working on now"
      intro={`My current focus, updated ${now.updated}.`}
    >
      <ul className="jf-rows">
        {now.items.map((item) => (
          <li key={item.title} className="jf-row">
            <h3 className="jf-row-title">{item.title}</h3>
            <p className={item.description.startsWith("[") ? "jf-row-text jf-placeholder" : "jf-row-text"}>
              {item.description}
            </p>
          </li>
        ))}
      </ul>
      {now.personalNote ? <p className="jf-stage-text">{now.personalNote}</p> : null}
      <p className="jf-fine jf-updated">Last updated {now.updated}.</p>
    </Section>
  );
}
