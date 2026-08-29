"use client";

import Link from "next/link";
import { Loader2, Send, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  assistantFallbackLinks,
  suggestedAssistantQuestions,
} from "@/data/assistant-navigation";
import { boundInput, screenQuestion } from "@/lib/assistant/guard";
import { ASSISTANT_INPUT_LIMIT, type AssistantResult } from "@/lib/assistant/types";

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
 * The assistant interface.
 *
 * Answers come from a retrieval service over OJ's approved corpus, reached
 * through this site's own `/api/assistant` route. The panel renders exactly
 * three outcomes and has no path that answers from anywhere else — the
 * deterministic matcher it replaced is gone rather than kept as a fallback,
 * because two knowledge sources behind one interface drift apart and the
 * visitor cannot tell which one they got.
 */
export function AssistantPanel({
  titleId,
  descriptionId,
  onClose,
}: AssistantPanelProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  /**
   * Identifies the in-flight request. A response whose token no longer matches
   * is discarded, so a slow first answer cannot overwrite a faster second one —
   * which would show the visitor an answer to a question they had moved on from.
   */
  const requestToken = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Abandon any in-flight result when the panel closes, so a late response
  // cannot set state on the way out.
  useEffect(() => () => void (requestToken.current += 1), []);

  const ask = async (rawQuestion: string) => {
    const question = boundInput(rawQuestion);
    if (!question || pending) return;

    // The visitor's own personal or credential data resolves here, in the
    // browser, and is never transmitted. Nothing else is decided locally:
    // questions about OJ and probes of the privacy boundary go to the service,
    // which is the single authority for product policy (ADR-0006 D14).
    const blocked = screenQuestion(question);
    if (blocked) {
      setResult(blocked);
      setQuery("");
      return;
    }

    const token = ++requestToken.current;
    setPending(true);
    setResult(null);
    setQuery("");

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const body: unknown = await response.json();

      if (token !== requestToken.current) return;

      // The route always answers with one of the three states. Anything else is
      // treated as unavailable rather than rendered.
      const state = (body as AssistantResult | null)?.state;
      if (state === "answered" || state === "not-covered") {
        setResult(body as AssistantResult);
      } else {
        setResult({ state: "unavailable" });
      }
    } catch {
      if (token !== requestToken.current) return;
      setResult({ state: "unavailable" });
    } finally {
      if (token === requestToken.current) setPending(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(query);
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
          {/* A plain <img> for the same reason as the entry control: next/image
              emits an inline style attribute that this site's nonce-based
              `style-src` blocks, and the asset is already a pre-sized 192px
              WebP (7.6 KB) shown at 40px. */}
          <img
            src="/images/profile/oj-assistant-avatar-3d.webp"
            alt="3D illustrated avatar of OJ Florendo"
            width={40}
            height={40}
            decoding="async"
            className="h-10 w-10 shrink-0 rounded-xl border border-accent/30 bg-accent/10 object-cover"
          />
          <div>
            <h2 id={titleId} className="font-heading text-base font-semibold text-ink">
              OJ Assistant
            </h2>
            {/* The permanent capability disclosure. Not a maturity label: it
                states what the assistant does, what bounds it, and that it is
                not OJ — obligations that hold for as long as the feature
                exists, rather than until it stops being new. */}
            <p id={descriptionId} className="mt-1 text-xs leading-5 text-muted">
              Answers from OJ&apos;s approved portfolio content, with sources.
              Not OJ.
            </p>
            <p className="mt-1 text-[0.7rem] leading-4 text-muted/80">
              Artistic digital representation of OJ Florendo.
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
            How your question is handled
          </div>
          {/* This replaced copy claiming the text never left the browser. That
              was true of the deterministic assistant and became false the moment
              answering moved to a model, so it changed in the same release. */}
          <p className="mt-1">
            Your question is sent to OJ&apos;s server and an AI provider to be
            answered from his approved documents. It is not stored, logged, or
            used for training. Please don&apos;t enter personal or sensitive
            information.
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
                onClick={() => void ask(question)}
                disabled={pending}
                className="rounded-full border border-line bg-surface-2 px-3 py-2 text-left text-xs font-medium text-ink transition-colors hover:border-accent/50 disabled:opacity-50"
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
              placeholder="Projects, skills, experience, services..."
              className="min-w-0 flex-1 rounded-xl border border-line bg-night px-3 py-2.5 text-sm text-ink placeholder:text-muted/70"
            />
            <button
              type="submit"
              aria-label="Ask OJ Assistant"
              className="inline-flex items-center justify-center rounded-xl bg-accent px-3 text-night transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!query.trim() || pending}
            >
              {pending ? (
                <Loader2
                  className="h-4 w-4 motion-safe:animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="text-right text-[0.7rem] text-muted">
            {query.length}/{ASSISTANT_INPUT_LIMIT}
          </p>
        </form>

        {/* One live region covering loading, answer, non-answer and failure, so
            a screen-reader user hears each transition without the panel
            stealing focus mid-question. */}
        <div aria-live="polite" aria-atomic="true">
          {pending ? (
            <p className="text-sm leading-6 text-muted">
              Looking through OJ&apos;s approved content…
            </p>
          ) : result ? (
            <AssistantOutcome result={result} onNavigate={onClose} />
          ) : (
            <p className="text-sm leading-6 text-muted">
              Choose a suggestion or ask a short question. Anything outside OJ&apos;s
              approved content is answered honestly rather than guessed at.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function FallbackLinks({ onNavigate }: { readonly onNavigate: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {assistantFallbackLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          className="rounded-full border border-line bg-night px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent/50"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

/**
 * Renders one outcome.
 *
 * Every branch that is not a grounded answer offers the way to OJ. A visitor who
 * is told "I can't help with that" and given no route onward has been failed
 * twice.
 */
function AssistantOutcome({
  result,
  onNavigate,
}: {
  readonly result: AssistantResult;
  readonly onNavigate: () => void;
}) {
  if (result.state === "answered") {
    return (
      <article className="rounded-xl border border-line bg-surface-2 p-4">
        {/* Model output, rendered as a React text node. No Markdown renderer and
            no dangerouslySetInnerHTML on this path: generated text is untrusted
            input like any other. */}
        <p className="text-sm leading-6 text-ink">{result.answer}</p>

        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          {result.citations.length === 1 ? "Source" : "Sources"}
        </p>
        <ul className="mt-2 space-y-2">
          {result.citations.map((citation, index) => (
            <li
              key={`${citation.label}-${index}`}
              className="border-l-2 border-line pl-3 text-xs leading-5 text-muted"
            >
              <span className="block italic">“{citation.quote}”</span>
              {/* An unmapped source keeps its name and loses its link. The
                  citation string is never used to build an href — it is looked
                  up in the corpus allowlist — so the failure mode here is a
                  missing link, never an attacker-chosen one. */}
              {citation.href ? (
                <Link
                  href={citation.href}
                  onClick={onNavigate}
                  className="mt-1 inline-block font-medium text-ink underline decoration-accent/50 underline-offset-2"
                >
                  {citation.label}
                </Link>
              ) : (
                <span className="mt-1 inline-block font-medium text-ink">
                  {citation.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </article>
    );
  }

  if (result.state === "not-covered") {
    return (
      <article className="rounded-xl border border-line bg-surface-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Not in OJ&apos;s approved content
        </p>
        <p className="mt-2 text-sm leading-6 text-ink">{result.answer}</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          OJ can answer this himself — the contact section reaches him directly.
        </p>
        <FallbackLinks onNavigate={onNavigate} />
      </article>
    );
  }

  if (result.state === "blocked") {
    return (
      <article className="rounded-xl border border-line bg-surface-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Please protect your privacy
        </p>
        <p className="mt-2 text-sm leading-6 text-ink">{result.answer}</p>
        <FallbackLinks onNavigate={onNavigate} />
      </article>
    );
  }

  // Unavailable. Outage, timeout, and daily-allowance exhaustion are one state
  // on purpose: to a visitor they all mean "not now", and the distinction is
  // operator information. There is deliberately nothing here that answers
  // anyway.
  return (
    <article className="rounded-xl border border-line bg-surface-2 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
        Assistant unavailable
      </p>
      <p className="mt-2 text-sm leading-6 text-ink">
        I can&apos;t answer right now. Rather than guess, here are the parts of
        the site that cover this — and OJ is reachable directly.
      </p>
      <FallbackLinks onNavigate={onNavigate} />
    </article>
  );
}
