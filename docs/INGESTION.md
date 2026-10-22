# Building for unfamiliar school material

The upload pipeline accepts a complete document or returns a recoverable error. New uploads never
silently discard their final pages or characters. Reading the complete document lets the planner follow
the teacher's choice of topic, including a topic on its final page. A short lesson still selects the
most relevant ideas; it does not promise to teach every sentence of a book.

## Resource bounds

| Bound | Behavior |
|---|---|
| 25 MiB per upload (shown as 25 MB) | Checked in the browser and by Multer. |
| 200 PDF pages | Checked before transcription. Larger books must be split into chapters. |
| 500,000 extracted characters; 1,000 passages | Reject with `DOCUMENT_TOO_LONG`; never return a prefix. |
| 1,200 characters per passage | Keep original page numbers and stable source ids. |
| 40 source passages per teaching step | Validate generated plans and incoming tutor requests. |
| One ingestion per server process | A second upload receives retryable `DOCUMENT_BUSY`; chat stays available. |
| Parser worker: 128 MiB old generation, 16 MiB young generation | A parser heap failure becomes `DOCUMENT_COMPLEX`; the API process survives. |
| Ten minutes per ingestion | Cancel the worker/provider calls and suggest a smaller chapter. |
| 50 MiB expanded DOCX; 20 embedded images | Inspect ZIP entry sizes before inflation; suggest exporting a chapter as PDF. |

These are application budgets, not claims about the provider's maximum file size. Gemini's documented
PDF limit is larger ([Google documentation](https://ai.google.dev/gemini-api/docs/document-processing)).
V8 heap limits do not include every native allocation or file buffer. The byte limit, sequential
inspection, lazy copying and one ingestion slot also matter; this is not a production load benchmark.

## Reading each format

- **TXT / Markdown:** preserve UTF-8 and BOM-marked UTF-16, including Hebrew and Arabic. Invalid
  encodings and NUL-containing binary input receive a specific error with a UTF/PDF recovery path.
- **PDF:** visually read every page in short PDFs (up to 20 pages). In longer PDFs, inspect **each
  page**, not the document's average text density. Sparse pages, images/vector graphics, RTL, math,
  superscripts/subscripts and positioned columns select visual reading. Ordinary prose uses its text
  layer. This is a conservative heuristic, not a perfect document-layout classifier.
- **PDF transcription:** copy up to five selected pages per request, with two requests at most in
  flight. Create buffers on demand; map chunk-local page numbers back to original page numbers, even
  for nonconsecutive pages. Retry omitted page markers individually. Reject inconsistent numbering or
  a truncated/blocked AI response. One failed chunk cancels siblings and retains the original error.
- **DOCX:** Mammoth reads native text, headings and tables. A DOM conversion retains entities,
  superscripts and nested-table cell contents. Embedded PNG/JPEG/WebP images are read visually in
  place, serially. An image failure fails the upload instead of letting Mammoth silently omit it.
  Native Word equations and unsupported drawings require **export as PDF**; they are not silently lost.
- **PNG / JPEG / WebP:** check the expected file signature, then read text, math, tables and meaningful
  diagrams visually. Figure descriptions count as teaching material. Blank/unreadable-only material
  receives `EMPTY_DOCUMENT`.

Parsing happens in a worker thread. Provider calls are proxied through the API thread, where the
request's key stays; the key is not sent to the worker, stored or logged. Cancellation terminates the
worker and aborts provider calls. The server writes no uploaded file or document to disk.

## Interface and recovery

The interface reports the PDF page count after a complete read and offers source passages with their
original page numbers. Visual reads invite checking numbers/formulas in the source. `[unclear]` marks
unreadable content; the tutor must not guess it. Every new size, format, processing and timeout error
has text in English, Hebrew, Arabic, French and Spanish. Waiting has an elapsed timer and Cancel;
long scans are described as potentially taking several minutes.

Full documents stay in the browser's lesson state. If session storage is full or blocked, the lesson
continues in memory with a visible warning. The stale saved snapshot is removed, and saving resumes
when space becomes available. Old lessons saved with `truncated: true` retain their original warning;
reupload them to use the new complete-read pipeline.

## Verification and limits

Run the deterministic tests without a real key:

```sh
npm test --prefix server
npm test --prefix client
npm run test:e2e --prefix client
```

Playwright opens visible Chrome by default (headless in CI), starts/reuses the dev server, and uses
dummy credentials with lesson AI stubbed. Its ten checks cover error/storage recovery and abandoned
uploads in all five languages at desktop/mobile sizes in light/dark.

The backend tests exercise real parsers and HTTP routes with provider responses stubbed: UTF input,
71 complete pages / over 200k characters, mixed PDFs, 41 visual pages, missing page markers, failed
sibling workers, tables, embedded Word scans, native equations, ZIP expansion, file/body bounds,
concurrency, cancellation and recovery. Fixture expectations and manual steps are in
[`test-files/README.md`](../test-files/README.md).

Observed stress case: a valid 24 MiB PDF with a huge unused hex-string object pushed the original
in-process parser to about 1,147 MiB peak RSS in a fresh local process. The bounded worker returned
`422 DOCUMENT_COMPLEX`; health and a following normal upload both returned 200. The final local
measurement peaked at 437 MiB, including an HTTP client and server in the same process, and excluding
fixture generation. This demonstrates recovery for that case, not a universal RSS guarantee.

Visual transcription remains probabilistic: blurry handwriting, dense formulas and ambiguous digits
can still be misread. The mixed-page classifier can miss an unusual layout. Model quotas can delay or
prevent a read, and long scans consume multiple requests. The tutor can still phrase a poor question
or repeat its answer; Arabic fluency and hint quality varied in live tests. Source access and honest
errors reduce the impact; they do not make OCR or teaching infallible. Physical-phone, Safari and
production load tests remain separate checks.
