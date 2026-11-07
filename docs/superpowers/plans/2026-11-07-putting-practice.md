# Putting Practice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile personal putting log with batch entry, continuous history, and local backup/restore.

**Architecture:** Static Vite/TypeScript application with semantic DOM views and no UI framework. Pure session calculations feed a small app controller; a storage boundary validates versioned data and owns persistence. Views receive data and callbacks rather than writing storage themselves.

**Tech Stack:** TypeScript, Vite, CSS, localStorage, Vitest, Playwright; npm with a committed lockfile.

**Spec:** `docs/superpowers/specs/2026-11-07-putting-practice-design.md`

## Global Constraints

- “Each session contains 24 putts at each of 20, 25, and 30 feet: three batches of 8 per distance, 72 putts total.”
- “Work through 20 ft, then 25 ft, then 30 ft.”
- “Only one unfinished session exists at a time.”
- “Whole-number percentages, rounded from the underlying counts.”
- “Use a versioned JSON document in browser localStorage.”
- “No text entry is needed during practice.”
- “Navigation is limited to Practice, History, and Backup.”
- “Use at least 48 px touch targets, visible keyboard focus, semantic buttons, and live status announcements.”
- No marketing text, sample data, season management, accounts, sync, configurable practice settings, or offline/installable app support.

## Review Focus

- Undoing an older result while another session is unfinished must not create two drafts; historic results are read-only (Task 3).
- Browser storage denial or quota errors must leave current practice recoverable in memory and exportable (Tasks 2–4).
- Backup timestamps and IDs containing hostile strings must be rejected or rendered as text, never markup (Tasks 2 and 4).
- Starting again after completion and reloading must not duplicate the finished session (Task 3).
- Local timezone display and narrow screens must not mislabel dates or hide entry/restore controls (Tasks 3–4).

## File map

- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`: tooling and static entry point.
- `src/model.ts`, `src/model.test.ts`: session types, transitions, statistics.
- `src/storage.ts`, `src/storage.test.ts`: schema validation, local persistence, backup codec.
- `src/app.ts`, `src/main.ts`: state controller, navigation, initialization.
- `src/views/practice.ts`, `src/views/results.ts`: entry and results DOM.
- `src/views/history.ts`, `src/views/backup.ts`: continuous history and backup UI.
- `src/ui.ts`, `src/styles.css`: safe shared DOM helpers and mobile styles.
- `playwright.config.ts`, `tests/practice.spec.ts`, `tests/backup.spec.ts`: browser verification.
- `README.md`: run/build/deploy instructions and local data/backup usage.
- `.gitignore`: retain existing `.superpowers/` exclusion; add dependency/build/test artifacts.

## Task 1: Session model and calculations

**Files:** Create tooling files, `src/model.ts`, `src/model.test.ts`; update `.gitignore`.

**Interfaces produced:**

```ts
type Distance = 20 | 25 | 30;
interface Session { id: string; startedAt: string; misses: number[] }
interface Dataset { version: 1; sessions: Session[] }
interface Score { made: number; attempts: number; percent: number | null }
interface SessionSummary { total: Score; distances: Record<Distance, Score> }
createSession(id: string, startedAt: string): Session
recordBatch(session: Session, misses: number): Session
undoBatch(session: Session): Session
getProgress(session: Session): { complete: boolean; distance: Distance; batch: number; putts: number }
summarize(session: Session): SessionSummary
aggregate(sessions: Session[]): SessionSummary
```

Transitions are immutable. Invalid misses and recording after completion throw; undo on empty is a no-op. Summary attempts reflect recorded batches. Aggregate excludes drafts. Empty scores have `percent: null`, rendered as an em dash. Completed progress uses distance 30/batch 3 with `complete: true`.

- [ ] Set up npm scripts `dev`, `build` (`tsc --noEmit && vite build`), `typecheck`, `test` (`vitest run`), and `test:e2e`. Install compatible current stable dependencies, record actual Node requirement in README later, and commit the lockfile. Configure Vitest to include only `src/**/*.test.ts`.
- [ ] Write model tests with these exact assertions: three zero-miss batches produce 24 attempts/24 makes at 20 ft and advance to 25 ft/batch 1; nine one-miss batches produce 63/72 and 88% overall, 21/24 and 88% at each distance; undo at batch 3 returns to 20 ft/batch 3; undo after completion returns to 30 ft/batch 3 with 64 attempts. Assert zero/perfect sessions yield 0%/100%, `-1`, `9`, `1.5`, and `NaN` throw, and a tenth batch throws. Assert inputs remain unchanged. For aggregation, combine 22/24 and 21/24 at 20 ft: 43/48 rounds to 90%; ignore an unfinished perfect batch.
- [ ] Run `npm test -- src/model.test.ts`; confirm missing model implementation fails.
- [ ] Implement the listed types and functions in `src/model.ts`, using fixed distance/batch constants and count-based percentages.
- [ ] Run `npm test -- src/model.test.ts` and `npm run typecheck`; require both to pass.
- [ ] Commit tooling and model files with `feat: add putting session model`.

## Task 2: Durable local data and validated backup codec

**Files:** Create `src/storage.ts`, `src/storage.test.ts`.

**Consumes:** Task 1 `Dataset` and `Session`.

**Interfaces produced:**

```ts
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
type LoadResult =
  | { kind: 'ok'; data: Dataset }
  | { kind: 'corrupt'; raw: string; message: string }
  | { kind: 'unavailable'; message: string };
const STORAGE_KEY = 'putt-practice:v1';
validateDataset(value: unknown): Dataset // throws readable Error
loadDataset(storage: StoragePort): LoadResult
saveDataset(storage: StoragePort, data: Dataset): void // throws on failure
exportBackup(data: Dataset, exportedAt: string): string
parseBackup(text: string): Dataset // validates version and exportedAt
```

Backup shape is `{ version: 1, exportedAt: string, sessions: Session[] }`. Validate dates as real canonical ISO UTC strings using date parse plus round-trip equality; app dates come from `toISOString()`. IDs must be nonempty strings and unique. Return newly constructed validated objects rather than trusting parsed references. Missing storage is an empty valid dataset. Save with a single `setItem` call after validation; never clear existing data first.

- [ ] Write tests asserting a dataset containing one complete session and one draft round-trips through export/parse unchanged. Parameterize rejection of invalid JSON, null root, unknown version, missing arrays, duplicate/empty IDs, invalid or impossible dates, extra batches, invalid miss counts, and two drafts. Assert malformed timestamp HTML is rejected and an ID containing markup remains inert string data. Assert absent storage returns an empty dataset, corrupt storage returns its exact raw text, and read denial returns unavailable. Use a storage fake whose `setItem` throws to assert previous stored text remains unchanged.
- [ ] Run `npm test -- src/storage.test.ts`; confirm failure before implementation.
- [ ] Implement storage interfaces and readable validation errors in `src/storage.ts`; keep browser downloads and file selection out of this module.
- [ ] Run `npm test -- src/storage.test.ts` and `npm run typecheck`; require pass.
- [ ] Commit with `feat: persist sessions and validate backups`.

## Task 3: Mobile practice, results, and continuous history

**Files:** Create `index.html`, `src/main.ts`, `src/app.ts`, `src/ui.ts`, `src/styles.css`, practice/results/history views, `playwright.config.ts`, `tests/practice.spec.ts`.

**Consumes:** Model and storage interfaces from Tasks 1–2.

**Interfaces produced:**

```ts
interface PracticeActions { start(): void; record(misses: number): void; undo(): void }
renderPractice(session: Session | null, actions: PracticeActions): HTMLElement
renderResults(session: Session, actions: { undo?: () => void; start: () => void }): HTMLElement
renderHistory(sessions: Session[], actions: { open(id: string): void; start(): void }): HTMLElement
mountApp(root: HTMLElement, storage: StoragePort): void
downloadText(filename: string, text: string): void // in ui.ts; JSON Blob, revoke URL
```

Controller owns dataset, selected view/result, corruption state, and unsaved error. Practice mutations update memory then attempt save; retry saves the latest snapshot. Start resumes the existing draft or creates one with `crypto.randomUUID()` and current ISO timestamp. Only the just-finished active session offers undo; opening history results is read-only. After reload choose the draft, otherwise show start-practice. Navigation never creates a new session implicitly.

- [ ] Configure Playwright with Chromium, a 390×844 viewport, and a Vite web server; add tests that start from empty localStorage. Assert 0–8 buttons exist; enter sample misses `[0,1,1,2,3,3,4,4,4]`, verifying distance transitions, reload/resume after two batches, and final 22/24 (92%), 16/24 (67%), 12/24 (50%), total 50/72 (69%). Assert undo returns to the last batch and re-entry does not duplicate history. Start a second session, reload, open the old result, and assert no Undo control there and exactly one draft in storage. Assert history displays date and percentages and ignores draft statistics.
- [ ] Add browser assertions for storage-write failure: install a throwing `Storage.prototype.setItem`, record a batch, verify visible unsaved status and preserved current progress, restore storage behavior, and retry successfully. Set timezone to `America/Los_Angeles` with a session at `2026-11-08T01:00:00.000Z`; assert history displays November 7 locally. At 320 px width assert document width does not exceed viewport and miss buttons are at least 48×48 px.
- [ ] Run `npm run test:e2e -- tests/practice.spec.ts`; confirm tests fail against the absent UI.
- [ ] Implement the app shell and practice/results views with DOM creation and `textContent` for data, never backup-sourced `innerHTML`. Include Practice/History/Backup navigation, green 3×3 miss grid, distance and batch progress, keyboard focus, live save/entry status, retry, and correct resume/results routing. Guard localStorage getter exceptions at startup. Reserve Backup navigation for Task 4.
- [ ] Implement history newest first, per-distance/all-time scores, selectable results, and three labeled chronological SVG trend lines. Pair the visual trend with the same values in dated history rows; empty history links to practice. Display local dates with `Intl.DateTimeFormat`.
- [ ] Run `npm test`, `npm run test:e2e -- tests/practice.spec.ts`, `npm run typecheck`, and `npm run build`; require all pass.
- [ ] Commit with `feat: add mobile practice and continuous history`.

## Task 4: Backup UI, recovery, and release verification

**Files:** Create `src/views/backup.ts`, `tests/backup.spec.ts`, `README.md`; update `src/app.ts` and styles as needed.

**Consumes:** Dataset, storage codec, and `downloadText` from earlier tasks.

**Interfaces produced:**

```ts
interface BackupActions {
  export(): void;
  preview(file: File): Promise<void>;
  confirmRestore(): void;
  cancelRestore(): void;
  downloadRaw(): void;
  reset(): void;
}
interface BackupViewState {
  completedCount: number; draftCount: number;
  pending: Dataset | null; error: string | null;
  recovery: boolean; rawAvailable: boolean;
}
renderBackup(state: BackupViewState, actions: BackupActions): HTMLElement
```

Controller reads files as text, parses into a pending validated dataset, and shows completed/draft counts before confirmation. Confirm writes pending data first; only success swaps current state. Cancel drops pending data. Export always uses the current in-memory dataset, including unsaved practice. Use filenames `putt-practice-YYYY-MM-DD.json`. Corruption blocks practice writes until confirmed reset or valid restore; raw download preserves original contents. Storage unavailability shows an explicit persistence error while allowing in-memory practice and export. A confirmed reset writes an empty valid dataset before leaving recovery mode.

- [ ] Write browser tests for exported JSON containing complete/draft records, restore confirmation and cancellation, valid round-trip into cleared storage, malformed backup retaining existing data, failed restore retaining current memory and stored data, and unsupported versions. Inject corrupt localStorage, assert no automatic overwrite, download raw contents, then verify confirmed reset and valid restore recovery in separate tests. Upload a backup whose ID contains `<img src=x onerror=alert(1)>` and assert no injected element/dialog appears. Verify export still contains the latest entry following a simulated write failure.
- [ ] Run `npm run test:e2e -- tests/backup.spec.ts`; confirm failure before backup UI implementation.
- [ ] Implement backup view, file selection, download, confirmation/cancel, restore ordering, raw recovery download, and confirmed reset. Reset file input after processing so the same filename can be selected again. Ensure old error state clears after successful retry/restore and no restored result becomes an editable historic session.
- [ ] Run `npm run test:e2e -- tests/backup.spec.ts`; require pass.
- [ ] Write README with actual Node requirement, `npm ci`, dev/test/build commands, static `dist/` deployment, stable-origin local storage behavior, and export/restore replacement instructions. State backup files should be retained outside browser storage. Do not imply offline support.
- [ ] Run `npm test`, `npm run test:e2e`, `npm run typecheck`, `npm run build`, and `git diff --check`; require pass. Inspect the app at 320 px and desktop widths, keyboard navigation, empty history, and one completed session. Record actual checks and any environment blockers rather than inferring browser success from unit tests.
- [ ] Commit with `feat: add backup restore and recovery`.

## Plan self-review

- Spec coverage: Tasks 1/3 cover entry, undo, summaries, resume, history, trends, and mobile accessibility; Tasks 2/4 cover storage, validation, backups, and error recovery; Task 4 covers build/deployment documentation.
- Interface review: all views consume the same Session/Dataset types; only the controller mutates app state and invokes storage. Derived statistics remain unpersisted.
- Failure review: all five Review Focus items have explicit assertions in their owning tasks.
- Scope review: four testable deliverables, no seasons or backend; prototype files remain exploratory reference only.
