"use client";

import Link from "next/link";
import { Bot, Send, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { suggestedAssistantQuestions } from "@/data/assistant-knowledge";
import {
  ASSISTANT_INPUT_LIMIT,
  answerPortfolioQuestion,
  type AssistantResult,
} from "@/lib/portfolio-assistant";

/**
 * Opaque, deliberately not `.glass`. The panel sits over arbitrary page content,
 * and `.glass` is 90% opacity with no backdrop blur, so hero headings read
 * straight through the answer text. Blur is reserved for the sticky header by
 * design (see globals.css), so a solid surface is the correct fix here.
 */
const PANEL_CLASS =
  "fixed bottom-20 left-4 right-4 max-h-[calc(100vh-7rem)] overflow-y-auto " +
  "rounded-2xl border border-line/70 bg-surface shadow-2xl shadow-black/40 " +
  "sm:left-auto sm:w-[27rem]";

interface AssistantPanelProps {
  readonly titleId: string;
  readonly descriptionId: string;
  readonly onClose: () => void;
}

/**
 * The assistant's entire interface and knowledge.
 *
 * Split out from the toggle so it forms its own chunk: the reviewed answer
 * manifest and the matcher are only downloaded and evaluated when a visitor
 * actually opens the assistant. Most visitors never do, and this component sits
 * on every page, so shipping it eagerly cost every page load for nothing.
 */
export function AssistantPanel({
  titleId,
  descriptionId,
  onClose,
}: AssistantPanelProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AssistantResult | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const ask = (question: string) => {
    setResult(answerPortfolioQuestion(question));
    setQuery("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    ask(query);
  };

  return (
    <section
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-modal="false"
      className={PANEL_CLASS}
    >
      {/* A plain div, not <header>: inside this dialog a <header> maps to a
          second `banner` landmark alongside the site nav, which axe flags as
          landmark-no-duplicate-banner and which reads as two banners to a
          screen reader. */}
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line/70 bg-surface px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={titleId} className="font-heading text-base font-semibold text-ink">
                OJ Assistant
              </h2>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wider text-accent">
                Curated beta
              </span>
            </div>
            <p id={descriptionId} className="mt-1 text-xs leading-5 text-muted">
              Reviewed portfolio answers, not a general-purpose chatbot.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close OJ Assistant"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-5 p-5">
        <div className="rounded-xl border border-line/70 bg-night/40 p-4 text-sm leading-6 text-muted">
          <div className="flex items-center gap-2 font-medium text-ink">
            <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
            Private by design
          </div>
          <p className="mt-1">
            Your text stays in this browser, is not sent or saved, and is used
            only to select fixed public answers. Do not enter personal or
            sensitive information.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Suggested questions
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedAssistantQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => ask(question)}
                className="rounded-full border border-line bg-surface-2 px-3 py-2 text-left text-xs font-medium text-ink transition-colors hover:border-accent/50"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-2">
          <label htmlFor="oj-assistant-question" className="text-sm font-medium text-ink">
            Ask about OJ&apos;s public portfolio
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="oj-assistant-question"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={ASSISTANT_INPUT_LIMIT}
              autoComplete="off"
              placeholder="Projects, skills, experience, education..."
              className="min-w-0 flex-1 rounded-xl border border-line bg-night px-3 py-2.5 text-sm text-ink placeholder:text-muted/70"
            />
            <button
              type="submit"
              aria-label="Ask OJ Assistant"
              className="inline-flex items-center justify-center rounded-xl bg-accent px-3 text-night transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!query.trim()}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="text-right text-[0.7rem] text-muted">
            {query.length}/{ASSISTANT_INPUT_LIMIT}
          </p>
        </form>

        <div aria-live="polite" aria-atomic="true">
          {result ? (
            <article className="rounded-xl border border-line bg-surface-2 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                {result.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink">{result.answer}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {result.links.map((link) => (
                  <Link
                    key={`${result.title}-${link.href}`}
                    href={link.href}
                    onClick={onClose}
                    className="rounded-full border border-line bg-night px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent/50"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </article>
          ) : (
            <p className="text-sm leading-6 text-muted">
              Choose a suggestion or ask a short question. Unknown topics are
              redirected to OJ rather than answered with a guess.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
