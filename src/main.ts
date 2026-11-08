import { mountApp } from './app';
import type { StoragePort } from './storage';
import { enableOffline, getOfflineStatus } from './offline';
import './styles.css';
let storage: StoragePort;
try { storage = window.localStorage; }
catch { storage = { getItem() { throw new Error('Unavailable'); }, setItem() { throw new Error('Unavailable'); } }; }
mountApp(document.getElementById('app')!, storage);
void enableOffline(() => {
  const label = document.querySelector('[data-offline-status]');
  if (label) label.textContent = getOfflineStatus();
});
