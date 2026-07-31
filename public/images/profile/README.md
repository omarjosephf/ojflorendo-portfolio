# Assistant avatar assets

Owner-supplied artistic representations of OJ Florendo, used only by OJ Assistant.

## Published files

| File | Size | Bytes | Used by |
| --- | --- | --- | --- |
| `oj-assistant-avatar-2d.webp` | 128×128 | 4,546 | Assistant entry control, rendered at 28px |
| `oj-assistant-avatar-3d.webp` | 192×192 | 7,580 | Assistant panel identity, rendered at 40px, loaded on open |

Both are WebP with an alpha channel, derived locally from the owner-supplied
1024×1024 PNG originals using the already-declared `sharp` dependency. No
dependency was added to produce them.

## What these are, and are not

These are **artistic digital representations**, not photographs. The assistant
states this in its identity area, and the 3D portrait carries the alternative
text "3D illustrated avatar of OJ Florendo".

They are **not** a substitute for a real profile photograph. `site.profileImage`
remains unset on purpose: the hero profile slot is reserved for a genuine
photograph, and these assets must not silently fill it.

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
