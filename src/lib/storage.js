/**
 * @purpose Persist CSMate configuration and auth sessions with deterministic JSON serialisation.
 * @inputs Plain objects representing configuration or session payloads.
 * @outputs Helper functions to load/save/clear persisted config and session data.
 */

const SESSION_KEY = 'csmate-session-v1';
const CONFIG_KEY = 'csmate-config-v2';

const memoryStorage = (() => {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
})();

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
  return memoryStorage;
}

function safeStringify(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return 'null';
  }
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function saveSession(session) {
  const storage = getStorage();
  try {
    storage.setItem(SESSION_KEY, safeStringify(session));
  } catch {}
  return session ?? null;
}

export function loadSession() {
  const storage = getStorage();
  const raw = storage.getItem(SESSION_KEY);
  if (typeof raw !== 'string' || raw.length === 0) return null;
  return safeParse(raw);
}

export function clearSession() {
  const storage = getStorage();
  try {
    storage.removeItem(SESSION_KEY);
  } catch {}
}

export function saveConfig(config) {
  const storage = getStorage();
  try {
    storage.setItem(CONFIG_KEY, safeStringify(config));
  } catch {}
  return config ?? null;
}

export function loadConfig() {
  const storage = getStorage();
  const raw = storage.getItem(CONFIG_KEY);
  if (typeof raw !== 'string' || raw.length === 0) return null;
  return safeParse(raw);
}

export function clearConfig() {
  const storage = getStorage();
  try {
    storage.removeItem(CONFIG_KEY);
  } catch {}
}
