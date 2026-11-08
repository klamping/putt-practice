import { batchSize, createSession, recordBatch, undoBatch, type Dataset, type Session } from './model';
import { loadDataset, saveDataset, exportBackup, parseBackup, STORAGE_KEY, type StoragePort } from './storage';
import { button, el, downloadText } from './ui';
import { renderPractice } from './views/practice';
import { renderResults } from './views/results';
import { renderHistory } from './views/history';
import { renderBackup, type BackupActions } from './views/backup';
import { getOfflineStatus } from './offline';

export function mountApp(root: HTMLElement, storage: StoragePort): void {
  // Capture exactly the bytes read at startup so a stale page cannot replace
  // a newer snapshot written by another tab or a restore.
  let savedSnapshot: string | null = null;
  const loaded = loadDataset({
    getItem(key) { savedSnapshot = storage.getItem(key); return savedSnapshot; },
    setItem: (key, value) => storage.setItem(key, value),
  });
  let conflict = false;
  const conflictMessage = 'Progress not saved: another tab changed the saved data. Export this tab’s progress before loading the saved data.';
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
  function saveChecked(next: Dataset) {
    if (storage.getItem(STORAGE_KEY) !== savedSnapshot) {
      conflict = true;
      throw new Error(conflictMessage);
    }
    saveDataset(storage, next);
    savedSnapshot = JSON.stringify(next);
    conflict = false;
  }
  function loadSaved() {
    if (!window.confirm('Load saved data and discard this tab’s unsaved changes? Export a backup first to keep them.')) return;
    root.replaceChildren(); mountApp(root, storage);
  }
  function replaceData(next: Dataset) {
    try { saveChecked(next); }
    catch {
      backupError = 'Restore failed. Existing data has not been replaced.';
      if (conflict) error = conflictMessage;
      render(); return;
    }
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
    try { saveChecked(data); error = null; }
    catch { error = conflict ? conflictMessage : 'Progress not saved. Keep this page open and retry, or export a backup.'; }
  }
  function start() {
    if (recovery) return;
    let draft = data.sessions.find(s => s.misses.length < 9);
    if (!draft) {
      const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() :
        Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
      draft = createSession(id, new Date().toISOString(), data.putterCount ?? 8); data = { ...data, sessions: [...data.sessions, draft] }; persist();
    }
    activeId = draft.id; resultId = null; editableResult = false; view = 'Practice'; render();
  }
  function setup() {
    activeId = data.sessions.find(s => s.misses.length < 9)?.id ?? null;
    resultId = null; editableResult = false; view = 'Practice'; render();
  }
  function setPutterCount(count: number) {
    if (count === (data.putterCount ?? 8)) return;
    data = { ...data, putterCount: count }; persist();
    if (error) render();
  }
  function update(change: (session: Session) => Session) {
    if (recovery) return;
    const current = data.sessions.find(s => s.id === activeId); if (!current) return;
    const next = change(current);
    data = { ...data, sessions: data.sessions.map(s => s.id === next.id ? next : s) }; persist();
    resultId = next.misses.length === 9 ? next.id : null; editableResult = !!resultId;
    live.textContent = next.misses.length === 9 ? 'Session complete.' : `${next.misses.length * batchSize(next)} of ${9 * batchSize(next)} putts recorded.`;
    render();
  }
  function record(makes: number) {
    const current = data.sessions.find(s => s.id === activeId); if (!current) return;
    const size = batchSize(current);
    update(session => recordBatch(session, size - makes));
    const tapped = main.querySelector<HTMLButtonElement>(`.miss-button[aria-label="${makes} makes"]`);
    if (tapped) {
      tapped.classList.add('entry-pulse');
      tapped.addEventListener('animationend', () => tapped.classList.remove('entry-pulse'), { once: true });
    }
    const feedback = el('div', `entry-feedback ${error ? 'unsaved' : ''}`,
      error ? `${makes}/${size} made · not saved` : `✓ ${makes}/${size} made`);
    feedback.addEventListener('animationend', () => feedback.remove(), { once: true });
    main.append(feedback);
  }
  function render() {
    const focused = document.activeElement?.getAttribute('aria-label');
    main.replaceChildren();
    const header = el('header', 'app-header');
    const offlineStatus = el('span', 'device-label', getOfflineStatus());
    offlineStatus.dataset.offlineStatus = ''; offlineStatus.setAttribute('role', 'status'); offlineStatus.hidden = !offlineStatus.textContent;
    header.append(el('span', 'brand', "Lee Carvalo's Putting Challenge"), offlineStatus);
    const nav = el('nav', 'nav'); nav.setAttribute('aria-label', 'Main navigation');
    for (const name of ['Practice', 'History', 'Backup'] as const) {
      const tab = button(name, () => { view = name; resultId = null; editableResult = false; render(); }, `nav-button ${view === name ? 'selected' : ''}`);
      if (view === name) tab.setAttribute('aria-current', 'page'); nav.append(tab);
    }
    main.append(header, nav);
    if (error) {
      const alert = el('div', 'error'); alert.setAttribute('role', 'alert'); alert.append(el('p', '', error));
      if (conflict) alert.append(button('Load saved data', loadSaved, 'button small'));
      else if (!recovery) alert.append(button('Retry save', () => { persist(); render(); }, 'button small'));
      main.append(alert);
    }
    const content = el('div', 'content');
    const result = data.sessions.find(s => s.id === resultId);
    if (recovery || view === 'Backup') content.append(renderBackup({
      completedCount: data.sessions.filter(s => s.misses.length === 9).length,
      draftCount: data.sessions.filter(s => s.misses.length < 9).length,
      pending, error: backupError, recovery, rawAvailable: raw !== null,
    }, backupActions));
    else if (result) content.append(renderResults(result, { start: setup, undo: editableResult ? () => update(undoBatch) : undefined }));
    else if (view === 'History') content.append(renderHistory(data.sessions, { start: setup, open(id) { resultId = id; editableResult = false; render(); } }));
    else {
      const current = data.sessions.find(s => s.id === activeId);
      if (current?.misses.length === 9) content.append(renderResults(current, { start: setup, undo: () => update(undoBatch) }));
      else content.append(renderPractice(current ?? null, { start, record, setPutterCount, undo: () => update(undoBatch) }, data.putterCount ?? 8));
    }
    main.append(content); if (!main.isConnected) root.append(main);
    if (focused) Array.from(main.querySelectorAll<HTMLButtonElement>('button')).find(b => b.getAttribute('aria-label') === focused)?.focus({ preventScroll: true });
  }
  render();
}
