import { DISTANCES, summarize, type Session } from '../model';
import { el, button, formatDate, percent } from '../ui';
export function renderResults(session: Session, actions: { undo?: () => void; start: () => void }): HTMLElement {
  const view = el('section', 'results'); const summary = summarize(session);
  view.append(el('p', 'eyebrow', formatDate(session.startedAt)), el('h1', '', 'Session complete'));
  const total = el('div', 'result-total');
  total.append(el('strong', 'total-percent', percent(summary.total.percent)), el('span', 'muted', `${summary.total.made} / ${summary.total.attempts} made`));
  view.append(total);
  const table = el('table', 'score-table');
  const head = el('thead'); const labels = el('tr');
  for (const text of ['Distance', 'Made', 'Make %']) { const th = el('th', '', text); th.scope = 'col'; labels.append(th); }
  head.append(labels); const body = el('tbody');
  for (const ft of DISTANCES) {
    const row = el('tr'); const score = summary.distances[ft];
    row.append(el('th', '', `${ft} ft`), el('td', '', `${score.made} / ${score.attempts}`), el('td', 'percentage', percent(score.percent))); body.append(row);
  }
  table.append(head, body); view.append(table);
  const actionsRow = el('div', 'result-actions');
  if (actions.undo) actionsRow.append(button('Undo last batch', actions.undo, 'button quiet'));
  actionsRow.append(button('New session', actions.start, 'button primary')); view.append(actionsRow);
  return view;
}
