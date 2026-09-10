# Profile and E.V avatar assets

## OJ hero portrait, 10 September 2026

The owner selected this photorealistic digital portrait, generated with Codex's
built-in image-generation tool using owner-supplied reference photographs.
It is an AI-generated representation, not an original camera photograph.
The approved face and image texture are preserved. At the owner's explicit
request, local non-generative segmentation adds an alpha channel to the original
master. All original RGB pixels are unchanged; no face or clothing is regenerated.
CSS fades the lower body into the page background. The hero has descriptive alternative
text and no visible image-production caption, as requested by the owner.

| File | Dimensions | Bytes | Use |
| --- | --- | --- | --- |
| `oj-hero-600.webp` | 600×750 | 80,186 | Small-screen hero |
| `oj-hero-1000.webp` | 1000×1250 | 164,124 | Large-screen hero |

Sharp only resizes and encodes the transparent master at WebP quality 95,
preserving its alpha channel. These derivatives omit metadata. The original
generated image, transparent master, reference photographs and prompt remain
outside the public repository. The older `oj-profile.webp` photograph has been
retired from the public assets and its navigation and contact circles removed.
`site.profileImage` is now null. E.V's separate illustrated identity is unchanged.

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

The following section records the earlier OJ artwork's provenance and former use.

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

These historical assets are **artistic digital representations**, not
photographs. Their former assistant identity area described them accordingly.
They are no longer rendered by the assistant or used for the owner's profile.

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
nature was disclosed in their former user interface. Their provenance remains
recorded here, and the originals retain their credentials outside the repository.

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
