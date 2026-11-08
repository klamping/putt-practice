import { DISTANCES, MAX_PUTTERS, batchSize, getProgress, summarize, type Session } from '../model';
import { el, button } from '../ui';
export interface PracticeActions { start(): void; record(makes: number): void; undo(): void; setPutterCount(count: number): void }
export function renderPractice(session: Session | null, actions: PracticeActions, putterCount = 8): HTMLElement {
  const view = el('section', 'practice');
  if (!session) {
    view.append(el('h1', '', 'Practice'));
    const form = el('form');
    const label = el('label', 'putter-label', 'Number of putters'); label.htmlFor = 'putter-count';
    const input = el('input', 'putter-input'); input.id = 'putter-count'; input.type = 'number'; input.min = '1'; input.max = String(MAX_PUTTERS); input.step = '1'; input.required = true; input.value = String(putterCount);
    const hint = el('p', 'hint');
    const updateHint = () => { hint.textContent = `Three batches of ${input.value} at each distance. Enter makes after each batch.`; };
    updateHint();
    input.addEventListener('input', () => {
      input.setCustomValidity(Number.isSafeInteger(input.valueAsNumber) ? '' : 'Enter a positive whole number of putters.');
      if (input.checkValidity()) updateHint();
    });
    input.addEventListener('change', () => { if (input.checkValidity()) actions.setPutterCount(input.valueAsNumber); });
    const diagram = el('div', 'distance-preview');
    for (const ft of DISTANCES) diagram.append(el('span', '', `${ft} ft`));
    const start = el('button', 'button primary', 'Start session'); start.type = 'submit';
    form.addEventListener('submit', event => { event.preventDefault(); actions.setPutterCount(input.valueAsNumber); actions.start(); });
    form.append(label, input, diagram, hint, start); view.append(form);
    return view;
  }
  const progress = getProgress(session);
  const size = batchSize(session); const total = size * 9;
  const distances = el('div', 'distances'); distances.setAttribute('aria-label', 'Distances');
  for (const ft of DISTANCES) {
    const node = el('span', `distance ${ft === progress.distance ? 'active' : ''}`, `${ft < progress.distance ? '✓ ' : ''}${ft} ft`);
    if (ft === progress.distance) node.setAttribute('aria-current', 'step');
    distances.append(node);
  }
  const heading = el('h1', 'distance-title', `${progress.distance} ft`);
  const bar = el('progress'); bar.max = total; bar.value = progress.putts; bar.setAttribute('aria-label', 'Session progress');
  view.append(distances, el('p', 'eyebrow', `Batch ${progress.batch} of 3 · ${size} putts`), heading, bar,
    el('h2', '', 'How many makes?'), el('p', 'hint', `Tap to save this batch of ${size}.`));
  const grid = el('div', 'miss-grid');
  for (let n = 0; n <= size; n++) {
    const entry = button(String(n), () => actions.record(n), `miss-button ${n === size ? 'zero' : ''}`);
    entry.setAttribute('aria-label', `${n} makes`); grid.append(entry);
  }
  const footer = el('div', 'practice-footer');
  const status = el('div', 'batch-status');
  status.append(el('strong', '', `${progress.putts} / ${total} putts`), el('span', 'muted', session.misses.length ? `Last batch: ${size - session.misses.at(-1)!}/${size} made · ${summarize(session).total.made} made so far` : 'No batches recorded'));
  const undo = button('↶ Undo last batch', actions.undo, 'button quiet'); undo.disabled = session.misses.length === 0;
  footer.append(status, undo); view.append(grid, footer);
  return view;
}
