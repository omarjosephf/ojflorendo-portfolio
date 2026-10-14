import { headers } from "next/headers";
import { Mail } from "lucide-react";
import { positioning } from "@/data/positioning";
import { site } from "@/data/site";
import { HomeSection } from "@/components/home/HomeSection";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { ContactForm } from "@/components/sections/ContactForm";

export async function Contact() {
  const externalSocials = site.socials.filter((social) => social.external);
  // The Turnstile script must carry the per-request nonce so it satisfies the
  // strict CSP, the same way `src/app/layout.tsx` supplies it to StructuredData.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <HomeSection
      id="contact"
      title={positioning.contact.heading}
      intro={positioning.contact.supportingCopy}
      className="jf-contact"
    >
      <div className="jf-contact-grid">
        <div>
          <div className="jf-contact-lead">
            <p>{positioning.contact.reassurance}</p>
            <p>{positioning.contact.secondary}</p>
          </div>
          <div id="project-enquiry" tabIndex={-1}>
            <ContactForm nonce={nonce} />
          </div>
        </div>

        <aside className="jf-contact-aside" aria-label="Other ways to get in touch">
          <h3 className="jf-contact-aside-title">Prefer email?</h3>
          <p className="jf-fine">{positioning.contact.asideCopy}</p>
          <a href={`mailto:${site.email}`} className="jf-button">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Email Joseph
          </a>
          <ul className="jf-contact-socials">
            {externalSocials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.ariaLabel}
                  className="jf-chip-link"
                >
                  <SocialIcon name={social.icon} className="h-4 w-4" />
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </HomeSection>
  );
}
