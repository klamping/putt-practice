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
npm run test:offline
npm run typecheck
npm run build
```

Playwright runs Chromium against a development server on port 4173. Unit tests
cover calculations and data validation; browser tests cover entry, history,
reload/resume, backups, storage failure, and mobile layout. `test:offline` builds
the production app and tests reopening with networking disabled, offline
backup/restore, failed caching, and updates waiting for open sessions.

## Deploy

`npm run build` produces `dist/`. Serve that directory on any HTTPS static host.
There is no backend or account. Keep a stable URL: saved data belongs to this
browser and the site's origin (protocol, hostname, and port). A different URL,
browser, or device has separate data.

### Netlify

Connect this repository to Netlify. The included `netlify.toml` sets the build
command to `npm run build`, the publish directory to `dist`, and Node to 22.
For manual deployment, build locally and upload `dist/`.

Before moving from the local IP address to Netlify, export a backup from the
old address. Open the Netlify HTTPS address and restore the file there. The new
address has its own browser storage; data does not transfer automatically.

## Offline use

1. Open the deployed HTTPS site while connected.
2. Wait for **Ready offline** in the header. This appears after the app's HTML,
   JavaScript, and styles have been cached successfully.
3. You can then reopen or reload that same address without a connection, record
   sessions, view history, and export/restore backup files. Saving is local.

If the header says **Offline setup failed**, reconnect and reload to retry.
Browser site data includes both saved sessions and the offline copy, so keep
your exported backups.

New app versions download while online and wait until all open app tabs close
before activating. They never force a reload during practice or alter session
data. Close all app tabs and reopen the site to use a downloaded update.

Offline caching is enabled only in production builds. `npm run dev` remains an
online development server. On phones, the plain-HTTP local IP address cannot
register an offline worker; use the Netlify HTTPS address. Localhost is supported
for production-build testing on your computer. No home-screen installation is
required.

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
