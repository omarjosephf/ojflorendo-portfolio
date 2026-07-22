import { Mail, ArrowUpRight } from "lucide-react";
import { site } from "@/data/site";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { ContactForm } from "@/components/sections/ContactForm";

export function Contact() {
  const externalSocials = site.socials.filter((s) => s.external);

  return (
    <Section
      id="contact"
      eyebrow="Contact"
      title="Let's work together"
      intro="Open to junior, internship, part-time, remote, freelance and collaborative opportunities. Send a message below, or reach me directly."
    >
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <Reveal>
          <ContactForm />
        </Reveal>

        <Reveal delay={1}>
          <div className="glass flex flex-col gap-6 rounded-2xl p-6 sm:p-8">
            <div>
              <p className="font-heading text-lg font-semibold text-ink">
                Prefer to reach out directly?
              </p>
              <p className="mt-2 text-sm text-muted">
                Email is the quickest way to get a reply. You can also connect on
                LinkedIn or take a look at my code on GitHub.
              </p>
            </div>

            <a
              href={`mailto:${site.email}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-night transition-transform hover:-translate-y-0.5"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email me
            </a>

            <div className="flex flex-col gap-3 border-t border-line/60 pt-6">
              {externalSocials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.ariaLabel}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent/60"
                >
                  <SocialIcon name={s.icon} className="h-4 w-4" />
                  {s.label}
                  <ArrowUpRight
                    className="ml-auto h-3.5 w-3.5 text-muted"
                    aria-hidden="true"
                  />
                </a>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
