"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X, FileText } from "lucide-react";
import { site } from "@/data/site";
import { Container } from "@/components/ui/Container";
import { Monogram } from "@/components/ui/Monogram";
import { SocialIcon } from "@/components/ui/SocialIcon";

/** Section ids observed for active-link highlighting. */
const sectionIds = site.nav.map((item) => item.targetId);

export function Nav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const reduceMotion = useReducedMotion();

  const close = useCallback(() => setOpen(false), []);

  // Highlight the nav link for the section currently in view.
  useEffect(() => {
    const targets = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  // Subtle header background once the page is scrolled. rAF-throttled and only
  // updates state when the boolean actually flips — never a per-frame setState.
  useEffect(() => {
    let raf = 0;
    let last = false;
    const evaluate = () => {
      raf = 0;
      const next = window.scrollY > 8;
      if (next !== last) {
        last = next;
        setScrolled(next);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(evaluate);
    };
    evaluate();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Mobile menu: close on Escape (returning focus) and on viewport widening.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        toggleRef.current?.focus();
      }
    };
    const onResize = () => {
      if (window.innerWidth >= 768) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    firstLinkRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open, close]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open
          ? "nav-blur border-b border-line/60"
          : "border-b border-transparent"
      }`}
    >
      <Container>
        <nav
          aria-label="Primary"
          className="flex h-16 items-center justify-between gap-4"
        >
          <Link
            href="/#top"
            className="flex items-center gap-2.5 rounded-lg"
            aria-label={`${site.name} — home`}
          >
            <Monogram />
            <span className="hidden font-heading text-sm font-semibold text-ink sm:block">
              {site.name}
            </span>
          </Link>

          {/* Desktop navigation */}
          <ul className="hidden items-center gap-1 md:flex">
            {site.nav.map((item) => {
              const isActive = active === item.targetId;
              return (
                <li key={item.targetId}>
                  <Link
                    href={`/#${item.targetId}`}
                    aria-current={isActive ? "true" : undefined}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-accent"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Right-hand actions */}
          <div className="flex items-center gap-1">
            <div className="hidden items-center gap-1 sm:flex">
              {site.socials
                .filter((s) => s.external)
                .map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.ariaLabel}
                    className="rounded-md p-2 text-muted transition-colors hover:text-ink"
                  >
                    <SocialIcon name={s.icon} />
                  </a>
                ))}
            </div>

            {site.cvPath ? (
              <a
                href={site.cvPath}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 hidden items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent/60 sm:inline-flex"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                View CV
              </a>
            ) : null}

            {/* Mobile menu toggle */}
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="ml-1 inline-flex items-center justify-center rounded-md p-2.5 text-ink md:hidden"
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>
      </Container>

      {/* Mobile menu panel */}
      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-menu"
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden border-t border-line/60 nav-blur md:hidden"
          >
            <Container>
              <ul className="flex flex-col gap-1 py-4">
                {site.nav.map((item, i) => (
                  <li key={item.targetId}>
                    <Link
                      ref={i === 0 ? firstLinkRef : undefined}
                      href={`/#${item.targetId}`}
                      onClick={close}
                      className="block rounded-md px-3 py-3 text-base font-medium text-ink hover:bg-surface-2"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 border-t border-line/60 py-4">
                {site.socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target={s.external ? "_blank" : undefined}
                    rel={s.external ? "noopener noreferrer" : undefined}
                    aria-label={s.ariaLabel}
                    onClick={close}
                    className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
                  >
                    <SocialIcon name={s.icon} className="h-4 w-4" />
                    {s.label}
                  </a>
                ))}
              </div>
            </Container>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
