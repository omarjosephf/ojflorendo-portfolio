import Link from "next/link";
import { site } from "@/data/site";
import { Container } from "@/components/ui/Container";
import { SocialIcon } from "@/components/ui/SocialIcon";

/** Mirrors the primary navigation so the page order is legible from the foot. */
const footerLinks = [
  { label: "Services", href: "/#services" },
  { label: "Work", href: "/#projects" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/#contact" },
];

/**
 * Only profiles that exist are linked. YouTube, Instagram and X join the list
 * when the owner confirms the handles; there are no placeholder links.
 */
export function Footer() {
  return (
    <footer className="jf-footer">
      <Container>
        <p className="jf-footer-name" aria-hidden="true">{site.name}</p>
        <div className="jf-footer-grid">
          <div>
            <p className="jf-footer-role">{site.descriptor}, Windsor, Berkshire</p>
            <p className="jf-fine">Building AI automations in public.</p>
          </div>
          <nav aria-label="Footer" className="jf-footer-links">
            {footerLinks.map((link) => (
              <Link key={link.href} className="jf-footer-link" href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <ul className="jf-footer-socials" aria-label="Profiles">
            {site.socials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target={social.external ? "_blank" : undefined}
                  rel={social.external ? "noopener noreferrer" : undefined}
                  aria-label={social.ariaLabel}
                  className="jf-footer-link"
                >
                  <SocialIcon name={social.icon} className="h-4 w-4" />
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="jf-footer-base">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p>Designed and built by Joseph Florendo.</p>
        </div>
      </Container>
    </footer>
  );
}
