/**
 * Throwaway / temporary email providers.
 *
 * Deliberately a small, hand-maintained list rather than a dependency: the
 * exhaustive lists are tens of thousands of entries, need constant updating, and
 * would be a supply-chain liability for very little gain. These are the common
 * ones a time-waster reaches for first.
 *
 * A genuine client, sponsor, collaborator or employer does not use these. If a
 * legitimate enquiry is ever blocked by an entry here, remove the entry — a lost
 * client costs more than a spam message.
 */
export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "10minutemail.com",
  "20minutemail.com",
  "33mail.com",
  "burnermail.io",
  "dispostable.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamail.net",
  "inboxbear.com",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "mintemail.com",
  "moakt.com",
  "mohmal.com",
  "sharklasers.com",
  "spam4.me",
  "temp-mail.org",
  "tempmail.com",
  "tempmailo.com",
  "tempr.email",
  "throwawaymail.com",
  "trashmail.com",
  "yopmail.com",
  "yopmail.net",
]);
