import { ArrowUpRight, Mail } from "lucide-react";
import { site } from "@/data/site";
import { positioning } from "@/data/positioning";
import { Container } from "@/components/ui/Container";
import { Avatar } from "@/components/ui/Avatar";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { DigitalCoreLazy } from "@/components/three/DigitalCoreLazy";

const roles = site.descriptor.split("·").map((role) => role.trim());

export function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative overflow-hidden pt-28 pb-16 sm:pt-32 lg:pt-36 lg:pb-24"
    >
      <Container>
        <div className="grid items-center gap-10 sm:gap-12 md:grid-cols-2 md:gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {positioning.hero.eyebrow}
            </p>

            <div className="mt-5 flex items-center gap-4">
              <Avatar />
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                <span>{site.location.replace(", United Kingdom", "")}</span>
                <span aria-hidden="true" className="text-line">•</span>
                <span className="text-accent">Open to selected opportunities</span>
              </p>
            </div>

            <h1
              id="hero-heading"
              className="mt-6 font-heading text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl"
            >
              {site.name}
            </h1>

            <p className="mt-5 max-w-xl text-xl font-semibold leading-relaxed text-ink sm:text-2xl">
              {site.headline}
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              {positioning.hero.supportingCopy}
            </p>

            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Professional roles">
              {roles.map((role) => (
                <li key={role} className="chip">
                  {role}
                </li>
              ))}
            </ul>

            <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
              {positioning.hero.availability}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-night transition-transform hover:-translate-y-0.5"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {positioning.hero.primaryCta}
              </a>
              <a
                href="#projects"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-accent/60"
              >
                {positioning.hero.secondaryCta}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="mt-8 flex items-center gap-3">
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

          <div className="relative">
            <div className="glass rounded-[var(--radius-xl2)] p-6 sm:p-10">
              <DigitalCoreLazy />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
