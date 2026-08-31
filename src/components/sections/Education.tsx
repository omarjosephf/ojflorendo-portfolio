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

/**
 * The intro has been rewritten twice for the same underlying reason: it must not
 * imply that a credential without an issuer verification page is somehow less
 * evidenced. It previously said links "appear only after their source evidence
 * has been reviewed", then that not every provider offers a verification page.
 * Both readings left three credentials looking unsupported.
 *
 * Since 31 August 2026 every credential publishes its certificate document, so
 * the intro can state the plain arrangement: the document is the evidence, and an
 * issuer page is an extra where one exists.
 */
const INTRO =
  "My credentials support my experience across Python, data, UX/UI, business intelligence, communication, and prompt engineering. Every credential below links to the certificate itself, and where the issuer also publishes a public verification page, I link to that as well.";

/**
 * Published under the owner's explicit decision of 31 August 2026. The wording is
 * his own and was chosen from three drafts; do not expand it with the family
 * detail he deliberately left out.
 */
const NAME_DISCLOSURE =
  "Some certificates show my legal name, Omar Joseph Florendo — the name on my birth certificate, and the name each issuer recorded. I go by OJ, and I present professionally as OJ Florendo Rayatchi, using both family surnames. Issuer records are preserved exactly as issued rather than rewritten.";

export function Education() {
  return (
    <Section
      id="education"
      eyebrow="Education & credentials"
      title="Verified learning and professional development"
      intro={INTRO}
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
          <p className="mb-5 text-sm leading-relaxed text-muted">{NAME_DISCLOSURE}</p>

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
                    {items.map((credential) => {
                      /*
                       * Four of the six certificates are scans with no text
                       * layer, so the document itself tells assistive technology
                       * nothing. The link's accessible name has to carry the
                       * credential, issuer, date and format instead.
                       */
                      const context = `${credential.title}, ${credential.issuer}, ${credential.date}`;

                      return (
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

                          {credential.certificatePath || credential.verificationUrl ? (
                            <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2.5">
                              {credential.certificatePath ? (
                                <a
                                  href={credential.certificatePath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent/60"
                                >
                                  <FileText
                                    className="h-3.5 w-3.5 text-accent"
                                    aria-hidden="true"
                                  />
                                  View certificate
                                  <span className="sr-only">{` for ${context} (PDF)`}</span>
                                </a>
                              ) : null}
                              {credential.verificationUrl ? (
                                <a
                                  href={credential.verificationUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                                >
                                  Verify with issuer
                                  <span className="sr-only">{` for ${context}`}</span>
                                  <ExternalLink
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
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
