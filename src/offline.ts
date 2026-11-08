let status = 'ON THIS DEVICE';
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
    if (registration.active) setStatus('Ready offline');
    const worker = registration.installing;
    if (worker) {
      const check = () => {
        if (worker.state === 'activated') setStatus('Ready offline');
        else if (worker.state === 'redundant' && !registration.active) setStatus('Offline setup failed');
      };
      worker.addEventListener('statechange', check);
      check();
    }
  } catch {
    setStatus(navigator.serviceWorker.controller ? 'Ready offline' : 'Offline setup failed');
  }
}
