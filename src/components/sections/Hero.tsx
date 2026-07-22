import { ArrowUpRight, Mail } from "lucide-react";
import { site } from "@/data/site";
import { Container } from "@/components/ui/Container";
import { Avatar } from "@/components/ui/Avatar";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { DigitalCoreLazy } from "@/components/three/DigitalCoreLazy";

const roles = site.descriptor.split("|").map((r) => r.trim());

export function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative overflow-hidden pt-28 pb-16 sm:pt-32 lg:pt-36 lg:pb-24"
    >
      <Container>
        <div className="grid items-center gap-10 sm:gap-12 md:grid-cols-2 md:gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Text column */}
          <div>
            <div className="flex items-center gap-4">
              <Avatar />
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                <span>{site.location.replace(", United Kingdom", "")}</span>
                <span aria-hidden="true" className="text-line">•</span>
                <span className="text-accent">Open to opportunities</span>
              </p>
            </div>

            <h1
              id="hero-heading"
              className="mt-6 font-heading text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl"
            >
              {site.name}
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
              Building practical digital solutions with{" "}
              <span className="text-gradient font-semibold">
                software, AI, data, and design
              </span>
              .
            </p>

            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Focus areas">
              {roles.map((role) => (
                <li key={role} className="chip">
                  {role}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#projects"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-night transition-transform hover:-translate-y-0.5"
              >
                View my work
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-accent/60"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Get in touch
              </a>
            </div>

            <div className="mt-8 flex items-center gap-3">
              {site.socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target={s.external ? "_blank" : undefined}
                  rel={s.external ? "noopener noreferrer" : undefined}
                  aria-label={s.ariaLabel}
                  className="rounded-md border border-line bg-surface p-2.5 text-muted transition-colors hover:text-ink hover:border-accent/50"
                >
                  <SocialIcon name={s.icon} />
                </a>
              ))}
            </div>
          </div>

          {/* Visual column — Digital Core (CSS fallback underlay + lazy WebGL scene) */}
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
