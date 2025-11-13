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
}
