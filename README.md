# Putting practice

A personal mobile putting log. Three batches of 8 putts at each of 20, 25, and
30 feet. Tap the misses after each batch. Results show makes and percentages
per distance; history tracks completed sessions continuously.

## Run locally

Requires Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To use your phone on the same network,
open the printed network URL. Plain HTTP works for local network testing;
use HTTPS for deployed sites.

## Checks

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run typecheck
npm run build
```

Playwright runs Chromium against a development server on port 4173. Unit tests
cover calculations and data validation; browser tests cover entry, history,
reload/resume, backups, storage failure, and mobile layout.

## Deploy

`npm run build` produces `dist/`. Serve that directory on any HTTPS static host.
There is no backend or account. Keep a stable URL: saved data belongs to this
browser and the site's origin (protocol, hostname, and port). A different URL,
browser, or device has separate data. The app does not provide offline caching
or installable-app support.

## Save and restore data

Each batch and undo is automatically saved in browser localStorage. Reloading
resumes the unfinished session. If a save fails, keep the page open, retry, or
export a backup to preserve current in-memory progress.

Use one practice tab at a time. If another tab has changed the saved data,
stale saves are blocked. Export any unsaved progress, then choose **Load saved
data** to use the newer saved copy.

In **Backup**, choose **Export backup** to download all sessions, including the
unfinished one. Keep backups outside browser storage, such as in your files or
cloud drive. Clearing site data or losing the device can remove local history.

To restore, choose the JSON file, review the counts, then confirm **Replace data
and restore**. Restore replaces current records; it does not merge them. Export
the current data first if you want to retain it. Invalid files are rejected
without replacing data. Unreadable saved data can be downloaded in its original
form before you reset or restore a valid backup.
