import { mountApp } from './app';
import type { StoragePort } from './storage';
import './styles.css';
let storage: StoragePort;
try { storage = window.localStorage; }
catch { storage = { getItem() { throw new Error('Unavailable'); }, setItem() { throw new Error('Unavailable'); } }; }
mountApp(document.getElementById('app')!, storage);
