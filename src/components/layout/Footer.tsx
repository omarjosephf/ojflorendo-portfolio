import Link from "next/link";
import { site } from "@/data/site";
import { Container } from "@/components/ui/Container";
import { Monogram } from "@/components/ui/Monogram";
import { SocialIcon } from "@/components/ui/SocialIcon";

/** Mirrors the primary navigation so the page order is legible from the foot. */
const footerLinks = [
  { label: "Services", href: "/#services" },
  { label: "Work", href: "/#projects" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/#contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-line py-12">
      <Container>
        <p className="footer-name" aria-hidden="true">OJ Florendo<span className="text-accent">↗</span></p>
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <Link href="/#top" className="flex items-center gap-3" aria-label="Back to top">
            <Monogram />
            <div><p className="text-sm font-semibold">{site.name}</p><p className="mt-1 text-xs text-muted">Web developer &amp; AI product builder · Windsor, Berkshire</p></div>
          </Link>
          <div className="flex flex-wrap items-center gap-6">
            {site.socials.map((social) => <a key={social.label} href={social.href} target={social.external ? "_blank" : undefined} rel={social.external ? "noopener noreferrer" : undefined} aria-label={social.ariaLabel} className="social-link"><SocialIcon name={social.icon} />{social.label}</a>)}
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <div className="sm:text-right"><p>Designed and built by OJ Florendo Rayatchi.</p><p className="mt-1 footer-links">{footerLinks.map((link) => <Link key={link.href} className="text-link" href={link.href}>{link.label}</Link>)}</p></div>
        </div>
      </Container>
    </footer>
  );
}
