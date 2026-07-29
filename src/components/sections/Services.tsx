import { Beaker, CheckCircle2 } from "lucide-react";
import { positioning } from "@/data/positioning";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function Services() {
  return (
    <Section
      id="services"
      eyebrow="Services"
      title="Practical support for digital ideas and growing organisations."
      intro={positioning.services.intro}
    >
      <div className="grid gap-5 md:grid-cols-2">
        {positioning.services.availableNow.map((service, index) => (
          <Reveal
            key={service.title}
            delay={((index % 4) + 1) as 1 | 2 | 3 | 4}
            className="glass hover-card flex h-full flex-col rounded-2xl p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-heading text-lg font-semibold text-ink">
                {service.title}
              </h3>
              <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">
                Available now
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {service.description}
            </p>
            <ul className="mt-5 grid gap-2 text-sm text-muted">
              {service.includes.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>

      <Reveal delay={1} className="mt-6 rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent">
            <Beaker className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Experimental / available for collaboration
            </p>
            <p className="mt-3 leading-relaxed text-muted">
              {positioning.services.experimental}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              <span className="font-semibold text-ink">Scope note:</span>{" "}
              {positioning.services.scopeNote}
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
