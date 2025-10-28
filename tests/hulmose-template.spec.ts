import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

type Material = { id: string; price: number };
type Template = {
  _meta?: { company?: string; admin_code?: string; source?: string };
  pay?: { base_wage_hourly?: number; allowances_per_hour?: Record<string, number> };
  roles?: Record<string, string[]>;
  price_table?: Record<string, number>;
};

async function readJson(relativePath: string) {
  const filePath = path.resolve(process.cwd(), relativePath);
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function assertPriceTableMatches(priceTable: Record<string, number> | undefined, materials: Material[]) {
  expect(priceTable, 'template is missing price_table').toBeDefined();
  const entries = Object.entries(priceTable ?? {});
  const ids = new Set(materials.map(item => item.id));
  expect(entries.length).toBe(ids.size);

  for (const material of materials) {
    const override = priceTable?.[material.id];
    expect(override, `missing override for ${material.id}`).toBeTypeOf('number');

    const roundedBase = Math.round(material.price * 100) / 100;
    expect(override).toBeCloseTo(roundedBase, 6);

    const scaled = Math.round((override ?? 0) * 100);
    expect(Math.abs((override ?? 0) * 100 - scaled)).toBeLessThan(1e-6);
  }

  const extras = entries.map(([id]) => id).filter(id => !ids.has(id));
  expect(extras).toEqual([]);
}

describe('tenant templates', () => {
  it('hulmose tenant matches base material price list to two decimals', async () => {
    const materials: Material[] = await readJson(path.join('app', 'data', 'materials.json'));
    const template: Template = await readJson(path.join('app', 'data', 'tenants', 'hulmose.json'));

    const meta = template._meta ?? {};
    expect(meta.company).toBe('Hulmose Stilladser ApS');
    expect(meta.admin_code).toBe('StilAce');
    expect(meta.source).toContain('HP3 Provinsen v50');

    expect(template.pay?.base_wage_hourly).toBeCloseTo(147, 6);
    expect(template.pay?.allowances_per_hour).toMatchObject({
      udd1: 42.98,
      udd2: 49.38,
      mentor: 22.26
    });

    expect(template.transport_rules).toMatchObject({
      included_distance_m: 15,
      tiers: expect.any(Array)
    });

    expect(template.roles?.chef).toEqual(['approve', 'reject', 'send', 'edit']);
    expect(template.roles?.kontor).toEqual(['approve', 'reject', 'send', 'edit', 'administer']);
    expect(template.roles?.formand).toEqual(['approve', 'reject', 'send']);
    expect(template.roles?.arbejder).toEqual(['send']);

    assertPriceTableMatches(template.price_table, materials);
  });

  it('exports hulmose template 1:1 for distribution', async () => {
    const tenant: Template = await readJson(path.join('app', 'data', 'tenants', 'hulmose.json'));
    const exported: Template = await readJson(path.join('templates', 'hulmose.json'));
    expect(exported).toEqual(tenant);
  });

  it.each([
    'templates/oens.json',
    'templates/stilladsgruppen.json'
  ])('ensures %s covers the material list with rounded overrides', async relativePath => {
    const materials: Material[] = await readJson(path.join('app', 'data', 'materials.json'));
    const template: Template = await readJson(relativePath);

    expect(template._meta?.company?.length ?? 0).toBeGreaterThan(0);
    expect(template.pay?.base_wage_hourly ?? 0).toBeGreaterThan(0);
    expect(template.roles?.chef ?? []).toContain('approve');

    assertPriceTableMatches(template.price_table, materials);
  });

  it('default skeleton exposes required keys but no prices', async () => {
    const skeleton: Template = await readJson(path.join('templates', 'default.json'));
    expect(skeleton._meta?.template).toBe('default');
    expect(skeleton.pay?.base_wage_hourly).toBe(0);
    expect(skeleton.price_table).toEqual({});
    expect(Object.keys(skeleton.roles ?? {})).toContain('chef');
  });
});
