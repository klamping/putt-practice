# Putting practice design progress

- [x] Explore project context: empty Git repository, no existing app or commits.
- [x] Clarify entry flow and storage requirements.
- [x] Compare approaches and recommend one: three interactive prototypes; A selected.
- [x] Present design sections for approval: user approved first-version summary.
- [x] Write and commit design specification.
- [x] Self-review specification: checked scope, calculations, restore behavior, and placeholders.
- [ ] Obtain user review of written specification.
- [ ] Create implementation plan using writing-plans.

Offer the optional visual companion if a visual question would benefit from it.

## Initial understanding

Personal mobile website without marketing text. Track putting practice in a
continuous history at 20, 25, and 30 feet. Season management is deferred.
Entry should avoid typing.

## Selected entry flow

User chose prototype A: tap the number of misses after each batch, with undo.
User revised batches to 8 and the total to 24, interpreted as 24 per distance:
three batches of 8 at each distance, 72 putts per session.
Updated interactive prototype: distance-percentages.html in the companion session.

## Storage and results

User chose device-local storage with backup. Provide backup export and restore.
Finished sessions show make percentages for each distance alongside made/24,
as well as the overall percentage. Prototype rounds percentages to whole numbers.

## Approved first-version summary

Practice with automatic progress saving, per-distance and overall results,
dated history with percentages over time, and local backup export/restore.
Written specification: docs/superpowers/specs/2026-11-07-putting-practice-design.md.
