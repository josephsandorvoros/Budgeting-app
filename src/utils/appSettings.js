import { resolveDemoMode } from '../data/demo.js';

const DEMO_SETTINGS_STORAGE_PREFIX = 'budget_ledger_demo_settings_v1:';

function getWindow() {
  return typeof window !== 'undefined' ? window : undefined;
}

function getStorage() {
  return typeof localStorage !== 'undefined' ? localStorage : undefined;
}

function getApiBase() {
  const win = getWindow();
  const isElectron = Boolean(win?.electronAPI);
  const isPackagedElectron = isElectron && win?.location?.protocol === 'file:';
  if (!isElectron) return '/api';
  return isPackagedElectron ? 'http://127.0.0.1:18765/api' : 'http://127.0.0.1:8765/api';
}

function getViteDemoMode() {
  const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  if (viteEnv) return viteEnv.VITE_DEMO_MODE;
  return globalThis.process?.env?.VITE_DEMO_MODE;
}

function shouldUseDemoMode() {
  const win = getWindow();
  return resolveDemoMode({
    viteDemoMode: getViteDemoMode(),
    hasElectronAPI: Boolean(win?.electronAPI),
    protocol: win?.location?.protocol || '',
  });
}

function demoStorageKey(key) {
  return `${DEMO_SETTINGS_STORAGE_PREFIX}${key}`;
}

function parseStoredValue(raw, fallback) {
  if (raw === null || raw === undefined) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function saveAppSetting(key, value) {
  const serialized = JSON.stringify(value);
  if (shouldUseDemoMode()) {
    try {
      const storage = getStorage();
      if (!storage) throw new Error('Storage unavailable');
      storage.setItem(demoStorageKey(key), serialized);
      return;
    } catch {
      throw new Error(`Failed to save setting ${key}`);
    }
  }

  try {
    const res = await fetch(`${getApiBase()}/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: serialized }),
    });
    if (!res.ok) throw new Error(`Failed to save setting ${key}`);
    return;
  } catch {
    // Electron/offline fallback: keep settings sticky even if API is unavailable.
    try {
      const storage = getStorage();
      if (!storage) throw new Error('Storage unavailable');
      storage.setItem(key, serialized);
      return;
    } catch {
      throw new Error(`Failed to save setting ${key}`);
    }
  }
}

export async function loadAppSetting(key, fallback, legacyLocalKey = key) {
  if (shouldUseDemoMode()) {
    try {
      const storage = getStorage();
      if (!storage) return fallback;
      const raw = storage.getItem(demoStorageKey(key));
      return parseStoredValue(raw, fallback);
    } catch {
      return fallback;
    }
  }

  try {
    const res = await fetch(`${getApiBase()}/settings/${encodeURIComponent(key)}`);
    if (res.ok) {
      const body = await res.json();
      if (body.value !== null && body.value !== undefined) {
        return parseStoredValue(body.value, fallback);
      }
    }
  } catch {
    // fall through to local migration fallback
  }

  try {
    const storage = getStorage();
    if (!storage) return fallback;
    const localRaw = storage.getItem(legacyLocalKey);
    if (localRaw !== null) {
      const parsed = parseStoredValue(localRaw, fallback);
      try {
        await saveAppSetting(key, parsed);
      } catch {
        // ignore failed migration, still return recovered local value
      }
      return parsed;
    }
  } catch {
    // ignore local fallback failures
  }

  return fallback;
}
