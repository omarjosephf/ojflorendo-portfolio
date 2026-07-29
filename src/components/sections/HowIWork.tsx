import {
  BadgeCheck,
  Bot,
  MessageSquareText,
  Search,
  Users,
} from "lucide-react";
import { positioning } from "@/data/positioning";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

const icons = [Search, MessageSquareText, Bot, Users, BadgeCheck] as const;

export function HowIWork() {
  return (
    <Section
      id="approach"
      eyebrow="How I work"
      title="Clear decisions, honest communication, accountable delivery"
      intro="Good work is not only about delivering something that looks impressive. It is about understanding the purpose, communicating clearly, and taking responsibility for the result."
    >
      <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {positioning.howIWork.map((item, index) => {
          const Icon = icons[index];
          return (
            <li key={item.title} className="h-full">
              <Reveal
                delay={((index % 4) + 1) as 1 | 2 | 3 | 4}
                className="glass hover-card flex h-full flex-col rounded-2xl p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-accent">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span
                    className="text-xs font-semibold text-muted"
                    aria-hidden="true"
                  >
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-heading text-base font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
