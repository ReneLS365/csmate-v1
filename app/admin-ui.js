import { listUsers, updateUser } from './user-registry.js';
import { listJobsForFirm, approveJobById, rejectJobById } from './job-admin.js';
import { formatApprovalStatus, ensureJobStatus } from './job-status.js';

function isGlobalAdmin(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.some(role => {
    const value = typeof role === 'string' ? role.trim().toLowerCase() : '';
    return value === 'csmate-admin' || value === 'owner' || value === 'platformadmin';
  });
}

function isFirmAdmin(user, firmId) {
  if (!user || !firmId) return false;
  const normalizedFirm = firmId.trim().toLowerCase();
  const tenants = Array.isArray(user.tenants) ? user.tenants : [];
  return tenants.some(entry => {
    if (!entry) return false;
    const id = typeof entry.id === 'string' && entry.id.trim()
      ? entry.id.trim().toLowerCase()
      : typeof entry.tenantId === 'string' && entry.tenantId.trim()
        ? entry.tenantId.trim().toLowerCase()
        : null;
    if (id !== normalizedFirm) return false;
    const role = typeof entry.role === 'string' ? entry.role.trim().toLowerCase() : '';
    return role === 'tenantadmin' || role === 'tenant_admin' || role === 'owner' || role === 'firma-admin';
  });
}

function getCurrentUserId(user) {
  if (!user) return '';
  if (typeof user.id === 'string' && user.id.trim()) return user.id;
  if (typeof user.authId === 'string' && user.authId.trim()) return user.authId;
  if (typeof user.email === 'string' && user.email.trim()) return user.email;
  if (typeof user.emailKey === 'string' && user.emailKey.trim()) return user.emailKey;
  return '';
}

function formatTimestamp(value) {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('da-DK', { dateStyle: 'short', timeStyle: 'short' });
  } catch (error) {
    console.warn('Kunne ikke formatere tidspunkt', error);
    return '';
  }
}

function renderUsersTable({ container, users, firmId, canAssign, tenantName }) {
  if (!container) return;

  container.replaceChildren();

  if (!Array.isArray(users) || users.length === 0) {
    const message = document.createElement('p');
    message.textContent = 'Ingen brugere registreret lokalt endnu.';
    container.append(message);
    return;
  }

  const heading = document.createElement('h4');
  heading.textContent = 'Brugere';
  container.append(heading);

  const subtitle = document.createElement('p');
  subtitle.className = 'muted';
  subtitle.textContent = 'Registreret lokalt i denne browser. Ændringer skal senere synkroniseres med Auth0.';
  container.append(subtitle);

  const table = document.createElement('table');
  table.className = 'admin-users-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Bruger', 'Firmatilhør', 'Rolle', 'Noter', 'Handlinger'].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.append(th);
  });
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement('tbody');

  users.forEach(user => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const name = user.name || user.email || user.id || '';
    const strong = document.createElement('strong');
    strong.textContent = name;
    nameCell.append(strong);
    nameCell.append(document.createElement('br'));
    const small = document.createElement('small');
    small.textContent = user.email || '';
    nameCell.append(small);
    row.append(nameCell);

    const firmCell = document.createElement('td');
    firmCell.textContent = user.firmId || '-';
    row.append(firmCell);

    const roleCell = document.createElement('td');
    const normalizedRole = typeof user.role === 'string' ? user.role.trim() : '';
    roleCell.textContent = normalizedRole || 'user';
    row.append(roleCell);

    const notesCell = document.createElement('td');
    const flags = [];
    if (user.firmId === firmId) flags.push('Samme firma');
    if (normalizedRole.toLowerCase() === 'firma-admin') flags.push('Firma-admin');
    if (normalizedRole.toLowerCase() === 'csmate-admin') flags.push('CSMate-admin');
    if (flags.length) {
      const badge = document.createElement('div');
      badge.className = 'muted';
      badge.textContent = flags.join(', ');
      notesCell.append(badge);
    }
    row.append(notesCell);

    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions';
    if (canAssign) {
      const assignBtn = document.createElement('button');
      assignBtn.type = 'button';
      assignBtn.className = 'btn small';
      assignBtn.dataset.userFirm = user.id;
      assignBtn.textContent = 'Tilknyt';
      actionsCell.append(assignBtn);

      const adminBtn = document.createElement('button');
      adminBtn.type = 'button';
      adminBtn.className = 'btn small';
      adminBtn.dataset.userFirmAdmin = user.id;
      adminBtn.textContent = 'Firma-admin';
      actionsCell.append(adminBtn);
    }
    row.append(actionsCell);

    tbody.append(row);
  });

  table.append(tbody);
  container.append(table);

  if (!canAssign) return;

  container.querySelectorAll('button[data-user-firm]').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.userFirm || '';
      const existing = users.find(user => user.id === targetId);
      updateUser(targetId, { firmId, role: existing?.role || 'user' });
      console.log('TODO: Opdater Auth0 app_metadata.firmId for', targetId, '->', firmId);
      renderUsersTable({ container, users: listUsers(), firmId, canAssign, tenantName });
    });
  });

  container.querySelectorAll('button[data-user-firm-admin]').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.userFirmAdmin || '';
      updateUser(targetId, { firmId, role: 'firma-admin' });
      console.log('TODO: Opdater Auth0 rolle til "firma-admin" for', targetId, 'i firma', firmId);
      renderUsersTable({ container, users: listUsers(), firmId, canAssign, tenantName });
    });
  });
}

function renderJobsTable({ container, jobs, currentUserId }) {
  if (!container) return;

  container.replaceChildren();

  if (!Array.isArray(jobs) || jobs.length === 0) {
    const message = document.createElement('p');
    message.textContent = 'Ingen sager registreret for dette firma endnu.';
    container.append(message);
    return;
  }

  const counts = jobs.reduce((acc, job) => {
    const key = job.approvalStatus || 'draft';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const heading = document.createElement('h4');
  heading.textContent = 'Sager';
  container.append(heading);

  const summary = document.createElement('p');
  summary.className = 'muted';
  summary.textContent = `Overblik – Kladde: ${counts.draft || 0}, Afventer: ${counts.submitted || 0}, Godkendt: ${counts.approved || 0}, Afvist: ${counts.rejected || 0}`;
  container.append(summary);

  const table = document.createElement('table');
  table.className = 'admin-jobs-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Sag', 'Status', 'Godkendt af', 'Tidspunkt', 'Handlinger'].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.append(th);
  });
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement('tbody');

  jobs.forEach(job => {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = job.navn || job.sagsnummer || job.id || '';
    row.append(nameCell);

    const statusCell = document.createElement('td');
    statusCell.textContent = formatApprovalStatus(job.approvalStatus);
    row.append(statusCell);

    const approvedByCell = document.createElement('td');
    approvedByCell.textContent = job.approvedBy || '-';
    row.append(approvedByCell);

    const approvedAtCell = document.createElement('td');
    approvedAtCell.textContent = formatTimestamp(job.approvedAt) || '-';
    row.append(approvedAtCell);

    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions';

    const approveBtn = document.createElement('button');
    approveBtn.type = 'button';
    approveBtn.className = 'btn small';
    approveBtn.dataset.jobApprove = job.id;
    approveBtn.textContent = 'Godkend';
    actionsCell.append(approveBtn);

    const rejectBtn = document.createElement('button');
    rejectBtn.type = 'button';
    rejectBtn.className = 'btn small';
    rejectBtn.dataset.jobReject = job.id;
    rejectBtn.textContent = 'Afvis';
    actionsCell.append(rejectBtn);

    row.append(actionsCell);
    tbody.append(row);
  });

  table.append(tbody);
  container.append(table);

  container.querySelectorAll('button[data-job-approve]').forEach(button => {
    button.addEventListener('click', () => {
      const jobId = button.dataset.jobApprove;
      approveJobById(jobId, currentUserId);
      renderJobsTable({ container, jobs: listJobsForFirm(container.dataset.firmId), currentUserId });
      renderLocalFirmAdminUI({
        tenantId: container.dataset.firmId,
        currentUser: window.csmate?.currentUser || null,
        tenantName: container.dataset.tenantLabel || ''
      });
    });
  });

  container.querySelectorAll('button[data-job-reject]').forEach(button => {
    button.addEventListener('click', () => {
      const jobId = button.dataset.jobReject;
      rejectJobById(jobId, currentUserId);
      renderJobsTable({ container, jobs: listJobsForFirm(container.dataset.firmId), currentUserId });
      renderLocalFirmAdminUI({
        tenantId: container.dataset.firmId,
        currentUser: window.csmate?.currentUser || null,
        tenantName: container.dataset.tenantLabel || ''
      });
    });
  });
}

export function renderLocalFirmAdminUI({ tenantId, currentUser, tenantName }) {
  const firmId = typeof tenantId === 'string' ? tenantId.trim() : '';
  const infoEl = document.getElementById('admin-firm-info');
  const usersEl = document.getElementById('admin-firm-users');
  const jobsEl = document.getElementById('admin-firm-jobs');

  if (infoEl) {
    infoEl.replaceChildren();
    const message = document.createElement('p');
    if (!firmId) {
      message.textContent = 'Ingen aktiv firma-tilknytning.';
    } else {
      const label = tenantName || firmId;
      message.append('Aktivt firma: ');
      const strong = document.createElement('strong');
      strong.textContent = label;
      message.append(strong);
      message.append(` (${firmId})`);
    }
    infoEl.append(message);
  }

  const users = listUsers();
  const currentUserId = getCurrentUserId(currentUser);
  const currentUserLabel = currentUser?.displayName || currentUser?.name || currentUserId;
  const globalAdmin = isGlobalAdmin(currentUser);
  const firmAdmin = isFirmAdmin(currentUser, firmId);
  const canAssign = globalAdmin || firmAdmin;

  if (usersEl) {
    renderUsersTable({ container: usersEl, users, firmId, canAssign, tenantName });
  }

  if (jobsEl) {
    jobsEl.dataset.firmId = firmId;
    jobsEl.dataset.tenantLabel = tenantName || '';
    const jobs = firmId ? listJobsForFirm(firmId).map(job => ensureJobStatus({ ...job })) : [];
    renderJobsTable({ container: jobsEl, jobs, currentUserId: currentUserLabel });
  }
import {
  isCsmateAdmin,
  isFirmaAdmin,
  getTenantFirmId,
  setActiveFirmId,
  loadFirmsConfig,
  saveFirmsConfig,
  loadTemplateMeta,
  loadTemplateForTenant,
  saveFirmOverrides
} from './tenant.js';

function renderEmpty(node, message) {
  if (!node) return;
  node.textContent = message || '';
}

export async function initAdminUI(tenant) {
  if (typeof document === 'undefined') return;
  const panel = document.getElementById('admin-panel');
  const adminView = document.getElementById('view-admin');
  if (!panel || !adminView) return;

  const globalSection = document.getElementById('admin-csmate-section');
  const firmSection = document.getElementById('admin-firm-section');

  const isGlobalAdmin = isCsmateAdmin(tenant);
  const isFirmAdminRole = isFirmaAdmin(tenant) || isGlobalAdmin;

  if (!tenant || (!isGlobalAdmin && !isFirmAdminRole)) {
    panel.hidden = true;
    if (adminView) {
      adminView.setAttribute('hidden', '');
      adminView.classList.add('hidden');
    }
    return;
  }

  panel.hidden = false;
  adminView.removeAttribute('hidden');
  adminView.classList.remove('hidden');

  if (globalSection) {
    globalSection.hidden = !isGlobalAdmin;
  }
  if (firmSection) {
    firmSection.hidden = !isFirmAdminRole;
  }

  if (isGlobalAdmin) {
    setupCsmateAdminSection(tenant).catch(error => {
      console.error('Kunne ikke initialisere CSMate admin', error);
    });
  }

  if (isFirmAdminRole) {
    setupFirmAdminSection(tenant).catch(error => {
      console.error('Kunne ikke initialisere firma admin', error);
    });
  }
}

async function setupCsmateAdminSection(tenant) {
  const container = document.getElementById('admin-csmate-firm-list');
  const createBtn = document.getElementById('admin-create-firm-btn');
  if (!container || !createBtn) return;

  const templates = await loadTemplateMeta();
  const templateOptions = (Array.isArray(templates?.templates) ? templates.templates : []).map(template => ({
    id: template.id,
    label: template.label || template.id
  }));

  async function render() {
    const config = await loadFirmsConfig();
    const firms = Array.isArray(config?.firms) ? config.firms : [];
    if (!firms.length) {
      renderEmpty(container, 'Ingen firmaer konfigureret endnu.');
      return;
    }

    const activeFirmId = getTenantFirmId(tenant);
    container.innerHTML = '';

    firms.forEach(firm => {
      const row = document.createElement('div');
      row.className = 'admin-firm-row';

      const title = document.createElement('strong');
      title.textContent = `${firm.name || firm.id} [${firm.id}]`;
      row.appendChild(title);

      if (firm.id === activeFirmId) {
        const activeBadge = document.createElement('span');
        activeBadge.className = 'status-pill';
        activeBadge.textContent = 'Aktiv';
        row.appendChild(activeBadge);
      }

      const templateLabel = document.createElement('label');
      templateLabel.textContent = 'Template';
      templateLabel.setAttribute('for', `firm-template-${firm.id}`);
      templateLabel.className = 'sr-only';
      row.appendChild(templateLabel);

      const select = document.createElement('select');
      select.id = `firm-template-${firm.id}`;
      select.dataset.firmId = firm.id;
      templateOptions.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.id;
        opt.textContent = option.label;
        select.appendChild(opt);
      });
      select.value = firm.templateId || templateOptions[0]?.id || 'default';
      select.addEventListener('change', async () => {
        const nextConfig = await loadFirmsConfig();
        const nextFirms = Array.isArray(nextConfig?.firms) ? nextConfig.firms : [];
        const target = nextFirms.find(entry => entry.id === firm.id);
        if (target) {
          target.templateId = select.value;
          saveFirmsConfig({ firms: nextFirms });
        }
      });
      row.appendChild(select);

      const switchBtn = document.createElement('button');
      switchBtn.type = 'button';
      switchBtn.className = 'btn small';
      switchBtn.textContent = 'Skift til firma';
      switchBtn.addEventListener('click', () => {
        setActiveFirmId(tenant, firm.id);
        window.location.reload();
      });
      row.appendChild(switchBtn);

      container.appendChild(row);
    });
  }

  await render();

  createBtn.addEventListener('click', async () => {
    const name = window.prompt('Firmanavn?');
    if (!name) return;
    const id = window.prompt('Firma-id (brug bogstaver og tal uden mellemrum)?');
    if (!id) return;

    const config = await loadFirmsConfig();
    const firms = Array.isArray(config?.firms) ? config.firms : [];
    if (firms.some(firm => firm.id === id)) {
      window.alert('Et firma med dette id findes allerede.');
      return;
    }
    firms.push({ id, name, templateId: 'default' });
    saveFirmsConfig({ firms });
    await render();
  });
}

async function setupFirmAdminSection(tenant) {
  const infoNode = document.getElementById('admin-firm-info');
  const pricesNode = document.getElementById('admin-firm-prices');
  if (!infoNode || !pricesNode) return;

  const config = await loadFirmsConfig();
  const firmId = getTenantFirmId(tenant);
  const firm = Array.isArray(config?.firms) ? config.firms.find(entry => entry.id === firmId) : null;

  if (!firm) {
    renderEmpty(infoNode, 'Ingen firma-tilknytning.');
    renderEmpty(pricesNode, 'Ingen priser at redigere.');
    return;
  }

  infoNode.innerHTML = `<p>Aktivt firma: <strong>${firm.name || firm.id}</strong> [${firm.id}]</p>`;

  const template = await loadTemplateForTenant(tenant);
  const items = Array.isArray(template?.items) ? template.items : [];
  const priceTable = template?.price_table && typeof template.price_table === 'object'
    ? template.price_table
    : {};

  const table = document.createElement('table');
  table.className = 'admin-price-table';

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Varenr.</th><th>Beskrivelse</th><th>Pris</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const entries = items.length
    ? items
    : Object.entries(priceTable).map(([id, price]) => ({ id, name: id, price }));

  entries.forEach(entry => {
    if (!entry || typeof entry !== 'object') return;
    const id = entry.id || entry.varenr || entry.key;
    if (!id) return;
    const row = document.createElement('tr');

    const idCell = document.createElement('td');
    idCell.textContent = id;
    row.appendChild(idCell);

    const labelCell = document.createElement('td');
    const label = entry.name || entry.label || entry.navn || '';
    labelCell.textContent = label;
    row.appendChild(labelCell);

    const priceCell = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
    input.value = typeof entry.price === 'number' ? entry.price : (typeof priceTable[id] === 'number' ? priceTable[id] : '');
    input.dataset.priceInput = id;
    priceCell.appendChild(input);
    row.appendChild(priceCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  pricesNode.innerHTML = '';
  pricesNode.appendChild(table);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn';
  saveBtn.id = 'admin-save-prices-btn';
  saveBtn.textContent = 'Gem prisændringer';
  saveBtn.addEventListener('click', () => {
    const inputs = pricesNode.querySelectorAll('input[data-price-input]');
    const overrides = { items: [] };
    inputs.forEach(input => {
      const id = input.dataset.priceInput;
      if (!id) return;
      const value = Number(input.value);
      if (!Number.isFinite(value)) return;
      overrides.items.push({ id, price: value });
    });
    saveFirmOverrides(firm.id, overrides);
    window.alert(`Priser gemt for ${firm.name || firm.id}`);
  });
  pricesNode.appendChild(saveBtn);
}
