import { validatePutterCount, type Dataset, type Session } from './model';
export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export type LoadResult = { kind: 'ok'; data: Dataset } | { kind: 'corrupt'; raw: string; message: string } | { kind: 'unavailable'; message: string };
export const STORAGE_KEY = 'putt-practice:v1';
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a data object.');
  return value as Record<string, unknown>;
}
function iso(value: unknown): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new Error('Invalid date in data.');
  return value;
}
export function validateDataset(value: unknown): Dataset {
  const root = object(value);
  if (root.version !== 1) throw new Error('Unsupported backup version.');
  if (!Array.isArray(root.sessions)) throw new Error('Missing session list.');
  const ids = new Set<string>();
  let drafts = 0;
  const sessions: Session[] = root.sessions.map(value => {
    const s = object(value);
    if (typeof s.id !== 'string' || !s.id.trim() || ids.has(s.id)) throw new Error('Session IDs must be present and unique.');
    ids.add(s.id);
    const startedAt = iso(s.startedAt);
    const size = s.batchSize === undefined ? 8 : validatePutterCount(s.batchSize);
    if (!Array.isArray(s.misses) || s.misses.length > 9 || s.misses.some(n => !Number.isInteger(n) || n < 0 || n > size)) throw new Error('Invalid session batches.');
    if (s.misses.length < 9 && ++drafts > 1) throw new Error('Only one unfinished session is allowed.');
    return { id: s.id, startedAt, misses: [...s.misses] as number[], ...(s.batchSize === undefined ? {} : { batchSize: size }) };
  });
  return { version: 1, sessions, ...(root.putterCount === undefined ? {} : { putterCount: validatePutterCount(root.putterCount) }) };
}
export function loadDataset(storage: StoragePort): LoadResult {
  let raw: string | null;
  try { raw = storage.getItem(STORAGE_KEY); } catch { return { kind: 'unavailable', message: 'Device storage is unavailable. Progress is only in memory; export a backup before leaving.' }; }
  if (raw === null) return { kind: 'ok', data: { version: 1, sessions: [] } };
  try { return { kind: 'ok', data: validateDataset(JSON.parse(raw)) }; }
  catch (error) { return { kind: 'corrupt', raw, message: `Saved data could not be read. ${error instanceof Error ? error.message : ''}` }; }
}
export function saveDataset(storage: StoragePort, data: Dataset): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(validateDataset(data)));
}
export function exportBackup(data: Dataset, exportedAt: string): string {
  return JSON.stringify({ ...validateDataset(data), exportedAt: iso(exportedAt) }, null, 2);
}
export function parseBackup(text: string): Dataset {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  const root = object(value);
  iso(root.exportedAt);
  return validateDataset(root);
}
