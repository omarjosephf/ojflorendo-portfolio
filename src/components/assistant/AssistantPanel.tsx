"use client";

import { SavedChatControls } from "./SavedChatControls";
import { useConversationStorage } from "./useConversationStorage";

import Link from "next/link";
import { Info, Send, Trash2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { assistantFallbackLinks } from "@/data/assistant-navigation";
import { boundInput, screenQuestion } from "@/lib/assistant/guard";
import {
  historyFrom,
  ASSISTANT_EXCHANGE_LIMIT,
  ASSISTANT_SESSION_KEY,
  loadAssistantSession,
  readAssistantResponse,
  saveAssistantSession,
  type AssistantExchange,
} from "@/lib/assistant/client-state";
import {
  ASSISTANT_INPUT_LIMIT,
  ASSISTANT_UI_TIMEOUT_MS,
  type AssistantResult,
} from "@/lib/assistant/types";

const PANEL_CLASS =
  "fixed bottom-20 left-4 right-4 flex h-[calc(100dvh-7rem)] max-h-[42rem] flex-col " +
  "overflow-hidden rounded-[4px] border border-line bg-surface shadow-[0_18px_45px_-28px_rgba(41,42,38,0.45)] " +
  "sm:left-auto sm:w-[27rem]";

const UNAVAILABLE_MESSAGE = "I can't answer right now. You can keep exploring OJ's work or contact him directly.";
const COUNTER_VISIBLE_AT = ASSISTANT_INPUT_LIMIT - 40;

interface AssistantPanelProps {
  readonly storageEnabled?: boolean;
  readonly nonce?: string;
  readonly open: boolean;
  readonly titleId: string;
  readonly descriptionId: string;
  readonly onClose: () => void;
}

export function AssistantPanel({
  storageEnabled=false,
  nonce,
  open,
  titleId,
  descriptionId,
  onClose,
}: AssistantPanelProps) {
  const [query, setQuery] = useState("");
  const [exchanges, setExchanges] = useState<readonly AssistantExchange[]>([]);
  const [pending, setPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [latestAnnouncement, setLatestAnnouncement] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const nextId = useRef(0);
  const requestToken = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const storage = useRef<Storage | null>(null);
  const storageWritable = useRef(true);
  const [persistence, setPersistence] = useState<"available" | "memory" | "uncertain">("available");
  const createdAt = useRef(0);
  const remoteStorage=useConversationStorage(storageEnabled,open,(loaded)=>{
    createdAt.current=Date.now();nextId.current=loaded.length?Math.max(...loaded.map(e=>e.id))+1:0;
    setExchanges(loaded);setQuery("");
  });

  const fallBackToMemory = useCallback(() => {
    storageWritable.current = false;
    try {
      if (!storage.current) throw new Error("Storage inaccessible");
      storage.current.removeItem(ASSISTANT_SESSION_KEY);
      setPersistence("memory");
    } catch {
      setPersistence("uncertain");
    }
  }, []);

  useEffect(() => {
    createdAt.current = Date.now();
    try {
      storage.current = window.sessionStorage;
      const saved = loadAssistantSession(storage.current);
      if (saved) {
        createdAt.current = saved.createdAt;
        nextId.current = saved.exchanges.length;
        setExchanges(saved.exchanges);
      }
    } catch {
      fallBackToMemory();
    } finally {
      setHydrated(true);
    }
  }, [fallBackToMemory]);

  useEffect(() => {
    if (!hydrated || !storage.current || !storageWritable.current) return;
    try {
      saveAssistantSession(storage.current, exchanges, createdAt.current);
    } catch {
      // Storage is an external system: a failed write must update the retention
      // notice immediately. This is error reconciliation, not derived UI state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fallBackToMemory();
    }
  }, [exchanges, hydrated, fallBackToMemory]);

  const cancelPending = useCallback(() => {
    requestToken.current += 1;
    activeRequest.current?.abort();
    activeRequest.current = null;
    setPending(false);
    setLatestAnnouncement(null);
    setExchanges((current) =>
      current.filter((exchange) => exchange.result !== null),
    );
  }, []);

  useEffect(() => {
    if (open && hydrated) inputRef.current?.focus();
    else {
      // Escape is owned by the lazy wrapper. Reconcile its closed prop with the
      // in-flight browser request and remove its unfinished exchange together.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      cancelPending();
    }
  }, [open, hydrated, cancelPending]);

  useEffect(() => {
    if (open && hydrated && !pending && document.activeElement === document.body) {
      inputRef.current?.focus();
    }
  }, [pending, open, hydrated]);

  useEffect(
    () => () => {
      requestToken.current += 1;
      activeRequest.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!open || exchanges.length === 0) return;
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    transcriptEndRef.current?.scrollIntoView?.({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
  }, [exchanges, open]);

  const closePanel = useCallback(() => {
    cancelPending();
    onClose();
  }, [cancelPending, onClose]);

  const ask = async (rawQuestion: string) => {
    const question = boundInput(rawQuestion);
    if (!question || activeRequest.current || !hydrated || remoteStorage.busy || remoteStorage.checking) return;

    const id = nextId.current++;
    const blocked = screenQuestion(question);
    if (blocked) {
      setQuery("");
      setLatestAnnouncement(id);
      setExchanges((current) =>
        [...current, { id, question, result: blocked }].slice(
          -ASSISTANT_EXCHANGE_LIMIT,
        ),
      );
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    const token = ++requestToken.current;
    const history = historyFrom(exchanges);

    setPending(true);
    setQuery("");
    setLatestAnnouncement(null);
    setExchanges((current) =>
      [...current, { id, question, result: null }].slice(
        -ASSISTANT_EXCHANGE_LIMIT,
      ),
    );

    const settle = (result: AssistantResult) => {
      setLatestAnnouncement(id);
      setExchanges((current) =>
        current.map((exchange) =>
          exchange.id === id ? { ...exchange, result } : exchange,
        ),
      );
    };

    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelListener: (() => void) | undefined;
    try {
      const request = (remoteStorage.connected ? remoteStorage.ask(question,history,controller.signal) : fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
        signal: controller.signal,
      })
        .then(readAssistantResponse))
        .then(
          (result) => ({ kind: "result", result }) as const,
          () => ({ kind: "failed" }) as const,
        );
      const canceled = new Promise<
        | { readonly kind: "canceled" }
        | { readonly kind: "timed-out" }
      >((resolve) => {
        cancelListener = () => resolve({ kind: "canceled" });
        controller.signal.addEventListener("abort", cancelListener, {
          once: true,
        });
        timeout = setTimeout(() => {
          resolve({ kind: "timed-out" });
          controller.abort();
        }, ASSISTANT_UI_TIMEOUT_MS);
      });

      const outcome = await Promise.race([request, canceled]);
      if (token !== requestToken.current) return;
      if (outcome.kind === "canceled") return;
      if(remoteStorage.connected&&outcome.kind!=="result") remoteStorage.failed();
      settle(
        outcome.kind === "result" && outcome.result
          ? outcome.result
          : { state: "unavailable" },
      );
    } catch {
      if (token === requestToken.current && !controller.signal.aborted) {
        settle({ state: "unavailable" });
      }
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
      if (cancelListener) {
        controller.signal.removeEventListener("abort", cancelListener);
      }
      if (token === requestToken.current) {
        activeRequest.current = null;
        setPending(false);
      }
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(query);
  };

  const clearConversation = () => {
    cancelPending();
    if(remoteStorage.connected)remoteStorage.startNew();
    createdAt.current = Date.now();
    setQuery("");
    setExchanges([]);
    try {
      if (!storage.current) throw new Error("Storage inaccessible");
      storage.current.removeItem(ASSISTANT_SESSION_KEY);
      if (!storageWritable.current) setPersistence("memory");
    } catch {
      storageWritable.current = false;
      setPersistence("uncertain");
    }
    inputRef.current?.focus();
  };

  const started = exchanges.length > 0;
  const latestResult = exchanges.find((exchange) => exchange.id === latestAnnouncement)?.result;
  const usedBackup = latestResult &&
    (latestResult.state === "answered" || latestResult.state === "not-covered") &&
    latestResult.modelRoute === "fallback";
  const replyAnnouncement = pending
    ? "Thinking…"
    : latestResult
      ? `E.V: ${usedBackup ? "Backup model used. " : ""}${latestResult.state === "unavailable" ? UNAVAILABLE_MESSAGE : latestResult.answer}`
      : "";
  const persistenceNotice = persistence === "available" ? "" : persistence === "memory"
    ? "This chat is staying in memory for now. Refreshing will clear it."
    : "Saving is unavailable. Older saved messages may reappear on refresh. Clear this site's browser storage to remove them.";
  const aboutId = `${titleId}-about-privacy`;

  return (
    <section
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-modal="false"
      className={PANEL_CLASS}
      hidden={!open}
    >
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {[replyAnnouncement, persistenceNotice].filter(Boolean).join(" ")}
      </p>
      <div className="border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src="/images/profile/ev-avatar-portrait.webp"
              alt="Illustrated avatar of E.V"
              width={36}
              height={36}
              decoding="async"
              className="h-9 w-9 shrink-0 rounded-[3px] border border-line bg-surface-2 object-cover"
            />
            <div className="flex items-center gap-2">
              <h2 id={titleId} className="font-heading text-lg font-semibold leading-none tracking-[0.01em] text-ink">
                E.V
              </h2>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setAboutOpen((current) => !current)}
              aria-label="About & privacy"
              aria-expanded={aboutOpen}
              aria-controls={aboutId}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[3px] text-muted transition-colors hover:bg-surface-2 hover:text-accent"
            >
              <Info className="h-4 w-4" aria-hidden="true" />
            </button>
            {started && (
              <button
                type="button"
                onClick={clearConversation}
                aria-label={remoteStorage.connected?"Start new chat":"Clear chat"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[3px] text-muted transition-colors hover:bg-surface-2 hover:text-accent"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={closePanel}
              aria-label="Close E.V"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[3px] text-muted transition-colors hover:bg-surface-2 hover:text-accent"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p id={descriptionId} className="mt-2 text-xs leading-4 text-muted">OJ&rsquo;s portfolio AI assistant</p>
      </div>

      {storageEnabled&&<details className="border-b border-line bg-surface text-xs text-muted">
        <summary className="min-h-11 cursor-pointer px-4 py-3 font-medium text-ink">{remoteStorage.connected?"Saved chat options":"Save and return to chats"}</summary>
        <SavedChatControls nonce={nonce} storage={remoteStorage} disabled={pending}/>
      </details>}

      <div
        id={aboutId}
        role="region"
        aria-label="About & privacy"
        hidden={!aboutOpen}
        className="max-h-[50%] space-y-2 overflow-y-auto border-b border-line bg-surface-2/55 px-4 py-3 text-xs leading-5 text-muted"
      >
        <p className="font-medium text-ink">
          AI answers from OJ&rsquo;s published portfolio, with sources. Not OJ.
        </p>
        <p>
          Questions go through OJ&apos;s server to Google, with OpenAI as a
          backup if the primary service is unavailable. Please don&apos;t enter
          personal or sensitive information.
        </p>
        <p>The website’s display-preference cookie remembers your chosen color theme; it contains no chat content or identifier.</p>
        {storageEnabled ? (
          <p>This tab keeps up to 20 recent exchanges within its size limit. If you start a saved chat, new questions and replies are stored for 30 days and may be reviewed by OJ. HttpOnly guest cookies let this browser return to them; they do not provide access on another device. Delete saved chat removes its server copy. Disconnecting ends access to the guest account; Start new chat keeps earlier saved chats.</p>
        ) : persistence === "available" ? (
          <p>
            This tab remembers up to 20 recent completed exchanges so the chat
            survives closing the panel or refreshing; older messages are
            removed as the record reaches its size limit. Chat history uses no account or server transcript and does not sync across devices. A duplicated
            tab may begin with a copy and then changes separately. Your browser
            may restore the chat with the tab; Clear chat removes this tab&apos;s
            saved copy.
          </p>
        ) : (
          <p>
            New messages stay in this page&apos;s memory. If a saved copy could
            not be removed, clear this site&apos;s browser storage to remove it.
            Chat history uses no account or server transcript and does not sync across devices.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        {!started && (
          <div className="flex min-h-full flex-col items-center justify-center py-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <h3 className="font-heading text-2xl font-semibold leading-none tracking-[-0.01em] text-ink">
                Hi, I&apos;m E.V.
              </h3>
              <span aria-hidden="true" className="text-lg">
                👋
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">How can I help you?</p>
          </div>
        )}

        {started && (
          <ol aria-label="Conversation with E.V" className="space-y-5">
            {exchanges.map((exchange) => (
              <li key={exchange.id} className="space-y-3">
                <p className="ml-auto w-fit max-w-[85%] break-words rounded-[4px] rounded-br-none border border-accent/20 bg-accent/10 px-3.5 py-2 text-sm leading-6 text-ink">
                  {exchange.question}
                </p>
                {exchange.result ? (
                  <AssistantOutcome
                    result={exchange.result}
                    onNavigate={closePanel}
                  />
                ) : null}
              </li>
            ))}
          </ol>
        )}
        {started && <div ref={transcriptEndRef} />}
      </div>

      <div className="space-y-2 border-t border-line bg-surface px-4 py-3">
        <form onSubmit={submit} className="space-y-2" aria-busy={pending}>
          <label htmlFor="oj-assistant-question" className="sr-only">
            Message E.V
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="oj-assistant-question"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={ASSISTANT_INPUT_LIMIT}
              autoComplete="off"
              placeholder="Write a message…"
              disabled={!hydrated || pending || remoteStorage.busy || remoteStorage.checking}
              className="min-w-0 flex-1 rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent disabled:opacity-70"
            />
            <button
              type="submit"
              aria-label="Send message to E.V"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[3px] bg-accent px-3 text-night transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!hydrated || !query.trim() || pending}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {query.length >= COUNTER_VISIBLE_AT && (
            <p className="text-right text-[0.7rem] text-muted">
              {ASSISTANT_INPUT_LIMIT - query.length} characters remaining
            </p>
          )}
        </form>

        {persistence !== "available" && (
          <p className="text-xs leading-5 text-muted">
            {persistenceNotice}
          </p>
        )}
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
          className="rounded-[3px] border border-line bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function AssistantOutcome({
  result,
  onNavigate,
}: {
  readonly result: AssistantResult;
  readonly onNavigate: () => void;
}) {
  if (result.state === "answered") {
    return (
      <article
        className="max-w-[92%] break-words rounded-[4px] rounded-bl-none border border-line bg-surface p-4"
      >
        {result.modelRoute === "fallback" && (
          <p className="mb-2 text-xs font-medium text-muted">Backup model used</p>
        )}
        <p className="text-sm leading-6 text-ink">{result.answer}</p>
        <details className="mt-3 text-xs leading-5 text-muted">
          <summary className="cursor-pointer font-medium text-accent">
            {result.citations.length === 1
              ? "1 source"
              : `${result.citations.length} sources`}
          </summary>
          <ul className="mt-2 space-y-2">
            {result.citations.map((citation, index) => (
              <li
                key={`${citation.label}-${index}`}
                className="border-l-2 border-accent/30 pl-3"
              >
                <span className="block italic">“{citation.quote}”</span>
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
        </details>
      </article>
    );
  }

  if (result.state === "not-covered") {
    return (
      <article
        className="max-w-[92%] break-words rounded-[4px] rounded-bl-none border border-line bg-surface p-4"
      >
        {result.modelRoute === "fallback" && (
          <p className="mb-2 text-xs font-medium text-muted">Backup model used</p>
        )}
        <p className="text-sm leading-6 text-ink">{result.answer}</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          You can also ask OJ directly through the contact section.
        </p>
        <FallbackLinks onNavigate={onNavigate} />
      </article>
    );
  }

  if (result.state === "blocked") {
    return (
      <article
        className="max-w-[92%] break-words rounded-[4px] rounded-bl-none border border-line bg-surface p-4"
      >
        <p className="text-sm leading-6 text-ink">{result.answer}</p>
        <FallbackLinks onNavigate={onNavigate} />
      </article>
    );
  }

  return (
    <article
      className="max-w-[92%] break-words rounded-[4px] rounded-bl-none border border-line bg-surface p-4"
    >
      <p className="text-sm leading-6 text-ink">
        {UNAVAILABLE_MESSAGE}
      </p>
      <FallbackLinks onNavigate={onNavigate} />
    </article>
  );
}
