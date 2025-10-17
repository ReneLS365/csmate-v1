import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');
const MATERIALS_FILE = path.join(DATA_DIR, 'materials.json');
const MAX_PRICE = 100000;

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(filePath, serialized, 'utf8');
}

function sanitizeFirmId(value) {
  if (typeof value !== 'string' || !value) {
    return 'default';
  }
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(normalized)) {
    return 'default';
  }
  return normalized;
}

async function getAllowedIds() {
  const materials = await readJson(MATERIALS_FILE);
  if (!Array.isArray(materials)) {
    return new Set();
  }
  return new Set(materials.map(item => item.id));
}

function normalizePrice(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed
      .replace(/\s+/g, '')
      .replace(/,(?=\d{3}(?:\D|$))/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function buildEnvKey(firmId) {
  return `FIRM_${firmId.replace(/[^a-z0-9]/gi, '_').toUpperCase()}_HASH`;
}

async function getFirmHash(firmId) {
  const envKey = buildEnvKey(firmId);
  return process.env[envKey] || process.env.FIRM_DEFAULT_HASH || '';
}

async function verifyAdminCode(firmId, code, providedHash) {
  const hash = providedHash || (await getFirmHash(firmId));
  if (!hash || typeof code !== 'string' || !code) {
    return false;
  }
  try {
    return await bcrypt.compare(code, hash);
  } catch (error) {
    console.error('Fejl ved kode verifikation', error);
    return false;
  }
}

async function handleVerify(body) {
  const firmId = sanitizeFirmId(body?.firmId);
  const code = typeof body?.code === 'string' ? body.code : '';
  if (!code) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Manglende kode' })
    };
  }

  const hash = await getFirmHash(firmId);
  if (!hash) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified: false })
    };
  }

  const verified = await verifyAdminCode(firmId, code, hash);
  return {
    statusCode: verified ? 200 : 401,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verified })
  };
}

async function handleUpdate(body) {
  const firmId = sanitizeFirmId(body?.firmId);
  const updates = body?.updates && typeof body.updates === 'object' ? body.updates : {};
  const removals = Array.isArray(body?.removals) ? body.removals : [];
  const allowedIds = await getAllowedIds();

  const normalizedUpdates = {};
  for (const [id, value] of Object.entries(updates)) {
    if (!allowedIds.has(id)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Ukendt varenr: ${id}` })
      };
    }
    const price = normalizePrice(value);
    if (price == null || price < 0 || price > MAX_PRICE) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Ugyldig pris for ${id}` })
      };
    }
    normalizedUpdates[id] = Math.round(price * 100) / 100;
  }

  const code = typeof body?.code === 'string' ? body.code : '';
  const authorized = await verifyAdminCode(firmId, code);
  if (!authorized) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Ugyldig eller manglende kode' })
    };
  }

  const existing = await readJson(path.join(TENANTS_DIR, `${firmId}.json`));
  const next = { ...existing };
  const changed = new Set();

  for (const [id, rounded] of Object.entries(normalizedUpdates)) {
    next[id] = rounded;
    changed.add(id);
  }

  removals.forEach(id => {
    if (id in next) {
      delete next[id];
      changed.add(id);
    }
  });

  if (changed.size === 0) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: firmId, prices: existing })
    };
  }

  await writeJson(path.join(TENANTS_DIR, `${firmId}.json`), next);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: firmId, prices: next })
  };
}

export const handler = async event => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Ugyldigt JSON payload' })
    };
  }

  const action = body?.action;
  if (action === 'verify') {
    try {
      return await handleVerify(body);
    } catch (error) {
      console.error('Verify fejl', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Fejl ved verificering' })
      };
    }
  }

  if (action === 'update_prices') {
    try {
      return await handleUpdate(body);
    } catch (error) {
      console.error('Update fejl', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Fejl ved opdatering' })
      };
    }
  }

  return {
    statusCode: 400,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Ukendt action' })
  };
};
