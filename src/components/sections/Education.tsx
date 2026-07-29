import { Award, ExternalLink, FileText, GraduationCap } from "lucide-react";
import { certifications, education } from "@/data/education";
import type { CredentialCategory } from "@/types";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

const categories: CredentialCategory[] = [
  "Professional certification",
  "Professional training",
  "Additional professional development",
];

export function Education() {
  return (
    <Section
      id="education"
      eyebrow="Education & credentials"
      title="Verified learning and professional development"
      intro="My credentials support my experience across Python, data, UX/UI, business intelligence, communication, and prompt engineering. Credential links and public PDFs appear only after their source evidence has been reviewed."
    >
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
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

        <Reveal delay={1}>
          <h3 className="mb-2 flex items-center gap-2 font-heading text-lg font-semibold text-ink">
            <Award className="h-5 w-5 text-accent" aria-hidden="true" />
            Credentials
          </h3>
          <p className="mb-5 text-sm leading-relaxed text-muted">
            Some credentials may display my legal name or a previously used
            professional name. Issuer records are preserved rather than rewritten.
          </p>

          <div className="space-y-6">
            {categories.map((category) => {
              const items = certifications.filter(
                (credential) => credential.category === category,
              );
              return (
                <section key={category} aria-labelledby={`credential-${category}`}>
                  <h4
                    id={`credential-${category}`}
                    className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-accent"
                  >
                    {category}
                  </h4>
                  <ul className="space-y-3">
                    {items.map((credential) => (
                      <li
                        key={credential.title}
                        className="glass hover-card rounded-xl px-4 py-3.5"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-ink">
                              {credential.title}
                            </p>
                            <p className="text-sm text-muted">{credential.issuer}</p>
                          </div>
                          <span className="shrink-0 text-xs text-muted">
                            {credential.date}
                          </span>
                        </div>

                        {credential.verificationUrl || credential.certificatePath ? (
                          <div className="mt-3 flex flex-wrap gap-3">
                            {credential.verificationUrl ? (
                              <a
                                href={credential.verificationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                              >
                                Verify credential
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                              </a>
                            ) : null}
                            {credential.certificatePath ? (
                              <a
                                href={credential.certificatePath}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                              >
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                View certificate
                              </a>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
