import './src/features/pctcalc/pctcalc.js'
import { mountDevIfHash } from './src/dev.js'
import { wireShortcuts } from './src/keyboard.js'
import { registerJobStoreHooks } from './src/globals.js'
import { initMaterialsScrollLock } from './src/modules/materialsScrollLock.js'
import { calculateTotals } from './src/modules/calculateTotals.js'
import { normalizeKey } from './src/lib/string-utils.js'
import { EXCLUDED_MATERIAL_KEYS, shouldExcludeMaterialEntry } from './src/lib/materials/exclusions.js'
import { createMaterialRow } from './src/modules/materialRowTemplate.js'
import { sha256Hex, constantTimeEquals } from './src/lib/sha256.js'
import { ensureExportLibs, ensureZipLib, prefetchExportLibs } from './src/features/export/lazy-libs.js'
import {
  initAuth,
  loginWithRedirect,
  signupWithRedirect,
  logout as authLogout,
  getAuthState,
  getUserProfileSnapshot,
  getAccessToken
} from './src/auth/auth0-client.js'
import {
  getCurrentUser as getStoredUser,
  setCurrentUser as setStoredCurrentUser,
  getAllUsers,
  updateUserRole as updateStoredUserRole,
  getUserTenants,
  getUserRoles,
  isOwner,
  isTenantAdmin,
  canSeeAdminTab
} from './src/state/users.js'
import { setupPwaInstall } from './src/pwa-install.js'
import {
  exportAll as exportAllForJob,
  exportSingleSheet,
  requireSagsinfo,
  registerPDFEngine,
  registerEkompletEngine
} from './src/exports.js'
import { wireStatusbar, queueChange } from './src/sync.js'
import { exportFullBackup } from './src/backup.js'
import { installLazyNumpad } from './src/ui/numpad.lazy.js'
import { createVirtualMaterialsList } from './src/modules/materialsVirtualList.js'
import { initClickGuard } from './src/ui/Guards/ClickGuard.js'
import { setAdminOk, setLock } from './src/state/admin.js'
import { canPerformAction } from './src/utils/permissions.js'
import {
  loadJobs,
  getJobs,
  saveJobs,
  createJob,
  updateJob,
  deleteJob,
  findJobById,
  appendAuditLog,
  lockJob as lockJobPersisted,
  markJobSent,
  setAuditUserResolver
} from './jobs.js'

let DEFAULT_ADMIN_CODE_HASH = ''
let materialsVirtualListController = null
let latestAuthState = { isAuthenticated: false, user: null }
let adminViewInitialized = false
let adminViewInitPromise = null
let lastAdminTenantsSignature = ''

function setLatestAuthState(state) {
  latestAuthState = {
    isAuthenticated: Boolean(state?.isAuthenticated),
    user: state?.user ? { ...state.user } : null
  }
  return latestAuthState
}

function getActiveProfile () {
  const profile = getUserProfileSnapshot()
  if (profile) return profile
  return getStoredUser()
}

function canActiveUserAccessAdmin () {
  const profile = getActiveProfile()
  return canSeeAdminTab(profile)
}

function syncAuthUiFromState() {
  const state = getAuthState()
  const latest = setLatestAuthState(state)
  updateAuthUi(latest.isAuthenticated, latest.user)
  updateAdminTabVisibility()
  return latest
}

async function loadDefaultAdminCode () {
  try {
    const response = await fetch('./data/tenants/hulmose.json')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const tenant = await response.json()
    if (tenant && typeof tenant._meta?.admin_code === 'string') {
      DEFAULT_ADMIN_CODE_HASH = tenant._meta.admin_code
    }
  } catch (error) {
    console.warn('Kunne ikke indlæse standard admin-kode', error)
  }
}

loadDefaultAdminCode()

// Initialize click guard for admin lock functionality
if (typeof document !== 'undefined') {
  initClickGuard()
}

// --- Utility Functions ---
function resolveSectionId(id) {
  if (!id) return '';
  const raw = String(id);
  if (typeof document !== 'undefined') {
    const direct = document.getElementById(raw);
    if (direct) return direct.id;
  }
  const base = raw.endsWith('Section') ? raw.slice(0, -7) : raw;
  const normalized = normalizeKey(base);
  const finalBase = normalized || base.replace(/Section$/i, '');
  const candidate = `${finalBase}Section`;
  if (typeof document !== 'undefined') {
    const resolved = document.getElementById(candidate);
    if (resolved) return resolved.id;
  }
  return candidate;
}

function forEachNode(nodeList, callback) {
  if (!nodeList || typeof callback !== 'function') return;

  if (typeof nodeList.forEach === 'function') {
    nodeList.forEach(callback);
    return;
  }

  for (let index = 0; index < nodeList.length; index += 1) {
    callback(nodeList[index], index, nodeList);
  }
}

function scheduleIdleTask(callback, { timeout = 1500 } = {}) {
  const run = () => {
    try {
      const result = callback();
      if (result && typeof result.then === 'function') {
        result.catch(error => {
          console.error('Deferred task failed', error);
        });
      }
    } catch (error) {
      console.error('Deferred task failed', error);
    }
  };

  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout });
  } else {
    setTimeout(run, timeout || 0);
  }
}

const TAB_SECTION_MAP = Object.freeze({
  job: 'jobs',
  case: 'sagsinfo',
  count: 'optaelling',
  wage: 'lon',
  history: 'historik',
  admin: 'view-admin',
  help: 'help'
});

function mapTabToSection(tabName) {
  if (!tabName) return '';
  const normalized = normalizeKey(tabName);
  return TAB_SECTION_MAP[normalized] || normalized;
}

function vis(id) {
  const targetId = resolveSectionId(id);
  const sections = document.querySelectorAll('.sektion');

  if (!sections.length) return;

  let activeId = targetId;
  let hasMatch = false;
  for (let index = 0; index < sections.length; index += 1) {
    if (sections[index].id === activeId) {
      hasMatch = true;
      break;
    }
  }

  if (!hasMatch) {
    const fallback = sections[0];
    activeId = fallback ? fallback.id : '';
  }

  forEachNode(sections, section => {
    const isActive = section.id === activeId;
    section.classList.toggle('active', isActive);
    section.style.display = isActive ? 'flex' : 'none';
    section.toggleAttribute('hidden', !isActive);
    section.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });

  syncActiveTabBySection(activeId);
}

function syncActiveTabBySection(activeSectionId) {
  const buttons = document.querySelectorAll('.tab-bar .tab-btn[data-section]');
  forEachNode(buttons, btn => {
    const buttonTarget = resolveSectionId(btn.dataset.section);
    const isActive = buttonTarget === activeSectionId;
    btn.classList.toggle('is-active', isActive);
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function setActiveTab(tabName) {
  if (!tabName) return;
  const normalizedTab = normalizeKey(tabName);
  if (normalizedTab === 'admin' && !canActiveUserAccessAdmin()) {
    return;
  }
  const section = mapTabToSection(tabName);
  if (section) {
    vis(section);
    if (normalizedTab === 'admin') {
      initAdminView().catch(error => {
        console.error('initAdminView failed', error);
      });
    }
  }
}

function activateTabByName(name) {
  if (!name || typeof document === 'undefined') return;
  const tab = document.getElementById(`tab-${name}`);
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(el => el.classList.add('hidden'));
  tab.classList.remove('hidden');
  document.querySelectorAll('[data-tab]').forEach(btn => {
    const isActive = btn.getAttribute('data-tab') === name;
    btn.classList.toggle('active', isActive);
    btn.classList.toggle('is-active', isActive);
  });
}

function resetAdminViewState() {
  adminViewInitialized = false;
  adminViewInitPromise = null;
  const select = document.getElementById('admin-tenant-select');
  if (select) {
    select.innerHTML = '';
    select.value = '';
  }
  const container = document.getElementById('admin-users-list');
  if (container) {
    container.innerHTML = '';
  }
}

function updateAdminTabVisibility() {
  const adminTabBtn = document.getElementById('tab-btn-admin');
  const adminSection = document.getElementById('view-admin');
  if (!adminTabBtn || !adminSection) return;

  const profile = getActiveProfile();
  if (canSeeAdminTab(profile)) {
    adminTabBtn.classList.remove('hidden');
    adminTabBtn.removeAttribute('hidden');
    adminTabBtn.removeAttribute('aria-hidden');
    const tenants = getUserTenants(profile);
    const signature = JSON.stringify(
      tenants
        .filter(tenant => tenant && (tenant.id || tenant.slug))
        .map(tenant => `${tenant.id || tenant.slug}:${tenant.role || ''}`)
        .sort()
    );
    const hasChanged = signature !== lastAdminTenantsSignature;
    if (hasChanged) {
      lastAdminTenantsSignature = signature;
      adminViewInitialized = false;
      adminViewInitPromise = null;
      if (!adminSection.hasAttribute('hidden')) {
        initAdminView().catch(error => {
          console.error('initAdminView failed', error);
        });
      }
    }
  } else {
    const wasActive = !adminSection.hasAttribute('hidden');
    adminTabBtn.classList.add('hidden');
    adminTabBtn.setAttribute('hidden', '');
    adminTabBtn.setAttribute('aria-hidden', 'true');
    adminTabBtn.classList.remove('active');
    adminTabBtn.classList.remove('is-active');
    adminSection.classList.add('hidden');
    adminSection.classList.remove('active');
    adminSection.setAttribute('hidden', '');
    adminSection.setAttribute('aria-hidden', 'true');
    adminSection.style.display = 'none';
    resetAdminViewState();
    lastAdminTenantsSignature = '';
    if (wasActive) {
      setActiveTab('job');
    }
  }
}

async function initAdminView() {
  if (!canActiveUserAccessAdmin()) return;
  if (adminViewInitialized) return;
  if (adminViewInitPromise) {
    await adminViewInitPromise;
    return;
  }

  const runner = async () => {
    const select = document.getElementById('admin-tenant-select');
    const container = document.getElementById('admin-users-list');
    if (!select || !container) {
      adminViewInitialized = false;
      return;
    }

    const profile = getActiveProfile();
    const tenantOptions = getUserTenants(profile)
      .filter(entry => entry && typeof entry.id === 'string' && entry.id.trim())
      .map(entry => ({
        id: entry.id.trim(),
        label: typeof entry.slug === 'string' && entry.slug.trim() ? entry.slug.trim() : entry.id.trim()
      }));

    select.innerHTML = '';
    tenantOptions.forEach(option => {
      const element = document.createElement('option');
      element.value = option.id;
      element.textContent = option.label;
      select.appendChild(element);
    });

    if (tenantOptions.length === 0) {
      container.innerHTML = '<p>Ingen firmaer tilknyttet din bruger.</p>';
      adminViewInitialized = true;
      return;
    }

    if (!select.dataset.adminBound) {
      select.addEventListener('change', event => {
        const target = event?.target;
        const nextTenant = target && typeof target.value === 'string' ? target.value : '';
        if (!nextTenant) return;
        loadAdminUsersForTenant(nextTenant);
      });
      select.dataset.adminBound = 'true';
    }

    const initialTenant = select.value || tenantOptions[0].id;
    if (!select.value) {
      select.value = initialTenant;
    }

    const loaded = await loadAdminUsersForTenant(initialTenant);
    if (!loaded) {
      adminViewInitialized = false;
      return;
    }

    adminViewInitialized = true;
  };

  adminViewInitPromise = runner();
  try {
    await adminViewInitPromise;
  } catch (error) {
    adminViewInitialized = false;
    console.error('initAdminView failed', error);
  } finally {
    adminViewInitPromise = null;
  }
}

async function loadAdminUsersForTenant(tenantId) {
  const normalizedTenantId = typeof tenantId === 'string' ? tenantId.trim() : '';
  const container = document.getElementById('admin-users-list');
  if (!container) return false;

  if (!normalizedTenantId) {
    container.innerHTML = '<p>Ingen brugere fundet for dette firma endnu.</p>';
    return false;
  }

  const token = await getAccessToken();
  if (!token) {
    console.error('Failed to load admin users: missing token');
    container.innerHTML = '<p>Kunne ikke indlæse brugere.</p>';
    return false;
  }

  let response;
  try {
    response = await fetch(
      '/.netlify/functions/admin-users?tenantId=' + encodeURIComponent(normalizedTenantId),
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
  } catch (error) {
    console.error('Failed to load admin users', error);
    container.innerHTML = '<p>Kunne ikke indlæse brugere.</p>';
    return false;
  }

  if (!response.ok) {
    let message = '';
    try {
      message = await response.text();
    } catch (error) {
      message = '';
    }
    console.error('Failed to load admin users', message || response.statusText);
    container.innerHTML = '<p>Kunne ikke indlæse brugere.</p>';
    return false;
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error('Failed to parse admin users response', error);
    container.innerHTML = '<p>Kunne ikke indlæse brugere.</p>';
    return false;
  }

  const list = Array.isArray(data?.users) ? data.users : [];
  renderAdminUsersTable(normalizedTenantId, list);
  return true;
}

function renderAdminUsersTable(tenantId, users) {
  const container = document.getElementById('admin-users-list');
  if (!container) return;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char] || char;
  });

  const validUsers = Array.isArray(users)
    ? users.filter(user => user && (typeof user.id === 'string' ? user.id : user.userId))
    : [];

  if (validUsers.length === 0) {
    container.innerHTML = '<p>Ingen brugere fundet for dette firma endnu.</p>';
    return;
  }

  container.innerHTML = `
    <table class="admin-users-table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Navn</th>
          <th>Rolle</th>
          <th>Handling</th>
        </tr>
      </thead>
      <tbody>
        ${validUsers
          .map(user => {
            const userId = escapeHtml(user.id || user.userId || '');
            const email = escapeHtml(user.email || '');
            const name = escapeHtml(user.displayName || user.name || '');
            const memberships = Array.isArray(user.tenants) ? user.tenants : [];
            const membership = memberships.find(entry => {
              if (!entry) return false;
              const id = typeof entry.id === 'string' ? entry.id : '';
              const slug = typeof entry.slug === 'string' ? entry.slug : '';
              return id === tenantId || slug === tenantId;
            });
            const role = typeof membership?.role === 'string' ? membership.role : (Array.isArray(user.roles) ? user.roles[0] : '');
            const selectDisabled = role === 'owner';
            return `
          <tr data-user-id="${userId}">
            <td>${email}</td>
            <td>${name}</td>
            <td>
              <select class="admin-role-select" ${selectDisabled ? 'disabled' : ''}>
                <option value="worker" ${role === 'worker' ? 'selected' : ''}>Medarbejder</option>
                <option value="tenantAdmin" ${role === 'tenantAdmin' ? 'selected' : ''}>Firma admin</option>
                ${role === 'owner' ? '<option value="owner" selected>Owner</option>' : ''}
              </select>
            </td>
            <td>
              <button type="button" class="admin-save-role" ${selectDisabled ? 'disabled' : ''}>Gem</button>
            </td>
          </tr>
        `;
          })
          .join('')}
      </tbody>
    </table>
  `;

  container.querySelectorAll('.admin-save-role').forEach(button => {
    button.addEventListener('click', async event => {
      const target = event.currentTarget;
      const row = target instanceof HTMLElement ? target.closest('tr[data-user-id]') : null;
      if (!row) return;
      const userId = row.dataset.userId;
      const roleSelect = row.querySelector('.admin-role-select');
      if (!userId || !(roleSelect instanceof HTMLSelectElement)) return;
      const newRole = roleSelect.value;
      target.disabled = true;
      try {
        await saveAdminUserRole(tenantId, userId, newRole);
      } catch (error) {
        console.error('Failed to save user role', error);
      } finally {
        target.disabled = false;
      }
    });
  });
}

async function saveAdminUserRole(tenantId, userId, role) {
  const token = await getAccessToken();
  if (!token) {
    console.error('Failed to save user role: missing token');
    return false;
  }

  const canonicalRole = normalizeRoleValue(role) || 'worker';

  const payload = {
    tenantId,
    userId,
    role: canonicalRole
  };

  let response;
  try {
    response = await fetch('/.netlify/functions/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Failed to save user role', error);
    return false;
  }

  if (!response.ok) {
    let message = '';
    try {
      message = await response.text();
    } catch (error) {
      message = '';
    }
    console.error('Failed to save user role', message || response.statusText);
    return false;
  }

  await loadAdminUsersForTenant(tenantId);
  return true;
}

let guideModalPreviousFocus = null;

function getGuideModalElement() {
  return document.getElementById('guideModal');
}

function openGuideModal() {
  const modal = getGuideModalElement();
  if (!modal) return;
  guideModalPreviousFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  modal.removeAttribute('hidden');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  const content = modal.querySelector('.modal-content');
  if (content && typeof content.focus === 'function') {
    content.focus();
  }
}

function closeGuideModal() {
  const modal = getGuideModalElement();
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modal.setAttribute('hidden', '');
  if (guideModalPreviousFocus && typeof guideModalPreviousFocus.focus === 'function') {
    guideModalPreviousFocus.focus();
  }
  guideModalPreviousFocus = null;
}

function setupGuideModal() {
  const modal = getGuideModalElement();
  if (!modal) return;

  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeGuideModal());
  }

  modal.addEventListener('click', event => {
    if (event.target === modal) {
      closeGuideModal();
    }
  });

  document.getElementById('btnOpenGuideModal')?.addEventListener('click', () => {
    openGuideModal();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const currentModal = getGuideModalElement();
      if (currentModal && currentModal.classList.contains('open')) {
        closeGuideModal();
      }
    }
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
}

function toNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (value == null) {
    return 0;
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return 0;
  }

  const compactValue = stringValue.replace(/\s+/g, '').replace(/'/g, '');
  const separators = compactValue.match(/[.,]/g) || [];
  let normalized = compactValue.replace(/[^0-9.,-]/g, '');

  if (separators.length > 1) {
    const lastSeparator = separators[separators.length - 1];
    const decimalIndex = normalized.lastIndexOf(lastSeparator);
    const integerPart = normalized.slice(0, decimalIndex).replace(/[.,]/g, '').replace(/(?!^)-/g, '');
    const fractionalPart = normalized.slice(decimalIndex + 1).replace(/[^0-9]/g, '');
    normalized = `${integerPart || '0'}.${fractionalPart}`;
  } else if (separators.length === 1) {
    if (/^-?\d{1,3}(?:[.,]\d{3})+$/.test(normalized)) {
      normalized = normalized.replace(/[.,]/g, '').replace(/(?!^)-/g, '');
    } else {
      const separator = separators[0];
      const decimalIndex = normalized.lastIndexOf(separator);
      const integerPart = normalized.slice(0, decimalIndex).replace(/[.,]/g, '').replace(/(?!^)-/g, '');
      const fractionalPart = normalized.slice(decimalIndex + 1).replace(/[^0-9]/g, '');
      normalized = `${integerPart || '0'}.${fractionalPart}`;
    }
  } else {
    normalized = normalized.replace(/(?!^)-/g, '');
  }

  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? num : 0;
}

function formatNumber(value) {
  const num = Number.isFinite(value) ? value : (parseFloat(value) || 0);
  return new Intl.NumberFormat('da-DK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

// --- Global Variables ---
const SYSTEM_IDS = ['BOSTA70', 'HAKI', 'MODEX', 'ALFIX_VARIO'];
const SYSTEM_KEY_BY_ID = {
  BOSTA70: 'bosta',
  HAKI: 'haki',
  MODEX: 'modex',
  ALFIX_VARIO: 'alfix'
};
const SYSTEM_ID_BY_KEY = {
  bosta: 'BOSTA70',
  haki: 'HAKI',
  modex: 'MODEX',
  alfix: 'ALFIX_VARIO'
};
const DEFAULT_JOB_NAME = 'Migreret job';
const DEFAULT_SYSTEM_ID = 'BOSTA70';
const DEFAULT_ACTION_HINT = 'Udfyld Sagsinfo for at fortsætte.';
const ROLE_PERMISSIONS = {
  owner: {
    canEditGlobalTemplates: true,
    canEditPrices: true,
    canEditWages: true,
    canCreateJobs: true,
    canDeleteJobs: true,
    canLockJobs: true,
    canSendJobs: true,
    canEditMaterials: true,
    canEditLon: true,
    canManageUsers: true
  },
  tenantAdmin: {
    canEditGlobalTemplates: false,
    canEditPrices: true,
    canEditWages: true,
    canCreateJobs: true,
    canDeleteJobs: true,
    canLockJobs: true,
    canSendJobs: true,
    canEditMaterials: true,
    canEditLon: true,
    canManageUsers: true
  },
  firmAdmin: {
    canEditGlobalTemplates: false,
    canEditPrices: true,
    canEditWages: true,
    canCreateJobs: true,
    canDeleteJobs: true,
    canLockJobs: true,
    canSendJobs: true,
    canEditMaterials: true,
    canEditLon: true,
    canManageUsers: true
  },
  'firma-admin': {
    canEditGlobalTemplates: false,
    canEditPrices: true,
    canEditWages: true,
    canCreateJobs: true,
    canDeleteJobs: true,
    canLockJobs: true,
    canSendJobs: true,
    canEditMaterials: true,
    canEditLon: true,
    canManageUsers: true
  },
  formand: {
    canEditGlobalTemplates: false,
    canEditPrices: false,
    canEditWages: false,
    canCreateJobs: true,
    canDeleteJobs: false,
    canLockJobs: true,
    canSendJobs: true,
    canEditMaterials: true,
    canEditLon: true,
    canManageUsers: false
  },
  foreman: {
    canEditGlobalTemplates: false,
    canEditPrices: false,
    canEditWages: false,
    canCreateJobs: true,
    canDeleteJobs: false,
    canLockJobs: true,
    canSendJobs: true,
    canEditMaterials: true,
    canEditLon: true,
    canManageUsers: false
  },
  montor: {
    canEditGlobalTemplates: false,
    canEditPrices: false,
    canEditWages: false,
    canCreateJobs: false,
    canDeleteJobs: false,
    canLockJobs: false,
    canSendJobs: false,
    canEditMaterials: true,
    canEditLon: true,
    canManageUsers: false
  },
  worker: {
    canEditGlobalTemplates: false,
    canEditPrices: false,
    canEditWages: false,
    canCreateJobs: false,
    canDeleteJobs: false,
    canLockJobs: false,
    canSendJobs: false,
    canEditMaterials: true,
    canEditLon: true,
    canManageUsers: false
  },
  user: {
    canEditGlobalTemplates: false,
    canEditPrices: false,
    canEditWages: false,
    canCreateJobs: false,
    canDeleteJobs: false,
    canLockJobs: false,
    canSendJobs: false,
    canEditMaterials: true,
    canEditLon: true,
    canManageUsers: false
  },
  guest: {
    canEditGlobalTemplates: false,
    canEditPrices: false,
    canEditWages: false,
    canCreateJobs: false,
    canDeleteJobs: false,
    canLockJobs: false,
    canSendJobs: false,
    canEditMaterials: false,
    canEditLon: false,
    canManageUsers: false
  }
};

let admin = false;
let workerCount = 0;
let laborEntries = [];
let lastLoensum = 0;
let lastMaterialSum = 0;
let lastEkompletData = null;
let currentStatus = 'kladde';
let recentCasesCache = [];
let cachedDBPromise = null;
let jobsState = [];
let currentJobId = null;
let currentSystemId = DEFAULT_SYSTEM_ID;
let activeUser = null;
let jobSearchTerm = '';
let jobStatusFilter = 'alle';
let showArchivedJobs = false;
let jobAutosaveTimer = null;
let lastCapturedMaterials = new Map();
let lastCapturedLon = {};
let jobStoreListenerAttached = false;
let jobStoreListenerInterval = null;
const DB_NAME = 'csmate_projects';
const DB_STORE = 'projects';

function resolveActiveJob () {
  const storeJob = window.JobStore?.getActiveJob?.()
  if (storeJob) return storeJob
  return getCurrentJob()
}

function resolveActiveSystemName (job) {
  const fromUI = window.UI?.getActiveSystemName?.()
  if (fromUI) return fromUI
  const systems = job?.systems
  if (Array.isArray(systems) && systems.length > 0) {
    const byId = typeof currentSystemId === 'string' ? currentSystemId : null
    const match = systems.find(sys => {
      const name = typeof sys === 'string' ? sys : (sys?.name || sys?.systemName || sys?.id)
      return byId ? name === byId : false
    })
    if (match) {
      if (typeof match === 'string') return match
      return match.name || match.systemName || match.id || ''
    }
    const first = systems[0]
    if (typeof first === 'string') return first
    return first?.name || first?.systemName || first?.id || ''
  }
  return typeof currentSystemId === 'string' ? currentSystemId : ''
}

async function handleGlobalClick (event) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return

  if (target.id === 'btn-export-all') {
    const button = target instanceof HTMLButtonElement ? target : null
    try {
      const job = resolveActiveJob()
      if (!job) {
        alert('Ingen aktivt job valgt.')
        return
      }
      if (!requireSagsinfo(job)) {
        alert('Udfyld sagsinfo først.')
        return
      }
      if (button) button.disabled = true
      await exportAllForJob(job)
    } catch (err) {
      console.error(err)
      alert('Eksport fejlede. Se console.')
    } finally {
      if (button) button.disabled = false
    }
  } else if (target.id === 'btn-share-sheet') {
    const button = target instanceof HTMLButtonElement ? target : null
    const job = resolveActiveJob()
    if (!job) {
      alert('Ingen aktivt job valgt.')
      return
    }
    const systemName = resolveActiveSystemName(job)
    if (!systemName) {
      alert('Vælg et system først.')
      return
    }
    try {
      if (button) button.disabled = true
      const { base } = await exportSingleSheet(job, systemName)
      const subject = encodeURIComponent(`Akkordseddel: ${base}`)
      const body = encodeURIComponent(`Filer er downloadet lokalt:\n- ${base}.pdf\n- ${base}-materialer.csv`)
      window.location.href = `mailto:?subject=${subject}&body=${body}`
    } catch (err) {
      console.error(err)
      alert('Deling fejlede. Se console.')
    } finally {
      if (button) button.disabled = false
    }
  } else if (target.id === 'btn-backup') {
    try {
      exportFullBackup()
    } catch (err) {
      console.error(err)
      alert('Backup eksport fejlede. Se console.')
    }
  }
}

function attachJobStoreListener () {
  if (jobStoreListenerAttached) return true
  const store = window.JobStore
  if (store && typeof store.onChange === 'function') {
    store.onChange((jobId, change) => {
      try {
        queueChange(jobId, change)
      } catch (error) {
        console.warn('Queue fail', error)
      }
    })
    jobStoreListenerAttached = true
    if (jobStoreListenerInterval) {
      window.clearInterval(jobStoreListenerInterval)
      jobStoreListenerInterval = null
    }
    return true
  }
  return false
}

function scheduleJobStoreListener () {
  if (typeof window === 'undefined') return
  if (attachJobStoreListener()) return
  if (jobStoreListenerInterval) return
  jobStoreListenerInterval = window.setInterval(() => {
    if (attachJobStoreListener()) {
      window.clearInterval(jobStoreListenerInterval)
      jobStoreListenerInterval = null
    }
  }, 1000)
}

function handleTabNavigation(event) {
  const btn = event.target.closest('[data-tab]')
  if (!btn) return
  const name = btn.getAttribute('data-tab')
  if (!name) return
  const tab = document.getElementById(`tab-${name}`)
  if (!tab) return
  if (btn.classList.contains('active')) {
    tab.classList.add('hidden')
    btn.classList.remove('active')
    return
  }
  document.querySelectorAll('.tab').forEach(el => {
    el.classList.add('hidden')
  })
  document.querySelectorAll('[data-tab]').forEach(b => {
    b.classList.remove('active')
  })
  tab.classList.remove('hidden')
  btn.classList.add('active')
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', handleGlobalClick)
  document.addEventListener('click', event => {
    const btn = event.target.closest('[data-tab]')
    if (!btn) return
    const name = btn.getAttribute('data-tab')
    activateTabByName(name)
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    wireShortcuts()
    wireStatusbar()
    scheduleJobStoreListener()
    wireShortcuts()
    mountDevIfHash()
  })
  scheduleJobStoreListener()
}

function refreshJobsState() {
  jobsState = loadJobs();
  return jobsState;
}

function getJobIndex(jobId) {
  if (!jobId) return -1;
  return jobsState.findIndex(job => job.id === jobId);
}

function getCurrentJob() {
  if (!currentJobId) return null;
  return jobsState.find(job => job.id === currentJobId) || null;
}

function updateJobStateEntry(updatedJob) {
  if (!updatedJob || !updatedJob.id) return;
  const index = getJobIndex(updatedJob.id);
  if (index !== -1) {
    jobsState[index] = updatedJob;
  }
}

function recordAudit(jobId, entry, options = {}) {
  if (!jobId) return null;
  const updated = appendAuditLog(jobId, entry);
  if (updated) {
    updateJobStateEntry(updated);
    if (jobId === currentJobId && !options.silent) {
      renderAuditLog();
    }
  }
  return updated;
}

function cloneMaterialList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    if (!item || typeof item !== 'object') return item;
    return { ...item };
  });
}

function applyMaterialList(target, source, systemId) {
  if (!Array.isArray(target)) return;
  target.length = 0;
  if (!Array.isArray(source)) return;
  source.forEach(item => {
    if (!item || typeof item !== 'object') return;
    const copy = { ...item };
    if (!copy.systemKey && systemId && SYSTEM_KEY_BY_ID[systemId]) {
      copy.systemKey = SYSTEM_KEY_BY_ID[systemId];
    }
    target.push(copy);
  });
}

function captureManualMaterials() {
  return cloneMaterialList(manualMaterials);
}

function applyManualMaterials(list) {
  if (!Array.isArray(list)) return;
  manualMaterials.length = 0;
  list.forEach(item => {
    if (!item || typeof item !== 'object') return;
    manualMaterials.push({ ...item, manual: true });
  });
  while (manualMaterials.length < 3) {
    manualMaterials.push({
      id: `manual-${manualMaterials.length + 1}`,
      name: '',
      price: 0,
      quantity: 0,
      manual: true,
    });
  }
}

function cloneLonState(state = {}) {
  return {
    jobType: state.jobType || 'montage',
    extraFields: { ...(state.extraFields || {}) },
    workers: Array.isArray(state.workers) ? state.workers.map(worker => ({ ...worker })) : [],
    totals: {
      material: state.totals?.material ?? 0,
      lon: state.totals?.lon ?? 0,
    },
  };
}

const JOB_EXTRA_FIELD_IDS = [
  'montagepris',
  'demontagepris',
  'slaebePct',
  'km',
  'antalBoringHuller',
  'antalLukHuller',
  'antalBoringBeton',
  'antalOpskydeligt',
  'traelleloeft35',
  'traelleloeft50',
];

const SAGSINFO_AUDIT_FIELDS = [
  { id: 'sagsnummer', key: 'sagsnummer', label: 'Sagsnummer' },
  { id: 'sagsnavn', key: 'navn', label: 'Navn/opgave' },
  { id: 'sagsadresse', key: 'adresse', label: 'Adresse' },
  { id: 'sagskunde', key: 'kunde', label: 'Kunde' },
  { id: 'sagsdato', key: 'dato', label: 'Dato' },
  { id: 'sagsmontoer', key: 'montorer', label: 'Montørnavne' },
];

function captureExtraFieldValues() {
  const values = {};
  JOB_EXTRA_FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      values[id] = el.value || '';
    }
  });
  const showSelected = document.getElementById('showSelectedOnly');
  values.showSelectedOnly = !!showSelected?.checked;
  return values;
}

function applyExtraFieldValues(values = {}) {
  JOB_EXTRA_FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el && Object.prototype.hasOwnProperty.call(values, id)) {
      el.value = values[id] ?? '';
    }
  });
  const showSelected = document.getElementById('showSelectedOnly');
  if (showSelected) {
    showSelected.checked = !!values.showSelectedOnly;
  }
}

function captureWorkers() {
  const rows = document.querySelectorAll('.worker-row');
  if (!rows.length) return [];
  return Array.from(rows).map(row => {
    const hours = row.querySelector('.worker-hours');
    const udd = row.querySelector('.worker-udd');
    const tillaeg = row.querySelector('.worker-tillaeg');
    const legend = row.querySelector('legend');
    return {
      name: legend?.textContent?.trim() || '',
      hours: hours?.value || '',
      udd: udd?.value || 'udd1',
      tillaeg: tillaeg?.value || '',
    };
  });
}

function applyWorkers(workers = []) {
  const container = document.getElementById('workers');
  if (!container) return;
  container.innerHTML = '';
  workerCount = 0;
  if (!Array.isArray(workers) || workers.length === 0) {
    addWorker();
    return;
  }
  workers.forEach(worker => {
    addWorker();
    const row = container.lastElementChild;
    if (!row) return;
    const hours = row.querySelector('.worker-hours');
    const udd = row.querySelector('.worker-udd');
    const tillaeg = row.querySelector('.worker-tillaeg');
    if (hours) hours.value = worker.hours ?? '';
    if (udd) udd.value = worker.udd ?? 'udd1';
    if (tillaeg) tillaeg.value = worker.tillaeg ?? '';
  });
}

function captureLonState() {
  const jobTypeEl = document.getElementById('jobType');
  return {
    jobType: jobTypeEl?.value || 'montage',
    extraFields: captureExtraFieldValues(),
    workers: captureWorkers(),
    totals: {
      material: lastMaterialSum,
      lon: lastLoensum,
    },
  };
}

function applyLonState(state = {}) {
  const jobTypeEl = document.getElementById('jobType');
  if (jobTypeEl && state.jobType) {
    jobTypeEl.value = state.jobType;
  }
  applyExtraFieldValues(state.extraFields || {});
  applyWorkers(Array.isArray(state.workers) ? state.workers : []);
  renderCurrency('[data-total="material"]', state.totals?.material ?? lastMaterialSum);
  renderCurrency('[data-total="labor"]', state.totals?.lon ?? lastLoensum);
}

function captureSheetState(systemId) {
  return {
    materials: cloneMaterialList(getDatasetForSystem(systemId)),
    manualMaterials: captureManualMaterials(),
    lon: captureLonState(),
    totals: {
      material: lastMaterialSum,
      lon: lastLoensum,
    },
  };
}

function applySheetState(systemId, sheet = {}) {
  const option = getSystemOptionById(systemId);
  if (option && Array.isArray(sheet.materials)) {
    applyMaterialList(option.dataset, sheet.materials, systemId);
  }
  if (Array.isArray(sheet.manualMaterials)) {
    applyManualMaterials(sheet.manualMaterials);
  }
  if (sheet.lon) {
    applyLonState(sheet.lon);
  }
}

function createEmptySheet(systemId) {
  const option = getSystemOptionById(systemId);
  const materials = option ? option.dataset.map(item => ({ ...item, quantity: 0 })) : [];
  const manual = Array.from({ length: 3 }, (_, index) => ({
    id: `manual-${index + 1}`,
    name: '',
    price: 0,
    quantity: 0,
    manual: true,
  }));
  return {
    materials,
    manualMaterials: manual,
    lon: cloneLonState({ jobType: 'montage', extraFields: { showSelectedOnly: false }, workers: [] }),
    totals: { material: 0, lon: 0 },
  };
}

function persistCurrentSheetState(systemId, options = {}) {
  if (!currentJobId || !systemId) return;
  const index = getJobIndex(currentJobId);
  if (index === -1) return;
  const job = { ...jobsState[index] };
  if (!job.sheets || typeof job.sheets !== 'object') {
    job.sheets = {};
  }
  job.sheets = { ...job.sheets };
  job.sheets[systemId] = captureSheetState(systemId);
  if (!Array.isArray(job.systems)) job.systems = [];
  if (!job.systems.includes(systemId)) {
    job.systems = job.systems.concat(systemId);
  }
  job.currentSystemId = systemId;
  const updated = updateJob(currentJobId, job);
  if (updated) {
    jobsState[index] = updated;
  }
  if (!options.silent) {
    scheduleJobAutosave();
  }
}

function syncMaterialAuditState(systemId) {
  lastCapturedMaterials.clear();
  const dataset = getDatasetForSystem(systemId);
  dataset.forEach(item => {
    const key = `${systemId}:${item.id}`;
    lastCapturedMaterials.set(key, {
      quantity: toNumber(item.quantity),
      price: toNumber(item.price),
    });
  });
  manualMaterials.forEach(item => {
    const key = `manual:${item.id}`;
    lastCapturedMaterials.set(key, {
      quantity: toNumber(item.quantity),
      price: toNumber(item.price),
    });
  });
}

function syncLonAuditState() {
  lastCapturedLon = {
    jobType: document.getElementById('jobType')?.value || 'montage',
    fields: captureExtraFieldValues(),
    workers: captureWorkers(),
  };
}

function persistCurrentJobState(options = {}) {
  if (!currentJobId) return;
  const index = getJobIndex(currentJobId);
  if (index === -1) return;
  const sagsinfo = collectSagsinfo();
  persistCurrentSheetState(currentSystemId, { silent: true });
  const job = { ...jobsState[index] };
  const jobTypeEl = document.getElementById('jobType');
  let nextStatus = job.status || 'montage';
  if (job.status !== 'lukket') {
    const typeValue = jobTypeEl?.value || 'montage';
    nextStatus = typeValue === 'demontage' ? 'demontage' : 'montage';
  }
  Object.assign(job, {
    sagsnummer: sagsinfo.sagsnummer || '',
    navn: sagsinfo.navn || '',
    adresse: sagsinfo.adresse || '',
    kunde: sagsinfo.kunde || '',
    dato: sagsinfo.dato || '',
    montorer: sagsinfo.montoer || '',
    status: nextStatus,
    metaStatus: currentStatus,
    currentSystemId,
    updatedAt: Date.now(),
  });
  const updated = updateJob(currentJobId, job);
  if (updated) {
    jobsState[index] = updated;
  }
  if (!options.silent) {
    renderJobList();
  }
}

function scheduleJobAutosave() {
  if (jobAutosaveTimer) {
    clearTimeout(jobAutosaveTimer);
  }
  jobAutosaveTimer = setTimeout(() => {
    jobAutosaveTimer = null;
    persistCurrentJobState({ silent: false });
  }, 250);
}

function migrateLegacyState() {
  if (typeof localStorage === 'undefined') return false;
  const legacyKeys = ['csmate.state', 'csmateState'];
  let found = false;
  legacyKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      found = true;
      localStorage.removeItem(key);
    }
  });
  if (!found) return false;
  const previousSystem = currentSystemId;
  currentSystemId = DEFAULT_SYSTEM_ID;
  const sheet = captureSheetState(DEFAULT_SYSTEM_ID);
  currentSystemId = previousSystem;
  const job = createJob({
    navn: DEFAULT_JOB_NAME,
    status: 'montage',
    systems: [DEFAULT_SYSTEM_ID],
    currentSystemId: DEFAULT_SYSTEM_ID,
    sheets: { [DEFAULT_SYSTEM_ID]: sheet },
    auditLog: [],
  });
  refreshJobsState();
  currentJobId = job?.id || null;
  return true;
}

function ensureJobsInitialised() {
  refreshJobsState();
  if (jobsState.length === 0) {
    const migrated = migrateLegacyState();
    if (!migrated) {
      const previousSystem = currentSystemId;
      currentSystemId = DEFAULT_SYSTEM_ID;
      const sheet = captureSheetState(DEFAULT_SYSTEM_ID);
      currentSystemId = previousSystem;
      const job = createJob({
        navn: DEFAULT_JOB_NAME,
        status: 'montage',
        systems: [DEFAULT_SYSTEM_ID],
        currentSystemId: DEFAULT_SYSTEM_ID,
        sheets: { [DEFAULT_SYSTEM_ID]: sheet },
        auditLog: [],
      });
      refreshJobsState();
      currentJobId = job?.id || null;
    } else {
      refreshJobsState();
    }
  }
  if (!currentJobId && jobsState.length > 0) {
    currentJobId = jobsState[0].id;
  }
  if (!currentSystemId) {
    currentSystemId = getCurrentJob()?.currentSystemId || DEFAULT_SYSTEM_ID;
  }
  syncSelectedKeysFromSystem();
}

function renderJobBadges(job) {
  const lockBadge = document.getElementById('jobLockBadge');
  const sentBadge = document.getElementById('jobSentBadge');
  if (lockBadge) {
    if (job?.isLocked) {
      lockBadge.textContent = 'Job låst';
      lockBadge.removeAttribute('hidden');
    } else {
      lockBadge.setAttribute('hidden', '');
    }
  }
  if (sentBadge) {
    if (job?.sentToOfficeAt) {
      const date = new Date(job.sentToOfficeAt);
      sentBadge.textContent = `Fremsendt ${date.toLocaleDateString('da-DK')} ${date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}`;
      sentBadge.removeAttribute('hidden');
    } else {
      sentBadge.setAttribute('hidden', '');
    }
  }
}

function updateLockControls(job) {
  const lockButton = document.getElementById('btnLockJob');
  const sendButton = document.getElementById('btnMarkSent');
  const lockPerm = requirePermission('canLockJobs');
  const sendPerm = requirePermission('canSendJobs');
  if (lockButton) {
    lockButton.disabled = !lockPerm || !currentJobId || job?.isLocked;
  }
  if (sendButton) {
    sendButton.disabled = !sendPerm || !currentJobId;
  }
}

function applyJobLockState(job) {
  const isLocked = !!job?.isLocked;
  const canEditMaterials = requirePermission('canEditMaterials') && !isLocked;
  const canEditPrices = requirePermission('canEditPrices') && !isLocked;
  const materialInputs = document.querySelectorAll('#optaellingSection input, #optaellingSection textarea, #optaellingSection select');
  materialInputs.forEach(input => {
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement)) return;
    if (input.type === 'button' || input.type === 'submit') return;
    if (input.id === 'showSelectedOnly') {
      input.disabled = isLocked;
      input.classList.toggle('disabled-field', input.disabled);
      return;
    }
    let allowed = canEditMaterials;
    if (input.classList.contains('csm-price') || input.classList.contains('price')) {
      allowed = canEditPrices;
    }
    input.disabled = !allowed;
    input.classList.toggle('disabled-field', input.disabled);
  });

  const lonInputs = document.querySelectorAll('#lonSection input, #lonSection textarea, #lonSection select');
  lonInputs.forEach(input => {
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement)) return;
    if (input.type === 'button' || input.type === 'submit') return;
    const allowed = requirePermission('canEditLon') && !isLocked;
    input.disabled = !allowed;
    input.classList.toggle('disabled-field', input.disabled);
  });
}

function applyJobToUI(job, options = {}) {
  if (!job) return;
  currentJobId = job.id;
  currentSystemId = job.currentSystemId || job.systems?.[0] || DEFAULT_SYSTEM_ID;
  syncSelectedKeysFromSystem();

  setSagsinfoField('sagsnummer', job.sagsnummer || '');
  setSagsinfoField('sagsnavn', job.navn || '');
  setSagsinfoField('sagsadresse', job.adresse || '');
  setSagsinfoField('sagskunde', job.kunde || '');
  setSagsinfoField('sagsdato', job.dato || '');
  const montorField = document.getElementById('sagsmontoer');
  if (montorField) {
    montorField.value = job.montorer || '';
  }

  currentStatus = job.metaStatus || 'kladde';
  syncStatusUI(currentStatus);

  const sheet = job.sheets?.[currentSystemId];
  if (sheet) {
    applySheetState(currentSystemId, sheet);
  } else {
    applySheetState(currentSystemId, createEmptySheet(currentSystemId));
  }

  renderJobBadges(job);
  syncMaterialAuditState(currentSystemId);
  syncLonAuditState();
  renderOptaelling();
  updateTotals(true);
  validateSagsinfo();
  renderAuditLog();
  updatePermissionControls();
}

function setCurrentJob(jobId, options = {}) {
  if (!jobId) return;
  if (jobId === currentJobId && !options.force) {
    applyJobToUI(getCurrentJob(), options);
    return;
  }
  if (currentJobId && !options.skipPersist) {
    persistCurrentJobState({ silent: true });
  }
  const job = jobsState.find(item => item.id === jobId);
  if (!job) return;
  applyJobToUI(job, options);
  renderJobList();
}

function formatJobStatus(status) {
  const labels = {
    montage: 'Montage',
    i_brug: 'I brug',
    demontage: 'Demontage',
    lukket: 'Lukket',
  };
  if (!status) return 'Montage';
  return labels[status] || (status.charAt(0).toUpperCase() + status.slice(1));
}

function formatJobTimestamp(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.toLocaleDateString('da-DK')} ${date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}`;
}

function renderJobList() {
  const listBody = document.getElementById('jobList');
  const archivedBody = document.getElementById('archivedJobList');
  const archivedSection = document.getElementById('archivedJobs');
  if (!listBody || !archivedBody) return;

  listBody.innerHTML = '';
  archivedBody.innerHTML = '';

  const search = jobSearchTerm.trim().toLowerCase();
  const statusFilter = jobStatusFilter;

  const shouldInclude = job => {
    const matchesSearch = !search || [job.sagsnummer, job.navn, job.kunde]
      .filter(Boolean)
      .some(value => value.toLowerCase().includes(search));
    const matchesStatus = statusFilter === 'alle' || (job.status || 'montage') === statusFilter;
    return matchesSearch && matchesStatus;
  };

  jobsState.forEach(job => {
    if (!shouldInclude(job)) return;
    const isArchived = (job.status || '').toLowerCase() === 'lukket';
    if (isArchived && !showArchivedJobs) return;

    const systems = Array.isArray(job.systems)
      ? job.systems.map(id => systemLabelMap.get(id) || id).join(', ')
      : '';
    const statusLabel = formatJobStatus(job.status);
    const updatedLabel = formatJobTimestamp(job.updatedAt);
    const actions = [];
    actions.push(`<button type="button" data-action="open" data-job="${job.id}">Åbn</button>`);
    if (requirePermission('canCreateJobs')) {
      actions.push(`<button type="button" data-action="duplicate" data-job="${job.id}">Duplikér</button>`);
    }
    const canArchive = requirePermission('canDeleteJobs');
    if (isArchived) {
      if (canArchive) {
        actions.push(`<button type="button" data-action="restore" data-job="${job.id}">Genåbn</button>`);
      }
    } else if (canArchive) {
      actions.push(`<button type="button" data-action="archive" data-job="${job.id}">Arkivér</button>`);
    }

    const targetBody = isArchived ? archivedBody : listBody;
    const activeClass = job.id === currentJobId ? ' class="active-job"' : '';
    targetBody.insertAdjacentHTML('beforeend', `
      <tr${activeClass}>
        <td>${job.sagsnummer || ''}</td>
        <td>${job.navn || ''}</td>
        <td>${job.kunde || ''}</td>
        <td>${systems}</td>
        <td>${statusLabel}${job.isLocked ? ' 🔒' : ''}</td>
        <td>${updatedLabel}</td>
        <td class="actions">${actions.join(' ')}</td>
      </tr>
    `);
  });

  if (archivedSection) {
    const hasArchived = archivedBody.children.length > 0;
    if (showArchivedJobs && hasArchived) {
      archivedSection.removeAttribute('hidden');
    } else {
      archivedSection.setAttribute('hidden', '');
    }
  }
}

function createNewJob() {
  if (currentJobId) {
    persistCurrentJobState({ silent: true });
  }
  const sheet = createEmptySheet(DEFAULT_SYSTEM_ID);
  const job = createJob({
    navn: '',
    status: 'montage',
    systems: [DEFAULT_SYSTEM_ID],
    currentSystemId: DEFAULT_SYSTEM_ID,
    sheets: { [DEFAULT_SYSTEM_ID]: sheet },
    auditLog: [],
  });
  refreshJobsState();
  if (job?.id) {
    recordAudit(job.id, { scope: 'job', message: 'Oprettede nyt job' });
    setCurrentJob(job.id, { force: true, skipPersist: true });
    renderJobList();
  }
}

function duplicateJob(jobId) {
  const source = jobsState.find(job => job.id === jobId);
  if (!source) return;
  const sheets = {};
  if (source.sheets && typeof source.sheets === 'object') {
    Object.keys(source.sheets).forEach(systemId => {
      const sheet = source.sheets[systemId];
      sheets[systemId] = {
        materials: cloneMaterialList(sheet?.materials || []),
        manualMaterials: cloneMaterialList(sheet?.manualMaterials || []),
        lon: cloneLonState(sheet?.lon || {}),
        totals: { ...(sheet?.totals || {}) },
      };
    });
  }
  const job = createJob({
    navn: source.navn || '',
    adresse: source.adresse || '',
    kunde: source.kunde || '',
    montorer: source.montorer || '',
    status: source.status || 'montage',
    systems: Array.isArray(source.systems) ? source.systems.slice() : [DEFAULT_SYSTEM_ID],
    currentSystemId: source.currentSystemId || DEFAULT_SYSTEM_ID,
    sheets,
    sagsnummer: '',
    dato: '',
    auditLog: [],
  });
  refreshJobsState();
  if (job?.id) {
    recordAudit(job.id, { scope: 'job', message: `Duplikerede job fra ${source.sagsnummer || source.id}` });
    setCurrentJob(job.id, { force: true, skipPersist: true });
    renderJobList();
  }
}

function updateJobStatus(jobId, status, auditMessage) {
  const updated = updateJob(jobId, job => {
    const next = { ...job };
    next.status = status;
    if (status !== 'lukket' && !next.metaStatus) {
      next.metaStatus = 'kladde';
    }
    next.updatedAt = Date.now();
    return next;
  });
  refreshJobsState();
  if (updated) {
    const loggedJob = recordAudit(jobId, { scope: 'status', message: auditMessage });
    const jobForUi = loggedJob || updated;
    if (jobId === currentJobId) {
      applyJobToUI(jobForUi, { force: true, skipPersist: true });
    }
    renderJobList();
  }
}

function archiveJob(jobId) {
  updateJobStatus(jobId, 'lukket', 'Job arkiveret');
}

function restoreJob(jobId) {
  updateJobStatus(jobId, 'montage', 'Job genåbnet');
}

function handleJobTableClick(event) {
  const button = event.target.closest('button[data-action][data-job]');
  if (!button) return;
  const jobId = button.dataset.job;
  const action = button.dataset.action;
  if (!jobId) return;
  switch (action) {
    case 'open':
      setCurrentJob(jobId);
      break;
    case 'duplicate':
      if (requirePermission('canCreateJobs')) duplicateJob(jobId);
      break;
    case 'archive':
      if (requirePermission('canDeleteJobs')) archiveJob(jobId);
      break;
    case 'restore':
      if (requirePermission('canDeleteJobs')) restoreJob(jobId);
      break;
    default:
      break;
  }
}

function setupJobUI() {
  const searchInput = document.getElementById('jobSearch');
  if (searchInput) {
    searchInput.addEventListener('input', event => {
      jobSearchTerm = event.target.value || '';
      renderJobList();
    });
  }

  const statusSelect = document.getElementById('jobStatusFilter');
  if (statusSelect) {
    statusSelect.addEventListener('change', event => {
      jobStatusFilter = event.target.value || 'alle';
      renderJobList();
    });
  }

  const archivedToggle = document.getElementById('toggleArchived');
  if (archivedToggle) {
    archivedToggle.addEventListener('change', event => {
      showArchivedJobs = !!event.target.checked;
      renderJobList();
    });
  }

  const createBtn = document.getElementById('btnCreateJob');
  if (createBtn) {
    createBtn.disabled = !!activeUser && !requirePermission('canCreateJobs');
    createBtn.addEventListener('click', () => {
      if (activeUser && !requirePermission('canCreateJobs')) return;
      createNewJob();
    });
  }

  const jobTables = [document.getElementById('jobList'), document.getElementById('archivedJobList')];
  jobTables.forEach(table => {
    table?.addEventListener('click', handleJobTableClick);
  });

  renderJobList();
}

function setupSagsinfoAudit() {
  SAGSINFO_AUDIT_FIELDS.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', handleSagsinfoChange);
      el.addEventListener('blur', handleSagsinfoChange);
    }
  });
}

function setupMaterialAuditListeners() {
  const container = document.getElementById('optaellingContainer');
  container?.addEventListener('input', handleMaterialInput);
}

function setupLonAuditListeners() {
  const jobTypeEl = document.getElementById('jobType');
  jobTypeEl?.addEventListener('change', handleLonFieldChange);
  JOB_EXTRA_FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('change', handleLonFieldChange);
    el?.addEventListener('blur', handleLonFieldChange);
  });
  const workersContainer = document.getElementById('workers');
  workersContainer?.addEventListener('input', handleWorkerFieldChange);
  workersContainer?.addEventListener('change', handleWorkerFieldChange);
}

function handleMaterialInput(event) {
  if (!currentJobId) return;
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const row = target.closest('.material-row');
  if (!row) return;
  const itemId = row.dataset.itemId;
  if (!itemId) return;
  const systemKey = row.dataset.system || ''; // e.g. 'bosta'
  const systemId = SYSTEM_ID_BY_KEY[systemKey] || (systemKey === 'manual' ? 'manual' : currentSystemId);
  const key = systemId === 'manual' ? `manual:${itemId}` : `${systemId}:${itemId}`;
  const entry = lastCapturedMaterials.get(key) || { quantity: 0, price: 0 };
  if (target.classList.contains('csm-qty')) {
    const newQty = toNumber(target.value);
    if (entry.quantity !== newQty) {
      recordAudit(currentJobId, {
        scope: 'materiale',
        message: `Opdaterede antal for ${itemId}`,
        diff: { type: 'quantity', itemId, systemId, before: entry.quantity, after: newQty },
      });
      entry.quantity = newQty;
      lastCapturedMaterials.set(key, entry);
      scheduleJobAutosave();
    }
  } else if (target.classList.contains('csm-price')) {
    const newPrice = toNumber(target.value);
    if (entry.price !== newPrice) {
      recordAudit(currentJobId, {
        scope: 'materiale',
        message: `Opdaterede pris for ${itemId}`,
        diff: { type: 'price', itemId, systemId, before: entry.price, after: newPrice },
      });
      entry.price = newPrice;
      lastCapturedMaterials.set(key, entry);
      scheduleJobAutosave();
    }
  }
}

function handleLonFieldChange(event) {
  if (!currentJobId) return;
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
  const job = getCurrentJob();
  if (!job) return;
  const id = target.id;
  if (id === 'jobType') {
    const newValue = target.value || 'montage';
    const prev = lastCapturedLon.jobType || 'montage';
    if (newValue !== prev) {
      recordAudit(currentJobId, {
        scope: 'lon',
        message: `Skiftede arbejdstype til ${newValue}`,
        diff: { field: 'jobType', before: prev, after: newValue },
      });
      lastCapturedLon.jobType = newValue;
      persistCurrentJobState({ silent: true });
    }
    return;
  }
  if (JOB_EXTRA_FIELD_IDS.includes(id)) {
    const newValue = target.value || '';
    const prev = lastCapturedLon.fields?.[id] || '';
    if (newValue !== prev) {
      recordAudit(currentJobId, {
        scope: 'lon',
        message: `Opdaterede ${id}`,
        diff: { field: id, before: prev, after: newValue },
      });
      if (!lastCapturedLon.fields) lastCapturedLon.fields = {};
      lastCapturedLon.fields[id] = newValue;
      persistCurrentJobState({ silent: true });
    }
  }
}

function handleWorkerFieldChange(event) {
  if (!currentJobId) return;
  const target = event.target;
  const row = target.closest('.worker-row');
  if (!row) return;
  const workers = Array.from(document.querySelectorAll('.worker-row'));
  const index = workers.indexOf(row);
  if (index === -1) return;
  const workerName = row.querySelector('legend')?.textContent?.trim() || `Mand ${index + 1}`;
  const prevWorker = Array.isArray(lastCapturedLon.workers) ? lastCapturedLon.workers[index] : null;
  if (!prevWorker) {
    syncLonAuditState();
    return;
  }
  const hoursInput = row.querySelector('.worker-hours');
  const uddSelect = row.querySelector('.worker-udd');
  const tillaegInput = row.querySelector('.worker-tillaeg');
  let changed = false;
  const diffs = [];
  if (hoursInput && hoursInput === target) {
    const newHours = hoursInput.value || '';
    if (newHours !== prevWorker.hours) {
      diffs.push({ field: 'hours', before: prevWorker.hours, after: newHours });
      prevWorker.hours = newHours;
      changed = true;
    }
  }
  if (uddSelect && uddSelect === target) {
    const newUdd = uddSelect.value || '';
    if (newUdd !== prevWorker.udd) {
      diffs.push({ field: 'udd', before: prevWorker.udd, after: newUdd });
      prevWorker.udd = newUdd;
      changed = true;
    }
  }
  if (tillaegInput && tillaegInput === target) {
    const newTillaeg = tillaegInput.value || '';
    if (newTillaeg !== prevWorker.tillaeg) {
      diffs.push({ field: 'tillaeg', before: prevWorker.tillaeg, after: newTillaeg });
      prevWorker.tillaeg = newTillaeg;
      changed = true;
    }
  }
  if (changed) {
    recordAudit(currentJobId, {
      scope: 'lon',
      message: `Opdaterede ${workerName}`,
      diff: { worker: workerName, changes: diffs },
    });
    lastCapturedLon.workers[index] = prevWorker;
    persistCurrentJobState({ silent: true });
  }
}

function updatePermissionControls() {
  const createBtn = document.getElementById('btnCreateJob');
  if (createBtn) {
    createBtn.disabled = !!activeUser && !requirePermission('canCreateJobs');
  }
  const addWorkerBtn = document.getElementById('btnAddWorker');
  if (addWorkerBtn) {
    const job = getCurrentJob();
    const locked = !!job?.isLocked;
    addWorkerBtn.disabled = !requirePermission('canEditLon') || locked;
  }
  const userAdminPanel = document.getElementById('user-admin-panel');
  if (userAdminPanel) {
    const allowed = requirePermission('canManageUsers');
    userAdminPanel.toggleAttribute('hidden', !allowed);
  }
  updateLockControls(getCurrentJob());
  applyJobLockState(getCurrentJob());
}

function lockCurrentJob() {
  if (!currentJobId || !requirePermission('canLockJobs')) return;
  const result = lockJobPersisted(currentJobId);
  refreshJobsState();
  if (result) {
    applyJobToUI(result, { force: true, skipPersist: true });
    renderJobList();
  }
}

function markCurrentJobSent() {
  if (!currentJobId || !requirePermission('canSendJobs')) return;
  const result = markJobSent(currentJobId);
  refreshJobsState();
  if (result) {
    applyJobToUI(result, { force: true, skipPersist: true });
    renderJobList();
  }
}

function renderAuditLog() {
  const body = document.getElementById('auditLogBody');
  if (!body) return;
  body.innerHTML = '';
  const job = getCurrentJob();
  const exportBtn = document.getElementById('btnExportAudit');
  if (!job || !Array.isArray(job.auditLog)) {
    if (exportBtn) exportBtn.disabled = true;
    return;
  }
  const entries = job.auditLog.slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  if (exportBtn) {
    exportBtn.disabled = entries.length === 0;
  }
  entries.forEach(entry => {
    const ts = entry.timestamp ? formatJobTimestamp(entry.timestamp) : '-';
    const scope = entry.scope || '';
    const user = entry.user || '';
    const message = entry.message || '';
    body.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${ts}</td>
        <td>${scope}</td>
        <td>${user}</td>
        <td>${message}</td>
      </tr>
    `);
  });
}

function exportAuditLogCsv() {
  const job = getCurrentJob();
  if (!job || !Array.isArray(job.auditLog) || job.auditLog.length === 0) return;
  const rows = job.auditLog.map(entry => {
    const diff = entry.diff != null ? JSON.stringify(entry.diff) : '';
    const iso = entry.timestamp ? new Date(entry.timestamp).toISOString() : '';
    return [iso, entry.scope || '', entry.user || '', (entry.message || '').replace(/\r?\n/g, ' '), diff].map(value => {
      const safe = String(value).replace(/"/g, '""');
      return `"${safe}"`;
    }).join(';');
  });
  const header = '"timestamp_iso";"scope";"user";"message";"diff"';
  const csv = [header].concat(rows).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const base = job.sagsnummer?.trim() || job.navn?.trim() || job.id;
  link.download = `auditlog-${base}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  recordAudit(job.id, { scope: 'export', message: 'Eksporterede audit-log (CSV)' });
}

function handleSagsinfoChange(event) {
  if (!currentJobId) return;
  const target = event.target;
  const fieldConfig = SAGSINFO_AUDIT_FIELDS.find(item => item.id === target.id);
  if (!fieldConfig) return;
  const job = getCurrentJob();
  if (!job) return;
  const newValue = target.value || '';
  const oldValue = job[fieldConfig.key] || '';
  if (newValue === oldValue) return;
  recordAudit(currentJobId, {
    scope: 'job',
    message: `Opdaterede ${fieldConfig.label}`,
    diff: { field: fieldConfig.key, before: oldValue, after: newValue },
  });
  persistCurrentJobState({ silent: true });
  renderJobList();
}

const USER_ROLE_OPTIONS = ['owner', 'tenantAdmin', 'worker', 'guest'];

function normalizeRoleValue (role) {
  if (typeof role !== 'string') return '';
  const trimmed = role.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower === 'firma-admin' || lower === 'firmadmin' || lower === 'tenant_admin' || lower === 'tenantadmin' || lower === 'formand' || lower === 'foreman' || lower === 'admin') return 'tenantAdmin';
  if (lower === 'montør' || lower === 'montor' || lower === 'worker' || lower === 'user' || lower === 'bruger') return 'worker';
  if (lower === 'owner' || lower === 'superadmin' || lower === 'ejer') return 'owner';
  if (lower === 'guest' || lower === 'gæst' || lower === 'gaest') return 'guest';
  return trimmed;
}

function formatRoleLabel (role) {
  const normalized = normalizeRoleValue(role);
  const labels = {
    owner: 'Owner',
    tenantAdmin: 'Firma-admin',
    worker: 'Medarbejder',
    guest: 'Gæst',
    guest: 'Gæst'
  };
  if (labels[normalized]) return labels[normalized];
  if (labels[role]) return labels[role];
  return normalized || role || 'Ukendt';
}

function requirePermission (key) {
  return canPerformAction({
    user: activeUser,
    action: key,
    rolePermissions: ROLE_PERMISSIONS
  });
}

function getAuth0DisplayName (state = latestAuthState) {
  if (!state?.isAuthenticated || !state.user) return '';
  const { name, nickname, email } = state.user;
  const candidates = [name, nickname, email];
  for (let index = 0; index < candidates.length; index += 1) {
    const value = candidates[index];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return '';
}

function getActiveUserName () {
  const candidate = typeof activeUser?.displayName === 'string' ? activeUser.displayName : activeUser?.name;
  return typeof candidate === 'string' ? candidate.trim() : '';
}

function updateAuthUi (isAuthenticated, user) {
  if (typeof document === 'undefined') return;

  const loginBtn = document.querySelector('[data-auth="login"]');
  const signupBtn = document.querySelector('[data-auth="signup"]');
  const offlineBtn = document.querySelector('[data-auth="offline"]');
  const logoutBtn = document.querySelector('[data-auth="logout"]');
  const userLabel = document.querySelector('[data-auth="user-label"]');
  const switchUserBtn = document.getElementById('btn-switch-user');

  const controls = [loginBtn, signupBtn, offlineBtn];
  controls.forEach(button => {
    if (!button) return;
    button.classList.toggle('hidden', Boolean(isAuthenticated));
  });

  if (logoutBtn) {
    logoutBtn.classList.toggle('hidden', !isAuthenticated);
  }

  if (switchUserBtn) {
    switchUserBtn.classList.toggle('hidden', Boolean(isAuthenticated));
  }

  if (userLabel) {
    const authLabel = isAuthenticated ? getAuth0DisplayName({ isAuthenticated, user }) : '';
    const activeName = getActiveUserName();
    const offlineState = Boolean(window.CSMATE_AUTH?.offline && !isAuthenticated);
    const label = authLabel || activeName || (offlineState ? 'Offline gæst' : '');

    if (label) {
      userLabel.textContent = label;
      userLabel.classList.remove('hidden');
    } else {
      userLabel.textContent = 'Ingen bruger';
      userLabel.classList.add('hidden');
    }
  }

  updateAdminTabVisibility();
}

function ensureUserAdminContainer () {
  if (typeof document === 'undefined') return null;
  const panel = document.getElementById('user-admin-panel');
  if (!panel) return null;
  if (!panel.dataset.bound) {
    panel.addEventListener('change', handleUserAdminChange);
    panel.addEventListener('click', handleUserAdminClick);
    panel.dataset.bound = 'true';
  }
  return panel;
}

function handleUserAdminChange (event) {
  if (!requirePermission('canManageUsers')) return;
  const select = event.target;
  if (!(select instanceof HTMLSelectElement)) return;
  if (select.name !== 'user-role') return;
  const userId = select.dataset.userId;
  if (!userId) return;

  const nextRole = normalizeRoleValue(select.value) || select.value;
  const updated = updateStoredUserRole(userId, nextRole, activeUser?.id);
  if (updated && activeUser && updated.id === activeUser.id) {
    applyUserToUi(updated);
  } else {
    renderUserAdminTable();
  }
}

function handleUserAdminClick (event) {
  if (!requirePermission('canManageUsers')) return;
  const button = event.target instanceof HTMLElement
    ? event.target.closest('button[data-action]')
    : null;
  if (!button) return;
  const action = button.dataset.action;
  const userId = button.dataset.userId;
  if (action === 'set-active-user' && userId) {
    event.preventDefault();
    const stored = setStoredCurrentUser(userId);
    applyUserToUi(stored);
  }
}

const lastLoginFormatter = (typeof Intl !== 'undefined' && Intl.DateTimeFormat)
  ? new Intl.DateTimeFormat('da-DK', { dateStyle: 'short', timeStyle: 'short' })
  : null;

function formatLastLogin (timestamp) {
  if (!Number.isFinite(timestamp)) return 'Aldrig';
  try {
    if (lastLoginFormatter) return lastLoginFormatter.format(timestamp);
    return new Date(timestamp).toLocaleString('da-DK');
  } catch (error) {
    console.warn('Kunne ikke formatere tidspunkt', error);
    return new Date(timestamp).toLocaleString('da-DK');
  }
}

function renderUserAdminTable () {
  const panel = ensureUserAdminContainer();
  if (!panel) return;

  const tbody = panel.querySelector('#user-admin-table-body');
  if (!tbody) return;
  const emptyState = panel.querySelector('#user-admin-empty');
  const allowed = requirePermission('canManageUsers');

  panel.toggleAttribute('hidden', !allowed);
  tbody.innerHTML = '';

  if (!allowed) {
    if (emptyState) emptyState.setAttribute('hidden', '');
    return;
  }

  const users = getAllUsers();

  if (!Array.isArray(users) || users.length === 0) {
    if (emptyState) emptyState.removeAttribute('hidden');
    return;
  }

  if (emptyState) emptyState.setAttribute('hidden', '');

  users.forEach(user => {
    const tr = document.createElement('tr');
    const userId = user?.id || '';
    if (userId) tr.dataset.userId = userId;
    const canonicalRole = normalizeRoleValue(user?.role);
    if (activeUser?.id && userId === activeUser.id) {
      tr.classList.add('is-active');
    }

    const nameCell = document.createElement('td');
    nameCell.textContent = user?.name?.trim?.() || user?.email || user?.emailKey || 'Ukendt';
    tr.appendChild(nameCell);

    const emailCell = document.createElement('td');
    emailCell.textContent = user?.email || user?.emailKey || '—';
    tr.appendChild(emailCell);

    const roleCell = document.createElement('td');
    const roleSelect = document.createElement('select');
    roleSelect.name = 'user-role';
    if (userId) roleSelect.dataset.userId = userId;
    USER_ROLE_OPTIONS.forEach(optionRole => {
      const option = document.createElement('option');
      option.value = optionRole;
      option.textContent = formatRoleLabel(optionRole);
      roleSelect.appendChild(option);
    });
    if (canonicalRole && !USER_ROLE_OPTIONS.includes(canonicalRole)) {
      const option = document.createElement('option');
      option.value = canonicalRole;
      option.textContent = formatRoleLabel(canonicalRole);
      roleSelect.appendChild(option);
    }
    roleSelect.value = canonicalRole || roleSelect.options[0]?.value || '';
    roleCell.appendChild(roleSelect);
    tr.appendChild(roleCell);

    const lastLoginCell = document.createElement('td');
    lastLoginCell.textContent = formatLastLogin(user?.lastLoginAt);
    tr.appendChild(lastLoginCell);

    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions';
    if (activeUser?.id && userId === activeUser.id) {
      const badge = document.createElement('span');
      badge.className = 'status-pill';
      badge.textContent = 'Aktiv bruger';
      actionsCell.appendChild(badge);
    } else {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn small';
      button.dataset.action = 'set-active-user';
      if (userId) button.dataset.userId = userId;
      button.textContent = 'Skift til';
      actionsCell.appendChild(button);
    }
    tr.appendChild(actionsCell);

    tbody.appendChild(tr);
  });
}

function setupUserManagementUi () {
  if (typeof document === 'undefined') return;
  const overlay = document.getElementById('userOverlay');
  if (overlay?.parentElement) {
    overlay.remove();
  }
  const trigger = document.getElementById('btnOpenUserOverlay');
  if (trigger) {
    trigger.textContent = 'Offline login';
    trigger.addEventListener('click', () => {
      const container = ensureUserAdminContainer();
      if (!container) return;
      container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}

function applyRoleGuards (user = activeUser) {
  if (typeof document !== 'undefined') {
    const roles = getUserRoles(user);
    const role = roles.length > 0 ? roles[0] : normalizeRoleValue(user?.role) || 'guest';
    document.body?.setAttribute('data-user-role', role);
  }
  updatePermissionControls();
}

function applyUserToUi (user) {
  if (user && typeof user === 'object') {
    const roles = getUserRoles(user);
    const primaryRole = roles.length > 0 ? roles[0] : normalizeRoleValue(user.role) || user.role || '';
    activeUser = {
      ...user,
      displayName: typeof user.displayName === 'string' && user.displayName.trim()
        ? user.displayName.trim()
        : (typeof user.name === 'string' && user.name.trim() ? user.name.trim() : user.email || ''),
      roles,
      role: primaryRole
    };
    if (Array.isArray(user.tenants)) {
      activeUser.tenants = user.tenants.map(entry => ({ ...entry }));
    }
  } else {
    activeUser = null;
  }
  setAuditUserResolver(() => {
    const name = getActiveUserName();
    return name || null;
  });
  applyRoleGuards(activeUser);
  renderUserAdminTable();
  renderJobList();
  syncAuthUiFromState();
}

if (typeof window !== 'undefined') {
  window.csmate = window.csmate || {};
  window.csmate.setActiveUser = applyUserToUi;
}

function initAuthButtons () {
  if (typeof document === 'undefined') return;

  const loginBtn = document.querySelector('[data-auth="login"]');
  if (loginBtn) {
    loginBtn.addEventListener('click', event => {
      event.preventDefault();
      loginWithRedirect();
    });
  }

  const signupBtn = document.querySelector('[data-auth="signup"]');
  if (signupBtn) {
    signupBtn.addEventListener('click', event => {
      event.preventDefault();
      signupWithRedirect();
    });
  }

  const offlineBtn = document.querySelector('[data-auth="offline"]');
  if (offlineBtn) {
    offlineBtn.addEventListener('click', event => {
      event.preventDefault();
      window.CSMATE_AUTH = {
        ...(window.CSMATE_AUTH || {}),
        isReady: true,
        isAuthenticated: false,
        user: null,
        offline: true
      };
      setLatestAuthState({ isAuthenticated: false, user: null });
      updateAuthUi(false, null);
    });
  }

  const logoutBtn = document.querySelector('[data-auth="logout"]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', event => {
      event.preventDefault();
      authLogout();
    });
  }

  const switchBtn = document.getElementById('btn-switch-user');
  if (switchBtn) {
    switchBtn.addEventListener('click', event => {
      event.preventDefault();
      loginWithRedirect();
    });
  }
}
const TRAELLE_RATE35 = 10.44;
const TRAELLE_RATE50 = 14.62;
const BORING_HULLER_RATE = 4.70;
const LUK_HULLER_RATE = 3.45;
const BORING_BETON_RATE = 11.49;
const OPSKYDELIGT_RATE = 9.67;
const KM_RATE = 2.12;
const TILLAEG_UDD1 = 42.98;
const TILLAEG_UDD2 = 49.38;

// --- Scaffold Part Lists ---
const dataBosta = [];
const dataHaki = [];
const dataModex = [];
const dataAlfix = [];

function applyBaseDataset(target, baseItems, systemKey) {
  if (!Array.isArray(target)) return;
  target.splice(0, target.length);
  if (!Array.isArray(baseItems)) return;
  baseItems.forEach((item, index) => {
    const entry = {
      id: item?.id ?? `${systemKey}-${index + 1}`,
      name: typeof item?.name === 'string' ? item.name : '',
      price: toNumber(item?.price),
      quantity: 0,
      systemKey,
    };
    target.push(entry);
  });
}

let baseMaterialListsPromise = null;
function primeBaseMaterialLists() {
  if (!baseMaterialListsPromise) {
    baseMaterialListsPromise = (async () => {
      if (dataBosta.length && dataHaki.length && dataModex.length && dataAlfix.length) {
        ensureDatasetSystemKeys();
        return;
      }
      try {
        const module = await import('./src/data/materials-static.js');
        const { BOSTA_BASE, HAKI_BASE, MODEX_BASE, ALFIX_BASE } = module;
        applyBaseDataset(dataBosta, BOSTA_BASE, 'bosta');
        applyBaseDataset(dataHaki, HAKI_BASE, 'haki');
        applyBaseDataset(dataModex, MODEX_BASE, 'modex');
        applyBaseDataset(dataAlfix, ALFIX_BASE, 'alfix');
      } catch (error) {
        console.warn('Kunne ikke indlæse statiske materialelister', error);
      } finally {
        ensureDatasetSystemKeys();
      }
    })();
  }
  return baseMaterialListsPromise;
}

const systemOptions = [
  { key: 'bosta', id: 'BOSTA70', label: 'BOSTA', dataset: dataBosta },
  { key: 'haki', id: 'HAKI', label: 'HAKI', dataset: dataHaki },
  { key: 'modex', id: 'MODEX', label: 'MODEX', dataset: dataModex },
  { key: 'alfix', id: 'ALFIX_VARIO', label: 'Alfix VARIO', dataset: dataAlfix },
];

function ensureDatasetSystemKeys() {
  systemOptions.forEach(option => {
    if (!Array.isArray(option.dataset)) return;
    option.dataset.forEach(item => {
      if (item && typeof item === 'object') {
        item.systemKey = option.key;
      }
    });
  });
}

ensureDatasetSystemKeys();

const systemLabelMap = new Map(systemOptions.map(option => [option.id, option.label]));

function getSystemOptionById(systemId) {
  const normalized = systemId && typeof systemId === 'string' ? systemId : DEFAULT_SYSTEM_ID;
  return systemOptions.find(option => option.id === normalized) || systemOptions[0];
}

function getDatasetForSystem(systemId) {
  const option = getSystemOptionById(systemId);
  if (!option || !Array.isArray(option.dataset)) return [];
  return option.dataset;
}

const selectedSystemKeys = new Set(systemOptions.length ? [systemOptions[0].key] : []);

function ensureSystemSelection() {
  if (selectedSystemKeys.size === 0 && systemOptions.length) {
    selectedSystemKeys.add(systemOptions[0].key);
  }
}

function getSelectedSystemKeys() {
  ensureSystemSelection();
  return Array.from(selectedSystemKeys);
}

function syncSelectedKeysFromSystem() {
  selectedSystemKeys.clear();
  const option = getSystemOptionById(currentSystemId);
  if (option) {
    selectedSystemKeys.add(option.key);
  }
}

function toggleDuplicateWarning(duplicates = [], conflicts = []) {
  const warning = document.getElementById('systemDuplicateWarning');
  if (!warning) return;
  const duplicateNames = Array.from(new Set(duplicates.filter(Boolean))).slice(0, 6);
  const conflictNames = Array.from(new Set(conflicts.filter(Boolean))).slice(0, 6);
  if (duplicateNames.length === 0 && conflictNames.length === 0) {
    warning.textContent = '';
    warning.setAttribute('hidden', '');
    return;
  }

  const parts = [];
  if (duplicateNames.length) {
    parts.push(`Materialer slået sammen: ${duplicateNames.join(', ')}`);
  }
  if (conflictNames.length) {
    parts.push(`Kontroller varenr.: ${conflictNames.join(', ')}`);
  }
  warning.textContent = parts.join('. ');
  warning.removeAttribute('hidden');
}

function aggregateSelectedSystemData() {
  const datasets = getDatasetForSystem(currentSystemId) || [];
  const aggregated = [];
  datasets.forEach(item => {
    if (item) aggregated.push(item);
  });
  toggleDuplicateWarning([], []);
  return aggregated;
}

const manualMaterials = Array.from({ length: 3 }, (_, index) => ({
  id: `manual-${index + 1}`,
  name: '',
  price: 0,
  quantity: 0,
  manual: true,
}));

function hydrateMaterialListsFromJson() {
  const mapList = (target, entries, prefix, systemKey) => {
    if (!Array.isArray(entries) || entries.length === 0) return false;
    const previous = new Map(
      target.map(item => [normalizeKey(item.name || ''), item.quantity || 0])
    );
    const filteredEntries = entries.filter(entry => {
      const rawName = entry?.beskrivelse ?? entry?.navn ?? entry?.name ?? '';
      const key = normalizeKey(String(rawName).trim());
      return !EXCLUDED_MATERIAL_KEYS.includes(key);
    });

    const next = filteredEntries.map((entry, index) => {
      const rawName = entry?.beskrivelse ?? entry?.navn ?? entry?.name ?? '';
      const baseName = String(rawName).trim();
      const name = baseName || `${prefix} materiale ${index + 1}`;
      const key = normalizeKey(name);
      const priceValue = entry?.pris ?? entry?.price ?? 0;
      return {
        id: `${prefix}-${index + 1}`,
        name,
        price: toNumber(priceValue),
        quantity: previous.get(key) ?? 0,
        systemKey,
      };
    });
    target.splice(0, target.length, ...next);
    ensureDatasetSystemKeys();
    return true;
  };

  const candidateSources = [
    { target: dataBosta, prefix: 'B', systemKey: 'bosta', sources: ['Bosta', 'bosta', 'BOSTA', 'BOSTA_DATA'] },
    { target: dataHaki, prefix: 'H', systemKey: 'haki', sources: ['HAKI', 'haki', 'HAKI_DATA'] },
    { target: dataModex, prefix: 'M', systemKey: 'modex', sources: ['MODEX', 'modex', 'MODEX_DATA'] },
    { target: dataAlfix, prefix: 'A', systemKey: 'alfix', sources: ['Alfix', 'alfix', 'ALFIX', 'ALFIX_DATA'] },
  ].map(({ target, prefix, systemKey, sources }) => ({
    target,
    prefix,
    systemKey,
    normalizedSources: sources
      .map(source => normalizeKey(source)),
  }));

  const applyLists = lists => {
    if (!lists || typeof lists !== 'object') return false;
    const normalizedLists = new Map();
    for (const [rawKey, value] of Object.entries(lists)) {
      const normalizedKey = normalizeKey(rawKey);
      if (normalizedKey) {
        normalizedLists.set(normalizedKey, value);
      }
    }

    let hydrated = false;
    for (const { target, prefix, normalizedSources, systemKey } of candidateSources) {
      for (const candidateKey of normalizedSources) {
        if (!normalizedLists.has(candidateKey)) continue;
        const entries = normalizedLists.get(candidateKey);
        if (mapList(target, entries, prefix, systemKey)) {
          hydrated = true;
          break;
        }
      }
    }

    if (hydrated) {
      renderOptaelling();
      updateTotals(true);
    }

    return hydrated;
  };

  const tryDatasetFallback = () => {
    if (typeof fetch !== 'function') return Promise.resolve(false);

    return fetch('./dataset.js')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.text();
      })
      .then(script => {
        const factory = new Function(
          `${script}; return {
            BOSTA_DATA: typeof BOSTA_DATA !== 'undefined' ? BOSTA_DATA : undefined,
            HAKI_DATA: typeof HAKI_DATA !== 'undefined' ? HAKI_DATA : undefined,
            MODEX_DATA: typeof MODEX_DATA !== 'undefined' ? MODEX_DATA : undefined,
            ALFIX_DATA: typeof ALFIX_DATA !== 'undefined' ? ALFIX_DATA : undefined,
          };`
        );
        const data = factory();
        return applyLists({
          BOSTA_DATA: data?.BOSTA_DATA,
          HAKI_DATA: data?.HAKI_DATA,
          MODEX_DATA: data?.MODEX_DATA,
          ALFIX_DATA: data?.ALFIX_DATA,
        });
      })
      .catch(err => {
        console.error('Kunne ikke indlæse fallback dataset.js', err);
        return false;
      });
  };

  if (typeof fetch !== 'function') {
    applyLists(typeof window !== 'undefined' ? window.COMPLETE_LISTS : undefined);
    return;
  }

  fetch('./complete_lists.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(applyLists)
    .then(applied => applied || tryDatasetFallback())
    .catch(err => {
      console.warn('Kunne ikke hente komplette materialelister', err);
      return tryDatasetFallback();
    });
}

function getAllData(includeManual = true) {
  const combined = aggregateSelectedSystemData();
  if (!includeManual) return combined;
  return combined.concat(manualMaterials);
}

function getActiveMaterialList() {
  return aggregateSelectedSystemData();
}

function findMaterialById(id) {
  const allSets = [dataBosta, dataHaki, dataModex, dataAlfix, manualMaterials];
  for (const list of allSets) {
    const match = list.find(item => String(item.id) === String(id));
    if (match) return match;
  }
  return null;
}

// --- UI for List Selection ---
function setupListSelectors() {
  const container = document.getElementById('systemTabs');
  if (!container) return;
  const buttons = Array.from(container.querySelectorAll('button[data-system]'));
  if (!buttons.length) return;

  const activate = (systemId, options = {}) => {
    if (!systemId) return;
    if (!options.force) {
      if (systemId === currentSystemId) {
        syncSystemSelectorState();
        return;
      }
      persistCurrentSheetState(currentSystemId, { silent: true });
    }
    currentSystemId = systemId;
    const job = getCurrentJob();
    if (job) {
      const sheet = job.sheets?.[systemId];
      if (sheet) {
        applySheetState(systemId, sheet);
      } else {
        applySheetState(systemId, createEmptySheet(systemId));
      }
    } else {
      applySheetState(systemId, createEmptySheet(systemId));
    }
    syncSelectedKeysFromSystem();
    syncSystemSelectorState();
    if (!options.skipRender) {
      renderOptaelling();
      updateTotals(true);
    }
    if (!options.silent && currentJobId) {
      recordAudit(currentJobId, {
        scope: 'sheet',
        message: `Skiftede system til ${systemId}`
      });
    }
    scheduleJobAutosave();
  };

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      activate(button.dataset.system);
    });
  });

  if (!SYSTEM_IDS.includes(currentSystemId)) {
    currentSystemId = buttons[0]?.dataset.system || DEFAULT_SYSTEM_ID;
  }
  syncSelectedKeysFromSystem();
  activate(currentSystemId, { force: true, skipRender: true, silent: true });
}

function syncSystemSelectorState() {
  const container = document.getElementById('systemTabs');
  if (!container) return;
  container.querySelectorAll('button[data-system]').forEach(button => {
    const isActive = button.dataset.system === currentSystemId;
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    button.classList.toggle('active', isActive);
    button.disabled = isActive;
  });
}

// --- Rendering Functions ---
function renderOptaelling() {
  const container = document.getElementById('optaellingContainer');
  if (!container) return;
  syncSystemSelectorState();

  const activeItems = getActiveMaterialList();
  const items = Array.isArray(activeItems)
    ? activeItems.concat(manualMaterials)
    : manualMaterials.slice();

  if (!items.length) {
    container.textContent = '';
    const message = document.createElement('p');
    message.className = 'empty-state';
    message.textContent = 'Ingen systemer valgt. Vælg et eller flere systemer for at starte optællingen.';
    container.appendChild(message);
    if (materialsVirtualListController) {
      materialsVirtualListController.controller.destroy?.();
      materialsVirtualListController = null;
    }
    return;
  }

  let zoomWrapper = container.querySelector('.mat-zoom');
  if (!zoomWrapper) {
    container.textContent = '';
    zoomWrapper = document.createElement('div');
    zoomWrapper.className = 'mat-zoom';
    container.appendChild(zoomWrapper);
  } else {
    container.querySelectorAll('.empty-state').forEach(node => node.remove());
  }

  let list = zoomWrapper.querySelector('.materials-list');
  if (!list) {
    list = document.createElement('div');
    list.className = 'materials-list csm-materials-list';
    zoomWrapper.appendChild(list);
  }
  list.classList.add('csm-materials-list');

  const renderRow = (item, index) => {
    const result = createMaterialRow(item, {
      admin,
      toNumber,
      formatCurrency,
      systemLabelMap
    })
    const row = result?.row || result
    if (row) {
      row.dataset.index = String(index)
    }
    return result
  }

  if (!materialsVirtualListController || materialsVirtualListController.container !== list) {
    const controller = createVirtualMaterialsList({
      container: list,
      items,
      renderRow,
      rowHeight: 64,
      overscan: 8
    })
    materialsVirtualListController = { container: list, controller }
  } else {
    materialsVirtualListController.controller.update(items)
  }

  initMaterialsScrollLock(container)
  updateTotals(true)
}

// --- Update Functions ---
function handleOptaellingInput(event) {
  const target = event.target;
  if (!target || !target.classList) return;
  if (target.classList.contains('qty')) {
    handleQuantityChange(event);
  } else if (target.classList.contains('price')) {
    handlePriceChange(event);
  } else if (target.classList.contains('manual-name')) {
    handleManualNameChange(event);
  }
}

function handleQuantityChange(event) {
  const { id } = event.target.dataset;
  updateQty(id, event.target.value);
}

function handlePriceChange(event) {
  const { id } = event.target.dataset;
  updatePrice(id, event.target.value);
}

function handleManualNameChange(event) {
  const { id } = event.target.dataset;
  const item = findMaterialById(id);
  if (item && item.manual) {
    item.name = event.target.value;
  }
}

function findMaterialRowElement(id) {
  const rows = document.querySelectorAll('.material-row');
  return Array.from(rows).find(row =>
    Array.from(row.querySelectorAll('input[data-id]')).some(input => input.dataset.id === String(id))
  ) || null;
}

function updateQty(id, val) {
  const item = findMaterialById(id);
  if (!item) return;
  item.quantity = toNumber(val);
  refreshMaterialRowDisplay(id);
  updateTotals();
}

function updatePrice(id, val) {
  const item = findMaterialById(id);
  if (!item) return;
  if (!item.manual && !admin) return;
  item.price = toNumber(val);
  refreshMaterialRowDisplay(id);
  updateTotals();
}

function refreshMaterialRowDisplay(id) {
  const item = findMaterialById(id);
  if (!item) return;
  const row = findMaterialRowElement(id);
  if (!row) return;

  const qtyInput = row.querySelector('input.qty');
  if (qtyInput && document.activeElement !== qtyInput) {
    if (item.manual) {
      const hasQuantity = item.quantity !== null && item.quantity !== undefined && item.quantity !== '';
      qtyInput.value = hasQuantity ? String(item.quantity) : '';
    } else {
      const qtyValue = item.quantity != null ? item.quantity : 0;
      qtyInput.value = String(qtyValue);
    }
  }

  const priceInput = row.querySelector('input.price');
  if (priceInput && document.activeElement !== priceInput) {
    const hasPrice = item.price !== null && item.price !== undefined && item.price !== '';
    const priceValue = hasPrice ? toNumber(item.price) : '';
    if (item.manual) {
      priceInput.value = hasPrice ? String(priceValue) : '';
      priceInput.readOnly = false;
    } else {
      const normalizedPrice = toNumber(item.price);
      priceInput.value = Number.isFinite(normalizedPrice) ? normalizedPrice.toFixed(2) : '0.00';
      priceInput.readOnly = !admin;
    }
    priceInput.dataset.price = hasPrice ? String(priceValue) : '';
  }

  const lineOutput = row.querySelector('.mat-line');
  if (lineOutput) {
    if (typeof window !== 'undefined' && typeof window.updateMaterialLine === 'function') {
      window.updateMaterialLine(row, { formatPrice: true, shouldUpdateTotals: false });
    } else {
      const formatted = `${formatCurrency(toNumber(item.price) * toNumber(item.quantity))} kr`;
      if (lineOutput instanceof HTMLInputElement) {
        lineOutput.value = formatted;
      } else {
        lineOutput.textContent = formatted;
      }
    }
  }
}

function calcMaterialesum() {
  return getAllData().reduce((sum, item) => {
    const line = toNumber(item.price) * toNumber(item.quantity);
    return sum + line;
  }, 0);
}

function renderCurrency(target, value) {
  let elements = [];
  if (typeof target === 'string') {
    elements = Array.from(document.querySelectorAll(target));
  } else if (target instanceof Element) {
    elements = [target];
  } else if (target && typeof target.length === 'number') {
    elements = Array.from(target);
  }
  if (elements.length === 0) return;
  const text = `${formatCurrency(value)} kr`;
  elements.forEach(el => {
    el.textContent = text;
  });
}

let totalsUpdateTimer = null;

function computeTraelleTotals() {
  const n35 = toNumber(document.getElementById('traelleloeft35')?.value);
  const n50 = toNumber(document.getElementById('traelleloeft50')?.value);
  const sum = (n35 * TRAELLE_RATE35) + (n50 * TRAELLE_RATE50);
  const state = {
    n35,
    n50,
    RATE35: TRAELLE_RATE35,
    RATE50: TRAELLE_RATE50,
    sum,
  };
  if (typeof window !== 'undefined') {
    window.__traelleloeft = state;
  }
  return state;
}

function performTotalsUpdate() {
  const tralleState = computeTraelleTotals();
  const tralleSum = tralleState && Number.isFinite(tralleState.sum) ? tralleState.sum : 0;
  const jobType = document.getElementById('jobType')?.value || 'montage';
  const jobFactor = jobType === 'demontage' ? 0.5 : 1;

  const materialLines = getAllData().map(item => ({
    qty: toNumber(item?.quantity),
    unitPrice: toNumber(item?.price) * jobFactor,
  }));

  const montageBase = calcMaterialesum() + tralleSum;
  const slaebePctInput = toNumber(document.getElementById('slaebePct')?.value);
  const slaebeBelob = montageBase * (Number.isFinite(slaebePctInput) ? slaebePctInput / 100 : 0);

  const ekstraarbejde = {
    tralleløft: tralleSum,
    huller: toNumber(document.getElementById('antalBoringHuller')?.value) * BORING_HULLER_RATE,
    boring: toNumber(document.getElementById('antalBoringBeton')?.value) * BORING_BETON_RATE,
    lukAfHul: toNumber(document.getElementById('antalLukHuller')?.value) * LUK_HULLER_RATE,
    opskydeligt: toNumber(document.getElementById('antalOpskydeligt')?.value) * OPSKYDELIGT_RATE,
    km: toNumber(document.getElementById('km')?.value) * KM_RATE,
    oevrige: 0,
  };

  const workers = Array.isArray(laborEntries)
    ? laborEntries.map(entry => ({
        hours: toNumber(entry?.hours),
        hourlyWithAllowances: toNumber(entry?.rate),
      }))
    : [];
  const totalHours = workers.reduce((sum, worker) => sum + (Number.isFinite(worker.hours) ? worker.hours : 0), 0);

  const totals = calculateTotals({
    materialLines,
    slaebeBelob,
    extra: ekstraarbejde,
    workers,
    totalHours,
  });

  lastMaterialSum = totals.samletAkkordsum;
  lastLoensum = totals.montoerLonMedTillaeg;

  renderCurrency('[data-total="material"]', totals.samletAkkordsum);
  renderCurrency('[data-total="labor"]', totals.montoerLonMedTillaeg);
  renderCurrency('[data-total="project"]', totals.projektsum);

  const montageField = document.getElementById('montagepris');
  if (montageField) {
    montageField.value = montageBase.toFixed(2);
  }
  const demontageField = document.getElementById('demontagepris');
  if (demontageField) {
    demontageField.value = (montageBase * 0.5).toFixed(2);
  }

  if (typeof updateMaterialVisibility === 'function') {
    updateMaterialVisibility();
  }
}

function updateMaterialVisibility() {
  const showSelectedOnly = document.getElementById('showSelectedOnly');
  const only = !!showSelectedOnly?.checked;
  const rows = document.querySelectorAll('#optaellingContainer .material-row');

  rows.forEach(row => {
    const qty = toNumber(row.querySelector('input.qty,input.quantity')?.value);
    row.style.display = (!only || qty > 0) ? '' : 'none';
  });
}

function updateTotals(options = {}) {
  const immediate = options === true || options?.immediate;
  if (immediate) {
    if (totalsUpdateTimer) {
      clearTimeout(totalsUpdateTimer);
      totalsUpdateTimer = null;
    }
    performTotalsUpdate();
    return;
  }

  if (totalsUpdateTimer) {
    clearTimeout(totalsUpdateTimer);
  }
  totalsUpdateTimer = setTimeout(() => {
    totalsUpdateTimer = null;
    performTotalsUpdate();
  }, 80);
}

function updateTotal() {
  updateTotals();
}

const sagsinfoFieldIds = ['sagsnummer', 'sagsnavn', 'sagsadresse', 'sagskunde', 'sagsdato', 'sagsmontoer'];

function collectSagsinfo() {
  return {
    sagsnummer: document.getElementById('sagsnummer')?.value.trim() || '',
    navn: document.getElementById('sagsnavn')?.value.trim() || '',
    adresse: document.getElementById('sagsadresse')?.value.trim() || '',
    kunde: document.getElementById('sagskunde')?.value.trim() || '',
    dato: document.getElementById('sagsdato')?.value || '',
    montoer: document.getElementById('sagsmontoer')?.value.trim() || '',
    status: currentStatus,
  };
}

function setSagsinfoField(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value;
}

function updateActionHint(message = '', variant = 'info') {
  const hint = document.getElementById('actionHint');
  if (!hint) return;
  hint.classList.remove('error', 'success');
  if (!message) {
    hint.textContent = DEFAULT_ACTION_HINT;
    hint.style.display = 'none';
    return;
  }
  hint.textContent = message;
  if (variant === 'error') {
    hint.classList.add('error');
  } else if (variant === 'success') {
    hint.classList.add('success');
  }
  hint.style.display = '';
}

function formatStatusLabel(status) {
  const normalized = (status || '').toLowerCase();
  const labels = {
    kladde: 'Kladde',
    afventer: 'Afventer',
    godkendt: 'Godkendt',
    afvist: 'Afvist',
  };
  if (labels[normalized]) return labels[normalized];
  if (!normalized) return 'Kladde';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function syncStatusUI(status) {
  const indicator = document.getElementById('statusIndicator');
  if (indicator) {
    indicator.textContent = formatStatusLabel(status);
    indicator.dataset.status = status || 'kladde';
  }
  const select = document.getElementById('sagStatus');
  if (select && (status ?? '') !== select.value) {
    select.value = status || 'kladde';
  }
}

function updateStatus(value, options = {}) {
  const next = (value || '').toLowerCase() || 'kladde';
  if (!admin && (next === 'godkendt' || next === 'afvist')) {
    if (options?.source === 'control') {
      syncStatusUI(currentStatus);
    }
    updateActionHint('Kun kontor kan godkende/afvise.', 'error');
    return;
  }
  const previous = currentStatus;
  if (previous === next) {
    currentStatus = next;
    syncStatusUI(currentStatus);
    return;
  }
  currentStatus = next;
  syncStatusUI(currentStatus);
  if (!currentJobId) return;
  const updated = updateJob(currentJobId, job => {
    const nextJob = { ...job };
    nextJob.metaStatus = next;
    return nextJob;
  });
  if (updated) {
    updateJobStateEntry(updated);
    recordAudit(currentJobId, {
      scope: 'status',
      message: `Skiftede status til ${formatStatusLabel(next)}`,
      diff: { field: 'metaStatus', before: previous, after: next },
    });
    renderJobList();
  }
}

function initStatusControls() {
  syncStatusUI(currentStatus);
  const select = document.getElementById('sagStatus');
  if (select) {
    select.addEventListener('change', event => {
      updateStatus(event.target.value, { source: 'control' });
    });
  }
}

function promisifyRequest(request) {
  if (!request) return Promise.resolve(undefined);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDB() {
  if (cachedDBPromise) return cachedDBPromise;
  if (typeof indexedDB === 'undefined') {
    cachedDBPromise = Promise.reject(new Error('IndexedDB er ikke tilgængelig'));
    cachedDBPromise.catch(() => {});
    return cachedDBPromise;
  }
  cachedDBPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = event => {
      const db = event.target?.result;
      if (db && !db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB kunne ikke åbnes'));
  });
  cachedDBPromise.catch(() => {
    cachedDBPromise = null;
  });
  return cachedDBPromise;
}

async function saveProject(data) {
  if (!data) return;
  try {
    const db = await openDB();
    if (!db) return;
    const tx = db.transaction(DB_STORE, 'readwrite');
    const completion = new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('Transaktionen blev afbrudt'));
      tx.onerror = () => reject(tx.error || new Error('Transaktionen fejlede'));
    });
    const store = tx.objectStore(DB_STORE);
    await promisifyRequest(store.add({ data, ts: Date.now() }));
    const all = await promisifyRequest(store.getAll());
    if (Array.isArray(all) && all.length > 20) {
      all.sort((a, b) => (a.ts || 0) - (b.ts || 0));
      const excess = all.length - 20;
      for (let index = 0; index < excess; index += 1) {
        const item = all[index];
        if (item && item.id != null) {
          await promisifyRequest(store.delete(item.id));
        }
      }
    }
    await completion;
  } catch (error) {
    console.warn('Kunne ikke gemme sag lokalt', error);
  }
}

async function getRecentProjects() {
  try {
    const db = await openDB();
    if (!db) return [];
    const tx = db.transaction(DB_STORE, 'readonly');
    const completion = new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('Transaktionen blev afbrudt'));
      tx.onerror = () => reject(tx.error || new Error('Transaktionen fejlede'));
    });
    const store = tx.objectStore(DB_STORE);
    const items = await promisifyRequest(store.getAll());
    await completion;
    if (!Array.isArray(items)) return [];
    return items
      .filter(entry => entry && entry.data)
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  } catch (error) {
    console.warn('Kunne ikke hente lokale sager', error);
    return [];
  }
}

async function populateRecentCases() {
  const select = document.getElementById('recentCases');
  if (!select) return;
  const button = document.getElementById('btnLoadCase');
  const cases = await getRecentProjects();
  recentCasesCache = cases;
  select.innerHTML = '';

  if (!cases.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Ingen gemte sager endnu';
    option.disabled = true;
    option.selected = true;
    select.appendChild(option);
    if (button) button.disabled = true;
    return;
  }

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Vælg gemt sag';
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  cases.forEach(entry => {
    const option = document.createElement('option');
    option.value = String(entry.id);
    const info = entry.data?.sagsinfo || {};
    const parts = [];
    if (info.sagsnummer) parts.push(info.sagsnummer);
    if (info.navn) parts.push(info.navn);
    option.textContent = parts.length ? parts.join(' – ') : `Sag #${entry.id}`;
    select.appendChild(option);
  });

  if (button) button.disabled = true;
}

function collectExtrasState() {
  const getValue = id => document.getElementById(id)?.value ?? '';
  return {
    jobType: document.getElementById('jobType')?.value || 'montage',
    montagepris: getValue('montagepris'),
    demontagepris: getValue('demontagepris'),
    slaebePct: getValue('slaebePct'),
    antalBoringHuller: getValue('antalBoringHuller'),
    antalLukHuller: getValue('antalLukHuller'),
    antalBoringBeton: getValue('antalBoringBeton'),
    opskydeligtRaekvaerk: getValue('antalOpskydeligt'),
    km: getValue('km'),
    traelle35: getValue('traelleloeft35'),
    traelle50: getValue('traelleloeft50'),
  };
}

function collectProjectSnapshot() {
  const materials = getAllData().map(item => ({
    id: item.id,
    name: item.name,
    price: toNumber(item.price),
    quantity: toNumber(item.quantity),
    manual: Boolean(item.manual),
    varenr: item.varenr || null,
  }));
  const labor = Array.isArray(laborEntries)
    ? laborEntries.map(entry => ({ ...entry }))
    : [];
  return {
    timestamp: Date.now(),
    status: currentStatus,
    sagsinfo: collectSagsinfo(),
    systems: Array.from(selectedSystemKeys),
    materials,
    labor,
    extras: collectExtrasState(),
    totals: {
      materialSum: lastMaterialSum,
      laborSum: lastLoensum,
    },
  };
}

async function persistProjectSnapshot() {
  try {
    const snapshot = collectProjectSnapshot();
    await saveProject(snapshot);
    await populateRecentCases();
  } catch (error) {
    console.warn('Kunne ikke gemme projekt snapshot', error);
  }
}

function applyExtrasSnapshot(extras = {}) {
  const assign = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
  };
  const jobType = document.getElementById('jobType');
  if (jobType && extras.jobType) {
    jobType.value = extras.jobType;
  }
  assign('montagepris', extras.montagepris);
  assign('demontagepris', extras.demontagepris);
  assign('slaebePct', extras.slaebePct);
  assign('antalBoringHuller', extras.antalBoringHuller);
  assign('antalLukHuller', extras.antalLukHuller);
  assign('antalBoringBeton', extras.antalBoringBeton);
  assign('antalOpskydeligt', extras.opskydeligtRaekvaerk);
  assign('km', extras.km);
  assign('traelleloeft35', extras.traelle35);
  assign('traelleloeft50', extras.traelle50);

  computeTraelleTotals();
}

function applyMaterialsSnapshot(materials = [], systems = []) {
  resetMaterials();
  if (Array.isArray(systems) && systems.length) {
    selectedSystemKeys.clear();
    systems.forEach(key => selectedSystemKeys.add(key));
  }
  if (Array.isArray(materials)) {
    materials.forEach(item => {
      if (shouldExcludeMaterialEntry(item)) {
        return;
      }
      const quantity = toNumber(item?.quantity);
      const price = toNumber(item?.price);
      let target = null;
      if (item?.id) {
        target = findMaterialById(item.id);
      }
      if (target && !target.manual) {
        target.quantity = quantity;
        if (Number.isFinite(price) && price > 0) {
          target.price = price;
        }
        return;
      }
      if (item?.manual) {
        const slot = manualMaterials.find(man => man.id === item.id)
          || manualMaterials.find(man => !man.name && man.quantity === 0 && man.price === 0);
        if (slot) {
          slot.name = item.name || slot.name;
          slot.price = Number.isFinite(price) ? price : slot.price;
          slot.quantity = quantity;
        }
        return;
      }
      const fallback = manualMaterials.find(man => !man.name && man.quantity === 0 && man.price === 0);
      if (fallback) {
        fallback.name = item?.name || '';
        fallback.price = Number.isFinite(price) ? price : 0;
        fallback.quantity = quantity;
      }
    });
  }
  renderOptaelling();
}

function applyLaborSnapshot(labor = []) {
  if (Array.isArray(labor)) {
    laborEntries = labor.map(entry => ({ ...entry }));
  } else {
    laborEntries = [];
  }
  populateWorkersFromLabor(laborEntries);
}

function applyProjectSnapshot(snapshot, options = {}) {
  if (!snapshot || typeof snapshot !== 'object') return;
  const info = snapshot.sagsinfo || {};
  setSagsinfoField('sagsnummer', info.sagsnummer || '');
  setSagsinfoField('sagsnavn', info.navn || '');
  setSagsinfoField('sagsadresse', info.adresse || '');
  setSagsinfoField('sagskunde', info.kunde || '');
  setSagsinfoField('sagsdato', info.dato || '');
  setSagsinfoField('sagsmontoer', info.montoer || '');

  if (info.status || snapshot.status) {
    currentStatus = (info.status || snapshot.status || 'kladde').toLowerCase();
    syncStatusUI(currentStatus);
  } else {
    syncStatusUI(currentStatus);
  }

  applyMaterialsSnapshot(snapshot.materials, snapshot.systems);
  applyExtrasSnapshot(snapshot.extras);
  applyLaborSnapshot(snapshot.labor);

  if (snapshot.totals) {
    if (Number.isFinite(snapshot.totals.materialSum)) {
      lastMaterialSum = snapshot.totals.materialSum;
    }
    if (Number.isFinite(snapshot.totals.laborSum)) {
      lastLoensum = snapshot.totals.laborSum;
    }
  }

  updateTotals(true);
  validateSagsinfo();
  if (!options?.skipHint) {
    updateActionHint('Sag er indlæst.', 'success');
  }
}

async function handleLoadCase() {
  const select = document.getElementById('recentCases');
  if (!select) return;
  const value = Number(select.value);
  if (!Number.isFinite(value) || value <= 0) return;
  let record = recentCasesCache.find(entry => Number(entry.id) === value);
  if (!record) {
    const cases = await getRecentProjects();
    recentCasesCache = cases;
    record = cases.find(entry => Number(entry.id) === value);
  }
  if (record && record.data) {
    applyProjectSnapshot(record.data, { skipHint: false });
  } else {
    updateActionHint('Kunne ikke indlæse den valgte sag.', 'error');
  }
}

function validateSagsinfo() {
  let isValid = true;
  sagsinfoFieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const rawValue = (el.value || '').trim();
    let fieldValid = rawValue.length > 0;
    if (id === 'sagsdato') {
      fieldValid = rawValue.length > 0 && !Number.isNaN(new Date(rawValue).valueOf());
    }
    if (!fieldValid) {
      isValid = false;
    }
    el.classList.toggle('invalid', !fieldValid);
  });

  ['btnExportCSV', 'btnExportAll', 'btnExportZip', 'btnPrint'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !isValid;
  });

  if (isValid) {
    updateActionHint('');
  } else {
    updateActionHint(DEFAULT_ACTION_HINT, 'error');
  }

  return isValid;
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeFilename(value) {
  return (value || 'akkordseddel')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9-_]+/gi, '_');
}

function formatNumberForCSV(value) {
  return toNumber(value).toFixed(2).replace('.', ',');
}

function formatPercentForCSV(value) {
  const num = toNumber(value);
  return `${num.toFixed(2).replace('.', ',')} %`;
}

function formatDateForDisplay(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isNaN(date.valueOf())) {
    return date.toLocaleDateString('da-DK');
  }
  return String(value);
}

function setEkompletStatus(message, variant = 'success') {
  const statusEl = document.getElementById('ekompletStatus');
  if (!statusEl) return;
  statusEl.classList.remove('success', 'error');
  if (!message) {
    statusEl.textContent = '';
    statusEl.setAttribute('hidden', '');
    return;
  }
  if (variant === 'success') {
    statusEl.classList.add('success');
  } else if (variant === 'error') {
    statusEl.classList.add('error');
  }
  statusEl.textContent = message;
  statusEl.removeAttribute('hidden');
}

function normalizeDateValue(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/[-\/.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) {
      return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
    }
    if (c.length === 4) {
      return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString().slice(0, 10);
  }
  return '';
}

function parseCSV(text) {
  const lines = String(text).split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];
  const delimiter = lines[0].includes(';') ? ';' : ',';

  const parseLine = (line) => {
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.every(cell => cell === '')) continue;
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function resetMaterials() {
  [dataBosta, dataHaki, dataModex, dataAlfix].forEach(list => {
    list.forEach(item => {
      item.quantity = 0;
    });
  });
  manualMaterials.forEach(item => {
    item.name = '';
    item.price = 0;
    item.quantity = 0;
  });
}

function resetWorkers() {
  workerCount = 0;
  const container = document.getElementById('workers');
  if (container) {
    container.innerHTML = '';
  }
}

function populateWorkersFromLabor(entries) {
  resetWorkers();
  if (!Array.isArray(entries) || entries.length === 0) {
    addWorker();
    updateTotals(true);
    return;
  }

  entries.forEach((entry, index) => {
    addWorker();
    const worker = document.getElementById(`worker${index + 1}`);
    if (!worker) return;

    const hoursInput = worker.querySelector('.worker-hours');
    const tillaegInput = worker.querySelector('.worker-tillaeg');
    const uddSelect = worker.querySelector('.worker-udd');

    if (hoursInput) {
      hoursInput.value = formatNumber(toNumber(entry.hours));
    }
    if (tillaegInput) {
      tillaegInput.value = formatNumber(toNumber(entry.mentortillaeg));
    }
    if (uddSelect instanceof HTMLSelectElement) {
      const savedValue = (entry?.udd ?? '').toString().trim();
      if (savedValue) {
        const hasOption = Array.from(uddSelect.options).some(option => option.value === savedValue);
        if (hasOption) {
          uddSelect.value = savedValue;
        } else if (uddSelect.options.length > 0) {
          uddSelect.selectedIndex = 0;
        }
      } else if (uddSelect.options.length > 0) {
        uddSelect.selectedIndex = 0;
      }
    }
  });

  updateTotals(true);
  const hasRegisteredHours = entries.some(entry => toNumber(entry.hours) > 0);
  if (hasRegisteredHours && typeof beregnLon === 'function') {
    beregnLon();
  }
}

function matchMaterialByName(name) {
  if (!name) return null;
  const targetKey = normalizeKey(name);
  const allLists = [dataBosta, dataHaki, dataModex, dataAlfix, manualMaterials];
  for (const list of allLists) {
    const match = list.find(item => normalizeKey(item.name) === targetKey);
    if (match) return match;
  }
  return null;
}

function assignMaterialRow(row) {
  const idValue = row.id?.trim?.() || '';
  const nameValue = row.name?.trim?.() || '';
  const qty = toNumber(row.quantity);
  const price = toNumber(row.price);
  if (!nameValue && !idValue && qty === 0 && price === 0) return;

  if (shouldExcludeMaterialEntry({ id: idValue, name: nameValue })) {
    return;
  }

  let target = null;
  if (idValue) {
    target = findMaterialById(idValue);
  }
  if (!target && nameValue) {
    target = matchMaterialByName(nameValue);
  }

  if (target && !target.manual) {
    target.quantity = qty;
    if (price > 0) target.price = price;
    return;
  }

  const receiver = manualMaterials.find(item => !item.name && item.quantity === 0 && item.price === 0);
  if (!receiver) return;
  const manualIndex = manualMaterials.indexOf(receiver) + 1;
  receiver.name = nameValue || receiver.name || `Manuelt materiale ${manualIndex}`;
  receiver.quantity = qty;
  receiver.price = price;
}

function applyCSVRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  resetMaterials();

  const info = collectSagsinfo();
  const montorValues = [];
  const materials = [];
  const labor = [];

  rows.forEach(row => {
    const normalized = {};
    Object.entries(row).forEach(([key, value]) => {
      normalized[normalizeKey(key)] = (value ?? '').toString().trim();
    });

    const sagsnummerVal = normalized['sagsnummer'] || normalized['sagsnr'] || normalized['sag'] || normalized['caseid'];
    if (sagsnummerVal) info.sagsnummer = sagsnummerVal;

    const navnVal = normalized['navnopgave'] || normalized['navn'] || normalized['opgave'] || normalized['projekt'];
    if (navnVal) info.navn = navnVal;

    const adresseVal = normalized['adresse'] || normalized['addresse'];
    if (adresseVal) info.adresse = adresseVal;

    const kundeVal = normalized['kunde'] || normalized['customer'];
    if (kundeVal) info.kunde = kundeVal;

    const datoVal = normalizeDateValue(normalized['dato'] || normalized['date']);
    if (datoVal) info.dato = datoVal;

    const montorVal = normalized['montoer'] || normalized['montor'] || normalized['montornavne'] || normalized['montornavn'];
    if (montorVal) montorValues.push(montorVal);

    const matName = normalized['materialenavn'] || normalized['materiale'] || normalized['varenavn'] || normalized['navn'];
    const matQty = normalized['antal'] || normalized['quantity'] || normalized['qty'] || normalized['maengde'];
    const matPrice = normalized['pris'] || normalized['price'] || normalized['enhedspris'] || normalized['stkpris'];
    const matId = normalized['id'] || normalized['materialeid'] || normalized['varenummer'];
    if (matName || matId || matQty || matPrice) {
      materials.push({ id: matId, name: matName, quantity: matQty, price: matPrice });
    }

    const laborType = normalized['arbejdstype'] || normalized['type'] || normalized['jobtype'];
    const laborHours = normalized['timer'] || normalized['hours'] || normalized['antalttimer'];
    const laborRate = normalized['sats'] || normalized['rate'] || normalized['timelon'] || normalized['timeloen'];
    if (laborType || laborHours || laborRate) {
      labor.push({ type: laborType || '', hours: toNumber(laborHours), rate: toNumber(laborRate) });
    }
  });

  setSagsinfoField('sagsnummer', info.sagsnummer || '');
  setSagsinfoField('sagsnavn', info.navn || '');
  setSagsinfoField('sagsadresse', info.adresse || '');
  setSagsinfoField('sagskunde', info.kunde || '');
  setSagsinfoField('sagsdato', info.dato || '');

  if (montorValues.length) {
    const names = montorValues
      .flatMap(value => value.split(/[\n,]/))
      .map(name => name.trim())
      .filter(Boolean)
      .join('\n');
    setSagsinfoField('sagsmontoer', names);
  }

  materials.forEach(assignMaterialRow);

  const systemsWithQuantities = systemOptions.filter(option =>
    option.dataset.some(item => toNumber(item.quantity) > 0)
  );
  if (systemsWithQuantities.length > 0) {
    selectedSystemKeys.clear();
    systemsWithQuantities.forEach(option => selectedSystemKeys.add(option.key));
  }

  renderOptaelling();

  laborEntries = labor.filter(entry => entry.hours > 0 || entry.rate > 0 || entry.type);
  populateWorkersFromLabor(laborEntries);
  updateTotals(true);

  if (laborEntries.length > 0) {
    const firstType = laborEntries[0].type?.toLowerCase() || '';
    const jobSelect = document.getElementById('jobType');
    if (jobSelect) {
      if (firstType.includes('demo')) jobSelect.value = 'demontage';
      else if (firstType.includes('montage')) jobSelect.value = 'montage';
    }
  }

  validateSagsinfo();
}

function setupCSVImport() {
  const dropArea = document.getElementById('dropArea');
  const fileInput = document.getElementById('csvFileInput');
  if (!dropArea || !fileInput) return;

  const openPicker = () => fileInput.click();

  ['dragenter', 'dragover'].forEach(evt => {
    dropArea.addEventListener(evt, event => {
      event.preventDefault();
      dropArea.classList.add('dragover');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    });
  });

  ['dragleave', 'dragend'].forEach(evt => {
    dropArea.addEventListener(evt, () => dropArea.classList.remove('dragover'));
  });

  dropArea.addEventListener('drop', event => {
    event.preventDefault();
    dropArea.classList.remove('dragover');
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      handleImportFile(file);
      fileInput.value = '';
    }
  });

  dropArea.addEventListener('click', openPicker);
  dropArea.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  });

  fileInput.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) {
      handleImportFile(file);
      fileInput.value = '';
    }
  });
}

function handleImportFile(file) {
  if (!file) return;
  const fileName = file.name || '';
  if (/\.json$/i.test(fileName) || (file.type && file.type.includes('json'))) {
    importJSONProject(file);
    return;
  }
  uploadCSV(file);
}

// --- Authentication ---
async function verifyAdminCodeInput(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || !DEFAULT_ADMIN_CODE_HASH) return false;
  const hash = await sha256Hex(trimmed);
  if (!hash) return false;
  return constantTimeEquals(hash, DEFAULT_ADMIN_CODE_HASH);
}

async function login() {
  const codeInput = document.getElementById('adminCode');
  const feedback = document.getElementById('adminFeedback');
  if (!codeInput) return;

  const isValid = await verifyAdminCodeInput(codeInput.value);
  if (isValid) {
    admin = true;
    setAdminOk(true); // Update admin state for click guard
    codeInput.value = '';
    feedback?.classList.remove('error');
    feedback?.classList.add('success');
    if (feedback) {
      feedback.textContent = 'Admin-tilstand aktiveret. Prisfelter er nu redigerbare.';
      feedback.removeAttribute('hidden');
    }
    renderOptaelling();
    updateTotals(true);
  } else if (feedback) {
    feedback.textContent = 'Forkert kode. Prøv igen.';
    feedback.classList.remove('success');
    feedback.classList.add('error');
    feedback.removeAttribute('hidden');
  }
}

const adminLoginButton = document.getElementById('btnAdminLogin');
if (adminLoginButton) {
  adminLoginButton.addEventListener('click', event => {
    event.preventDefault();
    login();
  });
}

// --- Worker Functions ---
function addWorker() {
  workerCount++;
  const w = document.createElement("fieldset");
  w.className = "worker-row";
  w.id = `worker${workerCount}`;
  w.innerHTML = `
    <legend>Mand ${workerCount}</legend>
    <div class="worker-grid">
      <label>
        <span>Timer</span>
        <input type="text" class="worker-hours" value="0" inputmode="decimal" data-numpad="true" data-decimal="comma" data-numpad-field="worker-hours-${workerCount}">
      </label>
      <label>
        <span>Uddannelse</span>
        <select class="worker-udd">
          <option value="udd1">Udd1 (42,98 kr)</option>
          <option value="udd2">Udd2 (49,38 kr)</option>
        </select>
      </label>
      <label>
        <span>Mentortillæg (22,26 kr/t)</span>
        <input type="text" class="worker-tillaeg" value="0" inputmode="decimal" data-numpad="true" data-decimal="comma" data-numpad-field="worker-tillaeg-${workerCount}">
      </label>
    </div>
    <div class="worker-output" aria-live="polite"></div>
  `;
  const container = document.getElementById('workers');
  if (!container) {
    console.warn('Kan ikke tilføje medarbejder – container mangler i DOM.');
    return null;
  }
  container.appendChild(w);
  syncLonAuditState();
  return w;
}


// Debounce funktion til performance
function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Async storage helpers
async function saveLocalData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

async function loadLocalData(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

function beregnLon() {
  const info = collectSagsinfo();
  const sagsnummer = info.sagsnummer?.trim() || 'uspecified';
  const jobType = document.getElementById('jobType')?.value || 'montage';
  const jobFactor = jobType === 'demontage' ? 0.5 : 1;
  const slaebePctInput = toNumber(document.getElementById('slaebePct')?.value);
  const antalBoringHuller = toNumber(document.getElementById('antalBoringHuller')?.value);
  const antalLukHuller = toNumber(document.getElementById('antalLukHuller')?.value);
  const antalBoringBeton = toNumber(document.getElementById('antalBoringBeton')?.value);
  const antalOpskydeligt = toNumber(document.getElementById('antalOpskydeligt')?.value);
  const antalKm = toNumber(document.getElementById('km')?.value);
  const workers = document.querySelectorAll('.worker-row');

  lastEkompletData = null;

  const tralleState = computeTraelleTotals();
  const traelleSum = tralleState && Number.isFinite(tralleState.sum) ? tralleState.sum : 0;

  const calcMaterialLines = [];
  const materialLines = [];
  const materialerTilEkomplet = [];
  const allData = getAllData();
  if (Array.isArray(allData)) {
    allData.forEach(item => {
      const qty = toNumber(item?.quantity);
      if (qty <= 0) return;
      const basePrice = toNumber(item?.price);
      const ackUnitPrice = basePrice * jobFactor;
      const lineTotal = qty * ackUnitPrice;
      calcMaterialLines.push({ qty, unitPrice: ackUnitPrice });
      const manualIndex = manualMaterials.indexOf(item);
      const label = item?.manual ? (item.name?.trim() || `Manuelt materiale ${manualIndex + 1}`) : item?.name;
      materialLines.push({
        label,
        quantity: qty,
        unitPrice: basePrice,
        lineTotal,
        ackUnitPrice,
      });
      const adjustedUnitPrice = qty > 0 ? lineTotal / qty : ackUnitPrice;
      materialerTilEkomplet.push({
        varenr: item?.varenr || item?.id || '',
        name: label,
        quantity: qty,
        unitPrice: adjustedUnitPrice,
        baseUnitPrice: basePrice,
        lineTotal,
      });
    });
  }

  const boringHullerTotal = antalBoringHuller * BORING_HULLER_RATE;
  const lukHullerTotal = antalLukHuller * LUK_HULLER_RATE;
  const boringBetonTotal = antalBoringBeton * BORING_BETON_RATE;
  const opskydeligtTotal = antalOpskydeligt * OPSKYDELIGT_RATE;
  const kilometerPris = antalKm * KM_RATE;

  const montageBase = calcMaterialesum() + traelleSum;
  const slaebePct = Number.isFinite(slaebePctInput) ? slaebePctInput / 100 : 0;
  const slaebebelob = montageBase * slaebePct;

  const ekstraarbejdeModel = {
    tralleløft: traelleSum,
    huller: boringHullerTotal,
    boring: boringBetonTotal,
    lukAfHul: lukHullerTotal,
    opskydeligt: opskydeligtTotal,
    km: kilometerPris,
    oevrige: 0,
  };

  let samletTimer = 0;
  workers.forEach(worker => {
    const hoursEl = worker.querySelector('.worker-hours');
    const hours = toNumber(hoursEl?.value);
    if (hours > 0) {
      samletTimer += hours;
    }
  });

  if (samletTimer === 0) {
    const resultatDiv = document.getElementById('lonResult');
    if (resultatDiv) {
      resultatDiv.innerHTML = '';
      const message = document.createElement('div');
      message.style.color = 'red';
      message.textContent = 'Indtast arbejdstimer for mindst én person';
      resultatDiv.appendChild(message);
    }
    laborEntries = [];
    return;
  }

  const totalsBaseInput = {
    materialLines: calcMaterialLines,
    slaebeBelob: slaebebelob,
    extra: ekstraarbejdeModel,
    workers: [],
    totalHours: samletTimer,
  };

  const totalsWithoutLabor = calculateTotals(totalsBaseInput);
  const akkordTimeLøn = totalsWithoutLabor.timeprisUdenTillaeg;
  const samletAkkordSum = totalsWithoutLabor.samletAkkordsum;

  const workerLines = [];
  const beregnedeArbejdere = [];
  const workersForTotals = [];

  workers.forEach((worker, index) => {
    const hours = toNumber(worker.querySelector('.worker-hours')?.value);
    if (hours <= 0) return;
    const mentortillaeg = toNumber(worker.querySelector('.worker-tillaeg')?.value);
    const uddSelect = worker.querySelector('.worker-udd');
    const udd = uddSelect?.value || '';
    const workerName = worker.querySelector('legend')?.textContent?.trim() || `Mand ${index + 1}`;
    const outputEl = worker.querySelector('.worker-output');

    let timelon = akkordTimeLøn + mentortillaeg;
    let uddannelsesTillaeg = 0;
    if (udd === 'udd1') {
      timelon += TILLAEG_UDD1;
      uddannelsesTillaeg = TILLAEG_UDD1;
    } else if (udd === 'udd2') {
      timelon += TILLAEG_UDD2;
      uddannelsesTillaeg = TILLAEG_UDD2;
    }

    const total = timelon * hours;
    if (outputEl) {
      outputEl.textContent = `${timelon.toFixed(2)} kr/t | Total: ${total.toFixed(2)} kr`;
    }
    workerLines.push({
      name: workerName,
      hours,
      rate: timelon,
      total,
    });
    const uddLabel = uddSelect?.selectedOptions?.[0]?.textContent?.trim() || '';
    beregnedeArbejdere.push({
      id: index + 1,
      name: workerName,
      type: jobType,
      hours,
      rate: timelon,
      baseRate: akkordTimeLøn,
      mentortillaeg,
      udd,
      uddLabel,
      uddannelsesTillaeg,
      total,
    });
    workersForTotals.push({ hours, hourlyWithAllowances: timelon });
  });

  const totals = calculateTotals({
    ...totalsBaseInput,
    workers: workersForTotals,
  });

  const samletUdbetalt = totals.montoerLonMedTillaeg;
  const materialSumInfo = totals.materialer + totals.slaeb;
  const projektsum = totals.projektsum;
  const datoDisplay = formatDateForDisplay(info.dato);

  const resultatDiv = document.getElementById('lonResult');
  if (resultatDiv) {
    resultatDiv.innerHTML = '';

    const sagsSection = document.createElement('div');
    const sagsHeader = document.createElement('h3');
    sagsHeader.textContent = 'Sagsinfo';
    sagsSection.appendChild(sagsHeader);

    const fields = [
      { label: 'Sagsnr.', value: info.sagsnummer || '' },
      { label: 'Navn', value: info.navn || '' },
      { label: 'Adresse', value: info.adresse || '' },
      { label: 'Dato', value: datoDisplay },
      { label: 'Status', value: formatStatusLabel(info.status) },
    ];

    fields.forEach(({ label, value }) => {
      const line = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = `${label}: `;
      line.appendChild(strong);
      const span = document.createElement('span');
      span.textContent = value;
      line.appendChild(span);
      sagsSection.appendChild(line);
    });

    resultatDiv.appendChild(sagsSection);

    const matHeader = document.createElement('h3');
    matHeader.textContent = 'Materialer brugt:';
    resultatDiv.appendChild(matHeader);

    if (materialLines.length > 0) {
      materialLines.forEach(lineItem => {
        const line = document.createElement('div');
        line.textContent = `${lineItem.label}: ${lineItem.quantity} × ${lineItem.unitPrice.toFixed(2)} kr = ${lineItem.lineTotal.toFixed(2)} kr`;
        resultatDiv.appendChild(line);
      });
    } else {
      const none = document.createElement('div');
      none.textContent = 'Ingen materialer brugt';
      resultatDiv.appendChild(none);
    }

    const workersHeader = document.createElement('h3');
    workersHeader.textContent = 'Arbejdere:';
    resultatDiv.appendChild(workersHeader);

    if (workerLines.length > 0) {
      workerLines.forEach(workerLine => {
        const line = document.createElement('div');
        line.textContent = `${workerLine.name}: Timer: ${workerLine.hours}, Timeløn: ${workerLine.rate.toFixed(2)} kr/t, Total: ${workerLine.total.toFixed(2)} kr`;
        resultatDiv.appendChild(line);
      });
    } else {
      const none = document.createElement('div');
      none.textContent = 'Ingen timer registreret';
      resultatDiv.appendChild(none);
    }

    const oversigtHeader = document.createElement('h3');
    oversigtHeader.textContent = 'Oversigt:';
    resultatDiv.appendChild(oversigtHeader);

    const oversigt = [
      ['Materialer', `${totals.materialer.toFixed(2)} kr`],
      ['Ekstraarbejde', `${totals.ekstraarbejde.toFixed(2)} kr`],
      ['Slæb', `${totals.slaeb.toFixed(2)} kr`],
      ['Samlet akkordsum', `${totals.samletAkkordsum.toFixed(2)} kr`],
      ['Timer', `${samletTimer.toFixed(1)} t`],
      ['Timepris (uden tillæg)', `${totals.timeprisUdenTillaeg.toFixed(2)} kr/t`],
      ['Lønsum', `${totals.montoerLonMedTillaeg.toFixed(2)} kr`],
      ['Projektsum', `${projektsum.toFixed(2)} kr`],
      ['Materialesum (info)', `${materialSumInfo.toFixed(2)} kr`],
      ['Kilometer (info)', `${kilometerPris.toFixed(2)} kr`],
      ['Tralleløft (info)', `${traelleSum.toFixed(2)} kr`],
    ];

    oversigt.forEach(([label, value]) => {
      const line = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = `${label}: `;
      line.appendChild(strong);
      const span = document.createElement('span');
      span.textContent = value;
      line.appendChild(span);
      resultatDiv.appendChild(line);
    });

    const actions = document.createElement('div');
    actions.className = 'ekomplet-actions no-print';

    const btn = document.createElement('button');
    btn.id = 'btnEkompletExport';
    btn.type = 'button';
    btn.textContent = 'Indberet til E-komplet';
    actions.appendChild(btn);

    const status = document.createElement('p');
    status.id = 'ekompletStatus';
    status.className = 'status-message';
    status.hidden = true;
    status.setAttribute('aria-live', 'polite');
    actions.appendChild(status);

    resultatDiv.appendChild(actions);
  }

  laborEntries = beregnedeArbejdere;

  lastEkompletData = {
    sagsinfo: info,
    jobType,
    montagepris: montageBase,
    demontagepris: montageBase * 0.5,
    extras: {
      slaebePct: slaebePctInput,
      slaebeBelob: slaebebelob,
      boringHuller: { antal: antalBoringHuller, pris: BORING_HULLER_RATE, total: boringHullerTotal },
      lukHuller: { antal: antalLukHuller, pris: LUK_HULLER_RATE, total: lukHullerTotal },
      boringBeton: { antal: antalBoringBeton, pris: BORING_BETON_RATE, total: boringBetonTotal },
      opskydeligtRaekvaerk: { antal: antalOpskydeligt, pris: OPSKYDELIGT_RATE, total: opskydeligtTotal },
      kilometer: { antal: antalKm, pris: KM_RATE, total: kilometerPris },
      traelleloeft: {
        antal35: tralleState?.n35 || 0,
        pris35: TRAELLE_RATE35,
        total35: (tralleState?.n35 || 0) * TRAELLE_RATE35,
        antal50: tralleState?.n50 || 0,
        pris50: TRAELLE_RATE50,
        total50: (tralleState?.n50 || 0) * TRAELLE_RATE50,
        total: traelleSum,
      },
    },
    materialer: materialerTilEkomplet,
    arbejdere: beregnedeArbejdere,
    totals: {
      materialer: totals.materialer,
      ekstraarbejde: totals.ekstraarbejde,
      kilometerPris,
      slaebeBelob: totals.slaeb,
      akkordsum: totals.samletAkkordsum,
      timer: samletTimer,
      akkordTimeLon: totals.timeprisUdenTillaeg,
      loensum: totals.montoerLonMedTillaeg,
      projektsum,
      materialeSumInfo: materialSumInfo,
      traelleSum,
    },
    traelle: {
      antal35: tralleState?.n35 || 0,
      antal50: tralleState?.n50 || 0,
      rate35: TRAELLE_RATE35,
      rate50: TRAELLE_RATE50,
      sum: traelleSum,
    },
  };

  updateTotals(true);
  attachEkompletButton();

  if (typeof window !== 'undefined') {
    window.__beregnLonCache = {
      materialSum: lastMaterialSum,
      laborSum: lastLoensum,
      projectSum: lastMaterialSum + lastLoensum,
      traelleSum,
      timestamp: Date.now(),
    };
  }

  persistProjectSnapshot();

  return sagsnummer;
}


function attachEkompletButton() {
  const button = document.getElementById('btnEkompletExport');
  if (!button) return;
  button.addEventListener('click', () => downloadEkompletCSV());
}

function buildEkompletCSVPayload(options = {}) {
  const { skipValidation = false, skipBeregn = false, silent = false } = options;
  if (!skipValidation && !validateSagsinfo()) {
    if (!silent) {
      setEkompletStatus('Udfyld Sagsinfo før du indberetter til E-komplet.', 'error');
      updateActionHint('Udfyld Sagsinfo for at indberette.', 'error');
    }
    return null;
  }

  if (!skipBeregn) {
    beregnLon();
  }

  const data = lastEkompletData;
  if (!data) {
    if (!silent) {
      setEkompletStatus('Beregn løn først, så alle data er opdaterede.', 'error');
    }
    return null;
  }

  const rows = [];
  const sagsinfo = data.sagsinfo || {};
  const jobTypeLabel = data.jobType === 'demontage' ? 'Demontage (50%)' : 'Montage';

  rows.push(['Sektion', 'Felt', 'Værdi']);
  rows.push(['Sagsinfo', 'Sagsnummer', sagsinfo.sagsnummer || '']);
  rows.push(['Sagsinfo', 'Navn', sagsinfo.navn || '']);
  rows.push(['Sagsinfo', 'Adresse', sagsinfo.adresse || '']);
  rows.push(['Sagsinfo', 'Dato', formatDateForDisplay(sagsinfo.dato || '')]);
  rows.push([]);

  rows.push(['Materialer', 'Varenr', 'Beskrivelse', 'Antal', 'Sats', 'Linjesum']);
  if (Array.isArray(data.materialer) && data.materialer.length > 0) {
    data.materialer.forEach(item => {
      rows.push([
        'Materiale',
        item.varenr || '',
        item.name || '',
        formatNumberForCSV(item.quantity || 0),
        formatNumberForCSV(item.unitPrice || 0),
        formatNumberForCSV(item.lineTotal || 0),
      ]);
    });
  } else {
    rows.push(['Materiale', '', 'Ingen registrering', '0', '0,00', '0,00']);
  }
  rows.push([]);

  rows.push(['Arbejdere', 'Navn', 'Timer', 'Uddannelse', 'Mentortillæg', 'Udd.tillæg', 'Sats', 'Linjesum']);
  if (Array.isArray(data.arbejdere) && data.arbejdere.length > 0) {
    data.arbejdere.forEach(worker => {
      rows.push([
        'Arbejder',
        worker.name || '',
        formatNumberForCSV(worker.hours || 0),
        worker.uddLabel || worker.udd || '',
        formatNumberForCSV(worker.mentortillaeg || 0),
        formatNumberForCSV(worker.uddannelsesTillaeg || 0),
        formatNumberForCSV(worker.rate || 0),
        formatNumberForCSV(worker.total || 0),
      ]);
    });
  } else {
    rows.push(['Arbejder', 'Ingen timer registreret', '0', '', '0,00', '0,00', '0,00', '0,00']);
  }
  rows.push([]);

  rows.push(['Tillæg', 'Type', 'Antal/Procent', 'Sats', 'Beløb']);
  const extras = data.extras || {};
  rows.push([
    'Tillæg',
    'Slæb',
    formatPercentForCSV(extras.slaebePct || 0),
    formatNumberForCSV(data.montagepris || 0),
    formatNumberForCSV(extras.slaebeBelob || 0),
  ]);
  const boringHuller = extras.boringHuller || {};
  rows.push([
    'Tillæg',
    'Boring af huller',
    formatNumberForCSV(boringHuller.antal || 0),
    formatNumberForCSV(boringHuller.pris || 0),
    formatNumberForCSV(boringHuller.total || 0),
  ]);
  const lukHuller = extras.lukHuller || {};
  rows.push([
    'Tillæg',
    'Luk af hul',
    formatNumberForCSV(lukHuller.antal || 0),
    formatNumberForCSV(lukHuller.pris || 0),
    formatNumberForCSV(lukHuller.total || 0),
  ]);
  const boringBeton = extras.boringBeton || {};
  rows.push([
    'Tillæg',
    'Boring i beton',
    formatNumberForCSV(boringBeton.antal || 0),
    formatNumberForCSV(boringBeton.pris || 0),
    formatNumberForCSV(boringBeton.total || 0),
  ]);
  const opskydeligt = extras.opskydeligtRaekvaerk || {};
  rows.push([
    'Tillæg',
    'Opskydeligt rækværk',
    formatNumberForCSV(opskydeligt.antal || 0),
    formatNumberForCSV(opskydeligt.pris || 0),
    formatNumberForCSV(opskydeligt.total || 0),
  ]);
  const kilometer = extras.kilometer || {};
  rows.push([
    'Tillæg',
    'Kilometer',
    formatNumberForCSV(kilometer.antal || 0),
    formatNumberForCSV(kilometer.pris || 0),
    formatNumberForCSV(kilometer.total || 0),
  ]);
  const traelle = data.traelle || {};
  rows.push([
    'Tillæg',
    'Tralleløft 0,35 m',
    formatNumberForCSV(traelle.antal35 || 0),
    formatNumberForCSV(traelle.rate35 || 0),
    formatNumberForCSV((traelle.antal35 || 0) * (traelle.rate35 || 0)),
  ]);
  rows.push([
    'Tillæg',
    'Tralleløft 0,50 m',
    formatNumberForCSV(traelle.antal50 || 0),
    formatNumberForCSV(traelle.rate50 || 0),
    formatNumberForCSV((traelle.antal50 || 0) * (traelle.rate50 || 0)),
  ]);
  rows.push([]);

  rows.push(['Projekt', 'Felt', 'Værdi']);
  rows.push(['Projekt', 'Arbejdstype', jobTypeLabel]);
  rows.push(['Projekt', 'Montagepris', formatNumberForCSV(data.montagepris || 0)]);
  rows.push(['Projekt', 'Demontagepris', formatNumberForCSV(data.demontagepris || 0)]);
  rows.push(['Projekt', 'Materialer', formatNumberForCSV(data.totals?.materialer || 0)]);
  rows.push(['Projekt', 'Ekstraarbejde', formatNumberForCSV(data.totals?.ekstraarbejde || 0)]);
  rows.push(['Projekt', 'Slæbebeløb', formatNumberForCSV(data.totals?.slaebeBelob || 0)]);
  rows.push(['Projekt', 'Materialesum (info)', formatNumberForCSV(data.totals?.materialeSumInfo || 0)]);
  rows.push(['Projekt', 'Kilometer', formatNumberForCSV(data.totals?.kilometerPris || 0)]);
  rows.push(['Projekt', 'Tralleløft i alt', formatNumberForCSV(data.totals?.traelleSum || 0)]);
  rows.push(['Projekt', 'Samlet akkordsum', formatNumberForCSV(data.totals?.akkordsum || 0)]);
  rows.push(['Projekt', 'Timer', formatNumberForCSV(data.totals?.timer || 0)]);
  rows.push(['Projekt', 'Timepris (uden tillæg)', formatNumberForCSV(data.totals?.akkordTimeLon || 0)]);
  rows.push(['Projekt', 'Lønsum', formatNumberForCSV(data.totals?.loensum || 0)]);
  rows.push(['Projekt', 'Projektsum', formatNumberForCSV(data.totals?.projektsum || 0)]);

  const csvContent = rows
    .map(row => row.map(cell => escapeCSV(cell ?? '')).join(';'))
    .join('\n');

  const baseName = sanitizeFilename(sagsinfo.sagsnummer || 'sag') || 'sag';
  return {
    content: csvContent,
    baseName,
    fileName: `${baseName}-ekomplet.csv`,
  };
}

function downloadEkompletCSV() {
  const payload = buildEkompletCSVPayload();
  if (!payload) return;

  const blob = new Blob([payload.content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = payload.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  setEkompletStatus('Filen er hentet og klar til upload i E-komplet.', 'success');
  updateActionHint('E-komplet fil er genereret.', 'success');
}

registerEkompletEngine(() => {
  const payload = buildEkompletCSVPayload({ skipValidation: true, silent: true });
  if (!payload) {
    throw new Error('E-komplet data er ikke tilgængelig');
  }
  return new Blob([payload.content], { type: 'text/csv;charset=utf-8;' });
});


// --- CSV-eksport ---
function buildCSVPayload(customSagsnummer, options = {}) {
  if (!options?.skipValidation && !validateSagsinfo()) {
    updateActionHint('Udfyld Sagsinfo for at eksportere.', 'error');
    return null;
  }
  if (!options?.skipBeregn) {
    beregnLon();
  }
  const info = collectSagsinfo();
  if (customSagsnummer) {
    info.sagsnummer = customSagsnummer;
  }
  const cache = typeof window !== 'undefined' ? window.__beregnLonCache : null;
  const materials = getAllData().filter(item => toNumber(item.quantity) > 0);
  const labor = Array.isArray(laborEntries) ? laborEntries : [];
  const tralleState = computeTraelleTotals();
  const tralleSum = tralleState && Number.isFinite(tralleState.sum) ? tralleState.sum : 0;
  const jobType = document.getElementById('jobType')?.value || 'montage';
  const jobFactor = jobType === 'demontage' ? 0.5 : 1;
  const materialLinesForTotals = materials.map(item => ({
    qty: toNumber(item.quantity),
    unitPrice: toNumber(item.price) * jobFactor,
  }));
  const montageBase = calcMaterialesum() + tralleSum;
  const slaebePctInput = toNumber(document.getElementById('slaebePct')?.value);
  const slaebeBelob = montageBase * (Number.isFinite(slaebePctInput) ? slaebePctInput / 100 : 0);
  const antalBoringHuller = toNumber(document.getElementById('antalBoringHuller')?.value);
  const antalBoringBeton = toNumber(document.getElementById('antalBoringBeton')?.value);
  const antalLukHuller = toNumber(document.getElementById('antalLukHuller')?.value);
  const antalOpskydeligt = toNumber(document.getElementById('antalOpskydeligt')?.value);
  const antalKm = toNumber(document.getElementById('km')?.value);

  const ekstraarbejdeModel = {
    tralleløft: tralleSum,
    huller: antalBoringHuller * BORING_HULLER_RATE,
    boring: antalBoringBeton * BORING_BETON_RATE,
    lukAfHul: antalLukHuller * LUK_HULLER_RATE,
    opskydeligt: antalOpskydeligt * OPSKYDELIGT_RATE,
    km: antalKm * KM_RATE,
    oevrige: 0,
  };
  const laborTotals = labor.map(entry => ({
    hours: toNumber(entry?.hours),
    hourlyWithAllowances: toNumber(entry?.rate),
  }));
  const totalHours = laborTotals.reduce((sum, worker) => sum + (Number.isFinite(worker.hours) ? worker.hours : 0), 0);
  const totalsFallback = calculateTotals({
    materialLines: materialLinesForTotals,
    slaebeBelob,
    extra: ekstraarbejdeModel,
    workers: laborTotals,
    totalHours,
  });

  const materialSum = cache && Number.isFinite(cache.materialSum)
    ? cache.materialSum
    : totalsFallback.materialer;
  const extraSum = totalsFallback.ekstraarbejde;
  const haulSum = totalsFallback.slaeb;
  const laborSum = cache && Number.isFinite(cache.laborSum)
    ? cache.laborSum
    : totalsFallback.montoerLonMedTillaeg;
  const projectSum = cache && Number.isFinite(cache.projectSum)
    ? cache.projectSum
    : totalsFallback.projektsum;

  const lines = [];
  lines.push('Sektion;Felt;Værdi;Antal;Pris;Linjesum');
  lines.push(`Sagsinfo;Sagsnummer;${escapeCSV(info.sagsnummer)};;;`);
  lines.push(`Sagsinfo;Navn/opgave;${escapeCSV(info.navn)};;;`);
  lines.push(`Sagsinfo;Adresse;${escapeCSV(info.adresse)};;;`);
  lines.push(`Sagsinfo;Kunde;${escapeCSV(info.kunde)};;;`);
  lines.push(`Sagsinfo;Dato;${escapeCSV(info.dato)};;;`);
  lines.push(`Sagsinfo;Status;${escapeCSV(formatStatusLabel(info.status))};;;`);
  const montorText = (info.montoer || '').replace(/\r?\n/g, ', ');
  lines.push(`Sagsinfo;Montørnavne;${escapeCSV(montorText)};;;`);

  lines.push('');
  lines.push('Sektion;Id;Materiale;Antal;Pris;Linjesum');
  if (materials.length === 0) {
    lines.push('Materiale;;;0;0,00;0,00');
  } else {
    materials.forEach(item => {
      const qty = toNumber(item.quantity);
      if (qty === 0) return;
      const price = toNumber(item.price);
      const total = qty * price;
      const manualIndex = manualMaterials.indexOf(item);
      const label = item.manual ? (item.name?.trim() || `Manuelt materiale ${manualIndex + 1}`) : item.name;
      lines.push(`Materiale;${escapeCSV(item.id)};${escapeCSV(label)};${escapeCSV(formatNumberForCSV(qty))};${escapeCSV(formatNumberForCSV(price))};${escapeCSV(formatNumberForCSV(total))}`);
    });
  }

  const tralle = window.__traelleloeft;
  if (tralle && (tralle.n35 > 0 || tralle.n50 > 0)) {
    if (tralle.n35 > 0) {
      const total35 = tralle.n35 * tralle.RATE35;
      lines.push(`Materiale;TL35;Tralleløft 0,35 m;${escapeCSV(formatNumberForCSV(tralle.n35))};${escapeCSV(formatNumberForCSV(tralle.RATE35))};${escapeCSV(formatNumberForCSV(total35))}`);
    }
    if (tralle.n50 > 0) {
      const total50 = tralle.n50 * tralle.RATE50;
      lines.push(`Materiale;TL50;Tralleløft 0,50 m;${escapeCSV(formatNumberForCSV(tralle.n50))};${escapeCSV(formatNumberForCSV(tralle.RATE50))};${escapeCSV(formatNumberForCSV(total50))}`);
    }
  }

  lines.push('');
  lines.push('Sektion;Arbejdstype;Timer;Sats;Linjesum');
  if (labor.length === 0) {
    lines.push('Løn;Ingen registrering;;;');
  } else {
    labor.forEach((entry, index) => {
      const hours = toNumber(entry.hours);
      const rate = toNumber(entry.rate);
      const total = hours * rate;
      const type = entry.type || `Arbejdstype ${index + 1}`;
      lines.push(`Løn;${escapeCSV(type)};${escapeCSV(formatNumberForCSV(hours))};${escapeCSV(formatNumberForCSV(rate))};${escapeCSV(formatNumberForCSV(total))}`);
    });
  }

  lines.push('');
  lines.push('Sektion;Total;Beløb');
  lines.push(`Total;Materialesum;${escapeCSV(formatNumberForCSV(materialSum))}`);
  if (extraSum > 0) {
    lines.push(`Total;Ekstraarbejde;${escapeCSV(formatNumberForCSV(extraSum))}`);
  }
  if (haulSum > 0) {
    lines.push(`Total;Slæb;${escapeCSV(formatNumberForCSV(haulSum))}`);
  }
  lines.push(`Total;Lønsum;${escapeCSV(formatNumberForCSV(laborSum))}`);
  lines.push(`Total;Projektsum;${escapeCSV(formatNumberForCSV(projectSum))}`);

  const content = lines.join('\n');
  const baseName = sanitizeFilename(info.sagsnummer || 'akkordseddel') || 'akkordseddel';
  return {
    content,
    baseName,
    fileName: `${baseName}.csv`,
    originalName: info.sagsnummer,
  };
}

function downloadCSV(customSagsnummer, options = {}) {
  const payload = buildCSVPayload(customSagsnummer, options);
  if (!payload) return false;
  const blob = new Blob([payload.content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = payload.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  updateActionHint('CSV er gemt til din enhed.', 'success');
  return true;
}

function generateCSVString(options = {}) {
  const payload = buildCSVPayload(options?.customSagsnummer, options);
  return payload ? payload.content : '';
}

// --- PDF-eksport (html2canvas + jsPDF) ---
async function exportPDFBlob(customSagsnummer, options = {}) {
  if (!options?.skipValidation && !validateSagsinfo()) {
    updateActionHint('Udfyld Sagsinfo for at eksportere.', 'error');
    return null;
  }
  if (!options?.skipBeregn) {
    beregnLon();
  }
  const info = collectSagsinfo();
  if (customSagsnummer) {
    info.sagsnummer = customSagsnummer;
  }
  const cache = typeof window !== 'undefined' ? window.__beregnLonCache : null;
  const materials = getAllData().filter(item => toNumber(item.quantity) > 0);
  const labor = Array.isArray(laborEntries) ? laborEntries : [];
  const tralleState = computeTraelleTotals();
  const tralleSum = tralleState && Number.isFinite(tralleState.sum) ? tralleState.sum : 0;
  const jobType = document.getElementById('jobType')?.value || 'montage';
  const jobFactor = jobType === 'demontage' ? 0.5 : 1;
  const materialLinesForTotals = materials.map(item => ({
    qty: toNumber(item.quantity),
    unitPrice: toNumber(item.price) * jobFactor,
  }));
  const montageBase = calcMaterialesum() + tralleSum;
  const slaebePctInput = toNumber(document.getElementById('slaebePct')?.value);
  const slaebeBelob = montageBase * (Number.isFinite(slaebePctInput) ? slaebePctInput / 100 : 0);
  const ekstraarbejdeModel = {
    tralleløft: tralleSum,
    huller: toNumber(document.getElementById('antalBoringHuller')?.value) * BORING_HULLER_RATE,
    boring: toNumber(document.getElementById('antalBoringBeton')?.value) * BORING_BETON_RATE,
    lukAfHul: toNumber(document.getElementById('antalLukHuller')?.value) * LUK_HULLER_RATE,
    opskydeligt: toNumber(document.getElementById('antalOpskydeligt')?.value) * OPSKYDELIGT_RATE,
    km: toNumber(document.getElementById('km')?.value) * KM_RATE,
    oevrige: 0,
  };
  const laborTotals = labor.map(entry => ({
    hours: toNumber(entry?.hours),
    hourlyWithAllowances: toNumber(entry?.rate),
  }));
  const totalHours = laborTotals.reduce((sum, worker) => sum + (Number.isFinite(worker.hours) ? worker.hours : 0), 0);
  const totalsFallback = calculateTotals({
    materialLines: materialLinesForTotals,
    slaebeBelob,
    extra: ekstraarbejdeModel,
    workers: laborTotals,
    totalHours,
  });

  const materialSum = cache && Number.isFinite(cache.materialSum)
    ? cache.materialSum
    : totalsFallback.materialer;
  const extraSum = totalsFallback.ekstraarbejde;
  const haulSum = totalsFallback.slaeb;
  const laborSum = cache && Number.isFinite(cache.laborSum)
    ? cache.laborSum
    : totalsFallback.montoerLonMedTillaeg;
  const projectSum = cache && Number.isFinite(cache.projectSum)
    ? cache.projectSum
    : totalsFallback.projektsum;

  const wrapper = document.createElement('div');
  wrapper.className = 'export-preview';
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.background = '#ffffff';
  wrapper.style.color = '#000000';
  wrapper.style.padding = '24px';
  wrapper.style.width = '794px';
  wrapper.style.boxSizing = 'border-box';

  const workerCountDisplay = laborTotals.filter(entry => Number.isFinite(entry.hours) && entry.hours > 0).length;
  const fmtHours = value => new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);

  function formatReviewValue(row) {
    switch (row.format) {
      case 'currency': {
        const amount = `${formatCurrency(row.value)} kr`;
        if (!row.info) return amount;
        let infoText = '';
        if (row.info.type === 'percent') {
          infoText = `${formatNumber(row.info.percent)} %`;
        } else if (row.info.type === 'qtyPrice') {
          const qtyLabel = row.info.unitLabel ? `${formatNumber(row.info.qty)} ${row.info.unitLabel}` : formatNumber(row.info.qty);
          infoText = `${qtyLabel} × ${formatCurrency(row.info.unitPrice)} kr`;
        } else if (row.info.type === 'trolley') {
          const qtyText = row.info.qty ? `${formatNumber(row.info.qty)} løft` : '';
          const entryText = Array.isArray(row.info.entries)
            ? row.info.entries
              .filter(entry => entry && Number(entry.qty) > 0)
              .map(entry => `${formatNumber(entry.qty)} × ${formatCurrency(entry.unitPrice)} kr`)
              .join(' · ')
            : '';
          infoText = [qtyText, entryText].filter(Boolean).join(' · ');
        }
        return infoText ? `${amount} (${infoText})` : amount;
      }
      case 'hours':
        return `${fmtHours(row.value)} t`;
      case 'team': {
        const count = Number(row.value?.workersCount) || 0;
        const hours = fmtHours(row.value?.hours || 0);
        if (!count) return `${hours} t`;
        const label = count === 1 ? '1 medarbejder' : `${count} medarbejdere`;
        return `${label} · ${hours} t`;
      }
      default:
        return '';
    }
  }

  const reviewRows = [
    { id: 'materials', label: '1. Materialer', format: 'currency', value: materialSum },
    { id: 'extraWork', label: '2. Ekstra arbejde', format: 'currency', value: extraSum },
    { id: 'extra-sled', label: '   Slæb', format: 'currency', value: slaebeBelob, subtle: true, info: { type: 'percent', percent: slaebePctInput } },
    { id: 'extra-km', label: '   Kilometer', format: 'currency', value: ekstraarbejdeModel.km, subtle: true, info: { type: 'qtyPrice', qty: antalKm, unitPrice: KM_RATE, unitLabel: 'km' } },
    { id: 'extra-holes', label: '   Boring af huller', format: 'currency', value: ekstraarbejdeModel.huller, subtle: true, info: { type: 'qtyPrice', qty: antalBoringHuller, unitPrice: BORING_HULLER_RATE } },
    { id: 'extra-close-hole', label: '   Luk af hul', format: 'currency', value: ekstraarbejdeModel.lukAfHul, subtle: true, info: { type: 'qtyPrice', qty: antalLukHuller, unitPrice: LUK_HULLER_RATE } },
    { id: 'extra-concrete', label: '   Boring i beton', format: 'currency', value: ekstraarbejdeModel.boring, subtle: true, info: { type: 'qtyPrice', qty: antalBoringBeton, unitPrice: BORING_BETON_RATE } },
    { id: 'extra-folding-rail', label: '   Opslåeligt rækværk', format: 'currency', value: ekstraarbejdeModel.opskydeligt, subtle: true, info: { type: 'qtyPrice', qty: antalOpskydeligt, unitPrice: OPSKYDELIGT_RATE } },
    {
      id: 'extra-trolley',
      label: '   Tralleløft',
      format: 'currency',
      value: tralleSum,
      subtle: true,
      info: {
        type: 'trolley',
        qty: (tralleState?.n35 || 0) + (tralleState?.n50 || 0),
        entries: [
          { qty: tralleState?.n35 || 0, unitPrice: TRAELLE_RATE35 },
          { qty: tralleState?.n50 || 0, unitPrice: TRAELLE_RATE50 }
        ]
      }
    },
    { id: 'accordSum', label: '3. Samlet akkordsum', format: 'currency', value: totalsFallback.samletAkkordsum, emphasize: true },
    { id: 'hours', label: '4. Timer', format: 'hours', value: totalHours },
    { id: 'team', label: '5. Medarbejdere & timer', format: 'team', value: { workersCount: workerCountDisplay, hours: totalHours } }
  ];

  const reviewRowsHtml = reviewRows.map(row => {
    const classes = ['review-row'];
    if (row.subtle) classes.push('review-row--subtle');
    if (row.emphasize) classes.push('review-row--emphasize');
    return `<div class="${classes.join(' ')}"><span>${row.label}</span><strong>${formatReviewValue(row)}</strong></div>`;
  }).join('');

  wrapper.innerHTML = `
    <style>
      .export-preview { font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
      .export-preview h2 { margin-top: 0; }
      .export-preview section { margin-bottom: 16px; }
      .export-preview ul { list-style: none; padding: 0; margin: 0; }
      .export-preview ul li { margin-bottom: 6px; }
      .export-preview table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      .export-preview th, .export-preview td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 14px; }
      .export-preview th { background: #f0f0f0; }
      .export-preview .review-grid { display: flex; flex-direction: column; gap: 6px; }
      .export-preview .review-row { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
      .export-preview .review-row--subtle { color: #4f4f4f; font-size: 13px; }
      .export-preview .review-row--emphasize { font-weight: 600; }
      .export-preview .review-row span { flex: 1; }
      .export-preview .review-row strong { white-space: pre-wrap; text-align: right; }
      .export-preview .totals { display: flex; gap: 12px; flex-wrap: wrap; }
      .export-preview .totals div { background: #f7f7f7; border: 1px solid #ddd; padding: 8px 12px; border-radius: 6px; }
    </style>
    <h2>Akkordseddel</h2>
    <section>
      <h3>Sagsinfo</h3>
      <ul>
        <li><strong>Sagsnummer:</strong> ${escapeHtml(info.sagsnummer)}</li>
        <li><strong>Navn/opgave:</strong> ${escapeHtml(info.navn)}</li>
        <li><strong>Adresse:</strong> ${escapeHtml(info.adresse)}</li>
        <li><strong>Kunde:</strong> ${escapeHtml(info.kunde)}</li>
        <li><strong>Dato:</strong> ${escapeHtml(info.dato)}</li>
        <li><strong>Status:</strong> ${escapeHtml(formatStatusLabel(info.status))}</li>
        <li><strong>Montørnavne:</strong> ${escapeHtml(info.montoer).replace(/\n/g, '<br>')}</li>
      </ul>
    </section>
    <section>
      <h3>Materialer</h3>
      ${materials.length ? `
        <table class="export-table">
          <thead>
            <tr><th>Id</th><th>Materiale</th><th>Antal</th><th>Pris</th><th>Linjesum</th></tr>
          </thead>
          <tbody>
            ${materials.map(item => {
              const qty = toNumber(item.quantity);
              const price = toNumber(item.price);
              const total = qty * price;
              const manualIndex = manualMaterials.indexOf(item);
              const label = item.manual ? (item.name?.trim() || `Manuelt materiale ${manualIndex + 1}`) : item.name;
              return `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(label)}</td><td>${qty.toLocaleString('da-DK', { maximumFractionDigits: 2 })}</td><td>${formatCurrency(price)} kr</td><td>${formatCurrency(total)} kr</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      ` : '<p>Ingen materialer registreret.</p>'}
    </section>
    <section>
      <h3>Løn</h3>
      ${labor.length ? `
        <table class="export-table">
          <thead>
            <tr><th>Arbejdstype</th><th>Timer</th><th>Sats</th><th>Linjesum</th></tr>
          </thead>
          <tbody>
            ${labor.map((entry, index) => {
              const hours = toNumber(entry.hours);
              const rate = toNumber(entry.rate);
              const total = hours * rate;
              const type = entry.type || `Arbejdstype ${index + 1}`;
              return `<tr><td>${escapeHtml(type)}</td><td>${hours.toLocaleString('da-DK', { maximumFractionDigits: 2 })}</td><td>${formatCurrency(rate)} kr</td><td>${formatCurrency(total)} kr</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      ` : '<p>Ingen lønlinjer registreret.</p>'}
    </section>
    <section>
      <h3>Oversigt</h3>
      <div class="review-grid">
        ${reviewRowsHtml}
      </div>
    </section>
    <section>
      <h3>Løn & projektsum</h3>
      <div class="totals">
        <div><strong>Lønsum</strong><div>${formatCurrency(laborSum)} kr</div></div>
        <div><strong>Projektsum</strong><div>${formatCurrency(projectSum)} kr</div></div>
      </div>
    </section>
    <section>
      <h3>Detaljer</h3>
      ${document.getElementById('lonResult')?.innerHTML || '<p>Ingen beregning udført.</p>'}
    </section>
  `;

  document.body.appendChild(wrapper);
  try {
    const { jsPDF, html2canvas } = await ensureExportLibs();
    const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: '#ffffff' });
    const doc = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
    const baseName = sanitizeFilename(info.sagsnummer || 'akkordseddel');
    const blob = doc.output('blob');
    return { blob, baseName, fileName: `${baseName}.pdf` };
  } catch (err) {
    console.error('PDF eksport fejlede:', err);
    updateActionHint('PDF eksport fejlede. Prøv igen.', 'error');
    return null;
  } finally {
    document.body.removeChild(wrapper);
  }
}

async function exportPDF(customSagsnummer, options = {}) {
  const payload = await exportPDFBlob(customSagsnummer, options);
  if (!payload) return;
  const url = URL.createObjectURL(payload.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = payload.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  updateActionHint('PDF er gemt til din enhed.', 'success');
}

registerPDFEngine(async (job, options = {}) => {
  const customSagsnummer = job?.sagsinfo?.sagsnr
    || job?.sagsinfo?.sagsnummer
    || job?.sagsnr
    || job?.sagsnummer
    || job?.id
    || null;
  const payload = await exportPDFBlob(customSagsnummer, { ...options, skipValidation: true });
  if (!payload?.blob) {
    throw new Error('PDF eksport mislykkedes');
  }
  return payload.blob;
});

async function exportZip() {
  if (!validateSagsinfo()) {
    updateActionHint('Udfyld Sagsinfo for at eksportere.', 'error');
    return;
  }
  try {
    const { JSZip } = await ensureZipLib();
    beregnLon();
    const csvPayload = buildCSVPayload(null, { skipValidation: true, skipBeregn: true });
    if (!csvPayload) return;
    const pdfPayload = await exportPDFBlob(csvPayload.originalName || csvPayload.baseName, { skipValidation: true, skipBeregn: true });
    if (!pdfPayload) return;

    const zip = new JSZip();
    zip.file(csvPayload.fileName, csvPayload.content);
    zip.file(pdfPayload.fileName, pdfPayload.blob);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    const baseName = csvPayload.baseName || pdfPayload.baseName || 'akkordseddel';
    link.href = url;
    link.download = `${baseName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    updateActionHint('ZIP med PDF og CSV er gemt.', 'success');
  } catch (error) {
    console.error('ZIP eksport fejlede', error);
    updateActionHint('ZIP eksport fejlede. Prøv igen.', 'error');
  }
}

// --- Samlet eksport ---
async function exportAll(customSagsnummer) {
  if (!validateSagsinfo()) {
    updateActionHint('Udfyld Sagsinfo for at eksportere.', 'error');
    return;
  }
  const sagsnummer = customSagsnummer || beregnLon();
  if (!sagsnummer) return;
  downloadCSV(sagsnummer, { skipBeregn: true, skipValidation: true });
  await exportPDF(sagsnummer, { skipBeregn: true });
  updateActionHint('Eksport af PDF og CSV er fuldført.', 'success');
}

// --- CSV-import for optælling ---
function importJSONProject(file) {
  const reader = new FileReader();
  reader.onload = event => {
    try {
      const text = event.target?.result;
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Ugyldigt JSON format');
      }
      const snapshot = parsed.data && !parsed.sagsinfo ? parsed.data : parsed;
      applyProjectSnapshot(snapshot, { skipHint: true });
      updateActionHint('JSON sag er indlæst.', 'success');
    } catch (error) {
      console.error('Kunne ikke importere JSON', error);
      updateActionHint('Kunne ikke importere JSON-filen.', 'error');
    }
  };
  reader.onerror = () => {
    updateActionHint('Kunne ikke læse filen.', 'error');
  };
  reader.readAsText(file, 'utf-8');
}

function uploadCSV(file) {
  if (!file) return;
  if (!/\.csv$/i.test(file.name) && !(file.type && file.type.includes('csv'))) {
    updateActionHint('Vælg en gyldig CSV-fil for at importere.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = event => {
    try {
      const rows = parseCSV(event.target.result);
      applyCSVRows(rows);
      updateActionHint('CSV er importeret.', 'success');
    } catch (err) {
      console.error('Kunne ikke importere CSV', err);
      updateActionHint('Kunne ikke importere CSV-filen.', 'error');
    }
  };
  reader.readAsText(file, 'utf-8');
}

function setupMobileKeyboardDismissal() {
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const type = target.type?.toLowerCase?.() || '';
    const mode = target.inputMode?.toLowerCase?.() || '';
    if (type === 'number' || mode === 'numeric' || mode === 'decimal') {
      event.preventDefault();
      target.blur();
    }
  });

  document.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const type = target.type?.toLowerCase?.() || '';
    const mode = target.inputMode?.toLowerCase?.() || '';
    if (type === 'number' || mode === 'numeric' || mode === 'decimal') {
      if (typeof target.blur === 'function') {
        target.blur();
      }
    }
  });
}

function setupServiceWorkerMessaging() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'CSMATE_UPDATED') {
      window.location.reload();
    }
  });
}


async function hardResetApp() {
  if (navigator.serviceWorker) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(reg => reg.unregister()));
  }

  if (window.caches) {
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
  }

  if (window.indexedDB) {
    const dbs = await indexedDB.databases?.() || [];
    await Promise.all(dbs.map(db => new Promise(resolve => {
      if (!db?.name) {
        resolve();
        return;
      }
      const request = indexedDB.deleteDatabase(db.name);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    })));
  }

  try {
    window.localStorage?.clear();
  } catch {}
  try {
    window.sessionStorage?.clear();
  } catch {}

  window.location.reload(true);
}


// --- Initialization ---
let appInitialized = false;

async function initApp() {
  if (appInitialized) return;
  appInitialized = true;

  vis('jobs');

  const navConfig = [
    { id: 'btnJobs', section: 'jobs', tab: 'job', onActivate: () => renderJobList() },
    { id: 'btnSagsinfo', section: 'sagsinfo', tab: 'case' },
    { id: 'btnOptaelling', section: 'optaelling', tab: 'count' },
    { id: 'btnLon', section: 'lon', tab: 'wage' },
    { id: 'btnHistorik', section: 'historik', tab: 'history', onActivate: () => renderAuditLog() },
    { id: 'tab-btn-admin', section: 'view-admin', tab: 'admin' },
    { id: 'tab-btn-help', section: 'help', tab: 'help', onActivate: () => activateTabByName('help') },
  ];

  navConfig.forEach(({ id, section, tab, onActivate }) => {
    const button = document.getElementById(id);
    if (!button) return;
    button.addEventListener('click', () => {
      if (tab) {
        setActiveTab(tab);
      } else if (section) {
        vis(section);
      }
      if (typeof onActivate === 'function') {
        onActivate();
      }
    });
  });

  const optaellingContainer = document.getElementById('optaellingContainer');
  if (optaellingContainer) {
    optaellingContainer.addEventListener('input', handleOptaellingInput);
    optaellingContainer.addEventListener('change', handleOptaellingInput);
  }

  const showSelectedInput = document.getElementById('showSelectedOnly');
  if (showSelectedInput) {
    showSelectedInput.addEventListener('change', () => {
      updateMaterialVisibility();
    });
  }

  scheduleIdleTask(async () => {
    await primeBaseMaterialLists();
    hydrateMaterialListsFromJson();
    setupListSelectors();
    renderOptaelling();
    addWorker();
    setupCSVImport();
    validateSagsinfo();
    updateTotals(true);
  }, { timeout: 500 });

  scheduleIdleTask(() => {
    initStatusControls();
    populateRecentCases();
    setupGuideModal();

    document.getElementById('btnBeregnLon')?.addEventListener('click', () => beregnLon());
    document.getElementById('btnPrint')?.addEventListener('click', () => {
      if (validateSagsinfo()) {
        window.print();
      } else {
        updateActionHint('Udfyld Sagsinfo for at kunne printe.', 'error');
      }
    });

    document.getElementById('btnExportCSV')?.addEventListener('click', () => downloadCSV());

    document.getElementById('btnExportAll')?.addEventListener('click', async () => {
      await exportAll();
    });

    document.getElementById('btnExportZip')?.addEventListener('click', async () => {
      await exportZip();
    });

    ['btnExportAll', 'btnExportZip'].forEach(id => {
      const button = document.getElementById(id);
      if (!button) return;
      const prime = () => prefetchExportLibs();
      button.addEventListener('pointerenter', prime, { once: true });
      button.addEventListener('focus', prime, { once: true });
    });

    document.getElementById('btnAddWorker')?.addEventListener('click', () => addWorker());

    const recentSelect = document.getElementById('recentCases');
    if (recentSelect) {
      recentSelect.addEventListener('change', event => {
        const loadBtn = document.getElementById('btnLoadCase');
        if (loadBtn) {
          loadBtn.disabled = !(event.target.value);
        }
      });
    }
    document.getElementById('btnLoadCase')?.addEventListener('click', () => handleLoadCase());
  }, { timeout: 1000 });

  ['traelleloeft35', 'traelleloeft50'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', () => updateTotals());
      input.addEventListener('change', () => updateTotals(true));
    }
  });

  sagsinfoFieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => validateSagsinfo());
      el.addEventListener('change', () => validateSagsinfo());
    }
  });

  scheduleIdleTask(() => {
    installLazyNumpad();
    setupMobileKeyboardDismissal();
    setupServiceWorkerMessaging();
    setupPwaInstall();
  });

  document.getElementById('btnHardResetApp')?.addEventListener('click', () => {
    hardResetApp();
  });

  const calendarIcon = document.getElementById('calendarIcon');
  if (calendarIcon) {
    calendarIcon.addEventListener('click', () => {
      const dateField = document.getElementById('sagsdato');
      if (!dateField) return;
      if (typeof dateField.showPicker === 'function') {
        dateField.showPicker();
      } else {
        dateField.focus();
        if (typeof dateField.click === 'function') {
          dateField.click();
        }
      }
    });
  }

  setupJobUI();
  setupSagsinfoAudit();
  setupMaterialAuditListeners();
  setupLonAuditListeners();
  setupUserManagementUi();
  ensureJobsInitialised();
  const job = getCurrentJob();
  if (job) {
    applyJobToUI(job, { force: true, skipPersist: true });
  } else {
    renderJobList();
  }
  document.getElementById('btnLockJob')?.addEventListener('click', () => lockCurrentJob());
  document.getElementById('btnMarkSent')?.addEventListener('click', () => markCurrentJobSent());
  document.getElementById('btnExportAudit')?.addEventListener('click', () => exportAuditLogCsv());
}

registerJobStoreHooks({
  resolveActiveJob: () => getCurrentJob(),
  setActiveJob: jobId => {
    if (!jobId) {
      return null;
    }
    setCurrentJob(jobId, { force: true });
    return getCurrentJob();
  },
  saveActiveJob: () => {
    persistCurrentJobState({ silent: false });
    return getCurrentJob();
  }
});

async function bootstrap () {
  await initApp();
  applyUserToUi(getStoredUser());

  try {
    await initAuth();
  } catch (error) {
    console.error('initAuth failed', error);
  }

  syncAuthUiFromState();
  updateAdminTabVisibility();
  initAuthButtons();
  setActiveTab('job');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}

export { populateWorkersFromLabor };
