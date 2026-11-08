let status = '';
export function getOfflineStatus(): string { return status; }

export async function enableOffline(onStatus: () => void): Promise<void> {
  if (!import.meta.env.PROD) return;
  const setStatus = (value: string) => { status = value; onStatus(); };
  if (!window.isSecureContext || !('serviceWorker' in navigator)) {
    setStatus(window.isSecureContext ? 'Offline unavailable' : 'Offline requires HTTPS');
    return;
  }
  setStatus('Preparing offline…');
  try {
    const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' });
    if (registration.active) setStatus('');
    const worker = registration.installing;
    if (worker) {
      const check = () => {
        if (worker.state === 'activated') setStatus('');
        else if (worker.state === 'redundant' && !registration.active) setStatus('Offline setup failed');
      };
      worker.addEventListener('statechange', check);
      check();
    }
  } catch {
    setStatus(navigator.serviceWorker.controller ? '' : 'Offline setup failed');
  }
}
