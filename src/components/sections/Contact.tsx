import { headers } from "next/headers";
import { Mail } from "lucide-react";
import { positioning } from "@/data/positioning";
import { site } from "@/data/site";
import { HomeSection } from "@/components/home/HomeSection";
import { SocialIcon } from "@/components/ui/SocialIcon";
import {
  BookingButton,
  ContactForm,
  type BookingLink,
} from "@/components/sections/ContactForm";

export async function Contact() {
  const externalSocials = site.socials.filter((social) => social.external);
  // The Turnstile script must carry the per-request nonce so it satisfies the
  // strict CSP, the same way `src/app/layout.tsx` supplies it to StructuredData.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Hidden until the owner adds the link (ADR-0033).
  const booking: BookingLink | undefined = site.bookingUrl
    ? { href: site.bookingUrl, label: positioning.contact.bookingAction }
    : undefined;

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
          </div>
          <div id="project-enquiry" tabIndex={-1}>
            <ContactForm nonce={nonce} booking={booking} />
          </div>
        </div>

        <aside className="jf-contact-aside" aria-label="Other ways to get in touch">
          {booking ? (
            <div className="jf-contact-aside-block">
              <h3 className="jf-contact-aside-title">
                {positioning.contact.bookingTitle}
              </h3>
              <BookingButton booking={booking} />
            </div>
          ) : null}
          <div className="jf-contact-aside-block">
            <h3 className="jf-contact-aside-title">Prefer email?</h3>
            <p className="jf-fine">{positioning.contact.asideCopy}</p>
            {/* With a booking button above, email steps back to the quiet style. */}
            <a
              href={`mailto:${site.email}`}
              className={booking ? "jf-button jf-button-quiet" : "jf-button"}
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email Joseph
            </a>
          </div>
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
