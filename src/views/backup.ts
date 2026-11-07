import type { Dataset } from '../model';
import { el, button } from '../ui';
export interface BackupActions {
  export(): void; preview(file: File): Promise<void>; confirmRestore(): void;
  cancelRestore(): void; downloadRaw(): void; reset(): void;
}
export interface BackupViewState {
  completedCount: number; draftCount: number; pending: Dataset | null;
  error: string | null; recovery: boolean; rawAvailable: boolean;
}
export function renderBackup(state: BackupViewState, actions: BackupActions): HTMLElement {
  const view = el('section', 'backup');
  view.append(el('p', 'eyebrow', 'ON THIS DEVICE'), el('h1', '', 'Backup'));
  if (!state.recovery) {
    view.append(el('p', 'muted', `${state.completedCount} completed sessions · ${state.draftCount} unfinished`),
      button('Export backup', actions.export, 'button primary'), el('p', 'hint backup-note', 'Save a copy outside this browser. Includes your history and any unfinished session.'));
  } else {
    view.append(el('p', 'hint', 'Your original data has been kept. Download it before resetting, or restore a valid backup.'));
    if (state.rawAvailable) view.append(button('Download original data', actions.downloadRaw, 'button primary'));
  }
  view.append(el('h2', '', 'Restore from a file'), el('p', 'hint', 'Restoring replaces the data on this device. You’ll review the session count first.'));
  const label = el('label', 'file-label', 'Choose backup file'); label.htmlFor = 'backup-file';
  const input = el('input', 'file-input'); input.id = 'backup-file'; input.type = 'file'; input.accept = '.json,application/json'; input.setAttribute('aria-label', 'Restore backup file');
  input.addEventListener('change', async () => { const file = input.files?.[0]; input.value = ''; if (file) await actions.preview(file); });
  view.append(label, input);
  if (state.error) { const error = el('p', 'error backup-error', state.error); error.setAttribute('role', 'alert'); view.append(error); }
  if (state.pending) {
    const preview = el('div', 'restore-preview');
    const complete = state.pending.sessions.filter(s => s.misses.length === 9).length;
    preview.append(el('h2', '', 'Replace local data?'), el('p', '', `${complete} completed · ${state.pending.sessions.length - complete} unfinished`),
      button('Replace data and restore', actions.confirmRestore, 'button primary'), button('Cancel restore', actions.cancelRestore, 'button quiet'));
    view.append(preview);
  }
  if (state.recovery) view.append(button('Reset local data', actions.reset, 'button quiet reset-data'));
  return view;
}
