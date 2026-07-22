import { GraduationCap, Award } from "lucide-react";
import { certifications, education } from "@/data/education";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function Education() {
  return (
    <Section id="education" eyebrow="Education" title="Education & certifications">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Education */}
        <Reveal>
          <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-ink">
            <GraduationCap className="h-5 w-5 text-accent" aria-hidden="true" />
            Education
          </h3>
          <ul className="space-y-4">
            {education.map((item) => (
              <li key={item.qualification} className="glass hover-card rounded-2xl p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <p className="font-medium text-ink">{item.qualification}</p>
                  <span className="text-sm text-muted">{item.period}</span>
                </div>
                <p className="mt-0.5 text-sm text-accent">{item.institution}</p>
                {item.detail ? (
                  <p className="mt-2 text-sm text-muted">{item.detail}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Certifications */}
        <Reveal delay={1}>
          <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-ink">
            <Award className="h-5 w-5 text-accent" aria-hidden="true" />
            Certifications
          </h3>
          <ul className="space-y-3">
            {certifications.map((cert) => (
              <li
                key={cert.title}
                className="glass hover-card flex items-start justify-between gap-3 rounded-xl px-4 py-3.5"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{cert.title}</p>
                  <p className="text-sm text-muted">{cert.issuer}</p>
                </div>
                <span className="shrink-0 text-xs text-muted">{cert.date}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
