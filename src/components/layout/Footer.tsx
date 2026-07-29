import { site } from "@/data/site";
import { Container } from "@/components/ui/Container";
import { Monogram } from "@/components/ui/Monogram";
import { SocialIcon } from "@/components/ui/SocialIcon";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line/60 py-12">
      <Container>
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Monogram />
            <div>
              <p className="font-heading text-sm font-semibold text-ink">
                {site.name}
              </p>
              <p className="text-sm text-muted">{site.location}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {site.socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target={social.external ? "_blank" : undefined}
                rel={social.external ? "noopener noreferrer" : undefined}
                aria-label={social.ariaLabel}
                className="rounded-md border border-line bg-surface p-2.5 text-muted transition-colors hover:border-accent/50 hover:text-ink"
              >
                <SocialIcon name={social.icon} />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-line/60 pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {site.name}. All rights reserved.</p>
          <div className="sm:text-right">
            <p>Designed and built by OJ Florendo Rayatchi.</p>
            <p className="mt-1 text-xs">Next.js · TypeScript · AI-assisted engineering</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
