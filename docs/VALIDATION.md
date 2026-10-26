# Verification

Completed 25 October 2026, including a fresh build and browser pass after workspace recovery.

| Check | Result |
| --- | --- |
| Production build and TypeScript | Passed |
| Configuration tests | Passed: pending/malformed/zero/wrong-chain CA, exact case-preserving destination, HTTPS-only links |
| Export validation | Passed: ten unique chapters/scenes and 24 local resource paths |
| Image integrity | All 30 website images decode and match their exported bytes |
| Fonts | Four local WOFF files decode; font licenses included |
| Logo / banner | Transparent alpha outside emblem; exact 1671 × 557 banner, 3:1 |
| Desktop | Approved dark hero and chapter presentation reviewed in Chrome |
| Phone | 390px and 320px iframe widths checked; title/document fit, readable chapter composition |
| Tablet | 768px iframe checked; both hero sisters remain visible, no horizontal document overflow |
| Viewer | Opens, advances to next scene, resets scroll, closes with Escape, restores opener focus |
| Narrow viewer | Opens without horizontal overflow; full art and expanded story remain available |
| Download | Actual full-resolution chapter download verified against packaged image bytes |
| Atmosphere | Rain on/off and motion preference controls checked; audio starts off |
| Unknown CA | Copy and buy controls disabled; no active trading destination |
| Archive | CRC checked and per-file SHA256SUMS supplied |

Narrative sections target approximately 70% image emphasis and 30% concise live text, not a pixel-exact ratio at every width. Narrow screens use short captions and safe 4:3 crops; each viewer contains full prose and uncropped artwork.

The final browser checks use the static production export. Narrow checks use iframe widths, not physical devices. Safari/iOS hardware, local Cursor development, configured live-CA flows, wallet transactions and remote GitHub deployment were not independently tested. The supplied export is for a domain root; the Pages workflow rebuilds for the repository base path. No public deployment was performed.

Unknown contract, official links, supply, tax and launch details remain pending. The source was restored following workspace cleanup using the saved approved artwork, then rebuilt and verified again.

## Archive repair — 26 October 2026

The previous download was incomplete. Its 150 source-file checksums still matched the intact working folder. The replacement uses ordinary ZIP entries without compression, encryption or ZIP64, and is written atomically after all archive bytes are assembled. A full extraction, all extracted-file hashes and an independent Info-ZIP test are checked before delivery. This repair changes packaging and extraction instructions; the site and artwork are preserved.
