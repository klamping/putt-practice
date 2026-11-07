export const DISTANCES = [20, 25, 30] as const;
export type Distance = typeof DISTANCES[number];
export interface Session { id: string; startedAt: string; misses: number[] }
export interface Dataset { version: 1; sessions: Session[] }
export interface Score { made: number; attempts: number; percent: number | null }
export interface SessionSummary { total: Score; distances: Record<Distance, Score> }

export function createSession(id: string, startedAt: string): Session {
  return { id, startedAt, misses: [] };
}
export function recordBatch(session: Session, misses: number): Session {
  if (!Number.isInteger(misses) || misses < 0 || misses > 8) throw new Error('Choose 0–8 misses.');
  if (session.misses.length >= 9) throw new Error('Session already complete.');
  return { ...session, misses: [...session.misses, misses] };
}
export function undoBatch(session: Session): Session {
  return { ...session, misses: session.misses.slice(0, -1) };
}
export function getProgress(session: Session) {
  const n = session.misses.length;
  return { complete: n === 9, distance: DISTANCES[Math.min(2, Math.floor(n / 3))], batch: n === 9 ? 3 : n % 3 + 1, putts: n * 8 };
}
function score(made: number, attempts: number): Score {
  return { made, attempts, percent: attempts ? Math.round(made / attempts * 100) : null };
}
export function summarize(session: Session): SessionSummary {
  const result = { total: score(0, 0), distances: {} as Record<Distance, Score> };
  DISTANCES.forEach((distance, i) => {
    const batches = session.misses.slice(i * 3, i * 3 + 3);
    result.distances[distance] = score(batches.reduce((made, misses) => made + 8 - misses, 0), batches.length * 8);
  });
  result.total = score(session.misses.reduce((made, misses) => made + 8 - misses, 0), session.misses.length * 8);
  return result;
}
export function aggregate(sessions: Session[]): SessionSummary {
  const summaries = sessions.filter(s => s.misses.length === 9).map(summarize);
  const result = summarize(createSession('', ''));
  for (const distance of DISTANCES) result.distances[distance] = score(
    summaries.reduce((n, s) => n + s.distances[distance].made, 0), summaries.length * 24,
  );
  result.total = score(summaries.reduce((n, s) => n + s.total.made, 0), summaries.length * 72);
  return result;
}
