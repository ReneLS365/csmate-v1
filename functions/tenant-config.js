import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'app', 'data');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');

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

export const handler = async event => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const params = new URLSearchParams(event.rawQuery || event.queryStringParameters);
  const firmId = sanitizeFirmId(params.get('firm'));
  const filePath = path.join(TENANTS_DIR, `${firmId}.json`);

  try {
    const tenant = await readJson(filePath);
    const priceTable =
      tenant && typeof tenant === 'object' && !Array.isArray(tenant) && tenant.price_table &&
      typeof tenant.price_table === 'object' && !Array.isArray(tenant.price_table)
        ? tenant.price_table
        : tenant;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: firmId, prices: priceTable })
    };
  } catch (error) {
    console.error('tenant-config fejl', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Kunne ikke læse tenant data' })
    };
  }
};
