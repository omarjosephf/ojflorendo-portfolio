"use client";

import Link from "next/link";
import { Loader2, MessageSquare, Send, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  assistantFallbackLinks,
  suggestedAssistantQuestions,
} from "@/data/assistant-navigation";
import { boundInput, screenQuestion } from "@/lib/assistant/guard";
import {
  ASSISTANT_HISTORY_LIMIT,
  ASSISTANT_INPUT_LIMIT,
  type AssistantHistoryTurn,
  type AssistantResult,
} from "@/lib/assistant/types";

/**
 * Opaque, deliberately not `.glass`. The panel sits over arbitrary page content,
 * and `.glass` is 90% opacity with no backdrop blur, so hero headings read
 * straight through the answer text. Blur is reserved for the sticky header by
 * design (see globals.css), so a solid surface is the correct fix here.
 */
const PANEL_CLASS =
  "fixed bottom-20 left-4 right-4 flex max-h-[calc(100vh-7rem)] flex-col " +
  "rounded-2xl border border-line/70 bg-surface shadow-2xl shadow-black/40 " +
  "sm:left-auto sm:w-[27rem]";

interface AssistantPanelProps {
  readonly titleId: string;
  readonly descriptionId: string;
  readonly onClose: () => void;
}

/**
 * One question and what came back.
 *
 * `result` is `null` while the request is in flight, which is what the thinking
 * indicator renders from. Keeping the question and its answer in the same record
 * is what makes a late response impossible to attach to the wrong question.
 */
interface Exchange {
  readonly id: number;
  readonly question: string;
  readonly result: AssistantResult | null;
}

/**
 * Earlier turns to send with a follow-up (ADR-0007).
 *
 * Only exchanges that produced a real reply are included: an outage or a blocked
 * input tells the assistant nothing about what the visitor is asking about, and
 * sending them would spend context on noise.
 *
 * Source *labels* travel, never the answer text — the type has no field for it.
 */
function historyFrom(exchanges: readonly Exchange[]): AssistantHistoryTurn[] {
  return exchanges
    .filter(
      (exchange) =>
        exchange.result?.state === "answered" ||
        exchange.result?.state === "not-covered",
    )
    .slice(-ASSISTANT_HISTORY_LIMIT)
    .map((exchange) => ({
      question: exchange.question,
      sources:
        exchange.result?.state === "answered"
          ? exchange.result.citations.map((citation) => citation.label)
          : [],
    }));
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
 *
 * The conversation lives here and nowhere else (ADR-0007 E1). There is no
 * session, no cookie and no storage entry: closing this panel or reloading the
 * page destroys the transcript, and nothing anywhere else has a copy. That is
 * what keeps the privacy notice below true as written.
 */
export function AssistantPanel({
  titleId,
  descriptionId,
  onClose,
}: AssistantPanelProps) {
  const [query, setQuery] = useState("");
  const [exchanges, setExchanges] = useState<readonly Exchange[]>([]);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const nextId = useRef(0);
  /**
   * Identifies the in-flight request. A response whose token no longer matches
   * is discarded, so a response arriving after the panel closes cannot set
   * state on the way out.
   */
  const requestToken = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => () => void (requestToken.current += 1), []);

  // Follow the conversation as it grows. `block: "nearest"` scrolls the panel's
  // own overflow container rather than the page behind it, which would move the
  // site under the visitor while they are reading.
  useEffect(() => {
    if (exchanges.length === 0) return;
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    // Optional call, not an assumed one. Following the conversation is a
    // convenience; an environment without `scrollIntoView` should render a
    // working assistant rather than throw on the way to the answer.
    transcriptEndRef.current?.scrollIntoView?.({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
  }, [exchanges]);

  const ask = async (rawQuestion: string) => {
    const question = boundInput(rawQuestion);
    if (!question || pending) return;

    const id = nextId.current++;

    // The visitor's own personal or credential data resolves here, in the
    // browser, and is never transmitted. Nothing else is decided locally:
    // questions about OJ and probes of the privacy boundary go to the service,
    // which is the single authority for product policy (ADR-0006 D14).
    const blocked = screenQuestion(question);
    if (blocked) {
      setExchanges((current) => [...current, { id, question, result: blocked }]);
      setQuery("");
      return;
    }

    const token = ++requestToken.current;
    // Captured before the state update so the request carries the conversation
    // as it stood when the question was asked.
    const history = historyFrom(exchanges);

    setPending(true);
    setQuery("");
    setExchanges((current) => [...current, { id, question, result: null }]);

    const settle = (result: AssistantResult) => {
      setExchanges((current) =>
        current.map((exchange) =>
          exchange.id === id ? { ...exchange, result } : exchange,
        ),
      );
    };

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      const body: unknown = await response.json();

      if (token !== requestToken.current) return;

      // The route always answers with one of the three states. Anything else is
      // treated as unavailable rather than rendered.
      const state = (body as AssistantResult | null)?.state;
      if (state === "answered" || state === "not-covered") {
        settle(body as AssistantResult);
      } else {
        settle({ state: "unavailable" });
      }
    } catch {
      if (token !== requestToken.current) return;
      settle({ state: "unavailable" });
    } finally {
      if (token === requestToken.current) setPending(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(query);
  };

  const clearConversation = () => {
    requestToken.current += 1;
    setExchanges([]);
    setPending(false);
    inputRef.current?.focus();
  };

  const started = exchanges.length > 0;

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
      <div className="flex items-start justify-between gap-4 border-b border-line/70 bg-surface px-5 py-4">
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
            <div className="flex items-center gap-2">
              <h2
                id={titleId}
                className="font-heading text-base font-semibold text-ink"
              >
                OJ Assistant
              </h2>
              {/* The maturity label required by §49.6 while the feature is
                  genuinely experimental. Distinct from the capability
                  disclosure below it: this one describes how finished the
                  feature is and is REMOVED at graduation, while the disclosure
                  describes what the feature is and never is.

                  It ships labelled because ADR-0006's graduation criteria
                  include a production soak, which cannot happen before
                  production. Publishing unlabelled on day one would be claiming
                  a maturity the evidence does not yet support. */}
              <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-accent">
                Beta
              </span>
            </div>
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

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        {!started && (
          <>
            <div className="rounded-xl border border-line/70 bg-night/40 p-4 text-sm leading-6 text-muted">
              <div className="flex items-center gap-2 font-medium text-ink">
                <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                How your question is handled
              </div>
              {/* This replaced copy claiming the text never left the browser.
                  That was true of the deterministic assistant and became false
                  the moment answering moved to a model, so it changed in the
                  same release. Conversation did not change it again: the
                  transcript lives in this tab and is sent with a follow-up, but
                  it is still stored nowhere. */}
              <p className="mt-1">
                Your question is sent to OJ&apos;s server and an AI provider to
                be answered from his approved documents. It is not stored,
                logged, or used for training. Please don&apos;t enter personal
                or sensitive information.
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

            <p className="text-sm leading-6 text-muted">
              Choose a suggestion or ask a short question. Anything outside
              OJ&apos;s approved content is answered honestly rather than
              guessed at.
            </p>
          </>
        )}

        {/* `role="log"` announces what is ADDED rather than re-reading the whole
            conversation on every turn, which is what a plain `aria-live` region
            containing a growing transcript would do.

            It sits on a wrapper rather than on the <ol> itself. A role replaces
            an element's implicit one, so `role="log"` on the list removed its
            `list` semantics and orphaned every <li> — axe caught exactly that,
            as `aria-allowed-role` plus `listitem`. The wrapper keeps both: a
            live region outside, a real list inside. */}
        {started && (
          <div role="log" aria-live="polite" aria-relevant="additions">
            <ol
              aria-label="Conversation with OJ Assistant"
              className="space-y-5"
            >
            {exchanges.map((exchange) => (
              <li key={exchange.id} className="space-y-3">
                <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-accent/15 px-3.5 py-2 text-sm leading-6 text-ink">
                  {exchange.question}
                </p>
                {exchange.result ? (
                  <AssistantOutcome result={exchange.result} onNavigate={onClose} />
                ) : (
                  <p className="flex items-center gap-2 text-sm leading-6 text-muted">
                    <Loader2
                      className="h-4 w-4 motion-safe:animate-spin"
                      aria-hidden="true"
                    />
                    Looking through OJ&apos;s approved content…
                  </p>
                )}
              </li>
            ))}
            </ol>
          </div>
        )}

        <div ref={transcriptEndRef} />
      </div>

      <div className="space-y-2 border-t border-line/70 bg-surface p-5">
        <form onSubmit={submit} className="space-y-2">
          <label htmlFor="oj-assistant-question" className="text-sm font-medium text-ink">
            {started
              ? "Ask a follow-up"
              : "Ask about OJ's public portfolio"}
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="oj-assistant-question"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={ASSISTANT_INPUT_LIMIT}
              autoComplete="off"
              placeholder={
                started
                  ? "Ask more about that…"
                  : "Projects, skills, experience, services..."
              }
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
          <div className="flex items-center justify-between gap-3">
            {started ? (
              <button
                type="button"
                onClick={clearConversation}
                className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-muted underline decoration-line underline-offset-2 transition-colors hover:text-ink"
              >
                <MessageSquare className="h-3 w-3" aria-hidden="true" />
                Start a new conversation
              </button>
            ) : (
              <span />
            )}
            <p className="text-[0.7rem] text-muted">
              {query.length}/{ASSISTANT_INPUT_LIMIT}
            </p>
          </div>
        </form>
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
