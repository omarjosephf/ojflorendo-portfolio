import { BookOpen, GraduationCap, LayoutTemplate, Rocket } from "lucide-react";
import { now } from "@/data/now";
import type { NowItem } from "@/types";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

const icons: Record<NowItem["iconKey"], typeof GraduationCap> = {
  study: GraduationCap,
  build: Rocket,
  portfolio: LayoutTemplate,
  learn: BookOpen,
};

export function Now() {
  return (
    <Section
      id="now"
      eyebrow="Now"
      title="What I'm working on now"
      intro="A snapshot of my current focus."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {now.items.map((item, i) => {
          const Icon = icons[item.iconKey];
          return (
            <Reveal
              key={item.title}
              delay={((i % 4) + 1) as 1 | 2 | 3 | 4}
              className="glass flex items-start gap-4 rounded-2xl p-5 sm:p-6"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-heading text-base font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>

      {now.personalNote ? (
        <Reveal className="mt-6">
          <p className="text-sm text-muted">
            <span className="text-accent">•</span> {now.personalNote}
          </p>
        </Reveal>
      ) : null}

      <p className="mt-6 text-xs text-muted">Last updated {now.updated}.</p>
    </Section>
  );
}
