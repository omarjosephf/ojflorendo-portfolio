"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { CalendarDays, CheckCircle2, Loader2, Send } from "lucide-react";
import {
  BUDGET_RANGES,
  COMPANY_SIZES,
  ENQUIRY_TYPES,
  IMPROVEMENT_AREAS,
  LIMITS,
  validateContact,
  type BudgetRange,
  type CompanySize,
  type EnquiryType,
  type FieldErrors,
  type ImprovementArea,
} from "@/lib/contact/schema";
import { TurnstileWidget } from "@/components/sections/TurnstileWidget";

type Status = "idle" | "submitting" | "success" | "error";

/** The free-call link (ADR-0033). Absent until the owner adds it to site config. */
export interface BookingLink {
  href: string;
  label: string;
}

interface FormValues {
  name: string;
  email: string;
  role: string;
  company: string;
  companyUrl: string;
  companySize: CompanySize | "";
  enquiryType: EnquiryType | "";
  areas: ImprovementArea[];
  budget: BudgetRange | "";
  message: string;
  consent: boolean;
  website: string; // honeypot — always empty for real users
}

const EMPTY: FormValues = {
  name: "",
  email: "",
  role: "",
  company: "",
  companyUrl: "",
  companySize: "",
  enquiryType: "",
  areas: [],
  budget: "",
  message: "",
  consent: false,
  website: "",
};

const FIELD_ORDER: (keyof FieldErrors)[] = [
  "name",
  "email",
  "role",
  "company",
  "companyUrl",
  "companySize",
  "enquiryType",
  "areas",
  "budget",
  "message",
  "consent",
];

export function ContactForm({
  nonce,
  booking,
}: { nonce?: string; booking?: BookingLink } = {}) {
  const uid = useId();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState("");
  const [delivered, setDelivered] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const [turnstileUnavailable, setTurnstileUnavailable] = useState(false);

  // Absent until the owner configures Turnstile, in which case the widget is not
  // rendered and the server-side check is likewise disabled.
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // With Turnstile enforced, submitting before the check has produced a token is
  // guaranteed to be refused server-side. Block it in the UI rather than letting
  // a visitor hit a "couldn't confirm you're human" error they did nothing to cause.
  const awaitingVerification = Boolean(turnstileSiteKey) && turnstileToken === "";
  // Once the check has failed outright the widget shows its own explanation, so
  // the button hint must stop claiming a check is still running.
  const showVerifyHint = awaitingVerification && !turnstileUnavailable;

  /**
   * A token is spent by any submission attempt. Drop it here rather than relying
   * on the widget to clear it, so a spent token can never be resubmitted even if
   * the reset does not complete, then ask for a replacement.
   */
  function refreshTurnstile() {
    setTurnstileToken("");
    setTurnstileResetSignal((n) => n + 1);
  }

  const fid = (name: string) => `${uid}-${name}`;
  // Each option in a group has its own id; an error on the group focuses the first.
  const optionId = (group: string, value: string) => `${fid(group)}-${value}`;
  const focusTarget = (field: keyof FieldErrors) =>
    field === "enquiryType"
      ? optionId("enquiryType", ENQUIRY_TYPES[0].value)
      : field === "areas"
        ? optionId("areas", IMPROVEMENT_AREAS[0].value)
        : fid(field);

  function focusFirstError(fieldErrors: FieldErrors) {
    const first = FIELD_ORDER.find((f) => fieldErrors[f]);
    if (first) document.getElementById(focusTarget(first))?.focus();
  }

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function toggleArea(area: ImprovementArea, checked: boolean) {
    update(
      "areas",
      checked
        ? [...values.areas, area]
        : values.areas.filter((a) => a !== area),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "submitting") return; // prevent duplicate submission

    const result = validateContact({ ...values });
    if (!result.ok) {
      setErrors(result.errors);
      setStatus("idle");
      focusFirstError(result.errors);
      return;
    }

    setErrors({});
    setServerError("");
    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, turnstileToken }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        delivered?: boolean;
        error?: string;
        fieldErrors?: FieldErrors;
      };

      if (res.ok && data.ok) {
        setDelivered(Boolean(data.delivered));
        setStatus("success");
        setValues(EMPTY);
        setTurnstileToken("");
        return;
      }

      // Past this point the attempt failed, and the token it carried is spent.
      // Every failure path must get a fresh one, or a corrected resubmission is
      // refused as a replay and the visitor can never send the form.
      refreshTurnstile();

      if (res.status === 422 && data.fieldErrors) {
        setErrors(data.fieldErrors);
        setStatus("idle");
        focusFirstError(data.fieldErrors);
        return;
      }
      setServerError(
        data.error ?? "Sorry — something went wrong. Please email me directly.",
      );
      setStatus("error");
    } catch {
      refreshTurnstile();
      setServerError(
        "Sorry — the message couldn't be sent. Please check your connection or email me directly.",
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="glass flex flex-col items-start gap-4 rounded-2xl p-8 text-left"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <p className="font-heading text-xl font-semibold text-ink">Thanks.</p>
          <p className="mt-2 text-sm text-muted">
            {delivered
              ? "I'll read it and reply by email."
              : "Your message passed validation. Email delivery isn't configured in this environment, so nothing was actually sent yet. You can reach me directly using the email button."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {booking ? <BookingButton booking={booking} /> : null}
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent/60"
          >
            Send another enquiry
          </button>
        </div>
      </div>
    );
  }

  const submitting = status === "submitting";
  const inputCls =
    "w-full rounded-xl border border-line bg-surface-2/60 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent/60 focus:outline-none";
  const choiceCls =
    "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-surface-2/60 px-3.5 py-2 text-sm text-ink transition-colors hover:border-accent/60 has-[:checked]:border-accent has-[:checked]:bg-accent/10";
  const describedBy = (field: keyof FieldErrors, ...extra: string[]) =>
    [...extra, errors[field] ? `${fid(field)}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="glass rounded-2xl p-6 sm:p-8">
      <h3 className="font-heading text-lg font-semibold text-ink">
        Start a project
      </h3>
      <p className="mt-1 text-sm text-muted">
        Fields marked <span className="text-accent">*</span> are required.
      </p>

      {status === "error" && serverError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {serverError}
        </p>
      ) : null}

      <Group legend="About you">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={fid("name")} label="Your name" required error={errors.name}>
            <input
              id={fid("name")}
              name="name"
              type="text"
              autoComplete="name"
              maxLength={LIMITS.name}
              required
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={describedBy("name")}
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field id={fid("email")} label="Email address" required error={errors.email}>
            <input
              id={fid("email")}
              name="email"
              type="email"
              autoComplete="email"
              maxLength={LIMITS.email}
              required
              aria-required="true"
              aria-invalid={!!errors.email}
              aria-describedby={describedBy("email")}
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field id={fid("role")} label="Your role" hint="Optional" error={errors.role}>
            <input
              id={fid("role")}
              name="role"
              type="text"
              autoComplete="organization-title"
              maxLength={LIMITS.role}
              aria-invalid={!!errors.role}
              aria-describedby={describedBy("role", `${fid("role")}-hint`)}
              value={values.role}
              onChange={(e) => update("role", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </Group>

      <Group legend="Your business">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id={fid("company")}
            label="Company name"
            hint="Optional"
            error={errors.company}
          >
            <input
              id={fid("company")}
              name="company"
              type="text"
              autoComplete="organization"
              maxLength={LIMITS.company}
              aria-invalid={!!errors.company}
              aria-describedby={describedBy("company", `${fid("company")}-hint`)}
              value={values.company}
              onChange={(e) => update("company", e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field
            id={fid("companyUrl")}
            label="Company website"
            hint="Optional"
            error={errors.companyUrl}
          >
            <input
              id={fid("companyUrl")}
              name="companyUrl"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="example.com"
              maxLength={LIMITS.companyUrl}
              aria-invalid={!!errors.companyUrl}
              aria-describedby={describedBy(
                "companyUrl",
                `${fid("companyUrl")}-hint`,
              )}
              value={values.companyUrl}
              onChange={(e) => update("companyUrl", e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field
            id={fid("companySize")}
            label="Company size"
            hint="Optional"
            error={errors.companySize}
          >
            <select
              id={fid("companySize")}
              name="companySize"
              aria-invalid={!!errors.companySize}
              aria-describedby={describedBy(
                "companySize",
                `${fid("companySize")}-hint`,
              )}
              value={values.companySize}
              onChange={(e) =>
                update("companySize", e.target.value as CompanySize | "")
              }
              className={`${inputCls} appearance-none`}
            >
              <option value="">Choose…</option>
              {COMPANY_SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Group>

      <Group legend="Your project">
        <ChoiceGroup
          id={fid("enquiryType")}
          legend="What do you need?"
          radio
          required
          error={errors.enquiryType}
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {ENQUIRY_TYPES.map((t) => (
              <label key={t.value} className={choiceCls}>
                <input
                  id={optionId("enquiryType", t.value)}
                  type="radio"
                  name="enquiryType"
                  value={t.value}
                  required
                  checked={values.enquiryType === t.value}
                  onChange={() => update("enquiryType", t.value)}
                  className="h-4 w-4 shrink-0 accent-accent"
                />
                {t.label}
              </label>
            ))}
          </div>
        </ChoiceGroup>

        <ChoiceGroup
          id={fid("areas")}
          legend="Areas to improve"
          hint="Optional. Tick any."
          error={errors.areas}
        >
          <div className="flex flex-wrap gap-2.5">
            {IMPROVEMENT_AREAS.map((a) => (
              <label key={a.value} className={choiceCls}>
                <input
                  id={optionId("areas", a.value)}
                  type="checkbox"
                  name="areas"
                  value={a.value}
                  aria-invalid={!!errors.areas}
                  aria-describedby={describedBy("areas")}
                  checked={values.areas.includes(a.value)}
                  onChange={(e) => toggleArea(a.value, e.target.checked)}
                  className="h-4 w-4 shrink-0 accent-accent"
                />
                {a.label}
              </label>
            ))}
          </div>
        </ChoiceGroup>

        <div className="sm:max-w-[calc(50%-0.625rem)]">
          <Field
            id={fid("budget")}
            label="Budget"
            hint="Optional"
            error={errors.budget}
          >
            <select
              id={fid("budget")}
              name="budget"
              aria-invalid={!!errors.budget}
              aria-describedby={describedBy("budget", `${fid("budget")}-hint`)}
              value={values.budget}
              onChange={(e) => update("budget", e.target.value as BudgetRange | "")}
              className={`${inputCls} appearance-none`}
            >
              <option value="">Choose…</option>
              {BUDGET_RANGES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          id={fid("message")}
          label="How can I help?"
          required
          error={errors.message}
          hint={`${values.message.length}/${LIMITS.message}`}
        >
          {/*
            Guidance a visitor can act on, associated with the field rather than
            floating near it, so assistive technology announces it with the
            textarea alongside the character counter.
          */}
          <p id={`${fid("message")}-guide`} className="mb-1.5 text-xs leading-relaxed text-muted">
            The task you repeat, or the idea, and what &lsquo;done&rsquo; looks like.
          </p>
          <textarea
            id={fid("message")}
            name="message"
            rows={5}
            maxLength={LIMITS.message}
            required
            aria-required="true"
            aria-invalid={!!errors.message}
            aria-describedby={describedBy(
              "message",
              `${fid("message")}-guide`,
              `${fid("message")}-hint`,
            )}
            value={values.message}
            onChange={(e) => update("message", e.target.value)}
            className={`${inputCls} resize-y`}
          />
        </Field>
      </Group>

      {/* Honeypot — hidden from users and assistive tech, catches naive bots. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor={fid("website")}>Leave this field empty</label>
        <input
          id={fid("website")}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => update("website", e.target.value)}
        />
      </div>

      <div className="mt-6 flex items-start gap-3">
        <input
          id={fid("consent")}
          name="consent"
          type="checkbox"
          required
          aria-required="true"
          aria-invalid={!!errors.consent}
          aria-describedby={describedBy("consent")}
          checked={values.consent}
          onChange={(e) => update("consent", e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-accent"
        />
        <div>
          <label htmlFor={fid("consent")} className="text-sm text-muted">
            I&apos;m happy for Joseph Florendo to use these details to reply to my
            enquiry.{" "}
            <span className="text-accent">*</span>
          </label>
          {errors.consent ? (
            <p
              id={`${fid("consent")}-error`}
              className="mt-1 text-sm text-red-300"
            >
              {errors.consent}
            </p>
          ) : null}
        </div>
      </div>

      {turnstileSiteKey ? (
        <TurnstileWidget
          siteKey={turnstileSiteKey}
          nonce={nonce}
          onToken={setTurnstileToken}
          onUnavailable={() => setTurnstileUnavailable(true)}
          resetSignal={turnstileResetSignal}
        />
      ) : null}

      <div className="mt-6 flex items-center gap-4">
        <button
          type="submit"
          disabled={submitting || awaitingVerification}
          aria-describedby={showVerifyHint ? `${uid}-verify-hint` : undefined}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting || awaitingVerification ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {submitting ? "Sending…" : "Send enquiry"}
        </button>
        {showVerifyHint ? (
          <span id={`${uid}-verify-hint`} className="text-sm text-muted">
            Just running a quick security check…
          </span>
        ) : null}
        {/* polite live region for submission progress */}
        <span role="status" aria-live="polite" className="sr-only">
          {submitting
            ? "Sending your message"
            : showVerifyHint
              ? "Waiting for the security check to finish before you can send"
              : ""}
        </span>
      </div>
    </form>
  );
}

/** The booking link opens Cal.com in a new tab; nothing of it loads into the page. */
export function BookingButton({ booking }: { booking: BookingLink }) {
  return (
    <a
      href={booking.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${booking.label} (opens in a new tab)`}
      className="jf-button"
    >
      <CalendarDays className="h-4 w-4" aria-hidden="true" />
      {booking.label}
    </a>
  );
}

/** One of the form's three sections, announced by its legend. */
function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="mt-7 grid gap-5 border-t border-line pt-5">
      <legend className="float-left mb-1 w-full text-xs font-semibold uppercase tracking-[0.14em] text-accent">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * A set of radios or tick boxes, with its question as the legend. A radio set
 * is a radiogroup, because ARIA puts its required and invalid states on the
 * group rather than on each radio.
 */
function ChoiceGroup({
  id,
  legend,
  radio,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  legend: string;
  radio?: boolean;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <fieldset
      role={radio ? "radiogroup" : undefined}
      aria-labelledby={`${id}-legend`}
      aria-required={radio && required ? true : undefined}
      aria-invalid={radio ? !!error : undefined}
      aria-describedby={describedBy}
    >
      <legend className="mb-1.5 flex w-full items-baseline justify-between gap-2 text-sm font-medium text-ink">
        <span id={`${id}-legend`}>
          {legend}
          {required ? (
            <span className="text-accent" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </span>
        {hint ? (
          <span id={`${id}-hint`} className="text-xs font-normal text-muted">
            {hint}
          </span>
        ) : null}
      </legend>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {required ? (
            <span className="text-accent" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </label>
        {hint ? (
          <span id={`${id}-hint`} className="text-xs text-muted">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
