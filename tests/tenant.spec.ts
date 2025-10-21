import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { promises as fs } from 'fs';
import path from 'path';
import { handler as adminUpdate } from '../functions/admin-update.js';

const TENANTS_DIR = path.resolve(process.cwd(), 'data/tenants');
const TEST_FILE = path.join(TENANTS_DIR, 'test.json');

describe('admin-update handler', () => {
  beforeAll(() => {
    const hash = bcrypt.hashSync('hemmelig', 10);
    process.env.FIRM_TEST_HASH = hash;
  });

  afterAll(async () => {
    delete process.env.FIRM_TEST_HASH;
    try {
      await fs.unlink(TEST_FILE);
    } catch (error) {
      if (error && error.code !== 'ENOENT') {
        throw error;
      }
    }
  });

  it('returns 401 for a bad admin code', async () => {
    const response = await adminUpdate({
      httpMethod: 'POST',
      body: JSON.stringify({ action: 'verify', firmId: 'test', code: 'forkert' })
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects updates with unknown item ids', async () => {
    const response = await adminUpdate({
      httpMethod: 'POST',
      body: JSON.stringify({
        action: 'update_prices',
        firmId: 'test',
        code: 'hemmelig',
        updates: { UNKNOWN: 10 }
      })
    });
    expect(response.statusCode).toBe(400);
  });
});
