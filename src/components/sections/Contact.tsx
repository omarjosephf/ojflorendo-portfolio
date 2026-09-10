import { headers } from "next/headers";
import { ArrowUpRight, Mail } from "lucide-react";
import { positioning } from "@/data/positioning";
import { site } from "@/data/site";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { ContactForm } from "@/components/sections/ContactForm";

export async function Contact() {
  const externalSocials = site.socials.filter((social) => social.external);
  // The Turnstile script must carry the per-request nonce so it satisfies the
  // strict CSP, the same way `src/app/layout.tsx` supplies it to StructuredData.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <Section
      id="contact"
      eyebrow="04 / Let's talk"
      title={positioning.contact.heading}
      intro={positioning.contact.supportingCopy}
    >
      <Reveal className="contact-lead">
        <p>{positioning.contact.reassurance}</p>
        <p>{positioning.contact.secondary}</p>
      </Reveal>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <Reveal>
          <div id="project-enquiry" tabIndex={-1}>
            <ContactForm nonce={nonce} />
          </div>
        </Reveal>

        <Reveal delay={1}>
          <div className="contact-aside glass flex flex-col gap-6 rounded-2xl p-6 sm:p-8">
            <div>
              <p className="font-heading text-lg font-semibold text-ink">
                Prefer email?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {positioning.contact.asideCopy}
              </p>
            </div>

            <a
              href={`mailto:${site.email}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-night transition-transform hover:-translate-y-0.5"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email OJ
            </a>

            <div className="flex flex-col gap-3 border-t border-line/60 pt-6">
              {externalSocials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.ariaLabel}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent/60"
                >
                  <SocialIcon name={social.icon} className="h-4 w-4" />
                  {social.label}
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
