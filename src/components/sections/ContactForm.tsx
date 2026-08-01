"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import {
  ENQUIRY_TYPES,
  LIMITS,
  validateContact,
  type EnquiryType,
  type FieldErrors,
} from "@/lib/contact/schema";
import { TurnstileWidget } from "@/components/sections/TurnstileWidget";

type Status = "idle" | "submitting" | "success" | "error";

interface FormValues {
  name: string;
  email: string;
  company: string;
  enquiryType: EnquiryType | "";
  subject: string;
  message: string;
  consent: boolean;
  website: string; // honeypot — always empty for real users
}

const EMPTY: FormValues = {
  name: "",
  email: "",
  company: "",
  enquiryType: "",
  subject: "",
  message: "",
  consent: false,
  website: "",
};

const FIELD_ORDER: (keyof FieldErrors)[] = [
  "name",
  "email",
  "company",
  "enquiryType",
  "subject",
  "message",
  "consent",
];

export function ContactForm({ nonce }: { nonce?: string } = {}) {
  const uid = useId();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState("");
  const [delivered, setDelivered] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  // Absent until the owner configures Turnstile, in which case the widget is not
  // rendered and the server-side check is likewise disabled.
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const fid = (name: string) => `${uid}-${name}`;

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "submitting") return; // prevent duplicate submission

    const result = validateContact({ ...values });
    if (!result.ok) {
      setErrors(result.errors);
      setStatus("idle");
      const first = FIELD_ORDER.find((f) => result.errors[f]);
      if (first) document.getElementById(fid(first))?.focus();
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
        return;
      }
      if (res.status === 422 && data.fieldErrors) {
        setErrors(data.fieldErrors);
        setStatus("idle");
        const first = FIELD_ORDER.find((f) => data.fieldErrors?.[f]);
        if (first) document.getElementById(fid(first))?.focus();
        return;
      }
      setServerError(
        data.error ?? "Sorry — something went wrong. Please email me directly.",
      );
      setStatus("error");
    } catch {
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
          <p className="font-heading text-xl font-semibold text-ink">
            Thanks for reaching out
          </p>
          <p className="mt-2 text-sm text-muted">
            {delivered
              ? "Your message has been sent — I'll get back to you soon."
              : "Your message passed validation. Email delivery isn't configured in this environment, so nothing was actually sent yet. You can reach me directly using the email button."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent/60"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  const submitting = status === "submitting";
  const inputCls =
    "w-full rounded-xl border border-line bg-surface-2/60 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent/60 focus:outline-none";

  return (
    <form onSubmit={onSubmit} noValidate className="glass rounded-2xl p-6 sm:p-8">
      <p className="font-heading text-lg font-semibold text-ink">
        Send a project enquiry
      </p>
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

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field
          id={fid("name")}
          label="Full name"
          required
          error={errors.name}
        >
          <input
            id={fid("name")}
            name="name"
            type="text"
            autoComplete="name"
            maxLength={LIMITS.name}
            required
            aria-required="true"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? `${fid("name")}-error` : undefined}
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field id={fid("email")} label="Email" required error={errors.email}>
          <input
            id={fid("email")}
            name="email"
            type="email"
            autoComplete="email"
            maxLength={LIMITS.email}
            required
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? `${fid("email")}-error` : undefined}
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field
          id={fid("company")}
          label="Company / organisation"
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
            aria-describedby={`${fid("company")}-hint${errors.company ? ` ${fid("company")}-error` : ""}`}
            value={values.company}
            onChange={(e) => update("company", e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field
          id={fid("enquiryType")}
          label="Enquiry type"
          required
          error={errors.enquiryType}
        >
          <select
            id={fid("enquiryType")}
            name="enquiryType"
            required
            aria-required="true"
            aria-invalid={!!errors.enquiryType}
            aria-describedby={
              errors.enquiryType ? `${fid("enquiryType")}-error` : undefined
            }
            value={values.enquiryType}
            onChange={(e) =>
              update("enquiryType", e.target.value as EnquiryType)
            }
            className={`${inputCls} appearance-none`}
          >
            <option value="" disabled>
              Choose one…
            </option>
            {ENQUIRY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-5">
        <Field
          id={fid("subject")}
          label="Subject"
          required
          error={errors.subject}
        >
          <input
            id={fid("subject")}
            name="subject"
            type="text"
            maxLength={LIMITS.subject}
            required
            aria-required="true"
            aria-invalid={!!errors.subject}
            aria-describedby={
              errors.subject ? `${fid("subject")}-error` : undefined
            }
            value={values.subject}
            onChange={(e) => update("subject", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field
          id={fid("message")}
          label="Message"
          required
          error={errors.message}
          hint={`${values.message.length}/${LIMITS.message}`}
        >
          <textarea
            id={fid("message")}
            name="message"
            rows={5}
            maxLength={LIMITS.message}
            required
            aria-required="true"
            aria-invalid={!!errors.message}
            aria-describedby={`${fid("message")}-hint${errors.message ? ` ${fid("message")}-error` : ""}`}
            value={values.message}
            onChange={(e) => update("message", e.target.value)}
            className={`${inputCls} resize-y`}
          />
        </Field>
      </div>

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

      <div className="mt-5 flex items-start gap-3">
        <input
          id={fid("consent")}
          name="consent"
          type="checkbox"
          required
          aria-required="true"
          aria-invalid={!!errors.consent}
          aria-describedby={
            errors.consent ? `${fid("consent")}-error` : undefined
          }
          checked={values.consent}
          onChange={(e) => update("consent", e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-accent"
        />
        <div>
          <label htmlFor={fid("consent")} className="text-sm text-muted">
            I&apos;m happy for OJ Florendo to use these details to reply to my
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
        />
      ) : null}

      <div className="mt-6 flex items-center gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {submitting ? "Sending…" : "Send project enquiry"}
        </button>
        {/* polite live region for submission progress */}
        <span role="status" aria-live="polite" className="sr-only">
          {submitting ? "Sending your message" : ""}
        </span>
      </div>
    </form>
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
