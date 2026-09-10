# Profile and E.V avatar assets

## E.V identity, 9 September 2026

E.V uses an original female digital illustration created with Codex's built-in
image-generation tool at the owner's request. The brief describes a confident,
warm, calming and charming assistant. This is an illustrated AI character, not
a photograph or a likeness of OJ or a named actor.

| File | Dimensions | Bytes | Use |
| --- | --- | --- | --- |
| `ev-avatar-launcher.webp` | 128×128 | 7,184 | Decorative launcher image, rendered at 28px |
| `ev-avatar-portrait.webp` | 192×192 | 12,722 | Header identity, rendered at 36px, loaded on first open |

Both WebP files preserve alpha transparency and use the same generated portrait.
The existing Sharp dependency only downsizes and encodes the generated master;
it does not change the character. Web derivatives omit metadata. The original
PNG and full prompt are retained outside the public delivery tree. The header's
alternative text is "Illustrated avatar of E.V"; the launcher's empty alternative
text avoids repeating the adjacent Ask E.V label.

The genuine `oj-profile.webp` profile photograph used elsewhere on the portfolio
is unchanged. The following section records the earlier OJ artwork's provenance
and describes its former use.

## Historical OJ assistant artwork

Owner-supplied artistic representations of OJ Florendo, retained as historical assets and no longer used by E.V.

### Earlier published files

| File | Size | Bytes | Used by |
| --- | --- | --- | --- |
| `oj-assistant-avatar-2d.webp` | 128×128 | 4,546 | Former assistant entry control |
| `oj-assistant-avatar-3d.webp` | 192×192 | 7,580 | Former assistant panel identity |

Both are WebP with an alpha channel, derived locally from the owner-supplied
1024×1024 PNG originals using the already-declared `sharp` dependency. No
dependency was added to produce them.

## What these are, and are not

These are **artistic digital representations**, not photographs. The assistant
states this in its identity area, and the 3D portrait carries the alternative
text "3D illustrated avatar of OJ Florendo".

They are **not** a substitute for a real profile photograph. `site.profileImage`
points to the separate, genuine `oj-profile.webp` photograph used in the
navigation and contact circles. CSS clips the unchanged image to those circles.
The assistant illustrations must not replace that photograph.

## Provenance

The owner-supplied originals carry a signed C2PA (Content Credentials) manifest
in a PNG `caBX` chunk, recording:

- `claim_generator_info`: OpenAI Media Service API
- IPTC digital source type: `trainedAlgorithmicMedia` (AI-generated)
- created/converted: 2026-07-28
- signing authority: Trufo C2PA Claim Signing CA (2025)
- the turnaround sheet additionally records `c2pa.watermarked.unbound`

The originals were inspected before use. They contain **no** local filesystem
paths, **no** private name forms, **no** generation prompts or seeds, and no
owner contact address; the single email in the manifest belongs to the signing
authority's domain, not to the owner.

**The published derivatives do not carry that manifest.** Re-encoding strips all
metadata, which was verified: the derivatives contain no EXIF, ICC, XMP or IPTC
data and no C2PA markers. This is a deliberate trade — a ~25 KB provenance box
on a 4.5 KB image is disproportionate for web delivery — and the AI-generated
nature is instead disclosed in the user interface, where visitors actually see
it. The originals retain their credentials outside the repository.

No copyright registration, facial accuracy or third-party licensing is claimed
beyond what is recorded here.

## Source and reference assets (not in this repository)

The full 360 turnaround sheet (1536×1024) is a source and visual-reference asset
for possible future richer 3D work. It is deliberately **not** committed and
**not** served: it is not an interactive model, and no visitor-facing
requirement for it has been approved. An end-to-end test asserts it is never
requested.

## Updating

Regenerating or replacing these assets requires owner approval, a fresh privacy
and metadata inspection, a check that transparency and framing still read
correctly at the rendered sizes, and the normal quality gate.
