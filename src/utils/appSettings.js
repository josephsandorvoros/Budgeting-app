const API_BASE = (typeof window !== 'undefined' && window.electronAPI)
  ? 'http://127.0.0.1:8765/api'
  : '/api';

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
  try {
    const res = await fetch(`${API_BASE}/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: serialized }),
    });
    if (!res.ok) throw new Error(`Failed to save setting ${key}`);
    return;
  } catch {
    // Electron/offline fallback: keep settings sticky even if API is unavailable.
    try {
      localStorage.setItem(key, serialized);
      return;
    } catch {
      throw new Error(`Failed to save setting ${key}`);
    }
  }
}

export async function loadAppSetting(key, fallback, legacyLocalKey = key) {
  try {
    const res = await fetch(`${API_BASE}/settings/${encodeURIComponent(key)}`);
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
    const localRaw = localStorage.getItem(legacyLocalKey);
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