const LOCAL_PREFIX = 'ff:';
const ADMIN_STORAGE_KEY = 'csmate_admin_enabled';
const FIRM_STORAGE_KEY = 'csmate_firm_id';

function parseBoolean(value, defaultValue = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return false;
  return defaultValue;
}

function readEnvFlag(key) {
  if (typeof process !== 'undefined' && process?.env && key in process.env) {
    return process.env[key];
  }

  if (typeof window !== 'undefined' && window) {
    const globalEnv = window.__ENV__;
    if (globalEnv && key in globalEnv) {
      return globalEnv[key];
    }
  }

  return undefined;
}

function readLocalOverride(key) {
  if (typeof window === 'undefined' || !window?.localStorage) return null;
  try {
    return window.localStorage.getItem(`${LOCAL_PREFIX}${key}`);
  } catch (error) {
    console.warn('Kunne ikke læse localStorage flag', error);
    return null;
  }
}

function readQueryOverride(key) {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has(key.toLowerCase())) {
      return params.get(key.toLowerCase());
    }
    if (params.has(key)) {
      return params.get(key);
    }
  } catch (error) {
    console.warn('Kunne ikke parse query params for flag', error);
  }
  return null;
}

function getFlag(key, defaultValue = false) {
  const queryOverride = readQueryOverride(key);
  if (queryOverride != null) {
    return parseBoolean(queryOverride, defaultValue);
  }

  const localOverride = readLocalOverride(key);
  if (localOverride != null) {
    return parseBoolean(localOverride, defaultValue);
  }

  const envValue = readEnvFlag(key);
  if (envValue != null) {
    return parseBoolean(envValue, defaultValue);
  }

  return defaultValue;
}

function isMaterialsV2Enabled() {
  return getFlag('FF_MATERIALS_V2', false);
}

function isTenantPricingEnabled() {
  return getFlag('FF_TENANT_PRICES', false);
}

function storeAdminState(isEnabled) {
  if (typeof window === 'undefined' || !window?.localStorage) return;
  try {
    if (isEnabled) {
      window.localStorage.setItem(ADMIN_STORAGE_KEY, '1');
    } else {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Kunne ikke opdatere admin state i localStorage', error);
  }
}

function readAdminState() {
  if (typeof window === 'undefined' || !window?.localStorage) return false;
  try {
    const value = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    return parseBoolean(value, false);
  } catch (error) {
    console.warn('Kunne ikke læse admin state fra localStorage', error);
    return false;
  }
}

function readFirmId() {
  if (typeof window === 'undefined') return 'default';

  try {
    const params = new URLSearchParams(window.location.search);
    const firmParam = params.get('firm');
    if (firmParam) {
      const normalized = firmParam.trim().toLowerCase();
      if (normalized) {
        window.localStorage?.setItem(FIRM_STORAGE_KEY, normalized);
        return normalized;
      }
    }
  } catch (error) {
    console.warn('Kunne ikke læse firm param', error);
  }

  try {
    const stored = window.localStorage?.getItem(FIRM_STORAGE_KEY);
    if (stored) {
      return stored;
    }
  } catch (error) {
    console.warn('Kunne ikke læse firm fra localStorage', error);
  }

  return 'default';
}

function persistFirmId(firmId) {
  if (typeof window === 'undefined' || !window?.localStorage) return;
  try {
    window.localStorage.setItem(FIRM_STORAGE_KEY, firmId);
  } catch (error) {
    console.warn('Kunne ikke gemme firmId', error);
  }
}

export {
  isMaterialsV2Enabled,
  isTenantPricingEnabled,
  storeAdminState,
  readAdminState,
  readFirmId,
  persistFirmId,
  parseBoolean
};
