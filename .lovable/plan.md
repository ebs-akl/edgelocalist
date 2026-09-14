# Remove “Cutco” from rep-facing copy

## Scope
- Replace only the specified human-readable references in metadata, FAQ/user guide content, profile prompts, contact views, CSV guidance, SMS copy, and trial email step 2.
- Preserve all legal/trademark/non-affiliation language, including every occurrence in `Legal.tsx`, the footer, and the trial-email trademark footer.
- Preserve code identifiers, database fields, comments tied to parsing/data logic, CSV matching logic, and other non-user-facing implementation names.
- Do not change application logic, layout, data models, or publish the app.

## Verification
- Run a case-insensitive repository-wide search for `cutco`.
- Review every remaining occurrence and report its file, line, and preservation reason.
- Check the preview build diagnostics after the copy edits.

## Assumption
- The explicit “do not touch `Legal.tsx`” instruction takes priority, so its product description remains unchanged even though it contains rep-facing wording.
