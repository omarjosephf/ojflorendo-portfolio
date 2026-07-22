/**
 * Shared contact-form contract and validation.
 *
 * Used by BOTH the client form (for inline UX) and the server route (which is
 * the authoritative check — client validation is never trusted). No external
 * dependency: the rules are simple and explicit.
 */

export const ENQUIRY_TYPES = [
  { value: "job", label: "Job opportunity" },
  { value: "freelance", label: "Freelance project" },
  { value: "collaboration", label: "Collaboration" },
  { value: "partnership", label: "Sponsorship / partnership" },
  { value: "speaking", label: "Speaking / training" },
  { value: "other", label: "Other" },
] as const;

export type EnquiryType = (typeof ENQUIRY_TYPES)[number]["value"];

const ENQUIRY_VALUES = new Set<string>(ENQUIRY_TYPES.map((t) => t.value));

export interface ContactInput {
  name: string;
  email: string;
  company?: string;
  enquiryType: EnquiryType;
  subject: string;
  message: string;
  consent: boolean;
}

/** Field length limits (characters), enforced on client and server. */
export const LIMITS = {
  name: 100,
  email: 200,
  company: 120,
  subject: 150,
  message: 4000,
} as const;

export type FieldErrors = Partial<Record<keyof ContactInput, string>>;

export type ValidationResult =
  | { ok: true; data: ContactInput }
  | { ok: false; errors: FieldErrors };

// Pragmatic email check — intentionally permissive but blocks obvious garbage.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * Validate and normalise arbitrary input into a `ContactInput`.
 * Trims strings, lowercases the email, and rejects anything malformed.
 */
export function validateContact(raw: unknown): ValidationResult {
  const input = (raw ?? {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const name = str(input.name);
  if (name.length < 2) errors.name = "Please enter your name.";
  else if (name.length > LIMITS.name)
    errors.name = `Please keep this under ${LIMITS.name} characters.`;

  const email = str(input.email).toLowerCase();
  if (!email) errors.email = "Please enter your email address.";
  else if (email.length > LIMITS.email)
    errors.email = `Please keep this under ${LIMITS.email} characters.`;
  else if (!EMAIL_RE.test(email))
    errors.email = "Please enter a valid email address.";

  const company = str(input.company);
  if (company.length > LIMITS.company)
    errors.company = `Please keep this under ${LIMITS.company} characters.`;

  const enquiryTypeRaw = str(input.enquiryType);
  if (!ENQUIRY_VALUES.has(enquiryTypeRaw))
    errors.enquiryType = "Please choose an enquiry type.";

  const subject = str(input.subject);
  if (subject.length < 3) errors.subject = "Please add a short subject.";
  else if (subject.length > LIMITS.subject)
    errors.subject = `Please keep this under ${LIMITS.subject} characters.`;

  const message = str(input.message);
  if (message.length < 10)
    errors.message = "Please add a little more detail (at least 10 characters).";
  else if (message.length > LIMITS.message)
    errors.message = `Please keep this under ${LIMITS.message} characters.`;

  const consent = input.consent === true || input.consent === "true";
  if (!consent)
    errors.consent = "Please confirm you're happy for me to reply to you.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      email,
      company: company || undefined,
      enquiryType: enquiryTypeRaw as EnquiryType,
      subject,
      message,
      consent: true,
    },
  };
}
