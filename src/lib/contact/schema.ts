/**
 * Shared contact-form contract and validation.
 *
 * Used by BOTH the client form (for inline UX) and the server route (which is
 * the authoritative check — client validation is never trusted). No external
 * dependency: the rules are simple and explicit.
 */

/**
 * What the enquirer needs (ADR-0033). The SET is the server contract; the
 * ORDER follows the services on the home page. Job, collaboration,
 * sponsorship and speaking enquiries were retired by the owner on 21 October
 * 2026, and with them every value the old form sent.
 *
 * Renaming any label is a separate change: labels reach the email templates and
 * the delivered notification, so they are not display-only.
 */
export const ENQUIRY_TYPES = [
  { value: "automation", label: "AI automation or workflow" },
  { value: "agent", label: "AI agent" },
  { value: "website", label: "Website or care plan" },
  { value: "other", label: "Something else" },
] as const;

/** Optional. A hint at the size of the job, never a filter (ADR-0033). */
export const COMPANY_SIZES = [
  { value: "solo", label: "Just me" },
  { value: "2-10", label: "2–10 people" },
  { value: "11-50", label: "11–50 people" },
  { value: "51-200", label: "51–200 people" },
  { value: "200-plus", label: "More than 200" },
] as const;

/** Optional tick boxes: the parts of the business the enquirer wants to improve. */
export const IMPROVEMENT_AREAS = [
  { value: "leads", label: "Leads and sales" },
  { value: "enquiries", label: "Customer enquiries" },
  { value: "admin", label: "Admin and paperwork" },
  { value: "content", label: "Content and social media" },
  { value: "reports", label: "Reports and data" },
  { value: "other", label: "Something else" },
] as const;

/**
 * Optional budget bands, in pounds. These are the only amounts the home page
 * may show: they are choices for the enquirer, not prices (ADR-0033 amends
 * ADR-0032 D3). The bands follow the owner's private quoting rate.
 */
export const BUDGET_RANGES = [
  { value: "under-1000", label: "Under £1,000" },
  { value: "1000-2500", label: "£1,000–£2,500" },
  { value: "2500-5000", label: "£2,500–£5,000" },
  { value: "5000-10000", label: "£5,000–£10,000" },
  { value: "10000-plus", label: "£10,000 or more" },
  { value: "not-sure", label: "Not sure yet" },
] as const;

export type EnquiryType = (typeof ENQUIRY_TYPES)[number]["value"];
export type CompanySize = (typeof COMPANY_SIZES)[number]["value"];
export type ImprovementArea = (typeof IMPROVEMENT_AREAS)[number]["value"];
export type BudgetRange = (typeof BUDGET_RANGES)[number]["value"];

const valuesOf = (list: readonly { value: string }[]) =>
  new Set<string>(list.map((item) => item.value));

const ENQUIRY_VALUES = valuesOf(ENQUIRY_TYPES);
const SIZE_VALUES = valuesOf(COMPANY_SIZES);
const AREA_VALUES = valuesOf(IMPROVEMENT_AREAS);
const BUDGET_VALUES = valuesOf(BUDGET_RANGES);

export interface ContactInput {
  name: string;
  email: string;
  role?: string;
  company?: string;
  /**
   * The company's website. Not `website`: that name belongs to the hidden
   * honeypot field the route checks before validation.
   */
  companyUrl?: string;
  companySize?: CompanySize;
  enquiryType: EnquiryType;
  areas: ImprovementArea[];
  budget?: BudgetRange;
  message: string;
  consent: boolean;
}

/** Field length limits (characters), enforced on client and server. */
export const LIMITS = {
  name: 100,
  email: 200,
  role: 100,
  company: 120,
  companyUrl: 200,
  message: 4000,
} as const;

export type FieldErrors = Partial<Record<keyof ContactInput, string>>;

export type ValidationResult =
  | { ok: true; data: ContactInput }
  | { ok: false; errors: FieldErrors };

// Pragmatic email check — intentionally permissive but blocks obvious garbage.
// No angle brackets, quotes, commas or semicolons: the address becomes the
// reply-to, which must be one plain address, never a display-name form.
const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]{2,}$/;

// A web address with or without http(s)://, such as example.com or
// https://www.example.co.uk/about. Any other scheme is refused.
const URL_RE = /^(?:https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d{2,5})?(?:[/?#]\S*)?$/i;

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * Single-line fields keep one line. Several of them reach the email subject,
 * so a pasted line break is collapsed rather than carried into a header.
 */
const line = (v: unknown): string => str(v).replace(/\s+/g, " ");

const TOO_LONG = (limit: number) => `Please keep this under ${limit} characters.`;

/**
 * Validate and normalise arbitrary input into a `ContactInput`.
 * Trims strings, lowercases the email, and rejects anything malformed.
 */
export function validateContact(raw: unknown): ValidationResult {
  const input = (raw ?? {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const name = line(input.name);
  if (name.length < 2) errors.name = "Please enter your name.";
  else if (name.length > LIMITS.name) errors.name = TOO_LONG(LIMITS.name);

  const email = str(input.email).toLowerCase();
  if (!email) errors.email = "Please enter your email address.";
  else if (email.length > LIMITS.email) errors.email = TOO_LONG(LIMITS.email);
  else if (!EMAIL_RE.test(email))
    errors.email = "Please enter a valid email address.";

  const role = line(input.role);
  if (role.length > LIMITS.role) errors.role = TOO_LONG(LIMITS.role);

  const company = line(input.company);
  if (company.length > LIMITS.company) errors.company = TOO_LONG(LIMITS.company);

  const companyUrl = str(input.companyUrl);
  if (companyUrl.length > LIMITS.companyUrl)
    errors.companyUrl = TOO_LONG(LIMITS.companyUrl);
  else if (companyUrl && !URL_RE.test(companyUrl))
    errors.companyUrl = "Please enter a web address, like example.com.";

  // Optional choices: empty means "not answered"; anything else must be listed.
  const companySize = str(input.companySize);
  if (companySize && !SIZE_VALUES.has(companySize))
    errors.companySize = "Please choose a size from the list.";

  const enquiryType = str(input.enquiryType);
  if (!ENQUIRY_VALUES.has(enquiryType))
    errors.enquiryType = "Please choose what you need.";

  // Absent means none ticked. Anything other than a list of known areas is
  // malformed, and is refused rather than quietly dropped.
  const areasRaw = input.areas ?? [];
  const areas: ImprovementArea[] = [];
  if (
    !Array.isArray(areasRaw) ||
    !areasRaw.every((a) => typeof a === "string" && AREA_VALUES.has(a))
  ) {
    errors.areas = "Please choose from the listed areas.";
  } else {
    for (const a of areasRaw as ImprovementArea[]) {
      if (!areas.includes(a)) areas.push(a);
    }
  }

  const budget = str(input.budget);
  if (budget && !BUDGET_VALUES.has(budget))
    errors.budget = "Please choose a budget from the list.";

  const message = str(input.message);
  if (message.length < 10)
    errors.message = "Please add a little more detail (at least 10 characters).";
  else if (message.length > LIMITS.message)
    errors.message = TOO_LONG(LIMITS.message);

  const consent = input.consent === true || input.consent === "true";
  if (!consent)
    errors.consent = "Please confirm you're happy for me to reply to you.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      email,
      role: role || undefined,
      company: company || undefined,
      companyUrl: companyUrl || undefined,
      companySize: (companySize || undefined) as CompanySize | undefined,
      enquiryType: enquiryType as EnquiryType,
      areas,
      budget: (budget || undefined) as BudgetRange | undefined,
      message,
      consent: true,
    },
  };
}

/** The display label for a listed value; used by the email body and subject. */
export function labelOf(
  list: readonly { value: string; label: string }[],
  value: string,
): string {
  return list.find((item) => item.value === value)?.label ?? value;
}
