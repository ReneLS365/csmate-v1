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
  if (!Array.isArray(users) || users.length === 0) {
    container.innerHTML = '<p>Ingen brugere registreret lokalt endnu.</p>';
    return;
  }

  const rows = users
    .map(user => {
      const name = user.name || user.email || user.id;
      const role = user.role || 'user';
      const firm = user.firmId || '-';
      const flags = [];
      if (user.firmId === firmId) flags.push('Samme firma');
      if (role === 'firma-admin') flags.push('Firma-admin');
      if (role === 'csmate-admin') flags.push('CSMate-admin');
      const badge = flags.length ? `<div class="muted">${flags.join(', ')}</div>` : '';
      const assignButtons = canAssign
        ? `
          <button type="button" class="btn small" data-user-firm="${encodeURIComponent(user.id)}">Tilknyt</button>
          <button type="button" class="btn small" data-user-firm-admin="${encodeURIComponent(user.id)}">Firma-admin</button>
        `
        : '';
      return `
        <tr>
          <td><strong>${name || ''}</strong><br><small>${user.email || ''}</small></td>
          <td>${firm}</td>
          <td>${role}</td>
          <td>${badge}</td>
          <td class="actions">${assignButtons}</td>
        </tr>
      `;
    })
    .join('');

  container.innerHTML = `
    <h4>Brugere</h4>
    <p class="muted">Registreret lokalt i denne browser. Ændringer skal senere synkroniseres med Auth0.</p>
    <table class="admin-users-table">
      <thead>
        <tr>
          <th>Bruger</th>
          <th>Firmatilhør</th>
          <th>Rolle</th>
          <th>Noter</th>
          <th>Handlinger</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  if (!canAssign) return;

  container.querySelectorAll('button[data-user-firm]').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = decodeURIComponent(button.getAttribute('data-user-firm'));
      updateUser(targetId, { firmId, role: users.find(user => user.id === targetId)?.role || 'user' });
      console.log('TODO: Opdater Auth0 app_metadata.firmId for', targetId, '->', firmId);
      renderUsersTable({ container, users: listUsers(), firmId, canAssign, tenantName });
    });
  });

  container.querySelectorAll('button[data-user-firm-admin]').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = decodeURIComponent(button.getAttribute('data-user-firm-admin'));
      updateUser(targetId, { firmId, role: 'firma-admin' });
      console.log('TODO: Opdater Auth0 rolle til "firma-admin" for', targetId, 'i firma', firmId);
      renderUsersTable({ container, users: listUsers(), firmId, canAssign, tenantName });
    });
  });
}

function renderJobsTable({ container, jobs, currentUserId }) {
  if (!container) return;
  if (!Array.isArray(jobs) || jobs.length === 0) {
    container.innerHTML = '<p>Ingen sager registreret for dette firma endnu.</p>';
    return;
  }

  const counts = jobs.reduce((acc, job) => {
    const key = job.approvalStatus || 'draft';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const rows = jobs
    .map(job => {
      const statusLabel = formatApprovalStatus(job.approvalStatus);
      const approvedBy = job.approvedBy || '-';
      const approvedAt = formatTimestamp(job.approvedAt) || '-';
      return `
        <tr>
          <td>${job.navn || job.sagsnummer || job.id}</td>
          <td>${statusLabel}</td>
          <td>${approvedBy}</td>
          <td>${approvedAt}</td>
          <td class="actions">
            <button type="button" class="btn small" data-job-approve="${job.id}">Godkend</button>
            <button type="button" class="btn small" data-job-reject="${job.id}">Afvis</button>
          </td>
        </tr>
      `;
    })
    .join('');

  container.innerHTML = `
    <h4>Sager</h4>
    <p class="muted">
      Overblik – Kladde: ${counts.draft || 0}, Afventer: ${counts.submitted || 0}, Godkendt: ${counts.approved || 0}, Afvist: ${counts.rejected || 0}
    </p>
    <table class="admin-jobs-table">
      <thead>
        <tr>
          <th>Sag</th>
          <th>Status</th>
          <th>Godkendt af</th>
          <th>Tidspunkt</th>
          <th>Handlinger</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  container.querySelectorAll('button[data-job-approve]').forEach(button => {
    button.addEventListener('click', () => {
      const jobId = button.getAttribute('data-job-approve');
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
      const jobId = button.getAttribute('data-job-reject');
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
    if (!firmId) {
      infoEl.innerHTML = '<p>Ingen aktiv firma-tilknytning.</p>';
    } else {
      const label = tenantName || firmId;
      infoEl.innerHTML = `<p>Aktivt firma: <strong>${label}</strong> (${firmId})</p>`;
    }
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
