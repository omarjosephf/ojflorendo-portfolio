# Runbook — enabling contact-form email delivery

**Scope:** turning the contact form from validated-but-not-delivered into real
email delivery via Resend.

**Who:** the owner only. This cannot be automated or delegated to an agent — it
requires registrar DNS access and creates production secrets.

**Related:** `docs/adr/0001-contact-form-email-boundary.md`, `.env.example`,
`src/lib/email/index.ts`.

---

## What the application already does

`src/lib/email/index.ts` selects its transport from the environment at request
time:

- **All three** of `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`
  set → real delivery via Resend's HTTP API.
- **Any missing** → the mock transport. It validates the submission, sends
  nothing, and the UI honestly tells the visitor nothing was sent.
- **Some but not all** set → mock, plus a server-log warning naming the missing
  variables. This is the signature of a typo in the hosting environment.

No code change or redeploy of application logic is needed — only configuration.

## Facts that shape this procedure

- DNS for `ojfr.me` is held at **Hostinger**, not Vercel. Records are added in
  hPanel's DNS Zone Editor. (Nameservers: `lunar`/`solar.dns-parking.com`.)
- The verified sending identity is the **`send.ojfr.me` subdomain**, not the
  apex — see ADR-0001, "Sending from the apex domain instead of a subdomain".
- Secrets live only in Vercel environment variables. Never in the repository,
  never with a `NEXT_PUBLIC_` prefix, never pasted into an issue or a PR.

---

## Procedure

### 1. Add the sending domain in Resend

Create the Resend account, then add the domain **`send.ojfr.me`**.

### 2. Publish the DNS records at Hostinger

Resend generates the record set per domain — an MX, an SPF `TXT`, and a DKIM
`TXT`. **Copy the values from Resend's Records tab and paste them into
Hostinger**; never transcribe them by hand or reuse values from documentation.

Add the DMARC record Resend recommends as well. `ojfr.me` currently publishes no
SPF, DKIM or DMARC at all, so this is a net gain in email authentication for the
domain rather than a change to existing mail.

Because every record sits under `send.ojfr.me`, none of this affects mail on
`ojfr.me` itself, now or later.

### 3. Verify

Trigger verification in Resend. The zone's TTL is 600s, so propagation is
usually minutes. Resend names the specific record if one fails.

### 4. Create a sending-only API key

Create the key with **sending permission only** — not full access. Copy it once;
it is not shown again.

### 5. Configure Vercel

In the Vercel project, **Production** scope:

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | the key from step 4 |
| `CONTACT_TO_EMAIL` | the inbox that should receive enquiries |
| `CONTACT_FROM_EMAIL` | an address on `send.ojfr.me` |

`CONTACT_FROM_EMAIL` **must** be on the verified domain or Resend rejects every
send with a 403.

### 6. Redeploy and confirm with a real enquiry

Redeploy so the new environment is picked up, then submit one genuine enquiry
through the live form and confirm:

- the success message reads as **sent**, not the mock-mode wording;
- the email arrives in `CONTACT_TO_EMAIL`;
- **replying to it goes to the enquirer**, not to `CONTACT_FROM_EMAIL`.

A green build is not evidence of delivery. Only a received email is.

---

## If it does not work

| Symptom | Likely cause |
| --- | --- |
| Visitor sees the mock "nothing was sent" wording | Not all three variables are set in the deployed scope. Check the server log for the warning naming the missing ones. |
| "Couldn't be sent right now" (502) | Resend rejected the send — most often an unverified domain or a `CONTACT_FROM_EMAIL` not on it (403), or an invalid key. |
| Enquiries stop after several rapid submissions | Expected: the route rate-limits to 5 per minute per IP. |

Diagnostics are deliberately limited to fixed categories. Message bodies,
provider responses and secrets are never logged, so do not expect to find a
failed enquiry's contents in the logs — by design.

## Rolling back

Remove the three variables in Vercel and redeploy. The form reverts to mock
mode: it keeps validating and honestly reports that nothing was sent, with the
direct email, LinkedIn and GitHub actions still available. The DNS records can be
left in place harmlessly.
