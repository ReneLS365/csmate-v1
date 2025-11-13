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
