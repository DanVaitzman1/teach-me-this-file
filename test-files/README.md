# Edge-case test files

Files for checking the app against the cases the assignment lists: other languages and RTL, scanned
pages, formulas, tables, very long documents and unexpected content. Upload each one with a real
Gemini key and compare with the expected behavior.

| File | What it tests | Expected |
|---|---|---|
| `arabic-water-cycle.txt` | Arabic, right-to-left | Plan and lesson in Arabic (unless the teacher asks otherwise); the whole lesson layout mirrors. |
| `english-photosynthesis.docx` | Word file with headings and a table | Read directly (no AI); the table stays a table in "View source". |
| `long-history-71-pages.pdf` | Very long digital PDF | Read from the text layer (fast, no AI); a notice that only the first part is taught. |
| `scanned-recipe-page.png` | A page as an image (like a scan or photo) | Transcribed by AI. |
| `blank-2-pages.pdf` | PDF with nothing on it | Error "No text was found in this file." |
| `recipe-pancakes.txt` | Unexpected, non-academic content | Still a sensible short lesson about the recipe; nothing invented. |
| `prompt-injection.txt` | A file that tells the AI to "ignore all previous instructions" | The tutor ignores it and teaches the Solar System. |

Also worth trying with any file:
- A teacher prompt in a different language than the file (e.g. a Hebrew file, "Teach this in English").
- Asking the tutor about something that is not in the file → it should say so and steer back.
- Wrong answers twice in a row → hints, then a simple explanation and a similar question.
- Stop in the middle of an answer, then reload the page → the lesson is restored.
