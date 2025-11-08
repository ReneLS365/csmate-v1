/**
 * @purpose Render the admin configuration console for Hulmose defaults and Auth0/E-Komplet SSO setup.
 * @inputs Stored configuration and session tokens resolved from local storage.
 * @outputs Mutated config persisted via storage helpers plus UI feedback for administrators.
 */

import { ConfigSchema } from '../lib/schema.js';
import { loadConfig, saveConfig } from '../lib/storage.js';
import { attachRoleToSession, can } from '../auth/guards.js';
import { startLogin } from '../auth/oidc.js';

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function ensureConfig() {
  const stored = loadConfig();
  const base = stored ? clone(stored) : clone(ConfigSchema);
  if (!base.auth) base.auth = clone(ConfigSchema.auth);
  if (!base.auth.provider) base.auth.provider = ConfigSchema.auth.provider;
  if (!base.auth.oidc) base.auth.oidc = clone(ConfigSchema.auth.oidc);
  if (!base.auth.roleMapping) base.auth.roleMapping = clone(ConfigSchema.auth.roleMapping);
  if (!('audience' in base.auth.oidc)) base.auth.oidc.audience = ConfigSchema.auth.oidc.audience;
  if (!('connection' in base.auth.oidc)) base.auth.oidc.connection = ConfigSchema.auth.oidc.connection;
  if (!('organization' in base.auth.oidc)) base.auth.oidc.organization = ConfigSchema.auth.oidc.organization;
  if (!('permissionClaim' in base.auth.oidc)) base.auth.oidc.permissionClaim = ConfigSchema.auth.oidc.permissionClaim;
  if (!('logoutPath' in base.auth.oidc)) base.auth.oidc.logoutPath = ConfigSchema.auth.oidc.logoutPath;
  if (!('logoutUsesReturnTo' in base.auth.oidc)) {
    base.auth.oidc.logoutUsesReturnTo = ConfigSchema.auth.oidc.logoutUsesReturnTo;
  }
  if (!Array.isArray(base.auth.roleMapping.rules)) base.auth.roleMapping.rules = [];
  const defaultRuleKeys = new Set(
    base.auth.roleMapping.rules
      .filter((rule) => rule && typeof rule === 'object')
      .map((rule) => `${(rule.claim ?? '').toLowerCase()}|${(rule.contains ?? '').toLowerCase()}|${(rule.to ?? '').toLowerCase()}`)
  );
  for (const rule of ConfigSchema.auth.roleMapping.rules) {
    const key = `${(rule.claim ?? '').toLowerCase()}|${(rule.contains ?? '').toLowerCase()}|${(rule.to ?? '').toLowerCase()}`;
    if (!defaultRuleKeys.has(key)) {
      base.auth.roleMapping.rules.push({ ...rule });
      defaultRuleKeys.add(key);
    }
  }
  if (!Array.isArray(base.auth.domainRules)) base.auth.domainRules = [];
  if (!base.admin) base.admin = clone(ConfigSchema.admin);
  if (!base.company) base.company = clone(ConfigSchema.company);
  if (!base.branding) base.branding = clone(ConfigSchema.branding);
  return base;
}

const config = ensureConfig();
window.__CONFIG__ = config;
attachRoleToSession(config);

const loginGate = document.querySelector('#login-gate');
const form = document.querySelector('#configForm');
const saveStatus = document.querySelector('#saveStatus');
const loginBtn = document.querySelector('#loginBtn');
const testLoginBtn = document.querySelector('#testLogin');

const providerEl = document.querySelector('#provider');
const authorityEl = document.querySelector('#authority');
const clientIdEl = document.querySelector('#clientId');
const redirectEl = document.querySelector('#redirectUri');
const postLogoutEl = document.querySelector('#postLogoutRedirectUri');
const scopesEl = document.querySelector('#scopes');
const audienceEl = document.querySelector('#audience');
const connectionEl = document.querySelector('#connection');
const organizationEl = document.querySelector('#organization');
const permissionClaimEl = document.querySelector('#permissionClaim');
const logoutPathEl = document.querySelector('#logoutPath');
const logoutReturnEl = document.querySelector('#logoutReturnTo');
const codeHashEl = document.querySelector('#codeHash');
const companyNameEl = document.querySelector('#companyName');
const appNameEl = document.querySelector('#appName');
const legalEl = document.querySelector('#legal');

const roleContainer = document.querySelector('#roleRules');
const domainContainer = document.querySelector('#domainRules');
const addRoleBtn = document.querySelector('#addRoleRule');
const addDomainBtn = document.querySelector('#addDomainRule');

function renderRoleRules() {
  roleContainer.innerHTML = '';
  config.auth.roleMapping.rules.forEach((rule, index) => {
    const row = document.createElement('div');
    row.className = 'list-row';

    const claim = document.createElement('input');
    claim.type = 'text';
    claim.placeholder = 'Claim (fx roles)';
    claim.value = rule.claim ?? '';
    claim.addEventListener('input', (event) => {
      config.auth.roleMapping.rules[index].claim = event.target.value;
    });

    const contains = document.createElement('input');
    contains.type = 'text';
    contains.placeholder = 'Indeholder (fx csmate_admin)';
    contains.value = rule.contains ?? '';
    contains.addEventListener('input', (event) => {
      config.auth.roleMapping.rules[index].contains = event.target.value;
    });

    const target = document.createElement('input');
    target.type = 'text';
    target.placeholder = 'Rolle (fx admin)';
    target.value = rule.to ?? '';
    target.addEventListener('input', (event) => {
      config.auth.roleMapping.rules[index].to = event.target.value;
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Fjern';
    remove.className = 'btn secondary';
    remove.addEventListener('click', () => {
      config.auth.roleMapping.rules.splice(index, 1);
      renderRoleRules();
    });

    row.append(claim, contains, target, remove);
    roleContainer.append(row);
  });

  if (config.auth.roleMapping.rules.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Ingen regler endnu – brug "Tilføj regel".';
    empty.className = 'empty-hint';
    roleContainer.append(empty);
  }
}

function renderDomainRules() {
  domainContainer.innerHTML = '';
  config.auth.domainRules.forEach((rule, index) => {
    const row = document.createElement('div');
    row.className = 'list-row';

    const domain = document.createElement('input');
    domain.type = 'text';
    domain.placeholder = 'Domæne (fx hulmose.dk)';
    domain.value = rule.domain ?? '';
    domain.addEventListener('input', (event) => {
      config.auth.domainRules[index].domain = event.target.value;
    });

    const to = document.createElement('input');
    to.type = 'text';
    to.placeholder = 'Rolle (fx foreman)';
    to.value = rule.to ?? '';
    to.addEventListener('input', (event) => {
      config.auth.domainRules[index].to = event.target.value;
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Fjern';
    remove.className = 'btn secondary';
    remove.addEventListener('click', () => {
      config.auth.domainRules.splice(index, 1);
      renderDomainRules();
    });

    row.append(domain, to, remove);
    domainContainer.append(row);
  });

  if (config.auth.domainRules.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Ingen domænemapping endnu – brug "Tilføj domæne".';
    empty.className = 'empty-hint';
    domainContainer.append(empty);
  }
}

function fillForm() {
  providerEl.value = config.auth.provider ?? 'auth0';
  authorityEl.value = config.auth.oidc.authority ?? '';
  clientIdEl.value = config.auth.oidc.clientId ?? '';
  redirectEl.value = config.auth.oidc.redirectUri ?? '';
  postLogoutEl.value = config.auth.oidc.postLogoutRedirectUri ?? '';
  scopesEl.value = config.auth.oidc.scopes ?? '';
  audienceEl.value = config.auth.oidc.audience ?? '';
  connectionEl.value = config.auth.oidc.connection ?? '';
  organizationEl.value = config.auth.oidc.organization ?? '';
  permissionClaimEl.value = config.auth.oidc.permissionClaim ?? ConfigSchema.auth.oidc.permissionClaim;
  logoutPathEl.value = config.auth.oidc.logoutPath ?? '';
  logoutReturnEl.checked = Boolean(config.auth.oidc.logoutUsesReturnTo);
  codeHashEl.value = config.admin.codeHash ?? '';
  companyNameEl.value = config.company.name ?? '';
  appNameEl.value = config.branding.appName ?? '';
  legalEl.value = config.branding.legal ?? '';
  renderRoleRules();
  renderDomainRules();
}

function updateConfigFromForm() {
  config.auth.provider = providerEl.value;
  config.auth.oidc.authority = authorityEl.value.trim();
  config.auth.oidc.clientId = clientIdEl.value.trim();
  config.auth.oidc.scopes = scopesEl.value.trim();
  config.auth.oidc.audience = audienceEl.value.trim();
  config.auth.oidc.connection = connectionEl.value.trim();
  config.auth.oidc.organization = organizationEl.value.trim();
  config.auth.oidc.permissionClaim = permissionClaimEl.value.trim() || ConfigSchema.auth.oidc.permissionClaim;
  config.auth.oidc.logoutPath = logoutPathEl.value.trim() || ConfigSchema.auth.oidc.logoutPath;
  config.auth.oidc.logoutUsesReturnTo = logoutReturnEl.checked;
  config.admin.codeHash = codeHashEl.value.trim();
  config.company.name = companyNameEl.value.trim();
  config.branding.appName = appNameEl.value.trim();
  config.branding.legal = legalEl.value.trim();

  config.auth.roleMapping.rules = config.auth.roleMapping.rules
    .filter((rule) => rule.claim || rule.contains || rule.to)
    .map((rule) => ({
      claim: (rule.claim ?? '').trim(),
      contains: (rule.contains ?? '').trim(),
      to: (rule.to ?? '').trim()
    }));

  config.auth.domainRules = config.auth.domainRules
    .filter((rule) => rule.domain || rule.to)
    .map((rule) => ({
      domain: (rule.domain ?? '').trim(),
      to: (rule.to ?? '').trim()
    }));
}

function handleSave(event) {
  event.preventDefault();
  updateConfigFromForm();
  saveConfig(config);
  window.__CONFIG__ = config;
  saveStatus.classList.remove('hidden');
  saveStatus.textContent = 'Gemte ændringer.';
  setTimeout(() => {
    saveStatus.classList.add('hidden');
  }, 2500);
}

const allowed = can('admin', config);
if (!allowed) {
  loginGate.classList.remove('hidden');
  form.classList.add('hidden');
  loginBtn?.addEventListener('click', () => startLogin());
} else {
  form.classList.remove('hidden');
  loginGate.classList.add('hidden');
  fillForm();
  form.addEventListener('submit', handleSave);
  providerEl.addEventListener('change', () => {
    config.auth.provider = providerEl.value;
  });
  addRoleBtn.addEventListener('click', () => {
    config.auth.roleMapping.rules.push({ claim: '', contains: '', to: '' });
    renderRoleRules();
  });
  addDomainBtn.addEventListener('click', () => {
    config.auth.domainRules.push({ domain: '', to: '' });
    renderDomainRules();
  });
  testLoginBtn?.addEventListener('click', () => startLogin());
}
