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

---

# Part 2 — Abuse protection (ADR-0005)

Independent of Part 1. The form works without any of this; these steps reduce
spam and protect the domain from being spoofed.

## 7. Enable Cloudflare Turnstile

Free, and it does **not** require moving DNS off Hostinger.

1. Create a Cloudflare account and open **Turnstile**.
2. Add a widget. Domain: `ojfr.me`. Widget mode: **Managed**.
3. Copy the **Site Key** and the **Secret Key**.
4. In Vercel → **Production**, add:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | the Site Key |
   | `TURNSTILE_SECRET_KEY` | the Secret Key |

5. **Redeploy.** The site key is compiled into the browser bundle at build time,
   so an environment change alone will not take effect.
6. Load the contact form and confirm the check appears above the submit button.

Until both variables exist the check stays switched off and the form behaves
exactly as before — a missed step degrades quietly, it does not break contact.

## 8. Lock down the apex domain against spoofing

`ojfr.me` currently publishes no SPF, DKIM or DMARC, so anyone can forge mail
that claims to come from it. These records fix that.

**Order matters.** DMARC on the apex is inherited by `send.ojfr.me`. Tightening
it before Resend is verified would cause your own enquiry mail to be rejected.

**Step 8a — now.** In Hostinger hPanel → DNS Zone Editor, add:

| Type | Name | Value |
| --- | --- | --- |
| TXT | `@` | `v=spf1 -all` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:<your inbox>` |

`v=spf1 -all` states that the apex itself sends no mail, which is true — sending
happens from `send.ojfr.me`. `p=none` is monitor-only and changes no delivery.

**Step 8b — only after Part 1 is verified and a real test enquiry has arrived.**
Change the `_dmarc` record to:

```
v=DMARC1; p=reject; rua=mailto:<your inbox>
```

Do not skip the wait. If DKIM or SPF alignment is wrong, `p=reject` will silently
destroy your own enquiries.

## 9. Harden the inbox

The published address is where malware and phishing actually arrive — no code in
this repository can prevent that. These controls matter more than anything above.

1. **Enable 2-Step Verification** on the Google account, and prefer an
   authenticator app or passkey over SMS.
2. **Review recovery options** — a stale recovery phone or address is a common
   account-takeover route.
3. **Add a filter** for form mail: match the `From` address you set as
   `CONTACT_FROM_EMAIL`, apply a label such as `Enquiries`, and never
   auto-forward it onward.
4. **Never open unexpected attachments**, especially archives, documents
   prompting to "enable content", or anything ending `.html`, `.iso` or `.zip`.
   Gmail scans attachments, but scanning is not a guarantee.
5. **Treat urgency as a warning sign.** Payment-detail changes, "confirm your
   account" links and deadline pressure are the standard phishing patterns
   aimed at freelancers.
6. Verify unfamiliar companies independently — search the company, check the
   domain matches the sender, and confirm the person exists on LinkedIn. The
   form cannot do this for you, and neither can any automated check.

## What this protects, and what it does not

- Turnstile stops most automated spam reaching the form.
- Screening removes throwaway addresses, undeliverable domains and link floods.
- SPF/DMARC stop others forging mail from your domain.
- **None of it makes the site or the inbox impossible to attack**, and none of it
  can tell whether a well-formed enquiry from a real address is a genuine client
  or a time-waster. That judgement stays human.
