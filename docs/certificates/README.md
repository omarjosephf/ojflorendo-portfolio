# Published certificate documents — publication record

This directory records the certificate documents published at
`public/documents/certificates/`. It follows the same pattern as `docs/cv/`.

Unlike the public CV, these files are **not** edited public-safe derivatives. They
are the issuers' own documents, republished byte-for-byte. They are evidence, and
altering, re-rendering or compressing them would undermine the reason for
publishing them at all.

## Owner decision

On **31 August 2026** the owner decided to publish all six certificates
unredacted, accepting that they display his legal name, "for transparency and
trust with my future clients/audience".

The previous policy linked only to issuer verification pages in order to keep
documents bearing the legal name off this domain. That policy left three of six
credentials with no evidence at all, which worked against the transparency the
Credentials section exists to provide.

Engineering Handbook §6.1 permits this: issuer records must be preserved exactly
as issued, and public credential copy may state that a credential displays a legal
name. The Credentials section discloses the name difference in copy.

## Published files

| Published path | Credential | Issuer |
| --- | --- | --- |
| `pcep-python-institute-2025.pdf` | PCEP – Certified Entry-Level Python Programmer | Python Institute |
| `business-intelligence-lpc-2025.pdf` | Business Intelligence: Data Analysis and Reporting Techniques | London Premier Centre |
| `ux-ui-designer-bootcamp-school-of-ux-design-2023.pdf` | Certified UX/UI Designer Bootcamp | School of UX Design, UK |
| `analyze-data-with-excel-codecademy-2025.pdf` | Analyze Data with Microsoft Excel | Codecademy |
| `prompt-engineering-dubai-future-foundation-2025.pdf` | One Million Prompters: Prompt Engineering | Dubai Future Foundation |
| `art-of-storytelling-iese-2025.pdf` | The Art of Storytelling | IESE Business School |

Source files came from the owner's own records. Filenames were normalised to
lowercase, hyphenated, URL-safe names; the file contents are unchanged.

## Public-safety statement

**Scope of what has been verified, and by what means.**

A programmatic scan on 31 August 2026 found **no phone number, email address,
date of birth or identification number** in any extractable text. One UK postcode,
`E14 5LB`, appears in the UX/UI bootcamp certificate and is the **issuer's**
London address, not the owner's.

**Four of the six documents have no text layer** and are image scans:
Business Intelligence, Analyze Data with Excel, One Million Prompters, and — in
part — the remaining scanned pages. Only the PCEP and UX/UI bootcamp documents
yield extractable text. A programmatic scan therefore cannot clear the image-only
files, and PDF page rendering is not available on the maintenance machine.

**Visual review completed: 31 August 2026 by the owner.** He opened all six
documents and confirmed each is the correct certificate and is matched to the
correct credential. This closes the gap the programmatic scan could not reach.

The file now published as `analyze-data-with-excel-codecademy-2025.pdf` came from
a source file named `OmarJoseph's profile _ Codecademy.pdf`. That name suggested a
saved profile page rather than a certificate; the owner confirmed on 31 August
2026 that it is the correct document. The original filename is recorded here only
so the question is not raised again from the name alone.

These documents **do** display the owner's legal name. That is intended.

## Review and update workflow

1. Obtain the document from the issuer; never reconstruct one.
2. Open and visually inspect every page at full size.
3. Confirm it contains no phone number, street address, date of birth,
   identification number, or third-party personal data.
4. Copy it into `public/documents/certificates/` under a lowercase, hyphenated,
   URL-safe name. Do not compress or re-render it.
5. Add `certificatePath` to the matching entry in `src/data/education.ts`.
6. Update the file table and the hashes below.
7. Run the repository quality gate and obtain explicit publication approval.

## Current SHA-256

- `analyze-data-with-excel-codecademy-2025.pdf`: `b19bbbcdd2b2d035708de8e544d7278f6db44e5fecc44be68971522add3f03f2`
- `art-of-storytelling-iese-2025.pdf`: `c9b995487efaf2f19ea21792995694c28c0a23cc362e776824f89d24ed40c924`
- `business-intelligence-lpc-2025.pdf`: `2207d5c2fa3b1ee7a4478661bb6a962d9338407793290e8ae8f11edbbf0751e0`
- `pcep-python-institute-2025.pdf`: `21f1188f9c2555ae31f1d7c3bb0d3a5dee14fd04aa140d7d4ef18d6f298ad2ca`
- `prompt-engineering-dubai-future-foundation-2025.pdf`: `28677da60be43f6447b05e4ca69ad8d3a1309c0777fc3180c3205d29da37ec08`
- `ux-ui-designer-bootcamp-school-of-ux-design-2023.pdf`: `f7e242d3aeaa95714b24f9bdddd7463d4beb2def4a9adf5a8782b618fb24d666`

Recorded: **31 August 2026**
