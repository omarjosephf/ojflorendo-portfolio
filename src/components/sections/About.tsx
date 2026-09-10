import { BadgeCheck, GraduationCap, MapPin, Presentation } from "lucide-react";
import { positioning } from "@/data/positioning";
import { site } from "@/data/site";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

const highlights = [
  { icon: GraduationCap, label: "Final-year BSc Computing & IT (Software)" },
  { icon: BadgeCheck, label: "Software developer and AI-focused builder" },
  { icon: Presentation, label: "Delivered AI, Python and data training" },
  { icon: MapPin, label: "Windsor, Berkshire · Remote-friendly" },
];

/**
 * Jump links to the rest of this route. Every target is a section further down
 * /about, plus the reviewed public CV — the CV link is rendered only when one
 * is configured.
 */
const backgroundLinks = [
  { label: "Experience", href: "#experience" },
  { label: "Skills", href: "#skills" },
  { label: "Education & credentials", href: "#education" },
];

export function About() {
  return (
    <Section
      id="about"
      eyebrow="01 / About"
      title="I'm OJ. I build the work you see here."
      as="h1"
    >
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <Reveal className="max-w-[65ch] space-y-5 text-base leading-relaxed text-muted sm:text-lg">
          {site.about.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <ul className="about-background" aria-label="Supporting background">
            {backgroundLinks.map((link) => (
              <li key={link.href}>
                <a className="text-link" href={link.href}>{link.label}</a>
              </li>
            ))}
            {site.cvPath ? (
              <li>
                <a className="text-link" href={site.cvPath} target="_blank" rel="noopener noreferrer">
                  Public CV <span aria-hidden="true">↗</span>
                </a>
              </li>
            ) : null}
          </ul>
        </Reveal>

        <Reveal delay={1}>
          <ul className="grid gap-3">
            {highlights.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="glass flex items-center gap-3 rounded-xl px-4 py-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-ink">{label}</span>
              </li>
            ))}
          </ul>
          <ul className="about-roles" aria-label="Professional roles">{site.descriptor.split("·").map((role) => <li key={role}>{role.trim()}</li>)}</ul>
          <p className="about-availability">{positioning.hero.availability}</p>
        </Reveal>
      </div>
    </Section>
  );
}
