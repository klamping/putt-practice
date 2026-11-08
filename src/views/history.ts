import { DISTANCES, aggregate, summarize, type Session } from '../model';
import { el, button, formatDate, percent } from '../ui';
function trend(sessions: Session[]): HTMLElement {
  const card = el('div', 'trend-card'); card.append(el('h2', '', 'Over time'));
  const chronological = [...sessions].reverse();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 320 140'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Make percentages over time. Exact values are listed in session history below.');
  for (const y of [10, 60, 110]) {
    const line = document.createElementNS(svg.namespaceURI, 'line');
    for (const [k, v] of Object.entries({ x1: '15', x2: '305', y1: String(y), y2: String(y), stroke: '#dce3d8' })) line.setAttribute(k, v);
    svg.append(line);
  }
  DISTANCES.forEach((ft, index) => {
    const points = chronological.map((s, i) => [chronological.length === 1 ? 160 : 15 + i / (chronological.length - 1) * 290, 110 - summarize(s).distances[ft].percent!]);
    const line = document.createElementNS(svg.namespaceURI, 'polyline');
    line.setAttribute('points', points.map(p => p.join(',')).join(' ')); line.setAttribute('class', `trend-line line-${index}`); svg.append(line);
    for (const [x, y] of points) {
      const dot = document.createElementNS(svg.namespaceURI, 'circle'); dot.setAttribute('cx', String(x)); dot.setAttribute('cy', String(y)); dot.setAttribute('r', '3'); dot.setAttribute('class', `trend-dot line-${index}`); svg.append(dot);
    }
  });
  const legend = el('div', 'trend-legend');
  DISTANCES.forEach((ft, i) => legend.append(el('span', `legend-${i}`, `${ft} ft`)));
  card.append(svg, legend); return card;
}
export function renderHistory(sessions: Session[], actions: { open(id: string): void; start(): void }): HTMLElement {
  const view = el('section', 'history');
  const completed = sessions.filter(s => s.misses.length === 9).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  view.append(el('h1', '', 'History'), el('p', 'muted', `${completed.length} ${completed.length === 1 ? 'session' : 'sessions'}`));
  if (!completed.length) { view.append(el('p', 'empty', 'Completed sessions will appear here.'), button('Start session', actions.start, 'button primary')); return view; }
  const stats = aggregate(completed); const summary = el('div', 'summary-grid');
  for (const ft of DISTANCES) {
    const cell = el('div'); cell.append(el('span', 'muted', `${ft} ft`), el('strong', '', percent(stats.distances[ft].percent))); summary.append(cell);
  }
  view.append(el('h2', '', 'All-time make rate'), summary, trend(completed), el('h2', '', 'Sessions'));
  for (const session of completed) {
    const item = button('', () => actions.open(session.id), 'session-row');
    item.setAttribute('aria-label', `View session ${formatDate(session.startedAt)}`);
    item.append(el('strong', '', formatDate(session.startedAt)), el('span', 'session-time', new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(session.startedAt))));
    const rates = el('div', 'session-rates'); const scores = summarize(session);
    for (const ft of DISTANCES) rates.append(el('span', '', `${ft} ft · ${percent(scores.distances[ft].percent)}`));
    item.append(rates); view.append(item);
  }
  return view;
}
