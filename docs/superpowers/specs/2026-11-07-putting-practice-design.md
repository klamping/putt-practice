# Putting practice — first version

## Goal and approved scope

A personal, mobile-first website for recording putting practice with minimal
phone interaction and no marketing text. Use one continuous, dated history;
season management is out of scope for this version.

Each session contains 24 putts at each of 20, 25, and 30 feet: three batches of
8 per distance, 72 putts total. The user selected prototype A: tap the number of
misses after each batch. Data stays in this browser on this device, with backup
export and restore.

## Practice flow

- Start a session with the current local date and time recorded automatically.
- Work through 20 ft, then 25 ft, then 30 ft.
- Show the active distance, batch number (1–3), and total session progress.
- Display nine large buttons labeled 0–8 for misses. One tap records a batch
  and advances; makes equal 8 minus misses.
- Undo removes the most recent batch and returns to its entry position,
  including across distance boundaries and from the finished-session screen.
- Save progress after every entry or undo. Reloading resumes an unfinished
  session. Only one unfinished session exists at a time.
- The ninth batch completes the session and opens results. Starting another
  session creates a new record while retaining the completed session.
- If saving fails, keep the current state in memory and show a visible error
  explaining that progress has not been saved, with retry available.

## Results and history

The finished-session screen shows:

- Each distance's makes out of 24 and make percentage.
- Total makes out of 72 and overall make percentage.
- Whole-number percentages, rounded from the underlying counts.

History lists completed sessions newest first, showing dates and the three
distance percentages. Selecting a session opens its results. A compact trend
view shows each distance's percentages chronologically; accessible labels or
the history rows expose the same values without relying on color alone.

History includes an all-time summary per distance. Aggregate percentages use
total makes divided by total attempts, not averages of rounded percentages.
Unfinished sessions are excluded from history statistics. Empty history gives
a direct action to start practicing.

## Local storage and backup

Use a versioned JSON document in browser localStorage. The expected personal
dataset is small, and synchronous persistence keeps this implementation simple.
No account or remote data service is needed. Data belongs to the browser and
site origin where the app is used.

Export downloads a dated JSON backup containing all completed sessions and any
unfinished session, plus a schema version and export timestamp. Restore uses a
file picker, validates the entire file before changing data, and presents a
record-count summary. Explicit confirmation replaces the current dataset;
cancel leaves it untouched. Replacing rather than merging avoids duplicate
sessions and ambiguous conflicts in this first version.

Reject unsupported versions, malformed records, duplicate IDs, invalid dates,
more than nine batches per session, miss counts outside integer 0–8, and more
than one unfinished session. Report a useful error without modifying existing
data. A failed storage write during restore must preserve the previous stored
dataset. A corrupt stored document must not be silently overwritten; offer a
download of the raw stored data and a confirmed reset or valid-backup restore.

## Data model and calculations

Stored root: schema version and session array. Each session has a stable ID,
ISO start timestamp, and an ordered array of batch miss counts. Completion is
derived from having nine batches; distance and batch number are derived from
array position. Derived makes, percentages, and summaries are not persisted.

The first three batches belong to 20 ft, the next three to 25 ft, and the last
three to 30 ft. This keeps undo and backup validation straightforward.

## Architecture

Use a small static application built with Vite and TypeScript, plain HTML/CSS,
and no UI framework. Deploy the build to a static host with a stable origin.

Separate responsibilities into focused modules:

- Session model: progression, undo, counts, and percentage calculations.
- Storage: versioned persistence and validated backup export/restore.
- Practice and results views: touch-first entry, summary, and resume behavior.
- History view: chronological results, trends, and aggregate statistics.
- App shell: navigation, shared state, and error reporting.

An entry action updates session state, persists the new snapshot, then renders
the appropriate view with save status. Restore validates and persists before
replacing active app state. User-provided backup contents are rendered as text,
never interpreted as HTML.

## Mobile interface

Follow the selected prototype: muted green palette, prominent distance, a 3×3
miss-count grid, progress indicator, and a reachable Undo action. Use at least
48 px touch targets, visible keyboard focus, semantic buttons, and live status
announcements. Layout must fit narrow mobile screens without horizontal scroll.
No text entry is needed during practice. Navigation is limited to Practice,
History, and Backup. Prototype sample data is not included in the real app.

## Verification

Unit tests cover progression through all nine batches, distance boundaries,
undo, zero/perfect/mixed results, aggregate percentages, backup validation,
and persistence failures. Browser checks cover a complete session, reload and
resume, completed-session history, backup round-trip, invalid restore without
data loss, and mobile layout. Run TypeScript checking and a production build.

## Deferred

Season management, accounts, device sync, configurable distances or batch sizes,
and installable/offline app support are outside the first-version scope.
