import { DISTANCES, getProgress, summarize, type Session } from '../model';
import { el, button } from '../ui';
export interface PracticeActions { start(): void; record(misses: number): void; undo(): void }
export function renderPractice(session: Session | null, actions: PracticeActions): HTMLElement {
  const view = el('section', 'practice');
  if (!session) {
    view.append(el('p', 'eyebrow', 'PUTTING PRACTICE'), el('h1', 'welcome-title', 'Ready when you are.'), el('p', 'muted', '24 putts each · 20, 25 & 30 ft'));
    const diagram = el('div', 'distance-preview');
    for (const ft of DISTANCES) diagram.append(el('span', '', `${ft} ft`));
    view.append(diagram, el('p', 'hint', 'Three batches of 8 at each distance. Tap the misses after each batch.'), button('Start session', actions.start, 'button primary'));
    return view;
  }
  const progress = getProgress(session);
  const distances = el('div', 'distances'); distances.setAttribute('aria-label', 'Distances');
  for (const ft of DISTANCES) {
    const node = el('span', `distance ${ft === progress.distance ? 'active' : ''}`, `${ft < progress.distance ? '✓ ' : ''}${ft} ft`);
    if (ft === progress.distance) node.setAttribute('aria-current', 'step');
    distances.append(node);
  }
  const heading = el('h1', 'distance-title', `${progress.distance} ft`);
  const bar = el('progress'); bar.max = 72; bar.value = progress.putts; bar.setAttribute('aria-label', 'Session progress');
  view.append(distances, el('p', 'eyebrow', `Batch ${progress.batch} of 3 · 8 putts`), heading, bar,
    el('h2', '', 'How many misses?'), el('p', 'hint', 'Tap to save this batch of 8.'));
  const grid = el('div', 'miss-grid');
  for (let n = 0; n <= 8; n++) {
    const entry = button(String(n), () => actions.record(n), `miss-button ${n === 0 ? 'zero' : ''}`);
    entry.setAttribute('aria-label', `${n} misses`); grid.append(entry);
  }
  const footer = el('div', 'practice-footer');
  const status = el('div', 'batch-status');
  status.append(el('strong', '', `${progress.putts} / 72 putts`), el('span', 'muted', session.misses.length ? `Last batch: ${8 - session.misses.at(-1)!}/8 made · ${summarize(session).total.made} made so far` : 'First batch ready'));
  const undo = button('↶ Undo last batch', actions.undo, 'button quiet'); undo.disabled = session.misses.length === 0;
  footer.append(status, undo); view.append(grid, footer);
  return view;
}
