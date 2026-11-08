export const DISTANCES = [20, 25, 30] as const;
export const MAX_PUTTERS = 100;
export type Distance = typeof DISTANCES[number];
export interface Session { id: string; startedAt: string; misses: number[]; batchSize?: number }
export interface Dataset { version: 1; sessions: Session[]; putterCount?: number }
export interface Score { made: number; attempts: number; percent: number | null }
export interface SessionSummary { total: Score; distances: Record<Distance, Score> }

export function validatePutterCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_PUTTERS) throw new Error(`Enter a whole number of putters from 1 to ${MAX_PUTTERS}.`);
  return value;
}
export function batchSize(session: Session): number { return session.batchSize ?? 8; }
export function createSession(id: string, startedAt: string, putters = 8): Session {
  return { id, startedAt, misses: [], batchSize: validatePutterCount(putters) };
}
export function recordBatch(session: Session, misses: number): Session {
  if (!Number.isInteger(misses) || misses < 0 || misses > batchSize(session)) throw new Error('Invalid batch score.');
  if (session.misses.length >= 9) throw new Error('Session already complete.');
  return { ...session, misses: [...session.misses, misses] };
}
export function undoBatch(session: Session): Session {
  return { ...session, misses: session.misses.slice(0, -1) };
}
export function getProgress(session: Session) {
  const n = session.misses.length;
  return { complete: n === 9, distance: DISTANCES[Math.min(2, Math.floor(n / 3))], batch: n === 9 ? 3 : n % 3 + 1, putts: n * batchSize(session) };
}
function score(made: number, attempts: number): Score {
  return { made, attempts, percent: attempts ? Math.round(made / attempts * 100) : null };
}
export function summarize(session: Session): SessionSummary {
  const size = batchSize(session);
  const result = { total: score(0, 0), distances: {} as Record<Distance, Score> };
  DISTANCES.forEach((distance, i) => {
    const batches = session.misses.slice(i * 3, i * 3 + 3);
    result.distances[distance] = score(batches.reduce((made, misses) => made + size - misses, 0), batches.length * size);
  });
  result.total = score(session.misses.reduce((made, misses) => made + size - misses, 0), session.misses.length * size);
  return result;
}
export function aggregate(sessions: Session[]): SessionSummary {
  const summaries = sessions.filter(s => s.misses.length === 9).map(summarize);
  const result = summarize(createSession('', ''));
  for (const distance of DISTANCES) result.distances[distance] = score(
    summaries.reduce((n, s) => n + s.distances[distance].made, 0), summaries.reduce((n, s) => n + s.distances[distance].attempts, 0),
  );
  result.total = score(summaries.reduce((n, s) => n + s.total.made, 0), summaries.reduce((n, s) => n + s.total.attempts, 0));
  return result;
}
