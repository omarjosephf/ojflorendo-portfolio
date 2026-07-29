import { Compass, Target } from "lucide-react";
import { positioning } from "@/data/positioning";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function Mission() {
  return (
    <Section
      id="mission"
      eyebrow="Mission"
      title="Purposeful products for real needs"
      intro={positioning.mission.short}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal className="glass hover-card rounded-2xl p-6 sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-accent">
            <Target className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="mt-5 font-heading text-lg font-semibold text-ink">
            What I aim to build
          </h3>
          <p className="mt-3 leading-relaxed text-muted">
            {positioning.mission.full}
          </p>
        </Reveal>

        <Reveal delay={1} className="glass hover-card rounded-2xl p-6 sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-accent">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="mt-5 font-heading text-lg font-semibold text-ink">
            Why this platform exists
          </h3>
          <p className="mt-3 leading-relaxed text-muted">
            {positioning.mission.platformPurpose}
          </p>
        </Reveal>
      </div>
    </Section>
  );
}
