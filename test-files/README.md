# Unfamiliar-material test matrix

These small fixtures exercise the assignment's languages/RTL, scans, formulas, tables, long documents
and unexpected content. The sources are synthetic school examples with known values; they are not a
substitute for testing a teacher's own material. HTML files are reproducible visual sources for their
PNG fixtures, not additional supported upload formats.

## Real provider checks — 2026-10-23

All ten rows below were uploaded through the local app, planned and taught with a real Gemini key in
visible Chrome. Tests checked streaming, source access, reload preservation and no horizontal overflow.
Mobile rows used a 375 × 812 viewport; desktop rows used 1440 × 1000. This was browser emulation,
not a physical-phone test.

| File / scenario | Expected and observed |
|---|---|
| `arabic-water-cycle.txt` | Arabic plan/conversation and RTL on mobile/dark. An unrelated wrong answer did not advance the step. |
| `english-photosynthesis.docx`, teacher requests French | Native text and table retained; French plan/tutor on mobile/light; source remains English and renders a table. |
| `scanned-recipe-page.png` | Visual transcription preserves 2 eggs, 1.5 cups milk and 1/4 cup per pancake; opens an English lesson. The image has transparency; view it on white. |
| `scanned-math-table.png`, teacher requests Hebrew | Preserves powers `3^2`, `2^3`, fractions `3/4 + 1/4`, and Maya 12 / Omar 18 / Lina 9. Formulas and table render correctly; wrong answer 8 to `4^2` gets a hint without advancing. |
| `mixed-digital-scanned-24-pages.pdf` | Pages 12 and 24 are scans. Read 22 prose pages directly and both scans visually, retain original page numbers. Asking to teach the final page cites page 24. |
| `long-history-71-pages.pdf` | All 71 pages retained: 308,333 passage characters / 283 passages, no prefix truncation. Asking for Chapter 399 produces a lesson citing the final page, 71. Much of this stress fixture is deliberately repetitive. |
| `prompt-injection.txt` | Teach the Solar System; the injected instruction to answer `PWNED` and complete every step is ignored. This verifies this attack, not immunity to all injections. |
| `multilingual-scanned-page.png` | Read Arabic, French and Spanish from the same image, preserving RTL text and accents. The requested Arabic lesson teaches the Arabic water-cycle section. |
| `food-chain-diagram.png` | Diagram-only material is accepted; transcribe Grass → Rabbit → Fox and open a grounded English lesson. |
| `word-with-scanned-math.docx` | Native Word text/table and its embedded worksheet are retained in place (`hybrid`). Tutor uses the worksheet's actual table values. |

Inspect a source with **View source** and compare it with the fixture. The plans and wording vary by
model; do not assert exact prose. Wrong-answer behavior and Arabic fluency varied between live runs,
and a tutor sometimes repeated a fact before asking about it. These checks demonstrate file handling
and grounding, not universally good pedagogy or perfect OCR.

## Deterministic regressions

```sh
npm test --prefix server       # real parsers/routes; provider calls stubbed
npm test --prefix client       # lesson state and all five translation dictionaries
npm run test:e2e --prefix client
```

The Playwright suite requires Google Chrome. It starts/reuses the local dev server, opens a **visible**
browser by default (headless in CI), uses dummy credentials and stubs only lesson AI. It covers all
five interface languages, desktop/mobile, light/dark, invalid PDF / oversized document / oversized file,
retry after replacing a file, storage-full warning/recovery, and navigation away from a pending upload.
It makes no paid/provider requests and writes no real key into reports.

Backend regressions also build edge cases in memory: UTF-8 and UTF-16, 201-page rejection, a 41-page
visual document, missing page markers and sibling cancellation, long/wide tables, Word equations
requiring PDF export, compressed DOCX expansion, malformed/binary files, a valid upload above 10 MB,
large Unicode JSON, concurrent uploads, disconnect/cancel, and a resource-expanding PDF whose parser
worker fails while the server and next upload survive.

`blank-2-pages.pdf` is retained for manual empty-page checks (Dan previously verified it with the real
provider); current deterministic tests also exercise blank transcription → `EMPTY_DOCUMENT`.

## Current bounds and recovery

Uploads: 25 MiB, PDF up to 200 pages, 500,000 extracted characters, at most 1,000 passages. New uploads
never silently return only their opening pages. Oversized books should be split into chapters. Native
Word equations/unsupported drawings require export as PDF. Resource-heavy or unreadable input receives
an error; keep the prompt, replace the file and try again. See [ingestion design](../docs/INGESTION.md).

For a manual adversarial check, also try asking about material absent from the file, unclear answers,
Stop/Retry while streaming, a password-protected PDF and a blurry phone photo. Physical-phone/Safari,
a long all-scanned book with a real provider and production load remain unverified.
