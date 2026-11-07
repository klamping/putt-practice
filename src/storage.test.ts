import { expect, it } from 'vitest';
import { exportBackup, parseBackup, validateDataset, loadDataset, saveDataset } from './storage';
import type { Dataset } from './model';
const date = '2026-11-07T12:00:00.000Z';
const full = { id: 'complete', startedAt: date, misses: Array(9).fill(1) };
const data: Dataset = { version: 1, sessions: [full, { id: 'draft', startedAt: date, misses: [2] }] };
it('round-trips completed and unfinished sessions', () => expect(parseBackup(exportBackup(data, date))).toEqual(data));
it.each([
  null, {}, { version: 2, sessions: [] }, { version: 1, sessions: null },
  { version: 1, sessions: [full, full] },
  ...[{ id: '' }, { startedAt: 'not a date' }, { startedAt: '2026-02-30T00:00:00.000Z' }, { startedAt: '<img src=x>' },
    { misses: Array(10).fill(0) }, { misses: [-1] }, { misses: [9] }, { misses: [1.5] }, { misses: [null] }, { misses: '0' }]
    .map(patch => ({ version: 1, sessions: [{ ...full, ...patch }] })),
  { version: 1, sessions: [{ ...full, misses: [] }, { ...full, id: 'two', misses: [] }] },
])('rejects malformed dataset %#', value => expect(() => validateDataset(value)).toThrow());
it('rejects invalid JSON and export timestamps', () => {
  expect(() => parseBackup('{')).toThrow();
  expect(() => parseBackup(JSON.stringify({ ...data, exportedAt: 'yesterday' }))).toThrow();
});
it('preserves arbitrary IDs as data', () => {
  const id = '<img src=x onerror=alert(1)>';
  expect(validateDataset({ version: 1, sessions: [{ ...full, id }] }).sessions[0].id).toBe(id);
});
it('loads absent storage and retains exact corrupt contents', () => {
  expect(loadDataset({ getItem: () => null, setItem() {} })).toEqual({ kind: 'ok', data: { version: 1, sessions: [] } });
  expect(loadDataset({ getItem: () => '{broken', setItem() {} })).toMatchObject({ kind: 'corrupt', raw: '{broken' });
  expect(loadDataset({ getItem() { throw new Error('Denied'); }, setItem() {} })).toMatchObject({ kind: 'unavailable' });
});
it('keeps stored data intact when writes fail', () => {
  const previous = JSON.stringify(data);
  const storage = { getItem: () => previous, setItem() { throw new Error('Quota'); } };
  expect(() => saveDataset(storage, { version: 1, sessions: [] })).toThrow();
  expect(loadDataset(storage)).toEqual({ kind: 'ok', data });
});
