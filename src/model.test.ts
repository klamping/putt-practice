import { describe, expect, it } from 'vitest';
import { createSession, recordBatch, undoBatch, getProgress, summarize, aggregate } from './model';
const session = (misses: number[] = []) => ({ ...createSession('one', '2026-11-07T12:00:00.000Z'), misses });

describe('practice calculations', () => {
  it('advances after 24 attempts and preserves the original', () => {
    const original = session([0, 0]);
    const next = recordBatch(original, 0);
    expect(original.misses).toEqual([0, 0]);
    expect(getProgress(next)).toEqual({ complete: false, distance: 25, batch: 1, putts: 24 });
    expect(summarize(next).distances[20]).toEqual({ made: 24, attempts: 24, percent: 100 });
  });
  it('calculates all nine batches and undoes across boundaries', () => {
    const complete = session(Array(9).fill(1));
    expect(summarize(complete).total).toEqual({ made: 63, attempts: 72, percent: 88 });
    for (const score of Object.values(summarize(complete).distances)) expect(score).toEqual({ made: 21, attempts: 24, percent: 88 });
    expect(getProgress(undoBatch(complete))).toEqual({ complete: false, distance: 30, batch: 3, putts: 64 });
    expect(getProgress(undoBatch(session([0, 0, 0])))).toEqual({ complete: false, distance: 20, batch: 3, putts: 16 });
    expect(undoBatch(session()).misses).toEqual([]);
  });
  it.each([-1, 9, 1.5, NaN])('rejects invalid misses %s', value => expect(() => recordBatch(session(), value)).toThrow());
  it('rejects a tenth batch', () => expect(() => recordBatch(session(Array(9).fill(0)), 0)).toThrow());
  it('handles empty, zero, and perfect results', () => {
    expect(summarize(session()).total.percent).toBeNull();
    expect(summarize(session(Array(9).fill(8))).total.percent).toBe(0);
    expect(summarize(session(Array(9).fill(0))).total.percent).toBe(100);
  });
  it('aggregates counts rather than rounded percentages and excludes drafts', () => {
    const a = session([0, 1, 1, 0, 0, 0, 0, 0, 0]);
    const b = session([1, 1, 1, 0, 0, 0, 0, 0, 0]);
    expect(aggregate([a, b, session([0])]).distances[20]).toEqual({ made: 43, attempts: 48, percent: 90 });
  });
});
