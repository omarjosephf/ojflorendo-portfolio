import Link from "next/link";
import { experience } from "@/data/experience";
import { positioning } from "@/data/positioning";
import { site } from "@/data/site";
import { story } from "@/data/story";
import { Section } from "@/components/ui/Section";

/** Stage two: the owner's story, public parts only. */
export function AboutOrigin() {
  return (
    <Section id="origin" stage title="Where it started" className="jf-origin">
      <div className="jf-story">
        {story.origin.map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}
      </div>
    </Section>
  );
}

/**
 * Stage three: the training roles, as the sessions the owner taught. How the
 * work was obtained stays out of public copy (ADR-0029).
 */
export function AboutTeaching() {
  const taught = experience.filter((item) => item.teaching);
  return (
    <Section id="teaching" stage title="Teaching AI to working professionals" intro={site.about[1]}>
      <ol className="jf-teaching">
        {taught.map((item) => (
          <li key={`${item.organisation}-${item.period}`} className="jf-teaching-item">
            <h3 className="jf-teaching-org">{item.organisation}</h3>
            <p className="jf-teaching-role">{`${item.role}, ${item.period}`}</p>
            <p className="jf-stage-text">{item.responsibilities[0]}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/**
 * Stage four: the systems in orbit. Each is described by what it does and its
 * real status; Learn Your Way is in progress and says so.
 */
export function AboutBuilding() {
  const { cited, ev, blog, learnYourWay } = positioning.work;
  const systems = [
    { title: cited.title, status: cited.status, text: cited.summary, link: { href: `/projects/${cited.caseStudySlug}`, label: "Read the Cited case study" } },
    { title: ev.title, status: ev.status, text: ev.summary, link: null },
    { title: "The blog agents", status: blog.status, text: blog.summary, link: { href: blog.href, label: "Read the blog" } },
    { title: learnYourWay.title, status: learnYourWay.status, text: learnYourWay.summary, link: null },
  ];
  return (
    <Section id="building" stage title="Systems I have launched and run" intro={site.about[2]}>
      <ul className="jf-systems">
        {systems.map((system) => (
          <li key={system.title} className={system.status === "Live" ? "jf-system" : "jf-system jf-system-pending"}>
            <h3 className="jf-system-title">{system.title}</h3>
            <p className="jf-system-status">
              <span className={system.status === "Live" ? "jf-status-dot" : "jf-status-dot jf-status-dot-hollow"} aria-hidden="true" />
              {system.status}
            </p>
            <p className={system.text.startsWith("[") ? "jf-stage-text jf-placeholder" : "jf-stage-text"}>{system.text}</p>
            {system.link ? (
              <Link href={system.link.href} className="jf-text-link">
                {system.link.label}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}
