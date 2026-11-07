import { createSession, recordBatch, undoBatch, type Dataset, type Session } from './model';
import { loadDataset, saveDataset, exportBackup, parseBackup, type StoragePort } from './storage';
import { button, el, downloadText } from './ui';
import { renderPractice } from './views/practice';
import { renderResults } from './views/results';
import { renderHistory } from './views/history';
import { renderBackup, type BackupActions } from './views/backup';

export function mountApp(root: HTMLElement, storage: StoragePort): void {
  const loaded = loadDataset(storage);
  let data: Dataset = loaded.kind === 'ok' ? loaded.data : { version: 1, sessions: [] };
  let recovery = loaded.kind === 'corrupt';
  let raw = loaded.kind === 'corrupt' ? loaded.raw : null;
  let pending: Dataset | null = null;
  let backupError: string | null = null;
  let previewSequence = 0;
  let error: string | null = loaded.kind === 'ok' ? null : loaded.message;
  let view: 'Practice' | 'History' | 'Backup' = recovery ? 'Backup' : 'Practice';
  let activeId = data.sessions.find(s => s.misses.length < 9)?.id ?? null;
  let resultId: string | null = null;
  let editableResult = false;
  const main = el('main');
  const live = el('div', 'sr-only'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
  root.append(live);
  function replaceData(next: Dataset) {
    try { saveDataset(storage, next); }
    catch { backupError = 'Restore failed. Existing data has not been replaced. Free some device storage and try again.'; render(); return; }
    data = next; pending = null; backupError = null; error = null; recovery = false; raw = null;
    activeId = data.sessions.find(s => s.misses.length < 9)?.id ?? null;
    resultId = null; editableResult = false; view = 'Backup';
    live.textContent = 'Data restored on this device.'; render();
  }
  const backupActions: BackupActions = {
    export() { downloadText(`putt-practice-${new Date().toISOString().slice(0, 10)}.json`, exportBackup(data, new Date().toISOString())); },
    async preview(file) {
      const request = ++previewSequence; pending = null; backupError = null;
      try { const parsed = parseBackup(await file.text()); if (request !== previewSequence) return; pending = parsed; }
      catch (failure) { if (request !== previewSequence) return; backupError = failure instanceof Error ? failure.message : 'Could not read backup file.'; }
      render();
    },
    confirmRestore() { if (pending) replaceData(pending); },
    cancelRestore() { previewSequence++; pending = null; backupError = null; render(); },
    downloadRaw() { if (raw !== null) downloadText('putt-practice-original-data.json', raw); },
    reset() { if (window.confirm('Reset local data? Download the original data first if you want to keep a copy.')) replaceData({ version: 1, sessions: [] }); },
  };
  function persist() {
    try { saveDataset(storage, data); error = null; }
    catch { error = 'Progress not saved. Keep this page open and retry, or export a backup.'; }
  }
  function start() {
    if (recovery) return;
    let draft = data.sessions.find(s => s.misses.length < 9);
    if (!draft) { draft = createSession(crypto.randomUUID(), new Date().toISOString()); data = { ...data, sessions: [...data.sessions, draft] }; persist(); }
    activeId = draft.id; resultId = null; editableResult = false; view = 'Practice'; render();
  }
  function update(change: (session: Session) => Session) {
    if (recovery) return;
    const current = data.sessions.find(s => s.id === activeId); if (!current) return;
    const next = change(current);
    data = { ...data, sessions: data.sessions.map(s => s.id === next.id ? next : s) }; persist();
    resultId = next.misses.length === 9 ? next.id : null; editableResult = !!resultId;
    live.textContent = next.misses.length === 9 ? 'Session complete.' : `${next.misses.length * 8} of 72 putts recorded.`;
    render();
  }
  function render() {
    const focused = document.activeElement?.getAttribute('aria-label');
    main.replaceChildren();
    const header = el('header', 'app-header'); header.append(el('span', 'brand', 'putt / practice'), el('span', 'device-label', 'ON THIS DEVICE'));
    const nav = el('nav', 'nav'); nav.setAttribute('aria-label', 'Main navigation');
    for (const name of ['Practice', 'History', 'Backup'] as const) {
      const tab = button(name, () => { view = name; resultId = null; editableResult = false; render(); }, `nav-button ${view === name ? 'selected' : ''}`);
      if (view === name) tab.setAttribute('aria-current', 'page'); nav.append(tab);
    }
    main.append(header, nav);
    if (error) {
      const alert = el('div', 'error'); alert.setAttribute('role', 'alert'); alert.append(el('p', '', error));
      if (!recovery) alert.append(button('Retry save', () => { persist(); render(); }, 'button small'));
      main.append(alert);
    }
    const content = el('div', 'content');
    const result = data.sessions.find(s => s.id === resultId);
    if (recovery || view === 'Backup') content.append(renderBackup({
      completedCount: data.sessions.filter(s => s.misses.length === 9).length,
      draftCount: data.sessions.filter(s => s.misses.length < 9).length,
      pending, error: backupError, recovery, rawAvailable: raw !== null,
    }, backupActions));
    else if (result) content.append(renderResults(result, { start, undo: editableResult ? () => update(undoBatch) : undefined }));
    else if (view === 'History') content.append(renderHistory(data.sessions, { start, open(id) { resultId = id; editableResult = false; render(); } }));
    else {
      const current = data.sessions.find(s => s.id === activeId);
      if (current?.misses.length === 9) content.append(renderResults(current, { start, undo: () => update(undoBatch) }));
      else content.append(renderPractice(current ?? null, { start, record: misses => update(s => recordBatch(s, misses)), undo: () => update(undoBatch) }));
    }
    main.append(content); if (!main.isConnected) root.append(main);
    if (focused) Array.from(main.querySelectorAll<HTMLButtonElement>('button')).find(b => b.getAttribute('aria-label') === focused)?.focus({ preventScroll: true });
  }
  render();
}
