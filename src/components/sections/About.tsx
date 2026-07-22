import { BadgeCheck, GraduationCap, MapPin, Presentation } from "lucide-react";
import { site } from "@/data/site";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

const highlights = [
  { icon: GraduationCap, label: "Final-year BSc Computing & IT (Software)" },
  { icon: BadgeCheck, label: "PCEP – Certified Entry-Level Python Programmer" },
  { icon: Presentation, label: "Delivered AI, Python & data training" },
  { icon: MapPin, label: "Windsor, Berkshire · Remote-friendly" },
];

export function About() {
  return (
    <Section id="about" eyebrow="About" title="A bit about me">
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <Reveal className="max-w-[62ch] space-y-5 text-base leading-relaxed text-muted sm:text-lg">
          {site.about.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </Reveal>

        <Reveal delay={1}>
          <ul className="grid gap-3">
            {highlights.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="glass flex items-center gap-3 rounded-xl px-4 py-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-ink">{label}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
